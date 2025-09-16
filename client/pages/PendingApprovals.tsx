import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth, useAuthenticatedFetch } from '@/contexts/AuthContext';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  role?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function PendingApprovals() {
  const { isAdmin } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirm = useConfirm();

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/auth/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users.filter((u: User) => !u.isActive));
      } else {
        setError(data.message || 'Erro ao carregar usuários');
      }
    } catch (e) {
      console.error(e);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/';
      return;
    }
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const approve = async (id: string) => {
    const ok = await confirm('Aprovar este usuário?');
    if (!ok) return;
    try {
      setActionLoading(id);
      const res = await authenticatedFetch(`/api/auth/users/${id}/approve`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== id));
        toast({ title: data.message || 'Aprovado' });
      } else {
        toast({ title: data.message || 'Erro ao aprovar' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro de conexão' });
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (id: string) => {
    const ok = await confirm('Rejeitar e excluir este cadastro?');
    if (!ok) return;
    try {
      setActionLoading(id);
      const res = await authenticatedFetch(`/api/auth/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== id));
        toast({ title: data.message || 'Excluído' });
      } else {
        toast({ title: data.message || 'Erro ao excluir' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro de conexão' });
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Aprovações Pendentes</h1>
          <div className="flex gap-2">
            <Link to="/users">
              <Button variant="outline">Voltar aos Usuários</Button>
            </Link>
            <Link to="/groups">
              <Button variant="outline">Gerenciar Grupos</Button>
            </Link>
            <Button onClick={loadPending} variant="outline">Atualizar</Button>
          </div>
        </div>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        {loading ? (
          <div>Carregando...</div>
        ) : (
          <div className="space-y-4">
            {users.map(user => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => approve(user.id)} disabled={actionLoading === user.id}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Aprovar
                      </Button>
                      <Button onClick={() => reject(user.id)} variant="ghost" disabled={actionLoading === user.id} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-slate-500">Criado em: {new Date(user.createdAt).toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}

            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhuma aprovação pendente</h3>
                <p className="text-slate-500">Todas as contas estão aprovadas</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
