import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Users, X } from "lucide-react";
import { useAuthenticatedFetch } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type SharedEntry = {
  id: string;
  kind: 'user' | 'group';
  name: string;
  email?: string;
  permission: "view" | "edit" | "admin";
  groupId?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  folderName?: string;
  initialSharedUsers?: SharedEntry[];
}

export default function AccessControlModal({ isOpen, onClose, folderId, folderName, initialSharedUsers = [] }: Props) {
  const authenticatedFetch = useAuthenticatedFetch();
  const [sharedUsers, setSharedUsers] = useState<SharedEntry[]>(initialSharedUsers);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPermission, setNewUserPermission] = useState<"view" | "edit" | "admin">("view");
  const [addKind, setAddKind] = useState<'user' | 'group'>('user');
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [applyToChildren, setApplyToChildren] = useState<boolean>(false);

  useEffect(() => {
    // Reset when opening
    setSharedUsers(initialSharedUsers);
    setNewUserEmail("");
    setNewUserPermission("view");
    setAddKind('user');
    setSelectedGroupId(null);

    // load groups for group selection first, then fetch saved permissions
    (async () => {
      try {
        // fetch groups
        const res = await authenticatedFetch('/api/groups');
        let fetchedGroups: Array<{ id: string; name: string }> = [];
        if (!res.ok) {
          fetchedGroups = [];
          setGroups([]);
        } else {
          const json = await res.json();
          if (Array.isArray(json)) {
            fetchedGroups = json.map((g: any) => ({ id: g.id, name: g.name }));
            setGroups(fetchedGroups);
          } else if (json && json.success && Array.isArray(json.groups)) {
            fetchedGroups = json.groups.map((g: any) => ({ id: g.id, name: g.name }));
            setGroups(fetchedGroups);
          }
        }

        // then fetch existing permissions for folder
        const r = await authenticatedFetch(`/api/folders/${folderId}/access`);
        if (!r.ok) return;
        const payload = await r.json();
        if (payload && payload.success && Array.isArray(payload.permissions)) {
          // Map permissions to SharedEntry shape, using group names when available
          const mapped: SharedEntry[] = payload.permissions.map((p: any) => {
            if (p.subjectType === 'group') {
              const g = fetchedGroups.find((x: any) => x.id === p.identifier);
              const groupName = g?.name || String(p.identifier);
              return {
                id: p.id,
                kind: 'group',
                name: groupName,
                permission: p.permission,
                groupId: p.identifier,
              } as SharedEntry;
            }
            return {
              id: p.id,
              kind: 'user',
              name: p.identifier?.split?.('@')?.[0] ?? String(p.identifier),
              email: p.identifier,
              permission: p.permission,
            } as SharedEntry;
          });
          setSharedUsers(mapped);
        }
      } catch (e) {
        // ignore network errors — groups/permissions remain empty
        setGroups([]);
      }
    })();
  }, [isOpen, initialSharedUsers]);

  // Ideally this would call an API like `/api/folders/:id/access` but backend may not exist.
  // For now operate on local state and attempt a best-effort API call when available.

  const addUser = async () => {
    if (addKind === 'user') {
      if (!newUserEmail.trim()) return;
      // prevent duplicate by email
      if (sharedUsers.find(s => s.kind === 'user' && s.email === newUserEmail)) {
        toast({ title: 'Atenção', description: 'Este usuário já possui uma permissão nesta pasta.' });
        return;
      }

      const tempId = `tmp-${Date.now()}`;
      const newUser: SharedEntry = {
        id: tempId,
        kind: 'user',
        name: newUserEmail.split("@")[0],
        email: newUserEmail,
        permission: newUserPermission,
      };

      // optimistic UI
      setSharedUsers((prev) => [...prev, newUser]);
      setNewUserEmail("");
      setNewUserPermission("view");

      try {
        const resp = await authenticatedFetch(`/api/folders/${folderId}/access`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectType: 'user', identifier: newUser.email, permission: newUser.permission, applyToChildren }),
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Erro ao salvar permissão');
        }
        const body = await resp.json();
        if (body && body.success && body.id) {
          // replace temp id with real id
          setSharedUsers(prev => prev.map(p => p.id === tempId ? { ...p, id: body.id } : p));
          toast({ title: 'Sucesso', description: 'Permissão adicionada' });
        } else {
          throw new Error('Resposta inválida do servidor');
        }
      } catch (e: any) {
        // revert optimistic
        setSharedUsers(prev => prev.filter(p => p.id !== tempId));
        console.warn("failed to persist access change", e);
        toast({ title: 'Erro', description: e?.message || 'Não foi possível salvar a permissão' });
      }
    } else {
      // group
      if (!selectedGroupId) return;
      const group = groups.find(g => g.id === selectedGroupId);
      if (!group) return;
      const newEntry: SharedEntry = {
        id: `group-${group.id}-${Date.now()}`,
        kind: 'group',
        name: group.name,
        permission: newUserPermission,
        groupId: group.id,
      };

      // prevent duplicate group
      if (sharedUsers.find(s => s.kind === 'group' && s.groupId === group.id)) {
        toast({ title: 'Atenção', description: 'Este grupo já possui uma permissão nesta pasta.' });
        return;
      }

      const tempId = `tmp-group-${group.id}-${Date.now()}`;
      const newGroupEntry: SharedEntry = {
        id: tempId,
        kind: 'group',
        name: group.name,
        permission: newUserPermission,
        groupId: group.id,
      };

      setSharedUsers(prev => [...prev, newGroupEntry]);
      setSelectedGroupId(null);
      setNewUserPermission('view');

      try {
        const resp = await authenticatedFetch(`/api/folders/${folderId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectType: 'group', identifier: group.id, permission: newEntry.permission, applyToChildren }),
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Erro ao salvar permissão');
        }
        const body = await resp.json();
        if (body && body.success && body.id) {
          setSharedUsers(prev => prev.map(p => p.id === tempId ? { ...p, id: body.id } : p));
          toast({ title: 'Sucesso', description: 'Permissão adicionada ao grupo' });
        } else {
          throw new Error('Resposta inválida do servidor');
        }
      } catch (e: any) {
    setSharedUsers(prev => prev.filter(p => p.id !== tempId));
        console.warn('failed to persist group access change', e);
        toast({ title: 'Erro', description: e?.message || 'Não foi possível salvar a permissão do grupo' });
      }
    }
  };

  const removeUser = async (entryId: string) => {
    const entry = sharedUsers.find(u => u.id === entryId);
    if (!entry) return;
    // optimistic remove but keep backup
    const backup = sharedUsers;
    setSharedUsers((prev) => prev.filter((u) => u.id !== entryId));
    try {
      const resp = await authenticatedFetch(`/api/folders/${folderId}/access`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectType: entry.kind === 'group' ? 'group' : 'user', identifier: entry.kind === 'group' ? entry.groupId : entry.email, applyToChildren }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao remover permissão');
      }
      const b = await resp.json().catch(() => null);
      if (b && b.success) {
        toast({ title: 'Sucesso', description: 'Permissão removida' });
      }
    } catch (e: any) {
      // revert
      setSharedUsers(backup);
      console.warn("failed to persist remove", e);
      toast({ title: 'Erro', description: e?.message || 'Não foi possível remover a permissão' });
    }
  };

  const updateUserPermission = async (entryId: string, permission: "view" | "edit" | "admin") => {
    const entry = sharedUsers.find(u => u.id === entryId);
    if (!entry) return;
    const backup = sharedUsers;
    setSharedUsers((prev) => prev.map((u) => (u.id === entryId ? { ...u, permission } : u)));
    try {
      const resp = await authenticatedFetch(`/api/folders/${folderId}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectType: entry.kind === 'group' ? 'group' : 'user', identifier: entry.kind === 'group' ? entry.groupId : entry.email, permission, applyToChildren }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao atualizar permissão');
      }
      const b = await resp.json().catch(() => null);
      if (b && b.success) {
        toast({ title: 'Sucesso', description: 'Permissão atualizada' });
      }
    } catch (e: any) {
      // revert
      setSharedUsers(backup);
      console.warn("failed to persist permission change", e);
      toast({ title: 'Erro', description: e?.message || 'Não foi possível atualizar a permissão' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Acesso{folderName ? ` — ${folderName}` : ''}</DialogTitle>
          <DialogDescription>Controle quem pode ver, editar ou administrar esta pasta</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2 items-center">
            <Select value={addKind} onValueChange={(v: any) => setAddKind(v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="group">Grupo</SelectItem>
              </SelectContent>
            </Select>

            {addKind === 'user' ? (
              <div className="flex-1">
                <Input placeholder="Digite o email do usuário" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
              </div>
            ) : (
              <div className="flex-1">
                <Select value={selectedGroupId ?? ''} onValueChange={(v: any) => setSelectedGroupId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectedGroupId ? (groups.find(g => g.id === selectedGroupId)?.name) : 'Selecione um grupo'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Select value={newUserPermission} onValueChange={(v: any) => setNewUserPermission(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Ver</SelectItem>
                <SelectItem value="edit">Editar</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addUser}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <input id="applyChildren" type="checkbox" checked={applyToChildren} onChange={(e) => setApplyToChildren(e.target.checked)} />
            <label htmlFor="applyChildren" className="text-sm">Aplicar também a subpastas</label>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-slate-900">Usuários com acesso</h4>
            {sharedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Select value={user.permission} onValueChange={(v: any) => updateUserPermission(user.id, v)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">Ver</SelectItem>
                      <SelectItem value="edit">Editar</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="ghost" size="sm" onClick={() => removeUser(user.id)} className="text-red-600 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
