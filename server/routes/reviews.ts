import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth';
import AuthService from '../services/auth';
import { DocumentDB, SubmissionDB, VersionDB, FolderDB, db } from '../services/db';
import { normalizeFilename } from './files';
import multer from 'multer';
import emailService from '../services/email';
import { emitRealtime } from '../services/realtime';

const router = Router();

// emailService é uma instância pronta

// Normalize a document name for matching: lowercased, no extension, ignore tokens like "REV01", "REV 02"
function normalizeBaseName(name: string): string {
  if (!name) return '';
  let base = name.toLowerCase();
  const ext = path.extname(base);
  if (ext) base = base.slice(0, -ext.length);
  // Remove any REV + number token anywhere (e.g., "rev01", "REV 02")
  base = base.replace(/\brev\.?\s*\d+\b/gi, ' ');
  // Collapse connectors and whitespace
  base = base.replace(/[_-]+/g, ' ');
  base = base.replace(/\s+/g, ' ').trim();
  return base;
}

// Directories
const uploadsDir = path.join(process.cwd(), 'uploads');
const stagingDir = path.join(uploadsDir, 'staging');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(stagingDir);

// Multer for staging submissions
// Keep in sync with files router. Config via env vars:
// UPLOAD_MAX_SIZE_MB and UPLOAD_MAX_FILES
const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || 1024);
const maxFiles = Number(process.env.UPLOAD_MAX_FILES || 100);
const stagingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, stagingDir),
  filename: (_req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});
const stagingUpload = multer({ storage: stagingStorage, limits: { fileSize: maxSizeMb * 1024 * 1024 } });

// Reviewer: submit file(s) for approval
router.post('/submit', authenticateToken, requireRole(['reviewer']), stagingUpload.array('files', maxFiles), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { targetFolderId, replacesDocumentId, changeNotes } = req.body as any;
    const uploadedBy = req.user?.email || 'unknown';

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo foi enviado' });
    }
    if (files.length !== 1) {
      return res.status(400).json({ success: false, message: 'Envie apenas um arquivo por submissão de revisão' });
    }
    if (!changeNotes || String(changeNotes).trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Inclua uma justificativa do que foi alterado' });
    }

  const submissions = files.map((file) => {
      const id = path.basename(file.filename, path.extname(file.filename));
      const submission = {
        id,
        targetFolderId: targetFolderId || 'root',
        replacesDocumentId: replacesDocumentId || null,
        originalName: normalizeFilename(file.originalname),
        filename: file.filename,
        size: file.size,
        mimeType: file.mimetype,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
    changeNotes: String(changeNotes),
        reviewNotes: null as any,
        reviewedBy: null as any,
        reviewedAt: null as any,
      };
      SubmissionDB.insert(submission);
      return submission;
    });

    res.json({ success: true, message: `${submissions.length} envio(s) aguardando aprovação`, submissions });
  } catch (error) {
    console.error('Review submit error:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar para revisão' });
  }
});

// Admin: list pending submissions
router.get('/pending', authenticateToken, requireRole(['approver','admin']), (_req: Request, res: Response) => {
  try {
  const items = SubmissionDB.allPending();
    const withMeta = items.map((s: any) => {
      // Build folder path names
      const pathNames: string[] = [];
      let curId = s.targetFolderId;
      let steps = 0;
      while (curId && curId !== 'root' && steps < 50) {
        const f: any = FolderDB.byId(curId);
        if (!f) break;
        pathNames.unshift(f.name || curId);
        curId = f.parentId;
        steps++;
      }
      const folderPath = pathNames.length ? ['Documentos', ...pathNames] : ['Documentos'];

  return {
        ...s,
        folderPath,
        previewUrl: `/api/reviews/${s.id}/file`,
      };
    });
    res.json({ success: true, submissions: withMeta });
  } catch (error) {
    console.error('List pending error:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar envios' });
  }
});

// Reviewer: list own submissions with status and notes
router.get('/mine', authenticateToken, (req: Request, res: Response) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    const all = SubmissionDB.allPending() as any[]; // get pending first
    // We also need non-pending; fetch all statuses from table directly
    const rows = (db.prepare("SELECT * FROM document_submissions WHERE uploadedBy = ? ORDER BY uploadedAt DESC").all(email) as any[]);
    const list = rows.map(s => ({
      id: s.id,
      originalName: s.originalName,
      uploadedAt: s.uploadedAt,
      status: s.status,
      reviewNotes: s.reviewNotes,
      reviewedAt: s.reviewedAt,
      reviewedBy: s.reviewedBy,
      changeNotes: s.changeNotes,
      targetFolderId: s.targetFolderId,
      previewUrl: `/api/reviews/${s.id}/file`,
    }));
    res.json({ success: true, submissions: list });
  } catch (error) {
    console.error('List my submissions error:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar seus envios' });
  }
});

// Admin: pending count only
router.get('/pending/count', authenticateToken, requireRole(['approver','admin']), (_req: Request, res: Response) => {
  try {
    const items = SubmissionDB.allPending();
    res.json({ success: true, count: (items || []).length });
  } catch (error) {
    console.error('Count pending error:', error);
    res.status(500).json({ success: false, message: 'Erro ao contar envios' });
  }
});

// Admin: preview staged file
router.get('/:id/file', (req: Request, res: Response) => {
  try {
    // Accept auth via header or query token (for iframe)
    const header = req.headers['authorization'];
    const bearer = header && header.startsWith('Bearer ')? header.split(' ')[1]: undefined;
    const qToken = (req.query.token as string | undefined);
    const token = bearer || qToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token de acesso necessário' });
    }
    const verification = AuthService.verifyToken(token);
    if (!verification.success || !verification.user) {
      return res.status(403).json({ success: false, message: verification.message || 'Token inválido' });
    }
    const { id } = req.params;
    const sub: any = SubmissionDB.byId(id);
    if (!sub) return res.status(404).json({ success: false, message: 'Envio não encontrado' });
  // Allow if admin, approver, or the uploader
  const isApprover = (verification.user as any).role === 'approver';
  if (!verification.user.isAdmin && !isApprover && verification.user.email !== sub.uploadedBy) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    const filePath = path.join(stagingDir, sub.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Arquivo não encontrado' });
    res.setHeader('Content-Type', sub.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(sub.originalName || sub.filename)}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Preview file error:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar arquivo' });
  }
});

// Admin: approve submission
router.post('/:id/approve', authenticateToken, requireRole(['approver','admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
  const { notes, replacesDocumentId: overrideReplaceId } = req.body || {};
    const adminEmail = req.user?.email || 'admin';
    const sub: any = SubmissionDB.byId(id);
    if (!sub || sub.status !== 'pending') {
      return res.status(404).json({ success: false, message: 'Envio não encontrado ou já processado' });
    }

    const stagingPath = path.join(stagingDir, sub.filename);
    if (!fs.existsSync(stagingPath)) {
      return res.status(404).json({ success: false, message: 'Arquivo da submissão não encontrado' });
    }

    const now = new Date().toISOString();
    let replacesId = overrideReplaceId || sub.replacesDocumentId || null;

    // If no explicit target to replace, try to match existing doc in target folder by originalName (case-insensitive)
    if (!replacesId && sub.targetFolderId) {
      const inFolder = (DocumentDB.byFolder(sub.targetFolderId) as any[]) || [];
      const needle = normalizeBaseName(sub.originalName || '');
      const match = inFolder.find(d => normalizeBaseName(d.originalName || '') === needle);
      if (match) {
        replacesId = match.id;
      }
    }

  if (replacesId) {
      const existing: any = DocumentDB.byId(replacesId);
      if (!existing) {
        return res.status(400).json({ success: false, message: 'Documento a substituir não existe' });
      }
      const archiveDir = path.join(uploadsDir, 'versions', replacesId);
      fs.ensureDirSync(archiveDir);
      const currentFilePath = path.join(uploadsDir, existing.filename);
      if (fs.existsSync(currentFilePath)) {
        const maxV = (VersionDB.maxVersion(replacesId) as any)?.maxVersion || 0;
        const newVersion = (maxV || 0) + 1;
        const archivedFilename = `${existing.id}-v${newVersion}${path.extname(existing.filename)}`;
        const archivedPath = path.join(archiveDir, archivedFilename);
        await fs.move(currentFilePath, archivedPath, { overwrite: true });
        const archivedRelPath = path.join('versions', existing.id, archivedFilename);
        VersionDB.insert({
          id: uuidv4(),
          documentId: existing.id,
          version: newVersion,
          originalName: existing.originalName,
          filename: archivedRelPath,
          size: existing.size,
          mimeType: existing.mimeType,
          archivedAt: now,
          archivedBy: adminEmail,
        });
      }
      const newServerFilename = `${existing.id}${path.extname(sub.filename)}`;
      const destPath = path.join(uploadsDir, newServerFilename);
      await fs.move(stagingPath, destPath, { overwrite: true });

  DocumentDB.update({
        ...existing,
        originalName: sub.originalName,
        filename: newServerFilename,
        size: sub.size,
        mimeType: sub.mimeType,
        // keep uploadDate (createdAt) as is on replacement
        uploadDate: existing.uploadDate,
        owner: sub.uploadedBy, // creditar ao revisor para autoria atual
        lastModified: now,
        lastModifiedBy: sub.uploadedBy,
      });
  emitRealtime({ type: 'document:uploaded', payload: { documentId: existing.id, folderId: existing.folderId || sub.targetFolderId || 'root' } });
    } else {
      const newId = path.basename(sub.filename, path.extname(sub.filename));
      const finalFilename = `${newId}${path.extname(sub.filename)}`;
      const destPath = path.join(uploadsDir, finalFilename);
      await fs.move(stagingPath, destPath, { overwrite: true });
  DocumentDB.insert({
        id: newId,
        originalName: sub.originalName,
        filename: finalFilename,
        size: sub.size,
        mimeType: sub.mimeType,
        uploadDate: now,
        owner: sub.uploadedBy,
        createdBy: sub.uploadedBy,
        lastModified: now,
        lastModifiedBy: sub.uploadedBy,
        folderId: sub.targetFolderId || 'root',
      });
  emitRealtime({ type: 'document:uploaded', payload: { documentId: newId, folderId: sub.targetFolderId || 'root' } });
    }

    SubmissionDB.update({ id, status: 'approved', reviewNotes: notes || null, reviewedBy: adminEmail, reviewedAt: now });

    // Notify reviewer via email
    const emailTo = sub.uploadedBy;
    if (emailTo) {
      const subject = 'Revisão de documento - Aprovado';
      const text = `Seu envio foi aprovado.\n\nDocumento: ${sub.originalName}\nPasta: ${(sub.targetFolderId || 'root')}\nAprovado por: ${adminEmail}\nData: ${new Date(now).toLocaleString('pt-BR')}`;
      await emailService.sendNotification(emailTo, subject, text);
    }

    res.json({ success: true, message: 'Submissão aprovada e processada' });
  } catch (error) {
    console.error('Approve submission error:', error);
    res.status(500).json({ success: false, message: 'Erro ao aprovar submissão' });
  }
});

// Admin: reject submission
router.post('/:id/reject', authenticateToken, requireRole(['approver','admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};
    const adminEmail = req.user?.email || 'admin';
    const sub: any = SubmissionDB.byId(id);
    if (!sub || sub.status !== 'pending') {
      return res.status(404).json({ success: false, message: 'Envio não encontrado ou já processado' });
    }
    const now = new Date().toISOString();
    SubmissionDB.update({ id, status: 'rejected', reviewNotes: notes || null, reviewedBy: adminEmail, reviewedAt: now });

    // Notify reviewer via email with justification
    const emailTo = sub.uploadedBy;
    if (emailTo) {
      const subject = 'Revisão de documento - Rejeitado';
      const text = `Seu envio foi rejeitado.\n\nDocumento: ${sub.originalName}\nPasta: ${(sub.targetFolderId || 'root')}\nRevisor: ${adminEmail}\nData: ${new Date(now).toLocaleString('pt-BR')}\n\nJustificativa:\n${notes || '(não informada)'}`;
      await emailService.sendNotification(emailTo, subject, text);
    }

    res.json({ success: true, message: 'Submissão rejeitada' });
  } catch (error) {
    console.error('Reject submission error:', error);
    res.status(500).json({ success: false, message: 'Erro ao rejeitar submissão' });
  }
});

export default router;
