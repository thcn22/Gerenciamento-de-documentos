import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Trash2,
  TestTube,
  Cloud,
  Info
} from 'lucide-react';

interface CollaboraInstance {
  id: string;
  url: string;
  status: 'active' | 'inactive';
  provider: 'play-with-docker' | 'codespace' | 'custom';
  createdAt: string;
}

interface Suggestion {
  provider: string;
  name: string;
  description: string;
  setupCommand: string;
  url: string;
}

export default function CollaboraManager() {
  const confirm = useConfirm();
  const [instances, setInstances] = useState<CollaboraInstance[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newInstanceUrl, setNewInstanceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const response = await fetch('/api/collabora-manager/instances');
      const data = await response.json();
      setInstances(data.instances || []);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error loading instances:', error);
    }
  };

  const addInstance = async () => {
    if (!newInstanceUrl.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/collabora-manager/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newInstanceUrl.trim() })
      });
      
      if (response.ok) {
        setNewInstanceUrl('');
        loadInstances();
      }
    } catch (error) {
      console.error('Error adding instance:', error);
    } finally {
      setLoading(false);
    }
  };

  const testInstance = async (instanceId: string) => {
    setTesting(instanceId);
    try {
      const response = await fetch(`/api/collabora-manager/instances/${instanceId}/test`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: '✅ Collabora está funcionando!' });
      } else {
        toast({ title: '❌ Collabora não está respondendo', description: result.message });
      }
      
      loadInstances();
    } catch (error) {
      toast({ title: 'Erro ao testar instância' });
    } finally {
      setTesting(null);
    }
  };

  const removeInstance = async (instanceId: string) => {
    const ok = await confirm('Remover esta instância?');
    if (!ok) return;
    try {
      await fetch(`/api/collabora-manager/instances/${instanceId}`, {
        method: 'DELETE'
      });
      loadInstances();
      toast({ title: 'Instância removida' });
    } catch (error) {
      console.error('Error removing instance:', error);
      toast({ title: 'Erro ao remover instância' });
    }
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  toast({ title: 'Comando copiado para área de transferência!' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Gerenciar Collabora Online (Sem Instalar Node)
          </CardTitle>
          <CardDescription>
            Configure instâncias remotas do Collabora usando serviços online gratuitos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Setup Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="border-2 border-dashed">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-2">{suggestion.name}</h4>
                  <p className="text-xs text-slate-600 mb-3">{suggestion.description}</p>
                  
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(suggestion.url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Abrir {suggestion.provider}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={() => copyCommand(suggestion.setupCommand)}
                    >
                      Copiar Comando
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Como usar:</strong> Abra um dos serviços acima, execute o comando Docker, 
              copie a URL resultante e cole abaixo para conectar ao seu sistema.
            </AlertDescription>
          </Alert>

          {/* Add Custom Instance */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <h4 className="font-medium mb-3">Adicionar Instância Collabora</h4>
            <div className="flex gap-2">
              <Input
                placeholder="URL do Collabora (ex: http://ip123-456-789-012-9980.direct.labs.play-with-docker.com)"
                value={newInstanceUrl}
                onChange={(e) => setNewInstanceUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={addInstance} disabled={loading || !newInstanceUrl.trim()}>
                {loading ? <img src="/logo.gif" alt="Carregando" className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </Button>
            </div>
          </div>

          {/* Current Instances */}
          {instances.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Instâncias Configuradas</h4>
              <div className="space-y-2">
                {instances.map((instance) => (
                  <div key={instance.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {instance.status === 'active' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      
                      <div>
                        <p className="text-sm font-medium">{instance.url}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={instance.status === 'active' ? 'default' : 'secondary'}>
                            {instance.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {instance.provider}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testInstance(instance.id)}
                        disabled={testing === instance.id}
                      >
                        {testing === instance.id ? (
                          <img src="/logo.gif" alt="Carregando" className="w-3 h-3" />
                        ) : (
                          <TestTube className="w-3 h-3" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(instance.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeInstance(instance.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
