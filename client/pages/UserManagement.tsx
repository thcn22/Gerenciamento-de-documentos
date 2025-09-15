import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Users, 
  MoreVertical, 
  Mail,
  Calendar,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  ShieldX,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2
} from "lucide-react";
import { useAuth, useAuthenticatedFetch } from "@/contexts/AuthContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  role?: 'reader' | 'reviewer' | 'approver' | 'admin';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function UserManagement() {
  const { user: currentUser, isAdmin } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin && !loading) {
      window.location.href = '/';
    }
  }, [isAdmin, loading]);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/auth/users');
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.message || 'Erro ao carregar usuários');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Erro de conexão ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserAdmin = async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
  toast({ title: 'Ação inválida', description: 'Você não pode alterar seus próprios privilégios' });
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;

    const action = user.isAdmin ? 'remover privilégios de administrador' : 'conceder privilégios de administrador';
    
  const confirmAction = await confirm(`Tem certeza que deseja ${action} para ${userName}?`);
  if (!confirmAction) return;

    try {
      setActionLoading(userId);
      
      const response = await authenticatedFetch(`/api/auth/users/${userId}/toggle-admin`, {
        method: 'PUT'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u
          )
        );
  toast({ title: 'Sucesso', description: data.message });
      } else {
  toast({ title: 'Erro', description: data.message || 'Erro ao alterar privilégios' });
      }
    } catch (error) {
      console.error('Error toggling admin:', error);
  toast({ title: 'Erro de conexão', description: 'Não foi possível conectar ao servidor' });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserActive = async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
  toast({ title: 'Ação inválida', description: 'Você não pode desativar sua própria conta' });
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;

    const action = user.isActive ? 'desativar' : 'ativar';
    
  const confirmAction = await confirm(`Tem certeza que deseja ${action} a conta de ${userName}?`);
  if (!confirmAction) return;

    try {
      setActionLoading(userId);
      
      const response = await authenticatedFetch(`/api/auth/users/${userId}/toggle-active`, {
        method: 'PUT'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId ? { ...u, isActive: !u.isActive } : u
          )
        );
  toast({ title: 'Sucesso', description: data.message });
      } else {
  toast({ title: 'Erro', description: data.message || 'Erro ao alterar status' });
      }
    } catch (error) {
      console.error('Error toggling active:', error);
  toast({ title: 'Erro de conexão', description: 'Não foi possível conectar ao servidor' });
    } finally {
      setActionLoading(null);
    }
  };

  const setUserRole = async (userId: string, role: 'reader' | 'reviewer' | 'approver' | 'admin') => {
    try {
      setActionLoading(userId);
      const response = await authenticatedFetch(`/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await response.json();
      if (data.success) {
  setUsers(prev => prev.map(u => u.id === userId ? { ...u, role, isAdmin: role === 'admin' } : u));
        toast({ title: 'Sucesso', description: data.message });
      } else {
        toast({ title: 'Erro', description: data.message || 'Erro ao alterar papel' });
      }
    } catch (e) {
      console.error('Set role error:', e);
  toast({ title: 'Erro de conexão', description: 'Não foi possível conectar ao servidor' });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
  toast({ title: 'Ação inválida', description: 'Você não pode excluir sua própria conta' });
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;

  const confirmed = await confirm(`Tem certeza que deseja excluir permanentemente o usuário ${userName}? Esta ação não pode ser desfeita.`);
  if (!confirmed) return;

    try {
      setActionLoading(userId);
      
      const response = await authenticatedFetch(`/api/auth/users/${userId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove user from local state
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
  toast({ title: 'Sucesso', description: data.message });
      } else {
  toast({ title: 'Erro', description: data.message || 'Erro ao excluir usuário' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
  toast({ title: 'Erro de conexão', description: 'Não foi possível conectar ao servidor' });
    } finally {
      setActionLoading(null);
    }
  };

  const approveUser = async (userId: string, userName: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
  const confirmed = await confirm(`Aprovar e ativar a conta de ${userName}?`);
  if (!confirmed) return;

    try {
      setActionLoading(userId);
      const response = await authenticatedFetch(`/api/auth/users/${userId}/approve`, {
        method: 'PUT'
      });
      const data = await response.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: true } : u));
  toast({ title: 'Sucesso', description: data.message });
      } else {
  toast({ title: 'Erro', description: data.message || 'Erro ao aprovar usuário' });
      }
    } catch (e) {
      console.error('Approve error:', e);
      toast({ title: 'Erro de conexão', description: 'Não foi possível conectar ao servidor' });
    } finally {
      setActionLoading(null);
    }
  };

  const hierarchyOrder = {
    admin: 1,
    approver: 2,
    reviewer: 3,
    reader: 4,
    undefined: 5 // caso não tenha papel definido
  };

  const filteredUsers = users
    .filter(user => {
  // Exclude pending/inactive users from the main users list
  if (!user.isActive) return false;
  const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email.toLowerCase().includes(searchTerm.toLowerCase());
  return matchesSearch;
    })
    .sort((a, b) => {
      const roleA = a.role || 'undefined';
      const roleB = b.role || 'undefined';
      return hierarchyOrder[roleA] - hierarchyOrder[roleB];
    });

  // Count pending (inactive) users for admin notifications
  const pendingCount = users.filter(u => !u.isActive).length;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acesso Negado</h2>
            <p className="text-slate-600 mb-4">
              Você precisa de privilégios de administrador para acessar esta página.
            </p>
            <Link to="/">
              <Button>Voltar ao Início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.gif" alt="Carregando" className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Carregando usuários...</h3>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-slate-50 user-management">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Administração de Usuários</h1>
                <p className="text-slate-600">Gerencie usuários e suas permissões</p>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar usuários por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={loadUsers} variant="outline">
                    Atualizar Lista
                  </Button>
                  <Link to="/admin/pending-approvals">
                    <Button variant="outline" className="relative">
                      <Mail className="w-4 h-4 mr-2" />
                      Aprovações Pendentes
                      {pendingCount > 0 && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link to="/admin/email-setup">
                    <Button variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Config. Email
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Usuários</p>
                    <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Administradores</p>
                    <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.isAdmin).length}</p>
                  </div>
                  <Shield className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Usuários Ativos</p>
                    <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.isActive).length}</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Usuários Inativos</p>
                    <p className="text-2xl font-bold text-slate-900">{users.filter(u => !u.isActive).length}</p>
                  </div>
                  <UserX className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Lista de todos os usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900">{user.name}</h3>
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">Você</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-500">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-500 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {user.lastLogin 
                              ? `Último login: ${formatDate(user.lastLogin)}`
                              : 'Nunca fez login'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {user.role === 'admin' ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-red-500" />
                            <Badge style={{backgroundColor:'#ef4444',color:'#fff',fontWeight:600}}>Administrador</Badge>
                          </>
                        ) : user.role === 'reviewer' ? (
                          <>
                            <Shield className="w-4 h-4 text-purple-500" />
                            <Badge style={{backgroundColor:'#a855f7',color:'#fff',fontWeight:600}}>Revisor</Badge>
                          </>
                        ) : user.role === 'approver' ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                            <Badge style={{backgroundColor:'#3b82f6',color:'#fff',fontWeight:600}}>Aprovador</Badge>
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4 text-blue-500" />
                            <Badge style={{backgroundColor:'#3b82f6',color:'#fff',fontWeight:600}}>Leitor</Badge>
                          </>
                        )}
                      </div>
                      
                      <Badge
                        style={{
                          backgroundColor: user.isActive ? '#22c55e' : '#facc15', // verde ou amarelo
                          color: '#222',
                          fontWeight: 600,
                        }}
                      >
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={actionLoading === user.id}>
                            {actionLoading === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MoreVertical className="w-4 h-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações do Usuário</DropdownMenuLabel>
                          
                          <DropdownMenuItem
                            onClick={() => toggleUserActive(user.id, user.name)}
                            disabled={user.id === currentUser?.id}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="w-4 h-4 mr-2 text-orange-500" />
                                Desativar Usuário
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                                Ativar Usuário
                              </>
                            )}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem
                            onClick={() => toggleUserAdmin(user.id, user.name)}
                            disabled={user.id === currentUser?.id}
                          >
                            {user.isAdmin ? (
                              <>
                                <ShieldX className="w-4 h-4 mr-2 text-orange-500" />
                                Remover Admin
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4 mr-2 text-green-500" />
                                Tornar Admin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setUserRole(user.id, 'reviewer')}>
                            <Shield className="w-4 h-4 mr-2" /> Definir como Revisor
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setUserRole(user.id, 'approver')}>
                            <Shield className="w-4 h-4 mr-2" /> Definir como Aprovador
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setUserRole(user.id, 'reader')}>
                            <Shield className="w-4 h-4 mr-2" /> Definir como Leitor
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />

                          {!user.isActive && (
                            <DropdownMenuItem onClick={() => approveUser(user.id, user.name)}>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                              Aprovar Usuário
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => deleteUser(user.id, user.name)}
                            disabled={user.id === currentUser?.id}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir Usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum usuário encontrado</h3>
                  <p className="text-slate-500">
                    {searchTerm 
                      ? 'Tente ajustar os filtros de busca' 
                      : 'Nenhum usuário cadastrado no sistema'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions removed per user request */}
        </div>
      </div>
    </div>
  );
}
