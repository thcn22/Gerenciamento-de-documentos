import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  FileText, 
  FileSpreadsheet, 
  Monitor,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function CreateDocumentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createDocument = async (type: 'word' | 'cell' | 'slide') => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Try professional editors in order: OnlyOffice -> Collabora

      // First try OnlyOffice
      const onlyOfficeResponse = await fetch(`/api/onlyoffice/sample/${type}`, {
        method: 'POST'
      });

      if (onlyOfficeResponse.ok) {
        const result = await onlyOfficeResponse.json();
        setSuccess(`Documento ${type} criado com OnlyOffice!`);

        // Redirect to OnlyOffice editor
        setTimeout(() => {
          navigate(`/onlyoffice-editor/${result.documentId}?mode=edit`);
        }, 1500);
        return;
      }

      // If OnlyOffice fails, try Collabora
      const collaboraResponse = await fetch(`/api/collabora/sample/${type}`, {
        method: 'POST'
      });

      if (collaboraResponse.ok) {
        const result = await collaboraResponse.json();
        setSuccess(`Documento ${type} criado com Collabora Online!`);

        // Redirect to Collabora editor with smart fallback
        setTimeout(() => {
          navigate(`/collabora-editor/${result.documentId}?mode=edit&editor=smart`);
        }, 1500);
        return;
      }

      // If OnlyOffice fails, create simple document using standard API
      const apiEndpoints = {
        word: '/api/create/word',
        cell: '/api/create/excel',
        slide: '/api/create/powerpoint'
      };

      const createResponse = await fetch(apiEndpoints[type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Novo ${type === 'word' ? 'Documento' : type === 'cell' ? 'Planilha' : 'Apresentação'}.${type === 'cell' ? 'csv' : 'txt'}`,
          folderId: 'root'
        })
      });

      if (createResponse.ok) {
        const result = await createResponse.json();
        setSuccess(`Documento ${type} criado com sucesso!`);

        // Redirect to editor with document ID
        setTimeout(() => {
          if (type === 'word') {
            navigate(`/text-editor/${result.document.id}`);
          } else if (type === 'cell') {
            navigate(`/spreadsheet-editor/${result.document.id}`);
          } else if (type === 'slide') {
            navigate(`/presentation-editor/${result.document.id}`);
          }
        }, 1500);
      } else {
        throw new Error('Erro ao criar documento simples');
      }

    } catch (error) {
      console.error('Error creating document:', error);
      setError('Erro ao criar documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const documentTypes = [
    {
      type: 'word' as const,
      title: 'Documento de Texto',
      description: 'Criar documento estilo Word para texto formatado',
      icon: <FileText className="w-12 h-12 text-blue-500" />,
      color: 'blue'
    },
    {
      type: 'cell' as const,
      title: 'Planilha de Cálculo',
      description: 'Criar planilha estilo Excel para cálculos e dados',
      icon: <FileSpreadsheet className="w-12 h-12 text-green-500" />,
      color: 'green'
    },
    {
      type: 'slide' as const,
      title: 'Apresentação',
      description: 'Criar apresentação estilo PowerPoint com slides',
      icon: <Monitor className="w-12 h-12 text-purple-500" />,
      color: 'purple'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link to="/">
              <Button variant="outline" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Criar Novo Documento</h1>
            <p className="text-slate-600">
              Escolha o tipo de documento que deseja criar. O sistema tentará usar o editor OnlyOffice se disponível, 
              caso contrário usará editores simples.
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Document Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {documentTypes.map((docType) => (
              <Card key={docType.type} className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    {docType.icon}
                  </div>
                  <CardTitle className="text-xl">{docType.title}</CardTitle>
                  <CardDescription>{docType.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={() => createDocument(docType.type)}
                    disabled={loading}
                    className={`w-full h-12 bg-${docType.color}-500 hover:bg-${docType.color}-600`}
                  >
                    {loading ? (
                      <img src="/logo.gif" alt="Carregando" className="w-5 h-5 mr-2" />
                    ) : (
                      <Plus className="w-5 h-5 mr-2" />
                    )}
                    Criar {docType.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Information Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                Informações sobre os Editores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">OnlyOffice (Profissional)</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Compatível com Microsoft Office</li>
                    <li>• Edição colaborativa em tempo real</li>
                    <li>• Recursos avançados de formatação</li>
                    <li>• Requer servidor OnlyOffice configurado</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Editores Simples (Fallback)</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Editor básico de texto</li>
                    <li>• Planilha simples com CSV</li>
                    <li>• Apresentação em texto estruturado</li>
                    <li>• Sempre disponível</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
