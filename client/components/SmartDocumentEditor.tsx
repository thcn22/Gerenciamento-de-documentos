import { useEffect, useState } from 'react';
import OnlyOfficeEditor from './OnlyOfficeEditor';
import CollaboraEditor from './CollaboraEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  RefreshCw,
  Info,
  Settings,
  Zap
} from 'lucide-react';

interface EditorStatus {
  onlyOfficeAvailable: boolean;
  collaboraAvailable: boolean;
  selectedEditor: 'onlyoffice' | 'collabora' | 'simple' | null;
  priority: 'onlyoffice' | 'collabora';
  error?: string;
}

interface SmartDocumentEditorProps {
  documentId: string;
  mode?: 'edit' | 'view';
  height?: string;
  width?: string;
  preferredEditor?: 'onlyoffice' | 'collabora' | 'auto';
  onDocumentReady?: () => void;
  onError?: (error: string) => void;
}

export default function SmartDocumentEditor({
  documentId,
  mode = 'edit',
  height = '100vh',
  width = '100%',
  preferredEditor = 'auto',
  onDocumentReady,
  onError
}: SmartDocumentEditorProps) {
  const [status, setStatus] = useState<EditorStatus>({
    onlyOfficeAvailable: false,
    collaboraAvailable: false,
    selectedEditor: null,
    priority: 'onlyoffice' // OnlyOffice has priority by default
  });
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    checkEditorsAvailability();
  }, [retryCount, preferredEditor]);

  const checkEditorsAvailability = async () => {
    setLoading(true);
    
    try {
      // Check both editors in parallel
      const [onlyOfficeResponse, collaboraResponse] = await Promise.allSettled([
        fetch('/api/onlyoffice/status'),
        fetch('/api/collabora/status')
      ]);
      
      let onlyOfficeAvailable = false;
      let collaboraAvailable = false;
      
      // Check OnlyOffice
      if (onlyOfficeResponse.status === 'fulfilled') {
        const onlyOfficeData = await onlyOfficeResponse.value.json();
        onlyOfficeAvailable = onlyOfficeData.onlyOfficeAvailable;
      }
      
      // Check Collabora
      if (collaboraResponse.status === 'fulfilled') {
        const collaboraData = await collaboraResponse.value.json();
        collaboraAvailable = collaboraData.collaboraAvailable;
      }
      
      const newStatus: EditorStatus = {
        onlyOfficeAvailable,
        collaboraAvailable,
        selectedEditor: null,
        priority: preferredEditor === 'collabora' ? 'collabora' : 'onlyoffice'
      };
      
      // Select the best available editor based on preference and availability
      if (preferredEditor === 'onlyoffice' && onlyOfficeAvailable) {
        newStatus.selectedEditor = 'onlyoffice';
      } else if (preferredEditor === 'collabora' && collaboraAvailable) {
        newStatus.selectedEditor = 'collabora';
      } else if (preferredEditor === 'auto') {
        // Auto selection: prefer OnlyOffice, fallback to Collabora, then simple
        if (onlyOfficeAvailable) {
          newStatus.selectedEditor = 'onlyoffice';
        } else if (collaboraAvailable) {
          newStatus.selectedEditor = 'collabora';
        } else {
          newStatus.selectedEditor = 'simple';
          newStatus.error = 'Nenhum editor profissional disponível. Usando editor simples.';
        }
      } else {
        // If preferred editor is not available, try the other one
        if (onlyOfficeAvailable) {
          newStatus.selectedEditor = 'onlyoffice';
        } else if (collaboraAvailable) {
          newStatus.selectedEditor = 'collabora';
        } else {
          newStatus.selectedEditor = 'simple';
          newStatus.error = 'Editores profissionais indisponíveis.';
        }
      }
      
      setStatus(newStatus);
      
    } catch (error) {
      console.error('Error checking editors availability:', error);
      setStatus({
        onlyOfficeAvailable: false,
        collaboraAvailable: false,
        selectedEditor: 'simple',
        priority: 'onlyoffice',
        error: 'Erro ao verificar editores disponíveis'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleEditorError = (errorMessage: string) => {
    console.error('Editor error:', errorMessage);
    
    // Try fallback logic
    if (status.selectedEditor === 'onlyoffice' && status.collaboraAvailable) {
      setStatus(prev => ({
        ...prev,
        selectedEditor: 'collabora',
        error: `OnlyOffice falhou: ${errorMessage}. Tentando Collabora...`
      }));
    } else if (status.selectedEditor === 'collabora' && status.onlyOfficeAvailable) {
      setStatus(prev => ({
        ...prev,
        selectedEditor: 'onlyoffice',
        error: `Collabora falhou: ${errorMessage}. Tentando OnlyOffice...`
      }));
    } else {
      // Fallback to simple editor
      setStatus(prev => ({
        ...prev,
        selectedEditor: 'simple',
        error: `Erro nos editores profissionais: ${errorMessage}. Usando editor simples.`
      }));
    }
    
    onError?.(errorMessage);
  };

  const switchEditor = (editor: 'onlyoffice' | 'collabora') => {
    if (editor === 'onlyoffice' && status.onlyOfficeAvailable) {
      setStatus(prev => ({ ...prev, selectedEditor: 'onlyoffice', error: undefined }));
    } else if (editor === 'collabora' && status.collaboraAvailable) {
      setStatus(prev => ({ ...prev, selectedEditor: 'collabora', error: undefined }));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <img src="/logo.gif" alt="Carregando" className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Verificando Editores</h3>
          <p className="text-slate-500">Procurando o melhor editor disponível...</p>
        </div>
      </div>
    );
  }

  // Render OnlyOffice editor
  if (status.selectedEditor === 'onlyoffice') {
    return (
      <div className="h-full">
        {/* Status Bar */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Usando OnlyOffice Document Server
              </span>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                Prioridade 1
              </Badge>
              {status.collaboraAvailable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => switchEditor('collabora')}
                  className="text-xs"
                >
                  Trocar para Collabora
                </Button>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div style={{ height: `calc(${height} - 40px)` }}>
          <OnlyOfficeEditor
            documentId={documentId}
            mode={mode}
            height="100%"
            width={width}
            onDocumentReady={onDocumentReady}
            onError={handleEditorError}
          />
        </div>
      </div>
    );
  }

  // Render Collabora editor
  if (status.selectedEditor === 'collabora') {
    return (
      <div className="h-full">
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Usando Collabora Online
              </span>
              <Badge variant="outline" className="text-green-700 border-green-300">
                {status.onlyOfficeAvailable ? 'Fallback' : 'Principal'}
              </Badge>
              {status.onlyOfficeAvailable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => switchEditor('onlyoffice')}
                  className="text-xs"
                >
                  Trocar para OnlyOffice
                </Button>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div style={{ height: `calc(${height} - 40px)` }}>
          <CollaboraEditor
            documentId={documentId}
            mode={mode}
            height="100%"
            width={width}
            onDocumentReady={onDocumentReady}
            onError={handleEditorError}
          />
        </div>
      </div>
    );
  }

  // Fallback to simple editor selection
  return (
    <div className="h-full">
      {/* Warning Bar */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Editores profissionais indisponíveis
            </span>
            <Badge variant="outline" className="text-amber-700 border-amber-300">
              Modo Simples
            </Badge>
          </div>
          <Button size="sm" variant="ghost" onClick={handleRetry}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {status.error && (
        <div className="p-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
        </div>
      )}
      
      <div className="h-full flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-500" />
              Configuração de Editores
            </CardTitle>
            <CardDescription>
              Configure os editores profissionais para melhor experiência
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Editor Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-800">OnlyOffice</h4>
                  <Badge variant={status.onlyOfficeAvailable ? 'default' : 'secondary'}>
                    {status.onlyOfficeAvailable ? 'Disponível' : 'Indisponível'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Editor compatível com Microsoft Office com recursos avançados
                </p>
                <div className="text-xs text-slate-500">
                  {status.onlyOfficeAvailable ? 
                    '✓ Servidor conectado' : 
                    '✗ Configure ONLYOFFICE_SERVER_URL'
                  }
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-800">Collabora Online</h4>
                  <Badge variant={status.collaboraAvailable ? 'default' : 'secondary'}>
                    {status.collaboraAvailable ? 'Disponível' : 'Indisponível'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Editor LibreOffice Online com protocolo WOPI
                </p>
                <div className="text-xs text-slate-500">
                  {status.collaboraAvailable ? 
                    '✓ Servidor conectado na porta 9980' : 
                    '✗ Execute Collabora via Docker'
                  }
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Setup Rápido
              </h4>
              <div className="space-y-2 text-sm text-blue-700">
                <div>
                  <strong>Collabora via Docker:</strong>
                  <code className="block bg-blue-100 p-2 mt-1 rounded text-xs">
                    docker run -t -d -p 9980:9980 -e "domain=localhost:8080" --name collabora collabora/code
                  </code>
                </div>
                <div>
                  <strong>OnlyOffice via Docker:</strong>
                  <code className="block bg-blue-100 p-2 mt-1 rounded text-xs">
                    docker run -i -t -d -p 80:80 onlyoffice/documentserver
                  </code>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Novamente
              </Button>
              <Button 
                onClick={() => window.location.href = `/text-editor`}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Usar Editor Simples
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
