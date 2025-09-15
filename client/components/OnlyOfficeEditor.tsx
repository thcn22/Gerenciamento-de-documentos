import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  FileText, 
  FileSpreadsheet, 
  Monitor, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  Edit
} from 'lucide-react';

// Declare OnlyOffice API for TypeScript
declare global {
  interface Window {
    DocsAPI: any;
  }
}

interface OnlyOfficeEditorProps {
  documentId: string;
  mode?: 'edit' | 'view';
  height?: string;
  width?: string;
  onDocumentReady?: () => void;
  onError?: (error: string) => void;
}

const OnlyOfficeEditor: React.FC<OnlyOfficeEditorProps> = ({
  documentId,
  mode = 'edit',
  height = '100vh',
  width = '100%',
  onDocumentReady,
  onError
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [isOnlyOfficeAvailable, setIsOnlyOfficeAvailable] = useState(false);
  const [docEditor, setDocEditor] = useState<any>(null);

  useEffect(() => {
    loadOnlyOfficeConfig();
  }, [documentId, mode]);

  const loadOnlyOfficeConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // First check if OnlyOffice is available
      const statusResponse = await fetch('/api/onlyoffice/status');
      const statusData = await statusResponse.json();
      setIsOnlyOfficeAvailable(statusData.onlyOfficeAvailable);

      if (!statusData.onlyOfficeAvailable) {
        throw new Error('OnlyOffice Document Server não está disponível');
      }

      // Get editor configuration
      const configResponse = await fetch(`/api/onlyoffice/config/${documentId}?mode=${mode}`);
      if (!configResponse.ok) {
        throw new Error('Erro ao carregar configuração do documento');
      }

      const configData = await configResponse.json();
      setConfig(configData);

      // Load OnlyOffice API if not already loaded
      if (!window.DocsAPI) {
        await loadOnlyOfficeAPI(configData.documentServerUrl);
      }

      // Initialize editor
      initializeEditor(configData.config);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadOnlyOfficeAPI = (documentServerUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.DocsAPI) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `${documentServerUrl}/web-apps/apps/api/documents/api.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar OnlyOffice API'));
      document.head.appendChild(script);
    });
  };

  const initializeEditor = (editorConfig: any) => {
    if (!editorRef.current || !window.DocsAPI) return;

    try {
      // Destroy existing editor if any
      if (docEditor) {
        docEditor.destroyEditor();
      }

      // Configure editor
      const fullConfig = {
        ...editorConfig,
        width: '100%',
        height: '100%',
        events: {
          onAppReady: () => {
            console.log('OnlyOffice app ready');
            setLoading(false);
            onDocumentReady?.();
          },
          onDocumentStateChange: (event: any) => {
            console.log('Document state changed:', event);
          },
          onError: (event: any) => {
            console.error('OnlyOffice error:', event);
            const errorMsg = event?.data || 'Erro no editor OnlyOffice';
            setError(errorMsg);
            onError?.(errorMsg);
          },
          onInfo: (event: any) => {
            console.log('OnlyOffice info:', event);
          },
          onWarning: (event: any) => {
            console.warn('OnlyOffice warning:', event);
          }
        }
      };

      // Create editor instance
      const editor = new window.DocsAPI.DocEditor(editorRef.current.id, fullConfig);
      setDocEditor(editor);

    } catch (err) {
      console.error('Error initializing OnlyOffice editor:', err);
      setError('Erro ao inicializar editor');
    }
  };

  const getDocumentIcon = (documentType: string) => {
    switch (documentType) {
      case 'word':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'cell':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'slide':
        return <Monitor className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const retryLoad = () => {
    setError(null);
    loadOnlyOfficeConfig();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Carregando Editor OnlyOffice</h3>
          <p className="text-slate-500">Preparando o ambiente de edição...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Erro no Editor</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              
              <div className="space-y-2">
                <Button onClick={retryLoad} className="w-full">
                  Tentar Novamente
                </Button>
                
                {!isOnlyOfficeAvailable && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      OnlyOffice não está disponível. Verifique se o Document Server está rodando.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full bg-background">
      {/* Status Bar */}
      <div className="border-b border-border px-4 py-2 bg-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {config && getDocumentIcon(config.config.documentType)}
            <div>
              <span className="font-medium text-foreground">
                {config?.config.document.title || `Documento ${documentId}`}
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={mode === 'edit' ? 'default' : 'secondary'} className="text-xs">
                  {mode === 'edit' ? (
                    <>
                      <Edit className="w-3 h-3 mr-1" />
                      Modo Edição
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3 mr-1" />
                      Modo Visualização
                    </>
                  )}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  OnlyOffice Conectado
                </Badge>
              </div>
            </div>
          </div>

          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      {/* Editor Container */}
      <div className="relative" style={{ height: `calc(${height} - 64px)`, width }}>
        <div
          id={`onlyoffice-editor-${documentId}`}
          ref={editorRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default OnlyOfficeEditor;
