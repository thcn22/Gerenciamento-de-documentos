import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SimpleTextEditor from '@/components/SimpleTextEditor';
import { useAuthenticatedFetch } from '@/contexts/AuthContext';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TextEditorPage() {
  const { id } = useParams();
  const [document, setDocument] = useState<any>(null);
  const authedFetch = useAuthenticatedFetch();
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  const loadDocument = async () => {
    if (!id) return;
    
    try {
      const response = await authedFetch(`/api/documents/text/${id}`);
      if (response.ok) {
        const result = await response.json();
        setDocument(result.document);
      } else {
        console.error('Document not found');
      }
    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.gif" alt="Carregando" className="h-24 w-24" />
          <p className="mt-4 text-slate-600">Carregando editor de texto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-2 flex items-center">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center ml-4">
          <FileText className="w-5 h-5 text-blue-500 mr-2" />
          <span className="font-medium">Editor de Texto</span>
        </div>
      </div>

      {/* Editor */}
      <SimpleTextEditor
        documentId={id}
        initialContent={document?.content || ''}
        initialTitle={document?.title || 'Novo Documento'}
        onSave={() => {
          // Reload document after save if needed
          if (id) loadDocument();
        }}
      />
    </div>
  );
}
