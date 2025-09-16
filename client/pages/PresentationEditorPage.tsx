import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/contexts/AuthContext';
// PresentationEditor temporarily disabled
import { ArrowLeft, Monitor } from 'lucide-react';

export default function PresentationEditorPage() {
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
      const response = await authedFetch(`/api/documents/presentation/${id}`);
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
          <p className="mt-4 text-slate-600">Carregando editor de apresentação...</p>
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
          <Monitor className="w-5 h-5 text-purple-500 mr-2" />
          <span className="font-medium">Editor de Apresentação</span>
        </div>
      </div>

      {/* Editor - Coming Soon */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Monitor className="w-16 h-16 text-purple-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Editor de Apresentação</h2>
          <p className="text-slate-500 mb-4">Em breve! Use os editores de texto e planilha disponíveis.</p>
          <Link to="/">
            <Button>Voltar ao Início</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
