import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { syncDocumentWithFolders, removeDocumentFromFolders } from "./folders";
import { DocumentDB, FolderDB, DeleteRequestDB, VersionDB, DocumentFolderDB } from "../services/db";
import { emitRealtime } from "../services/realtime";
import { authenticateToken, requireAdmin, requireRole, optionalAuth, authenticateTokenAllowQuery } from "../middleware/auth";
import libreOfficeService from "../services/libreoffice";

const router = Router();
// Attempt to normalize potentially mis-encoded strings (UTF-8 bytes interpreted as Latin-1)
export function normalizeFilename(name: string): string {
  try {
    // Convert string to bytes to analyze UTF-8 sequences
    const bytes: number[] = [];
    for (let i = 0; i < name.length; i++) {
      bytes.push(name.charCodeAt(i));
    }
    
    // Check if we have UTF-8 sequences that were interpreted as Latin-1
    let hasUTF8Sequences = false;
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 195) { // UTF-8 multibyte sequence start
        hasUTF8Sequences = true;
        break;
      }
    }
    
    if (!hasUTF8Sequences) {
      return name; // No UTF-8 issues detected
    }
    
    // Decode UTF-8 sequences back to correct characters
    const result: number[] = [];
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      
      // Handle UTF-8 sequences that start with 195 (0xC3)
      if (byte === 195 && i + 1 < bytes.length) {
        const nextByte = bytes[i + 1];
        
        // Map UTF-8 sequences back to correct Unicode code points
        const utf8Map: { [key: number]: number } = {
          135: 199,  // Ç (195,135 -> 199)
          131: 195,  // Ã (195,131 -> 195)
          137: 201,  // É (195,137 -> 201)
          161: 225,  // á (195,161 -> 225)
          160: 224,  // à (195,160 -> 224)
          163: 227,  // ã (195,163 -> 227)
          162: 226,  // â (195,162 -> 226)
          164: 228,  // ä (195,164 -> 228)
          169: 233,  // é (195,169 -> 233)
          170: 234,  // ê (195,170 -> 234)
          168: 232,  // è (195,168 -> 232)
          171: 235,  // ë (195,171 -> 235)
          173: 237,  // í (195,173 -> 237)
          172: 236,  // ì (195,172 -> 236)
          174: 238,  // î (195,174 -> 238)
          175: 239,  // ï (195,175 -> 239)
          179: 243,  // ó (195,179 -> 243)
          178: 242,  // ò (195,178 -> 242)
          181: 245,  // õ (195,181 -> 245)
          180: 244,  // ô (195,180 -> 244)
          182: 246,  // ö (195,182 -> 246)
          186: 250,  // ú (195,186 -> 250)
          185: 249,  // ù (195,185 -> 249)
          187: 251,  // û (195,187 -> 251)
          188: 252,  // ü (195,188 -> 252)
          167: 231,  // ç (195,167 -> 231)
          177: 241,  // ñ (195,177 -> 241)
          // Uppercase versions
          129: 193,  // Á (195,129 -> 193)
          128: 192,  // À (195,128 -> 192)
          130: 194,  // Â (195,130 -> 194)
          132: 196,  // Ä (195,132 -> 196)
          138: 202,  // Ê (195,138 -> 202)
          136: 200,  // È (195,136 -> 200)
          139: 203,  // Ë (195,139 -> 203)
          141: 205,  // Í (195,141 -> 205)
          140: 204,  // Ì (195,140 -> 204)
          142: 206,  // Î (195,142 -> 206)
          143: 207,  // Ï (195,143 -> 207)
          147: 211,  // Ó (195,147 -> 211)
          146: 210,  // Ò (195,146 -> 210)
          149: 213,  // Õ (195,149 -> 213)
          148: 212,  // Ô (195,148 -> 212)
          150: 214,  // Ö (195,150 -> 214)
          154: 218,  // Ú (195,154 -> 218)
          153: 217,  // Ù (195,153 -> 217)
          155: 219,  // Û (195,155 -> 219)
          156: 220,  // Ü (195,156 -> 220)
          145: 209,  // Ñ (195,145 -> 209)
        };
        
        if (utf8Map[nextByte]) {
          result.push(utf8Map[nextByte]);
          i++; // Skip next byte as we processed it
          continue;
        }
      }
      
      // Keep other bytes as-is
      result.push(byte);
    }
    
    const decoded = String.fromCharCode(...result);
    if (decoded !== name) {
      console.log(`🔧 UTF-8 encoding fix applied: "${name}" -> "${decoded}"`);
      return decoded;
    }
    
    return name;
  } catch (e) {
    console.warn(`⚠️ Error normalizing filename: ${name}`, e);
    return name;
  }
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
fs.ensureDirSync(uploadsDir);
const stagingDir = path.join(uploadsDir, "staging");
fs.ensureDirSync(stagingDir);
const previewsDir = path.join(uploadsDir, "previews");
fs.ensureDirSync(previewsDir);

// Helpers for versioned storage structure
function sanitizeDirname(input: string): string {
  const name = input
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  // Avoid trailing dot or space (Windows)
  return name.replace(/[\.\s]+$/g, '') || 'Documento';
}

function sanitizeFilename(input: string): string {
  const parts = input.split('.');
  const ext = parts.length > 1 ? '.' + parts.pop() : '';
  const base = parts.join('.') || 'arquivo';
  const safeBase = base
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\.\s]+$/g, '');
  return (safeBase || 'arquivo') + ext;
}

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function nextVersionNumber(docFolderPath: string): number {
  try {
    if (!fs.existsSync(docFolderPath)) return 1;
    const entries = fs.readdirSync(docFolderPath, { withFileTypes: true });
    const versions = entries
      .filter(e => e.isDirectory())
      .map(e => {
        const m = e.name.match(/Versao\s+(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => Number.isFinite(n) && n > 0);
    const max = versions.length ? Math.max(...versions) : 0;
    return max + 1;
  } catch {
    return 1;
  }
}

function parseVersionFromRelPath(relPath: string): number | null {
  try {
    const parts = relPath.split(path.sep);
    // Expect segment like "Versao N (dd.MM.yyyy)"
    const seg = parts.find((p) => /Versao\s+\d+\s*\(/i.test(p));
    if (!seg) return null;
    const m = seg.match(/Versao\s+(\d+)/i);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function getFilePathForVersion(document: any, versionParam?: string | string[]): { absPath: string, version: number } | null {
  const requested = versionParam ? Number(String(versionParam)) : undefined;
  const currentVersion = parseVersionFromRelPath(document.filename) ?? undefined;
  if (!requested || (currentVersion && requested === currentVersion)) {
    return { absPath: path.join(uploadsDir, document.filename), version: currentVersion || 1 };
  }
  // search in archived versions
  try {
    const list = VersionDB.byDocument(document.id) as any[];
    const hit = list.find(v => Number(v.version) === requested);
    if (hit) {
      return { absPath: path.join(uploadsDir, hit.filename), version: requested };
    }
  } catch {}
  return null;
}

// Helper function to clean up empty document folders after file deletion
function cleanupDocumentFolders(filePath: string) {
  try {
    const documentFolder = path.dirname(filePath);
    if (documentFolder !== uploadsDir) {
      // First, try to remove the version folder (e.g., "Versao 1 (02.09.2025)")
      try {
        const remainingFiles = fs.readdirSync(documentFolder);
        if (remainingFiles.length === 0) {
          fs.rmdirSync(documentFolder);
          
          // Then try to remove the parent document folder (e.g., "NomeDoArquivo")
          const parentDocumentFolder = path.dirname(documentFolder);
          if (parentDocumentFolder !== uploadsDir) {
            try {
              const remainingVersions = fs.readdirSync(parentDocumentFolder);
              if (remainingVersions.length === 0) {
                fs.rmdirSync(parentDocumentFolder);
              }
            } catch (parentFolderError) {
              console.warn('Could not remove parent document folder:', parentFolderError);
            }
          }
        }
      } catch (versionFolderError) {
        console.warn('Could not remove version folder:', versionFolderError);
      }
    }
  } catch (folderError) {
    console.warn('Error cleaning up document folder structure:', folderError);
  }
}

// Configure multer for file uploads (versioned folder structure)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const original = normalizeFilename(file.originalname);
      const base = path.basename(original, path.extname(original));
      const folderName = sanitizeDirname(base);
      const docFolderPath = path.join(uploadsDir, folderName);
      fs.ensureDirSync(docFolderPath);
      const vNum = nextVersionNumber(docFolderPath);
      const versionFolderName = `Versao ${vNum} (${formatDateBR(new Date())})`;
      const dest = path.join(docFolderPath, versionFolderName);
      fs.ensureDirSync(dest);
      // Attach computed paths to request for later use
      (file as any)._appDest = dest;
      (file as any)._appRelDir = path.relative(uploadsDir, dest);
      cb(null, dest);
    } catch (e) {
      console.error('multer destination error:', e);
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    try {
      const original = normalizeFilename(file.originalname);
      const safe = sanitizeFilename(original);
      cb(null, safe);
    } catch {
      const uniqueId = uuidv4();
      const extension = path.extname(file.originalname);
      cb(null, `${uniqueId}${extension}`);
    }
  },
});

// Allow configuring upload limits via environment variables.
// UPLOAD_MAX_SIZE_MB: maximum size per file in MB (default 1024 MB)
// UPLOAD_MAX_FILES: maximum number of files per upload (default 50 files)
const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || 1024);
const maxFiles = Number(process.env.UPLOAD_MAX_FILES || 100);
const upload = multer({
  storage,
  limits: {
    fileSize: maxSizeMb * 1024 * 1024, // Configurable limit (default 100MB)
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types (check MIME + extension)
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/plain",
      "text/csv",
    ];
    const allowedExts = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".gif", ".txt", ".csv"]);
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedTypes.includes(file.mimetype) && allowedExts.has(ext)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Separate storage for submissions (staging)
const stagingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, stagingDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  },
});
const stagingUpload = multer({
  storage: stagingStorage,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
});

// Interface for document metadata
interface DocumentMetadata {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadDate: string;
  owner: string;
}

// Documents now stored in SQLite via DocumentDB

// Upload endpoint
router.post(
  "/upload",
  authenticateToken,
  requireRole(['approver','admin']),
  // use configurable maxFiles
  upload.array("files", maxFiles),
  (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const targetFolderIdRaw = (req.body as any)?.targetFolderId;
      const targetFolderId = targetFolderIdRaw && String(targetFolderIdRaw).trim() ? String(targetFolderIdRaw).trim() : 'root';

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }

      // Validate destination folder if not root
      if (targetFolderId !== 'root') {
        const exists = FolderDB.byId(targetFolderId as any);
        if (!exists) {
          return res.status(400).json({ error: 'Pasta de destino não encontrada' });
        }
      }

      const userEmail = req.user?.email || "unknown";

      // cache all docs for simple matching by base name (series)
      const existingDocs = DocumentDB.all();

      const uploadedDocs: DocumentMetadata[] = files.map((file) => {
        const nowIso = new Date().toISOString();
        const originalName = normalizeFilename(file.originalname);
        const safeFilename = file.filename; // already sanitized by storage
        const relDir = ((file as any)._appRelDir || '');
        const relPath = path.join(relDir, safeFilename);

        // Series key based on sanitized base name (folder name used)
        const folderName = sanitizeDirname(path.basename(originalName, path.extname(originalName)));
        const existing = existingDocs.find((d: any) => {
          const base = sanitizeDirname(path.basename(normalizeFilename(d.originalName), path.extname(d.originalName)));
          return base.toLowerCase() === folderName.toLowerCase();
        }) as any | undefined;

  if (existing) {
          // Archive previous version metadata (best-effort)
          try {
            const prevVersion = parseVersionFromRelPath(existing.filename) ?? 1;
            VersionDB.insert({
              id: uuidv4(),
              documentId: existing.id,
              version: prevVersion,
              originalName: existing.originalName,
              filename: existing.filename,
              size: existing.size,
              mimeType: existing.mimeType,
              archivedAt: nowIso,
              archivedBy: userEmail,
            });
          } catch (e) {
            console.warn('Could not archive previous version:', e);
          }

          // Update existing as the new current version
          const updated = {
            ...existing,
            originalName,
            filename: relPath,
            size: file.size,
            mimeType: file.mimetype,
            uploadDate: nowIso,
            owner: userEmail,
            lastModified: nowIso,
            lastModifiedBy: userEmail,
          };
          DocumentDB.update(updated);
          syncDocumentWithFolders(updated as any);
          const dest = targetFolderId || 'root';
          try { DocumentDB.move(existing.id, dest); } catch {}
          emitRealtime({ type: 'document:uploaded', payload: { documentId: existing.id, folderId: dest } });
          return {
            id: existing.id,
            originalName: updated.originalName,
            filename: updated.filename,
            size: updated.size,
            mimeType: updated.mimeType,
            uploadDate: updated.uploadDate,
            owner: updated.owner,
          };
        }

        // New series: insert new document
        const newId = uuidv4();
        const dest = targetFolderId || 'root';
        const newDoc: any = {
          id: newId,
          originalName,
          filename: relPath,
          size: file.size,
          mimeType: file.mimetype,
          uploadDate: nowIso,
          owner: userEmail,
          createdBy: userEmail,
          lastModified: nowIso,
          lastModifiedBy: userEmail,
          folderId: dest,
        };
        DocumentDB.insert(newDoc);
        // ensure folder assignment (even for root)
        try { DocumentDB.move(newId, dest); } catch {}
        emitRealtime({ type: 'document:uploaded', payload: { documentId: newId, folderId: dest } });
        const doc: DocumentMetadata = {
          id: newId,
          originalName: originalName,
          filename: relPath,
          size: file.size,
          mimeType: file.mimetype,
          uploadDate: nowIso,
          owner: userEmail,
        };
        return doc;
      });

      res.json({
        message: `${uploadedDocs.length} arquivo(s) enviado(s) com sucesso`,
        documents: uploadedDocs,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// Get all documents
router.get("/documents", authenticateToken, (req: Request, res: Response) => {
  const documents = DocumentDB.all();
  res.json({ documents });
});

// Get specific document metadata
router.get("/documents/:id", authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const document: any = DocumentDB.byId(id);

  if (!document) {
    return res.status(404).json({ error: "Documento não encontrado" });
  }

  res.json({ document });
});

// Download/view document
router.get("/documents/:id/download", authenticateTokenAllowQuery, (req: Request, res: Response) => {
  const { id } = req.params;
  const document: any = DocumentDB.byId(id);

  if (!document) {
    return res.status(404).json({ error: "Documento não encontrado" });
  }

  // Normal users cannot request specific versions via query param
  const requestedVersion = (req.query as any)?.version;
  const isPrivileged = !!req.user?.isAdmin || req.user?.role === 'approver';
  if (requestedVersion && !isPrivileged) {
    return res.status(403).json({ error: 'Acesso negado: selecionar versões requer aprovação/admin.' });
  }
  const versionSel = getFilePathForVersion(document, requestedVersion);
  if (!versionSel) {
    return res.status(404).json({ error: "Versão não encontrada" });
  }
  const filePath = versionSel.absPath;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Arquivo não encontrado no disco" });
  }

  // Set appropriate headers
  res.setHeader("Content-Type", document.mimeType);
  const safeName = path.basename(document.originalName || 'document');
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(safeName)}"`,
  );

  // Stream the file
  res.sendFile(filePath);
});

// View document (for inline viewing)
router.get("/documents/:id/view", authenticateTokenAllowQuery, (req: Request, res: Response) => {
  const { id } = req.params;
  const document: any = DocumentDB.byId(id);

  if (!document) {
    return res.status(404).json({ error: "Documento não encontrado" });
  }

  const requestedVersion = (req.query as any)?.version;
  const isPrivileged = !!req.user?.isAdmin || req.user?.role === 'approver';
  if (requestedVersion && !isPrivileged) {
    return res.status(403).json({ error: 'Acesso negado: selecionar versões requer aprovação/admin.' });
  }
  const versionSel = getFilePathForVersion(document, requestedVersion);
  if (!versionSel) {
    return res.status(404).json({ error: "Versão não encontrada" });
  }
  const filePath = versionSel.absPath;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Arquivo não encontrado no disco" });
  }

  // Set headers for inline viewing
  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");

  // For PDFs and images, allow inline viewing
  if (
    document.mimeType === "application/pdf" ||
    document.mimeType.startsWith("image/")
  ) {
    res.setHeader("Content-Disposition", "inline");
  }

  res.sendFile(filePath);
});

// Preview as PDF (auto-convert Office docs using LibreOffice and cache)
router.get("/documents/:id/preview", authenticateTokenAllowQuery, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document: any = DocumentDB.byId(id);
    if (!document) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    const requestedVersion = (req.query as any)?.version;
    const isPrivileged = !!req.user?.isAdmin || req.user?.role === 'approver';
    if (requestedVersion && !isPrivileged) {
      return res.status(403).json({ error: 'Acesso negado: selecionar versões requer aprovação/admin.' });
    }
    const versionSel = getFilePathForVersion(document, requestedVersion);
    if (!versionSel) {
      return res.status(404).json({ error: "Versão não encontrada" });
    }
    const filePath = versionSel.absPath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Arquivo não encontrado no disco" });
    }

    // If already PDF, just stream inline
    if (document.mimeType === "application/pdf") {
      res.setHeader("Content-Type", "application/pdf");
      const pdfName = `${path.basename(document.originalName || 'document', path.extname(document.originalName || ''))}.pdf`;
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(pdfName)}"`);
      return res.sendFile(filePath);
    }

    const convertible = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.oasis.opendocument.presentation",
      "text/plain",
      "text/csv"
    ];
    const allowedExts = new Set([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp", ".csv", ".txt"]);
    const ext = path.extname(document.originalName || document.filename || "").toLowerCase();
    const canConvert = convertible.includes(document.mimeType) || allowedExts.has(ext);
    if (!canConvert) {
      return res.status(415).json({ error: "Tipo de arquivo não suportado para pré-visualização" });
    }

  const ver = versionSel.version || 1;
  const previewPath = path.join(previewsDir, `${id}_v${ver}.pdf`);

    // Use cache if exists and not stale
    const srcStat = fs.statSync(filePath);
    const hasPreview = fs.existsSync(previewPath);
    const isStale = hasPreview ? fs.statSync(previewPath).mtimeMs < srcStat.mtimeMs : true;

    if (!hasPreview || isStale) {
      try {
  const pdfBuffer = await libreOfficeService.convertDocument(filePath, ".pdf");
  // Write buffer to disk (cache) using DataView to satisfy typings
  const view = new DataView(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
  fs.writeFileSync(previewPath, view);
      } catch (e) {
        console.error("Preview conversion error:", e);
        return res.status(500).json({ error: "Erro ao converter documento para PDF" });
      }
    }

    res.setHeader("Content-Type", "application/pdf");
    const pdfName2 = `${path.basename(document.originalName || 'document', path.extname(document.originalName || ''))}.pdf`;
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(pdfName2)}"`);
    return res.sendFile(previewPath);
  } catch (err) {
    console.error("preview route error:", err);
    return res.status(500).json({ error: "Erro interno ao gerar pré-visualização" });
  }
});

// List versions (current + archived)
router.get('/documents/:id/versions', authenticateToken, requireRole(['approver','admin']), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc: any = DocumentDB.byId(id);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });
    const currentVer = parseVersionFromRelPath(doc.filename) || 1;
    const folderSegs = doc.filename.split(path.sep);
    const verSeg = folderSegs.find(s => /Versao\s+\d+\s*\(/i.test(s));
    let dateStr: string | null = null;
    if (verSeg) {
      const m = verSeg.match(/\(([^)]+)\)/);
      if (m) dateStr = m[1];
    }
    const currentEntry = {
      version: currentVer,
      isCurrent: true,
      filename: doc.filename,
      size: doc.size,
      mimeType: doc.mimeType,
      label: `Versão ${currentVer}${dateStr ? ` (${dateStr})` : ''}`,
      uploadedAt: doc.uploadDate,
    };
    const archived = (VersionDB.byDocument(id) as any[]).map(v => {
      let label = `Versão ${v.version}`;
      const verSeg = String(v.filename || '').split(path.sep).find((s: string) => /Versao\s+\d+\s*\(/i.test(s));
      if (verSeg) {
        const m = verSeg.match(/\(([^)]+)\)/);
        if (m) label = `Versão ${v.version} (${m[1]})`;
      }
      return {
        version: v.version,
        isCurrent: false,
        filename: v.filename,
        size: v.size,
        mimeType: v.mimeType,
        label,
        uploadedAt: v.archivedAt,
      };
    });
    const all = [currentEntry, ...archived].sort((a,b) => b.version - a.version);
    res.json({ versions: all });
  } catch (e) {
    console.error('versions list error:', e);
    res.status(500).json({ error: 'Erro ao listar versões' });
  }
});

// Delete document (Admin, or Approver if owns the document)
router.delete(
  "/documents/:id",
  authenticateToken,
  requireRole(['approver','admin']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const document: any = DocumentDB.byId(id);
    if (!document) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }
    const filePath = path.join(uploadsDir, document.filename);

    // Permission check
    const isAdmin = !!req.user?.isAdmin;
    const isApprover = req.user?.role === 'approver';
    const userEmail = req.user?.email;
    if (!isAdmin) {
      const isOwner = userEmail && (document.owner === userEmail || document.createdBy === userEmail);
      if (!(isApprover && isOwner)) {
        return res.status(403).json({ error: 'Sem permissão para excluir. Solicite ao proprietário.' });
      }
    }

    try {
      // Delete main document file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete all archived versions from VersionDB
      try {
        const versions = VersionDB.byDocument(id) as any[];
        versions.forEach((version: any) => {
          const versionPath = path.join(uploadsDir, version.filename);
          if (fs.existsSync(versionPath)) {
            fs.unlinkSync(versionPath);
          }
          // Clean up folder structure for each version
          cleanupDocumentFolders(versionPath);
        });
        // Remove version entries from database
        VersionDB.deleteByDocument(id);
      } catch (versionError) {
        console.warn('Error deleting versions:', versionError);
      }

      // Clean up main document folder structure
      cleanupDocumentFolders(filePath);

      removeDocumentFromFolders(id);
      emitRealtime({ type: 'document:deleted', payload: { documentId: id } });
      res.json({ message: "Documento excluído com sucesso" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Erro ao excluir documento" });
    }
  },
);

// Get folders associated with a document (includes primary)
router.get('/documents/:id/folders', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = DocumentDB.byId(id);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });
    const folders = DocumentFolderDB.foldersForDocument(id);
    return res.json({ folders });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao carregar pastas do documento' });
  }
});

// Get detailed folder information for a document
router.get('/documents/:id/folders-details', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc: any = DocumentDB.byId(id);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });
    
    const folderIds = DocumentFolderDB.foldersForDocument(id);
    const primary = doc.folderId || 'root';
    
    const folders = folderIds.map(folderId => {
      if (folderId === 'root') {
        return {
          id: 'root',
          name: 'Documentos',
          color: '#3b82f6',
          isPrimary: primary === 'root',
          canRemove: primary !== 'root' // Pode remover apenas se não for a pasta primária
        };
      } else {
        const folder: any = FolderDB.byId(folderId);
        return folder ? {
          id: folder.id,
          name: folder.name,
          color: folder.color || '#6b7280',
          isPrimary: primary === folder.id,
          canRemove: primary !== folder.id // Pode remover apenas se não for a pasta primária
        } : null;
      }
    }).filter(Boolean);
    
    return res.json({ folders, primaryFolderId: primary });
  } catch (e) {
    console.error('Get folder details error:', e);
    res.status(500).json({ error: 'Erro ao carregar detalhes das pastas do documento' });
  }
});

// Set folders associated with a document (keeps current primary; adds/removes links for others)
router.post('/documents/:id/folders', authenticateToken, requireRole(['approver','admin']), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { folderIds } = req.body as { folderIds: string[] };
    if (!Array.isArray(folderIds)) return res.status(400).json({ error: 'folderIds inválido' });
    const doc: any = DocumentDB.byId(id);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });

    const unique = Array.from(new Set(folderIds.filter(Boolean)));
    // Validate all folders
    for (const fid of unique) {
      if (fid !== 'root' && !FolderDB.byId(fid)) return res.status(400).json({ error: `Pasta inválida: ${fid}` });
    }

    const primary = doc.folderId || 'root';
    const ensurePrimary = unique.includes(primary) ? unique : [primary, ...unique];
    // Only store links for non-primary
    const extras = ensurePrimary.filter((fid) => fid !== primary);

    DocumentFolderDB.clearLinks(id);
    for (const fid of extras) DocumentFolderDB.addLink(id, fid);

    // Touch doc lastModified
    const now = new Date().toISOString();
    DocumentDB.update({ ...doc, lastModified: now, lastModifiedBy: req.user?.email || 'system' });

    try { emitRealtime({ type: 'document:uploaded', payload: { documentId: id, folderId: primary } }); } catch {}
    return res.json({ success: true, folders: DocumentFolderDB.foldersForDocument(id) });
  } catch (e) {
    console.error('Set folders error:', e);
    return res.status(500).json({ error: 'Erro ao atualizar pastas do documento' });
  }
});

// Remove document from a specific folder
router.delete('/documents/:id/folders/:folderId', authenticateToken, requireRole(['approver','admin']), (req: Request, res: Response) => {
  try {
    const { id, folderId } = req.params;
    const doc: any = DocumentDB.byId(id);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });
    
    const primary = doc.folderId || 'root';
    
    // Não pode remover da pasta primária
    if (folderId === primary) {
      return res.status(400).json({ error: 'Não é possível remover o documento de sua pasta primária. Mova o documento para outra pasta primeiro.' });
    }
    
    // Remove o link da pasta
    DocumentFolderDB.removeLink(id, folderId);
    
    // Touch doc lastModified
    const now = new Date().toISOString();
    DocumentDB.update({ ...doc, lastModified: now, lastModifiedBy: req.user?.email || 'system' });
    
    try { emitRealtime({ type: 'document:uploaded', payload: { documentId: id, folderId: primary } }); } catch {}
    return res.json({ success: true, message: 'Documento removido da pasta com sucesso' });
  } catch (e) {
    console.error('Remove from folder error:', e);
    return res.status(500).json({ error: 'Erro ao remover documento da pasta' });
  }
});

// Create a deletion request (for users who cannot delete directly)
router.post('/documents/:id/request-delete', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document: any = DocumentDB.byId(id);
    if (!document) return res.status(404).json({ error: 'Documento não encontrado' });
    const requester = req.user?.email;
    if (!requester) return res.status(401).json({ error: 'Usuário não autenticado' });

    const isAdmin = !!req.user?.isAdmin;
    const isApproverOwner = req.user?.role === 'approver' && (document.owner === requester || document.createdBy === requester);
    if (isAdmin || isApproverOwner) {
      return res.status(400).json({ error: 'Você tem permissão para excluir diretamente este documento.' });
    }

    const existing = DeleteRequestDB.findPendingByDocAndRequester(id, requester);
    if (existing) {
      return res.json({ success: true, message: 'Solicitação já enviada e está pendente.' });
    }

    const ownerEmail = document.owner || document.createdBy;
    if (!ownerEmail) return res.status(400).json({ error: 'Documento sem proprietário definido para direcionar solicitação.' });

    const reqObj = {
      id: uuidv4(),
      documentId: id,
      requestedBy: requester,
      ownerEmail,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      decisionNotes: null,
      decidedAt: null,
    } as any;
    DeleteRequestDB.insert(reqObj);
    return res.json({ success: true, message: 'Solicitação de exclusão enviada ao proprietário.' });
  } catch (e) {
    console.error('request-delete error:', e);
    return res.status(500).json({ error: 'Erro ao criar solicitação de exclusão' });
  }
});

// Owner inbox: list pending deletion requests for documents the user owns
router.get('/delete-requests/inbox', authenticateToken, (req: Request, res: Response) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Usuário não autenticado' });
  const items = DeleteRequestDB.inboxForOwner(email);
  res.json({ success: true, requests: items });
});

// Requester outbox: list requests the user has sent
router.get('/delete-requests/sent', authenticateToken, (req: Request, res: Response) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Usuário não autenticado' });
  const items = DeleteRequestDB.sentByRequester(email);
  res.json({ success: true, requests: items });
});

// Owner decision: approve/reject a deletion request
router.post('/delete-requests/:requestId/:action', authenticateToken, requireRole(['approver','admin']), async (req: Request, res: Response) => {
  try {
    const { requestId, action } = req.params as any;
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: 'Usuário não autenticado' });
    const r: any = DeleteRequestDB.byId(requestId);
    if (!r) return res.status(404).json({ error: 'Solicitação não encontrada' });
    if (r.status !== 'pending') return res.status(400).json({ error: 'Solicitação já processada' });
    if (r.ownerEmail !== email && !req.user?.isAdmin) return res.status(403).json({ error: 'Apenas o proprietário ou admin pode decidir' });

    if (action === 'approve') {
      const doc: any = DocumentDB.byId(r.documentId);
      if (!doc) {
        DeleteRequestDB.updateStatus(requestId, 'rejected', 'Documento não encontrado para exclusão.');
        return res.status(404).json({ error: 'Documento não encontrado' });
      }
      const filePath = path.join(uploadsDir, doc.filename);
      
      try {
        // Delete main document file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Delete all archived versions
        try {
          const versions = VersionDB.byDocument(r.documentId) as any[];
          versions.forEach((version: any) => {
            const versionPath = path.join(uploadsDir, version.filename);
            if (fs.existsSync(versionPath)) {
              fs.unlinkSync(versionPath);
            }
            // Clean up folder structure for each version
            cleanupDocumentFolders(versionPath);
          });
          // Remove version entries from database
          VersionDB.deleteByDocument(r.documentId);
        } catch (versionError) {
          console.warn('Error deleting versions:', versionError);
        }

        // Clean up main document folder structure
        cleanupDocumentFolders(filePath);
      } catch (fileError) {
        console.warn('Error deleting files:', fileError);
      }

      removeDocumentFromFolders(r.documentId);
      DeleteRequestDB.updateStatus(requestId, 'approved');
      emitRealtime({ type: 'document:deleted', payload: { documentId: r.documentId } });
      return res.json({ success: true, message: 'Documento excluído e solicitação aprovada.' });
    } else {
      const notes = (req.body as any)?.notes;
      DeleteRequestDB.updateStatus(requestId, 'rejected', notes);
      return res.json({ success: true, message: 'Solicitação rejeitada.' });
    }
  } catch (e) {
    console.error('decision error:', e);
    return res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

export default router;
