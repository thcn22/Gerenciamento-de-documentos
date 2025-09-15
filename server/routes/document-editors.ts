import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { syncDocumentWithFolders, removeDocumentFromFolders } from './folders';
import { DocumentDB, VersionDB } from '../services/db';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
fs.ensureDirSync(uploadsDir);
function normalizeStr(name: string): string {
  try {
    if (name.includes('Ã') || name.includes('�')) {
      return Buffer.from(name, 'latin1').toString('utf8');
    }
    return name;
  } catch { return name; }
}

// Persist metadata via DocumentDB

// TEXT DOCUMENT ROUTES
// Create text document
router.post('/text', authenticateToken, requireRole(['reviewer','approver','admin']), async (req: Request, res: Response) => {
  try {
    const { title, content, html, text, folderId } = req.body;
    
    const filename = `${uuidv4()}.json`;
    const filePath = path.join(uploadsDir, filename);
    
    const documentData = {
      title: title || 'Novo Documento',
      content, // Quill Delta format
      html,    // HTML representation
      text,    // Plain text
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      type: 'text-document'
    };
    
    // Save document data
    fs.writeFileSync(filePath, JSON.stringify(documentData, null, 2));
    
    const documentMetadata = {
      id: path.basename(filename, '.json'),
  originalName: `${normalizeStr(title || 'Novo Documento')}.html`,
      filename: filename,
      size: Buffer.byteLength(JSON.stringify(documentData)),
      mimeType: 'text/html',
      uploadDate: new Date().toISOString(),
      owner: req.user?.email || 'unknown',
      folderId: folderId || 'root',
      editorType: 'text'
    };
    
    syncDocumentWithFolders(documentMetadata);
    
    res.json({
      message: 'Documento de texto criado com sucesso',
      document: documentMetadata
    });
    
  } catch (error) {
    console.error('Text document creation error:', error);
    res.status(500).json({ error: 'Erro ao criar documento de texto' });
  }
});

// Update text document
router.put('/text/:id', authenticateToken, requireRole(['reviewer','approver','admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, html, text } = req.body;
    
    const filename = `${id}.json`;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const updatedData = {
      ...existingData,
      title: title || existingData.title,
      content: content || existingData.content,
      html: html || existingData.html,
      text: text || existingData.text,
      modified: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    
    // Update metadata
    // Update metadata size/name if present in DB (optional)
    const existing: any = DocumentDB.byId(id);
    if (existing) {
      existing.originalName = `${title || 'Documento'}.html`;
      existing.size = Buffer.byteLength(JSON.stringify(updatedData));
      DocumentDB.update(existing);
    }
    
    res.json({ message: 'Documento atualizado com sucesso' });
    
  } catch (error) {
    console.error('Text document update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
});

// SPREADSHEET ROUTES
// Create spreadsheet
router.post('/spreadsheet', authenticateToken, requireRole(['reviewer','approver','admin']), async (req: Request, res: Response) => {
  try {
    const { title, sheets, folderId } = req.body;
    
    const filename = `${uuidv4()}.json`;
    const filePath = path.join(uploadsDir, filename);
    
    const documentData = {
      title: title || 'Nova Planilha',
      sheets: sheets || [],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      type: 'spreadsheet'
    };
    
    fs.writeFileSync(filePath, JSON.stringify(documentData, null, 2));
    
    const documentMetadata = {
      id: path.basename(filename, '.json'),
  originalName: `${normalizeStr(title || 'Nova Planilha')}.xlsx`,
      filename: filename,
      size: Buffer.byteLength(JSON.stringify(documentData)),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploadDate: new Date().toISOString(),
      owner: req.user?.email || 'unknown',
      folderId: folderId || 'root',
      editorType: 'spreadsheet'
    };
    
    syncDocumentWithFolders(documentMetadata);
    
    res.json({
      message: 'Planilha criada com sucesso',
      document: documentMetadata
    });
    
  } catch (error) {
    console.error('Spreadsheet creation error:', error);
    res.status(500).json({ error: 'Erro ao criar planilha' });
  }
});

// Update spreadsheet
router.put('/spreadsheet/:id', authenticateToken, requireRole(['reviewer','approver','admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, sheets } = req.body;
    
    const filename = `${id}.json`;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Planilha não encontrada' });
    }
    
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const updatedData = {
      ...existingData,
      title: title || existingData.title,
      sheets: sheets || existingData.sheets,
      modified: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    
    // Update metadata
    const existing: any = DocumentDB.byId(id);
    if (existing) {
      existing.originalName = `${title || 'Planilha'}.xlsx`;
      existing.size = Buffer.byteLength(JSON.stringify(updatedData));
      DocumentDB.update(existing);
    }
    
    res.json({ message: 'Planilha atualizada com sucesso' });
    
  } catch (error) {
    console.error('Spreadsheet update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar planilha' });
  }
});

// PRESENTATION ROUTES
// Create presentation
router.post('/presentation', authenticateToken, requireRole(['reviewer','approver','admin']), async (req: Request, res: Response) => {
  try {
    const { title, slides, folderId } = req.body;
    
    const filename = `${uuidv4()}.json`;
    const filePath = path.join(uploadsDir, filename);
    
    const documentData = {
      title: title || 'Nova Apresentação',
      slides: slides || [],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      type: 'presentation'
    };
    
    fs.writeFileSync(filePath, JSON.stringify(documentData, null, 2));
    
    const documentMetadata = {
      id: path.basename(filename, '.json'),
  originalName: `${normalizeStr(title || 'Nova Apresentação')}.html`,
      filename: filename,
      size: Buffer.byteLength(JSON.stringify(documentData)),
      mimeType: 'text/html',
      uploadDate: new Date().toISOString(),
      owner: req.user?.email || 'unknown',
      folderId: folderId || 'root',
      editorType: 'presentation'
    };
    
    syncDocumentWithFolders(documentMetadata);
    
    res.json({
      message: 'Apresentação criada com sucesso',
      document: documentMetadata
    });
    
  } catch (error) {
    console.error('Presentation creation error:', error);
    res.status(500).json({ error: 'Erro ao criar apresentação' });
  }
});

// Update presentation
router.put('/presentation/:id', authenticateToken, requireRole(['reviewer','approver','admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slides } = req.body;
    
    const filename = `${id}.json`;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Apresentação não encontrada' });
    }
    
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const updatedData = {
      ...existingData,
      title: title || existingData.title,
      slides: slides || existingData.slides,
      modified: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    
    // Update metadata
    const existing: any = DocumentDB.byId(id);
    if (existing) {
      existing.originalName = `${title || 'Apresentação'}.html`;
      existing.size = Buffer.byteLength(JSON.stringify(updatedData));
      DocumentDB.update(existing);
    }
    
    res.json({ message: 'Apresentação atualizada com sucesso' });
    
  } catch (error) {
    console.error('Presentation update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar apresentação' });
  }
});

// GENERAL ROUTES
// Get document data for editing
router.get('/:type/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    
    const filename = `${id}.json`;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    const documentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json({ document: documentData });
    
  } catch (error) {
    console.error('Document load error:', error);
    res.status(500).json({ error: 'Erro ao carregar documento' });
  }
});

// Delete document
router.delete('/:type/:id', authenticateToken, requireRole(['approver','admin']), async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    
    const filename = `${id}.json`;
    const filePath = path.join(uploadsDir, filename);
    
    // Delete the main JSON file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete all archived versions from VersionDB if they exist
    try {
      const versions = VersionDB.byDocument(id) as any[];
      versions.forEach((version: any) => {
        const versionPath = path.join(uploadsDir, version.filename);
        if (fs.existsSync(versionPath)) {
          fs.unlinkSync(versionPath);
        }
      });
      // Remove version entries from database
      VersionDB.deleteByDocument(id);
    } catch (versionError) {
      console.warn('Error deleting versions for editor document:', versionError);
    }
    
    // Remove metadata from DB
    DocumentDB.remove(id);
    
    removeDocumentFromFolders(id);
    
    res.json({ message: 'Documento excluído com sucesso' });
    
  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir documento' });
  }
});

// Get all web documents
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const docs = DocumentDB.all();
  res.json({ documents: docs });
});

export default router;
