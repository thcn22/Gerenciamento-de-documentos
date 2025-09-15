import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { authenticateToken, requireAdmin, requireRole } from "../middleware/auth";
import { FolderDB, DocumentDB, DocumentFolderDB } from "../services/db";
import { emitRealtime } from "../services/realtime";

const router = Router();

// Data now persisted via SQLite (see services/db.ts)

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  created: string;
  createdBy?: string;
  lastModified: string;
  lastModifiedBy?: string;
  color?: string | null;
  description?: string | null;
};

// Get all folders
router.get("/", authenticateToken, (req: Request, res: Response) => {
  try {
    // Build folder hierarchy
  const allFolders = FolderDB.all();
  const buildHierarchy = (parentId: string | null | string = 'root'): any[] => {
      return allFolders
        .filter((folder: any) => folder.parentId === parentId)
        .map((folder: any) => ({
          ...folder,
          children: buildHierarchy(folder.id),
          documentCount: (DocumentDB.byFolder(folder.id) as any[]).length,
        }));
    };

  const hierarchy = buildHierarchy('root');
    res.json({ folders: hierarchy });
  } catch (error) {
    console.error("Error getting folders:", error);
    res.status(500).json({ error: "Erro ao carregar pastas" });
  }
});

// Create new folder
router.post("/", authenticateToken, requireRole(['reviewer','approver','admin']), (req: Request, res: Response) => {
  try {
    const { name, parentId, color, description } = req.body;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (!name) {
      return res.status(400).json({ error: "Nome da pasta é obrigatório" });
    }

    // Check if parent exists (if specified)
  if (parentId && parentId !== "root" && !FolderDB.byId(parentId)) {
      return res.status(400).json({ error: "Pasta pai não encontrada" });
    }

    const now = new Date().toISOString();
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      parentId: parentId || "root",
      created: now,
      createdBy: userEmail || "unknown",
      lastModified: now,
      lastModifiedBy: userEmail || "unknown",
      color: color || "#6b7280",
      description,
    };

  FolderDB.insert(newFolder);
  // Broadcast creation
  emitRealtime({ type: 'folder:created', payload: { folderId: newFolder.id, parentId: newFolder.parentId } });

    res.json({
      message: "Pasta criada com sucesso",
      folder: newFolder,
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ error: "Erro ao criar pasta" });
  }
});

// Update folder
router.put("/:id", authenticateToken, requireRole(['reviewer','approver','admin']), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, description } = req.body;
    const userEmail = req.user?.email;

  const existing = FolderDB.byId(id) as unknown as Folder | undefined;
  if (!existing) {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }

    // Don't allow updating root folder name
    if (id === "root" && name) {
      return res
        .status(400)
        .json({ error: "Não é possível renomear a pasta raiz" });
    }

    const updated: Folder = {
      id: existing.id,
      name: name ?? existing.name,
      parentId: existing.parentId,
      created: existing.created,
      createdBy: existing.createdBy,
      lastModified: new Date().toISOString(),
      lastModifiedBy: userEmail || 'unknown',
      color: color ?? existing.color ?? null,
      description: description !== undefined ? description : existing.description ?? null,
    };
    FolderDB.update(updated);
  res.json({ message: 'Pasta atualizada com sucesso', folder: updated });
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).json({ error: "Erro ao atualizar pasta" });
  }
});

// Delete folder (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Don't allow deleting root folder
      if (id === "root") {
        return res
          .status(400)
          .json({ error: "Não é possível excluir a pasta raiz" });
      }

      const existing = FolderDB.byId(id) as any;
  if (!existing) {
        return res.status(404).json({ error: "Pasta não encontrada" });
      }

      // Permission: admin can delete; approver can delete only folders they created
      const isAdmin = !!req.user?.isAdmin;
      const isApprover = req.user?.role === 'approver';
      const userEmail = req.user?.email;
      if (!isAdmin) {
        if (!(isApprover && existing?.createdBy && existing.createdBy === userEmail)) {
          return res.status(403).json({ error: 'Apenas administradores podem excluir ou o aprovador que criou a pasta.' });
        }
      }

      // Check if folder has subfolders
  const hasSubfolders = !!FolderDB.hasChildren(id);
      if (hasSubfolders) {
        return res
          .status(400)
          .json({ error: "Não é possível excluir pasta que contém subpastas" });
      }

    // For documents whose primary is this folder, move to root; also remove link rows for this folder
  (DocumentDB.byFolder(id) as any[]).forEach((doc: any) => {
    const d = DocumentDB.byId(doc.id) as any;
    if (d?.folderId === id) {
      DocumentDB.move(doc.id, 'root');
    }
    try { DocumentFolderDB.removeLink(doc.id, id); } catch {}
  });
  FolderDB.remove(id);
  // Broadcast deletion
  emitRealtime({ type: 'folder:deleted', payload: { folderId: id } });

      res.json({ message: "Pasta excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ error: "Erro ao excluir pasta" });
    }
  },
);

// Get folder contents
router.get("/:id/contents", authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if folder exists
  if (id !== "root" && !FolderDB.byId(id)) {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }

    // Get subfolders
  const subfolders = FolderDB.subfolders(id);

    // Get documents in this folder
  const documents = DocumentDB.byFolder(id);

    res.json({
  folder: FolderDB.byId(id) || {
        id: "root",
        name: "Documentos",
      },
      subfolders,
      documents,
    });
  } catch (error) {
    console.error("Error getting folder contents:", error);
    res.status(500).json({ error: "Erro ao carregar conteúdo da pasta" });
  }
});

// Move document to folder
router.post("/move-document", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { documentId, folderId } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: "ID do documento é obrigatório" });
    }

    // Check if folder exists (if specified)
  if (folderId && folderId !== "root" && !FolderDB.byId(folderId)) {
      return res.status(400).json({ error: "Pasta de destino não encontrada" });
    }

    // Find document in storage
  const existing = DocumentDB.byId(documentId);
  if (!existing) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

  DocumentDB.move(documentId, folderId || 'root');

    res.json({ message: "Documento movido com sucesso" });
  } catch (error) {
    console.error("Error moving document:", error);
    res.status(500).json({ error: "Erro ao mover documento" });
  }
});

// Move folder
router.post("/move-folder", authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { folderId, newParentId } = req.body;

    if (!folderId || folderId === "root") {
      return res
        .status(400)
        .json({ error: "Não �� possível mover a pasta raiz" });
    }

    // Check if source folder exists
  const existing = FolderDB.byId(folderId);
  if (!existing) {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }

    // Check if destination exists
    if (
      newParentId &&
      newParentId !== "root" &&
      !FolderDB.byId(newParentId)
    ) {
      return res.status(400).json({ error: "Pasta de destino não encontrada" });
    }

    // Prevent moving folder into itself or its children
    const isDescendant = (checkId: string, ancestorId: string): boolean => {
      if (checkId === ancestorId) return true;
      const folder: any = FolderDB.byId(checkId);
      if (!folder || !folder.parentId) return false;
      return isDescendant(folder.parentId, ancestorId);
    };

    if (newParentId && isDescendant(newParentId, folderId)) {
      return res
        .status(400)
        .json({ error: "Não é possível mover pasta para dentro de si mesma" });
    }

  FolderDB.move(folderId, newParentId || 'root');
  // Broadcast move
  emitRealtime({ type: 'folder:moved', payload: { folderId, newParentId: newParentId || 'root' } });

    res.json({ message: "Pasta movida com sucesso" });
  } catch (error) {
    console.error("Error moving folder:", error);
    res.status(500).json({ error: "Erro ao mover pasta" });
  }
});

// Duplicate folder (copy) recursively
router.post("/:id/duplicate", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetParentId } = req.body;

    if (!id || id === 'root') return res.status(400).json({ error: 'Não é possível duplicar a pasta raiz' });

    const source = FolderDB.byId(id) as any;
    if (!source) return res.status(404).json({ error: 'Pasta não encontrada' });

    // Check target parent
    const parentId = targetParentId || source.parentId || 'root';
    if (parentId !== 'root' && !FolderDB.byId(parentId)) return res.status(400).json({ error: 'Pasta de destino não encontrada' });

    // Map oldId -> newId
    const idMap: Record<string, string> = {};

  const createdEvents: Array<{ folderId: string; parentId: string | null }> = [];
  const cloneFolderRecursive = (folderId: string, newParentId: string | null, isRootClone = false) => {
      const f: any = FolderDB.byId(folderId);
      const now = new Date().toISOString();
      const newId = uuidv4();
      idMap[folderId] = newId;
      // Determine folder name: only append ' (cópia)' to top-level clone when a sibling with same name exists
      const destParentId = newParentId || 'root';
      let folderName = f.name;
      if (isRootClone) {
        const siblings = FolderDB.subfolders(destParentId);
        const nameCollision = siblings.some((s: any) => s.name === f.name);
        if (nameCollision) folderName = f.name + ' (cópia)';
      }

      const newFolder = {
        id: newId,
        name: folderName,
        parentId: destParentId,
        created: now,
        createdBy: req.user?.email || 'system',
        lastModified: now,
        lastModifiedBy: req.user?.email || 'system',
        color: f.color || '#6b7280',
        description: f.description || null,
      };
      FolderDB.insert(newFolder);
  createdEvents.push({ folderId: newId, parentId: newFolder.parentId || 'root' });

      // Clone documents
      const docs = DocumentDB.byFolder(folderId);
      docs.forEach((doc: any) => {
        const newDocId = uuidv4();
        const ext = path.extname(doc.filename) || '';
        const newFilename = `${uuidv4()}${ext}`;
        const uploadsDir = path.join(process.cwd(), 'uploads');
        fs.ensureDirSync(uploadsDir);
        try {
          fs.copySync(path.join(uploadsDir, doc.filename), path.join(uploadsDir, newFilename));
        } catch (e) {
          console.warn('Could not copy file:', doc.filename, e);
        }
        const nowDoc = new Date().toISOString();
        DocumentDB.insert({
          id: newDocId,
          originalName: doc.originalName,
          filename: newFilename,
          size: doc.size,
          mimeType: doc.mimeType,
          uploadDate: nowDoc,
          owner: doc.owner,
          createdBy: req.user?.email || 'system',
          lastModified: nowDoc,
          lastModifiedBy: req.user?.email || 'system',
          folderId: newId,
        });
      });

      // Recurse into children
      const children = FolderDB.subfolders(folderId || 'root');
      children.forEach((child: any) => cloneFolderRecursive(child.id, newId, false));
    };

    // Start clone: mark top-level clone so it receives the ' (cópia)' suffix
    cloneFolderRecursive(id, parentId || 'root', true);

  // Emit creation events for new folders
  createdEvents.forEach((ev) => emitRealtime({ type: 'folder:created', payload: { folderId: ev.folderId, parentId: ev.parentId } }));

    res.json({ message: 'Pasta duplicada com sucesso', mapping: idMap });
  } catch (error) {
    console.error('Error duplicating folder:', error);
    res.status(500).json({ error: 'Erro ao duplicar pasta' });
  }
});

// Sync documents with folder system (called by files route)
export const syncDocumentWithFolders = (document: any) => {
  const existing = DocumentDB.byId(document.id);
  if (!existing) {
    const now = new Date().toISOString();
    DocumentDB.insert({
      ...document,
      folderId: 'root',
      createdBy: document.owner || 'unknown',
      lastModified: document.uploadDate || now,
      lastModifiedBy: document.owner || 'unknown',
    });
  }
};

// Remove document from folder system
export const removeDocumentFromFolders = (documentId: string) => {
  try { DocumentFolderDB.clearLinks(documentId); } catch {}
  DocumentDB.remove(documentId);
};

// Get documents in folder for other routes
export const getDocumentsInFolder = (folderId: string) => {
  return DocumentDB.byFolder(folderId);
};

export default router;
