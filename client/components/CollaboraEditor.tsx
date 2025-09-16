import { useEffect, useState, useRef } from 'react';
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
  Edit,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CollaboraEditorProps {
  documentId: string;
  mode?: 'edit' | 'view';
  height?: string;
  width?: string;
  onDocumentReady?: () => void;
  onError?: (error: string) => void;
}

const CollaboraEditor: React.FC<CollaboraEditorProps> = ({
  documentId,
  mode = 'edit',
  height = '100vh',
  width = '100%',
  onDocumentReady,
  onError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [isCollaboraAvailable, setIsCollaboraAvailable] = useState(false);

  useEffect(() => {
    loadCollaboraConfig();
  }, [documentId, mode]);

  const loadCollaboraConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if Collabora is available
      const statusResponse = await fetch('/api/collabora/status');
      const statusData = await statusResponse.json();
      setIsCollaboraAvailable(statusData.collaboraAvailable);

      if (!statusData.collaboraAvailable) {
        throw new Error('Collabora Online não está disponível');
      }

      // Get editor configuration
      const configResponse = await fetch(`/api/collabora/config/${documentId}?mode=${mode}`);
      if (!configResponse.ok) {
        throw new Error('Erro ao carregar configuração do documento');
      }

      const configData = await configResponse.json();
      setConfig(configData);

      // Initialize iframe after getting config
      setTimeout(() => {
        if (iframeRef.current && configData.iframeUrl) {
          iframeRef.current.src = configData.iframeUrl;
        }
      }, 100);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleIframeLoad = () => {
    console.log('Collabora iframe loaded');
    setLoading(false);
    onDocumentReady?.();
  };

  const handleIframeError = () => {
    setError('Erro ao carregar editor Collabora');
    setLoading(false);
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
    loadCollaboraConfig();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <img src="/logo.gif" alt="Carregando" className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Carregando Collabora Online</h3>
          <p className="text-slate-500">Preparando o ambiente de edição profissional...</p>
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
              <h3 className="text-lg font-medium text-slate-900 mb-2">Erro no Collabora</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              
              <div className="space-y-2">
                <Button onClick={retryLoad} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                {!isCollaboraAvailable && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Collabora Online não está disponível. Verifique se o servidor está rodando na porta 9980.
                    </AlertDescription>
                  </Alert>
                )}
                
                <Link to="/">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
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
      <div className="border-b border-border px-4 py-2 bg-green-50 dark:bg-green-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {config?.document && getDocumentIcon(config.document.documentType)}
            <div>
              <span className="font-medium text-foreground">
                {config?.document?.filename || `Documento ${documentId}`}
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
                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Collabora Online
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

      {/* Collabora Iframe */}
      <div className="relative" style={{ height: `calc(${height} - 64px)`, width }}>
        {config?.iframeUrl && (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={`Collabora Editor - ${documentId}`}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox"
            allow="clipboard-read; clipboard-write"
          />
        )}
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/75">
            <div className="text-center">
              <img src="/logo.gif" alt="Carregando" className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando editor...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaboraEditor;
