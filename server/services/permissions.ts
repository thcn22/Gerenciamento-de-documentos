import { FolderDB, FolderPermissionDB, DocumentFolderDB } from './db';
import GroupsService from './groups';

type UserLike = { userId?: string; email?: string; isAdmin?: boolean; role?: string };

function levelOf(p: string) {
  switch (p) {
    case 'admin': return 3;
    case 'edit': return 2;
    case 'view': return 1;
    default: return 0;
  }
}

function sufficient(required: string, actual: string) {
  return levelOf(actual) >= levelOf(required);
}

// Check if user (or user's groups provided) has at least requiredPermission on folderId.
// This checks explicit folder_permissions for the folder, then walks up to parents (inheritance).
export async function checkFolderPermission(user: UserLike | undefined, folderId: string, requiredPermission: 'view' | 'edit' | 'admin'): Promise<boolean> {
  try {
    if (!user) return false;
    if (user.isAdmin) return true;

    const userId = user.userId;

    const seen = new Set<string>();
    let cur: string | null = folderId;
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      // Get explicit permissions for this folder
      const perms: any[] = FolderPermissionDB.allForFolder(cur) as any[];
      for (const p of perms) {
        if (p.subjectType === 'user' && p.identifier === user.email) {
          if (sufficient(requiredPermission, p.permission)) return true;
        }
        if (p.subjectType === 'user' && p.identifier === userId) {
          if (sufficient(requiredPermission, p.permission)) return true;
        }
        if (p.subjectType === 'group') {
          try {
            const g = GroupsService.getAll().find((x: any) => x.id === p.identifier);
            if (g && Array.isArray(g.members) && userId && g.members.includes(userId)) {
              if (sufficient(requiredPermission, p.permission)) return true;
            }
          } catch (e) {
            // ignore group lookup errors
          }
        }
      }

      // ascend to parent
      const f: any = FolderDB.byId(cur as any);
      if (!f || !f.parentId) break;
      cur = f.parentId === 'root' ? 'root' : f.parentId;
    }
    return false;
  } catch (e) {
    console.error('Error checking folder permission', e);
    return false;
  }
}

// For documents: document may be in multiple folders; succeed if any folder grants permission
export async function checkDocumentPermission(user: UserLike | undefined, documentId: string, requiredPermission: 'view' | 'edit' | 'admin'): Promise<boolean> {
  try {
    if (!user) return false;
    if (user.isAdmin) return true;
    const folderIds = DocumentFolderDB.foldersForDocument(documentId) as string[];
    for (const fid of folderIds) {
      const ok = await checkFolderPermission(user, fid, requiredPermission);
      if (ok) return true;
    }
    return false;
  } catch (e) {
    console.error('Error checking document permission', e);
    return false;
  }
}

export default { checkFolderPermission, checkDocumentPermission };
