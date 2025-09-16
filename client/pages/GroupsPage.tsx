import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthenticatedFetch, useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Group { id: string; name: string; members: string[]; createdAt: string }
interface User { id: string; name: string; email: string }

export default function GroupsPage() {
  const { isAdmin } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  const load = async () => {
    try {
      const [gRes, uRes] = await Promise.all([
        authenticatedFetch('/api/groups'),
        authenticatedFetch('/api/auth/users')
      ]);
      const gJson = await gRes.json();
      const uJson = await uRes.json();
      if (gJson.success) setGroups(gJson.groups || []);
      if (uJson.success) setUsers(uJson.users || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao carregar dados' });
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await authenticatedFetch('/api/groups', { method: 'POST', body: JSON.stringify({ name: newGroupName }) });
      const data = await res.json();
      if (data.success) {
        setNewGroupName('');
        load();
        toast({ title: 'Grupo criado' });
      } else {
        toast({ title: 'Erro', description: data.message });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Erro ao criar grupo' });
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/groups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        load();
        toast({ title: 'Grupo excluído' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Erro ao excluir' });
    }
  };

  const addMember = async (groupId: string, userId: string) => {
    try {
      const res = await authenticatedFetch(`/api/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ userId }) });
      const data = await res.json();
      if (data.success) load();
    } catch (e) { console.error(e); }
  };

  const removeMember = async (groupId: string, userId: string) => {
    try {
      const res = await authenticatedFetch(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) load();
    } catch (e) { console.error(e); }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Gestão de Grupos</h1>
          <div className="flex gap-2">
            <Link to="/users"><Button variant="outline">Voltar aos Usuários</Button></Link>
            <Button variant="outline" onClick={load}>Atualizar</Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Criar Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nome do grupo" />
              <Button onClick={createGroup}>Criar</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {groups.map(g => (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-sm text-slate-500">Criado em: {new Date(g.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => deleteGroup(g.id)}>Excluir</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 font-medium">Membros</div>
                <div className="grid grid-cols-3 gap-2">
                  {users.map(u => (
                    <div key={u.id} className="p-2 border rounded flex items-center justify-between">
                      <div className="text-sm"><div className="font-medium">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></div>
                      <div>
                        {g.members.includes(u.id) ? (
                          <Button variant="ghost" onClick={() => removeMember(g.id, u.id)}>Remover</Button>
                        ) : (
                          <Button onClick={() => addMember(g.id, u.id)}>Adicionar</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
