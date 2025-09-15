import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

const dataDir = path.join(process.cwd(), 'data');
fs.ensureDirSync(dataDir);
const dbPath = path.join(dataDir, 'app.db');

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Schema
db.exec(`
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parentId TEXT,
  created TEXT NOT NULL,
  createdBy TEXT,
  lastModified TEXT NOT NULL,
  lastModifiedBy TEXT,
  color TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  originalName TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mimeType TEXT NOT NULL,
  uploadDate TEXT NOT NULL,
  owner TEXT,
  createdBy TEXT,
  lastModified TEXT,
  lastModifiedBy TEXT,
  folderId TEXT
);

-- Submissions for review/approval
CREATE TABLE IF NOT EXISTS document_submissions (
  id TEXT PRIMARY KEY,
  targetFolderId TEXT,
  replacesDocumentId TEXT,
  originalName TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mimeType TEXT NOT NULL,
  uploadedBy TEXT,
  uploadedAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  changeNotes TEXT,
  reviewNotes TEXT,
  reviewedBy TEXT,
  reviewedAt TEXT
);

-- Archived versions when a document is replaced on approval
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  documentId TEXT NOT NULL,
  version INTEGER NOT NULL,
  originalName TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mimeType TEXT NOT NULL,
  archivedAt TEXT NOT NULL,
  archivedBy TEXT
);

-- Deletion requests for documents
CREATE TABLE IF NOT EXISTS document_delete_requests (
  id TEXT PRIMARY KEY,
  documentId TEXT NOT NULL,
  requestedBy TEXT NOT NULL,
  ownerEmail TEXT NOT NULL,
  requestedAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  decisionNotes TEXT,
  decidedAt TEXT
);

-- Many-to-many mapping between documents and additional folders (besides the primary documents.folderId)
CREATE TABLE IF NOT EXISTS document_folders (
  documentId TEXT NOT NULL,
  folderId TEXT NOT NULL,
  PRIMARY KEY (documentId, folderId)
);
`);

// Ensure root folder
const rootExists = db.prepare('SELECT 1 FROM folders WHERE id = ?').get('root');
if (!rootExists) {
  db.prepare(`INSERT INTO folders (id, name, parentId, created, createdBy, lastModified, lastModifiedBy, color, description)
    VALUES (@id, @name, @parentId, @created, @createdBy, @lastModified, @lastModifiedBy, @color, @description)`).run({
      id: 'root',
      name: 'Documentos',
      parentId: null,
      created: new Date().toISOString(),
      createdBy: 'system',
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'system',
      color: '#3b82f6',
      description: null,
    });
}

// Folder helpers
export const FolderDB = {
  all: () => db.prepare('SELECT * FROM folders').all(),
  byId: (id: string) => db.prepare('SELECT * FROM folders WHERE id = ?').get(id),
  subfolders: (parentId: string | null) => {
    if (parentId === null) {
      return db.prepare('SELECT * FROM folders WHERE parentId IS NULL').all();
    }
    return db.prepare('SELECT * FROM folders WHERE parentId = ?').all(parentId);
  },
  insert: (folder: any) => db.prepare(`INSERT INTO folders (id, name, parentId, created, createdBy, lastModified, lastModifiedBy, color, description)
    VALUES (@id, @name, @parentId, @created, @createdBy, @lastModified, @lastModifiedBy, @color, @description)`).run(folder),
  update: (folder: any) => db.prepare(`UPDATE folders SET name=@name, color=@color, description=@description, lastModified=@lastModified, lastModifiedBy=@lastModifiedBy WHERE id=@id`).run(folder),
  move: (id: string, newParentId: string | null) => db.prepare(`UPDATE folders SET parentId = @newParentId WHERE id = @id`).run({ id, newParentId }),
  remove: (id: string) => db.prepare('DELETE FROM folders WHERE id = ?').run(id),
  hasChildren: (id: string) => db.prepare('SELECT 1 FROM folders WHERE parentId = ? LIMIT 1').get(id),
};

// Additional mapping helpers
export const DocumentFolderDB = {
  foldersForDocument: (documentId: string): string[] => {
    const doc = db.prepare('SELECT folderId FROM documents WHERE id = ?').get(documentId) as any;
    const primary = doc?.folderId || 'root';
    const links = db.prepare('SELECT folderId FROM document_folders WHERE documentId = ?').all(documentId) as any[];
    const ids = new Set<string>([primary]);
    for (const r of links) ids.add(r.folderId);
    return Array.from(ids);
  },
  addLink: (documentId: string, folderId: string) => db.prepare('INSERT OR IGNORE INTO document_folders (documentId, folderId) VALUES (?, ?)').run(documentId, folderId),
  removeLink: (documentId: string, folderId: string) => db.prepare('DELETE FROM document_folders WHERE documentId = ? AND folderId = ?').run(documentId, folderId),
  clearLinks: (documentId: string) => db.prepare('DELETE FROM document_folders WHERE documentId = ?').run(documentId),
};

// Document helpers
export const DocumentDB = {
  all: () => db.prepare('SELECT * FROM documents').all(),
  byId: (id: string) => db.prepare('SELECT * FROM documents WHERE id = ?').get(id),
  byFolder: (folderId: string) => db.prepare(`
    SELECT DISTINCT d.* FROM documents d
    WHERE d.folderId = ?
       OR d.id IN (SELECT documentId FROM document_folders WHERE folderId = ?)
  `).all(folderId, folderId),
  insert: (doc: any) => db.prepare(`INSERT INTO documents (id, originalName, filename, size, mimeType, uploadDate, owner, createdBy, lastModified, lastModifiedBy, folderId)
    VALUES (@id, @originalName, @filename, @size, @mimeType, @uploadDate, @owner, @createdBy, @lastModified, @lastModifiedBy, @folderId)`).run(doc),
  update: (doc: any) => db.prepare(`UPDATE documents SET originalName=@originalName, filename=@filename, size=@size, mimeType=@mimeType, uploadDate=@uploadDate, owner=@owner, createdBy=@createdBy, lastModified=@lastModified, lastModifiedBy=@lastModifiedBy, folderId=@folderId WHERE id=@id`).run(doc),
  move: (id: string, folderId: string | null) => db.prepare('UPDATE documents SET folderId = ? WHERE id = ?').run(folderId, id),
  remove: (id: string) => db.prepare('DELETE FROM documents WHERE id = ?').run(id),
};

// Submissions helpers
export const SubmissionDB = {
  allPending: () => db.prepare("SELECT * FROM document_submissions WHERE status = 'pending' ORDER BY uploadedAt ASC").all(),
  byId: (id: string) => db.prepare('SELECT * FROM document_submissions WHERE id = ?').get(id),
  insert: (s: any) => db.prepare(`INSERT INTO document_submissions (id, targetFolderId, replacesDocumentId, originalName, filename, size, mimeType, uploadedBy, uploadedAt, status, changeNotes, reviewNotes, reviewedBy, reviewedAt)
    VALUES (@id, @targetFolderId, @replacesDocumentId, @originalName, @filename, @size, @mimeType, @uploadedBy, @uploadedAt, @status, @changeNotes, @reviewNotes, @reviewedBy, @reviewedAt)`).run(s),
  update: (s: any) => db.prepare(`UPDATE document_submissions SET status=@status, reviewNotes=@reviewNotes, reviewedBy=@reviewedBy, reviewedAt=@reviewedAt WHERE id=@id`).run(s),
  remove: (id: string) => db.prepare('DELETE FROM document_submissions WHERE id = ?').run(id),
};

// Migration: ensure changeNotes column exists in document_submissions (for older DBs)
try {
  const cols: Array<{ name: string }> = db.prepare("PRAGMA table_info(document_submissions)").all() as any;
  if (!cols.find(c => c.name === 'changeNotes')) {
    db.prepare('ALTER TABLE document_submissions ADD COLUMN changeNotes TEXT').run();
  }
} catch (e) {
  console.warn('Could not ensure changeNotes column:', e);
}

// Versions helpers
export const VersionDB = {
  byDocument: (documentId: string) => db.prepare('SELECT * FROM document_versions WHERE documentId = ? ORDER BY version DESC').all(documentId),
  insert: (v: any) => db.prepare(`INSERT INTO document_versions (id, documentId, version, originalName, filename, size, mimeType, archivedAt, archivedBy)
    VALUES (@id, @documentId, @version, @originalName, @filename, @size, @mimeType, @archivedAt, @archivedBy)`).run(v),
  maxVersion: (documentId: string) => db.prepare('SELECT MAX(version) as maxVersion FROM document_versions WHERE documentId = ?').get(documentId) as { maxVersion: number } | undefined,
  deleteByDocument: (documentId: string) => db.prepare('DELETE FROM document_versions WHERE documentId = ?').run(documentId),
};

// Deletion Requests helpers
export const DeleteRequestDB = {
  byId: (id: string) => db.prepare('SELECT * FROM document_delete_requests WHERE id = ?').get(id),
  findPendingByDocAndRequester: (documentId: string, requestedBy: string) => db.prepare("SELECT * FROM document_delete_requests WHERE documentId = ? AND requestedBy = ? AND status = 'pending'").get(documentId, requestedBy),
  inboxForOwner: (ownerEmail: string) => db.prepare('SELECT * FROM document_delete_requests WHERE ownerEmail = ? AND status = \"pending\" ORDER BY requestedAt ASC').all(ownerEmail),
  sentByRequester: (requestedBy: string) => db.prepare('SELECT * FROM document_delete_requests WHERE requestedBy = ? ORDER BY requestedAt DESC').all(requestedBy),
  insert: (r: any) => db.prepare(`INSERT INTO document_delete_requests (id, documentId, requestedBy, ownerEmail, requestedAt, status, decisionNotes, decidedAt)
    VALUES (@id, @documentId, @requestedBy, @ownerEmail, @requestedAt, @status, @decisionNotes, @decidedAt)`).run(r),
  updateStatus: (id: string, status: 'approved' | 'rejected', decisionNotes?: string) => db.prepare('UPDATE document_delete_requests SET status=@status, decisionNotes=@decisionNotes, decidedAt=@decidedAt WHERE id=@id').run({ id, status, decisionNotes: decisionNotes ?? null, decidedAt: new Date().toISOString() }),
};
