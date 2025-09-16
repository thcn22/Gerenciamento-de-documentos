import { useState, useEffect } from "react";
import AppLoader from "@/components/AppLoader";
import { useParams, Link } from "react-router-dom";
import { useAuth, useAuthenticatedFetch } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Edit, 
  Star, 
  Users, 
  Eye,
  FileText,
  FileSpreadsheet,
  Calendar,
  User,
  Lock,
  Unlock,
  Plus,
  X
} from "lucide-react";

interface SharedUser {
  id: string;
  name: string;
  email: string;
  permission: 'view' | 'edit' | 'admin';
  addedDate: string;
}

const mockSharedUsers: SharedUser[] = [
  {
    id: '1',
    name: 'Ana Silva',
    email: 'ana.silva@empresa.com',
    permission: 'admin',
    addedDate: '2024-01-15'
  },
  {
    id: '2',
    name: 'João Santos',
    email: 'joao.santos@empresa.com',
    permission: 'edit',
    addedDate: '2024-01-10'
  },
  {
    id: '3',
    name: 'Maria Costa',
    email: 'maria.costa@empresa.com',
    permission: 'view',
    addedDate: '2024-01-08'
  }
];

export default function DocumentViewer() {
  const { id } = useParams();
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>(mockSharedUsers);
  const [isStarred, setIsStarred] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPermission, setNewUserPermission] = useState<'view' | 'edit' | 'admin'>('view');
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { token } = useAuth();
  const authedFetch = useAuthenticatedFetch();

  // Load document data from server
  useEffect(() => {
    const loadDocument = async () => {
      if (!id) return;

      try {
        const response = await authedFetch(`/api/files/documents/${id}`);
        if (response.ok) {
          const result = await response.json();
          setDocument({
            id: result.document.id,
            name: result.document.originalName,
            type: result.document.mimeType.includes('pdf') ? 'pdf' :
                  result.document.mimeType.includes('excel') || result.document.mimeType.includes('spreadsheet') ? 'excel' :
                  result.document.mimeType.includes('doc') || result.document.mimeType.includes('word') ? 'doc' : 'other',
            size: `${(result.document.size / 1024 / 1024).toFixed(2)} MB`,
            lastModified: new Date(result.document.uploadDate).toLocaleDateString('pt-BR'),
            owner: result.document.owner,
            createdDate: new Date(result.document.uploadDate).toLocaleDateString('pt-BR'),
            description: `Documento ${result.document.originalName} enviado em ${new Date(result.document.uploadDate).toLocaleDateString('pt-BR')}.`,
            mimeType: result.document.mimeType
          });
        } else {
          console.error('Document not found');
        }
      } catch (error) {
        console.error('Error loading document:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [id]);

  // Sempre que o documento mudar, se for office (doc/excel), marcamos como carregando até o iframe disparar onLoad
  useEffect(() => {
    if (!document) return;
    const isOffice = document.type === 'doc' || document.type === 'excel';
    setPreviewLoading(!!isOffice);
  }, [document]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <AppLoader size="lg" label="Carregando documento..." />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Documento não encontrado</h2>
          <Link to="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'doc':
        return <FileText className="w-8 h-8 text-blue-500" />;
      default:
        return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const addUser = () => {
    if (newUserEmail.trim()) {
      const newUser: SharedUser = {
        id: Date.now().toString(),
        name: newUserEmail.split('@')[0],
        email: newUserEmail,
        permission: newUserPermission,
        addedDate: new Date().toISOString().split('T')[0]
      };
      setSharedUsers(prev => [...prev, newUser]);
      setNewUserEmail('');
      setNewUserPermission('view');
    }
  };

  const removeUser = (userId: string) => {
    setSharedUsers(prev => prev.filter(user => user.id !== userId));
  };

  const updateUserPermission = (userId: string, permission: 'view' | 'edit' | 'admin') => {
    setSharedUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, permission } : user
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-3">
                {getFileIcon(document.type)}
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">{document.name}</h1>
                  <p className="text-sm text-slate-500">{document.size} • {document.lastModified}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsStarred(!isStarred)}
              >
                <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
              </Button>
              
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Compartilhar Documento</DialogTitle>
                    <DialogDescription>
                      Gerencie quem pode acessar este documento
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Add new user */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Digite o email do usuário"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                        />
                      </div>
                      <Select value={newUserPermission} onValueChange={(value: 'view' | 'edit' | 'admin') => setNewUserPermission(value)}>
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

                    <Separator />

                    {/* Current shared users */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-900">Usuários com acesso</h4>
                      {sharedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">{user.name}</p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Select 
                              value={user.permission} 
                              onValueChange={(value: 'view' | 'edit' | 'admin') => updateUserPermission(user.id, value)}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="view">Ver</SelectItem>
                                <SelectItem value="edit">Editar</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <a href={`/api/files/documents/${document.id}/download`} download>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Viewer */}
          <div className="lg:col-span-2">
            <Card className="h-[800px]">
              <CardContent className="p-0 h-full">
                <div className="h-full bg-slate-50 rounded-lg overflow-hidden relative">
                  {document.mimeType === 'application/pdf' ? (
                    <iframe
                      src={token ? `/api/files/documents/${document.id}/view?token=${encodeURIComponent(token)}` : `/api/files/documents/${document.id}/view`}
                      className="w-full h-full border-0"
                      title={document.name}
                    />
                  ) : document.mimeType.startsWith('image/') ? (
                    <div className="flex items-center justify-center h-full p-4">
                      <img
                        src={token ? `/api/files/documents/${document.id}/view?token=${encodeURIComponent(token)}` : `/api/files/documents/${document.id}/view`}
                        alt={document.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : document.mimeType === 'text/plain' ? (
                    <iframe
                      src={token ? `/api/files/documents/${document.id}/view?token=${encodeURIComponent(token)}` : `/api/files/documents/${document.id}/view`}
                      className="w-full h-full border-0"
                      title={document.name}
                    />
                  ) : document.type === 'doc' || document.type === 'excel' ? (
                    <iframe
                      src={token ? `/api/files/documents/${document.id}/preview?token=${encodeURIComponent(token)}` : `/api/files/documents/${document.id}/preview`}
                      className="w-full h-full border-0"
                      title={`${document.name} (pré-visualização)`}
                      onLoad={() => setPreviewLoading(false)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        {getFileIcon(document.type)}
                        <h3 className="text-lg font-medium text-slate-900 mt-4 mb-2">{document.name}</h3>
                        <p className="text-slate-500 mb-4">
                          Pré-visualização não disponível para este tipo de arquivo
                        </p>
                        <div className="flex gap-2 justify-center">
                          <a href={`/api/files/documents/${document.id}/download`} target="_blank" rel="noopener noreferrer">
                            <Button>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overlay de conversão/carregamento para Office */}
                  {previewLoading && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
                      <AppLoader size="lg" label="Convertendo documento… isso pode levar alguns segundos" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Document Info Sidebar */}
          <div className="space-y-6">
            {/* Document Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Detalhes do Documento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-600">Nome</Label>
                  <p className="text-sm text-slate-900">{document.name}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-slate-600">Tamanho</Label>
                  <p className="text-sm text-slate-900">{document.size}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-slate-600">Proprietário</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">AS</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-slate-900">{document.owner}</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-slate-600">Criado em</Label>
                  <p className="text-sm text-slate-900">{document.createdDate}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-slate-600">Última modificação</Label>
                  <p className="text-sm text-slate-900">{document.lastModified}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-600">Descrição</Label>
                  <p className="text-sm text-slate-900">{document.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Access Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Acesso ao Documento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Status</span>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Share2 className="w-3 h-3" />
                    Compartilhado
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Usuários com acesso</span>
                  <span className="text-sm text-slate-900">{sharedUsers.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Sua permissão</span>
                  <Badge>Admin</Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600">Usuários recentes</Label>
                  {sharedUsers.slice(0, 3).map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-slate-900">{user.name}</span>
                      </div>
                      <Badge variant={user.permission === 'admin' ? 'default' : user.permission === 'edit' ? 'secondary' : 'outline'} className="text-xs">
                        {user.permission === 'admin' ? 'Admin' : user.permission === 'edit' ? 'Editar' : 'Ver'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Gerenciar Acesso
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Gerenciar Acesso ao Documento</DialogTitle>
                      <DialogDescription>
                        Controle quem pode visualizar, editar ou administrar este documento
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Add new user */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Digite o email do usuário"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                          />
                        </div>
                        <Select value={newUserPermission} onValueChange={(value: 'view' | 'edit' | 'admin') => setNewUserPermission(value)}>
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

                      <Separator />

                      {/* Current shared users */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-slate-900">Usuários com acesso</h4>
                        {sharedUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900">{user.name}</p>
                                <p className="text-sm text-slate-500">{user.email}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Select 
                                value={user.permission} 
                                onValueChange={(value: 'view' | 'edit' | 'admin') => updateUserPermission(user.id, value)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="view">Ver</SelectItem>
                                  <SelectItem value="edit">Editar</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUser(user.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
