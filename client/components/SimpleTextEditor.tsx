import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedFetch } from '@/contexts/AuthContext';
import { 
  Save, 
  Download, 
  FileText, 
  Bold, 
  Italic, 
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Type
} from 'lucide-react';

interface SimpleTextEditorProps {
  documentId?: string;
  folderId?: string;
  initialContent?: string;
  initialTitle?: string;
  onSave?: (content: string, title: string) => void;
}

export default function SimpleTextEditor({ 
  documentId, 
  folderId = 'root', 
  initialContent = '', 
  initialTitle = 'Novo Documento',
  onSave 
}: SimpleTextEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const navigate = useNavigate();
  const authedFetch = useAuthenticatedFetch();

  const updateWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    updateWordCount(value);
  };

  const saveDocument = async () => {
    setIsSaving(true);
    
    try {
      const documentData = {
        title,
        content,
        html: content.replace(/\n/g, '<br>'),
        text: content,
        folderId,
        type: 'text-document'
      };

      let response;
      if (documentId) {
        response = await authedFetch(`/api/documents/text/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData)
        });
      } else {
        response = await authedFetch('/api/documents/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData)
        });
      }

      if (response.ok) {
        const result = await response.json();
        setLastSaved(new Date());
        
        if (onSave) {
          onSave(content, title);
        }
        
        if (!documentId && result.document) {
          navigate(`/text-editor/${result.document.id}`);
        }
      } else {
        throw new Error('Erro ao salvar documento');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Erro ao salvar documento' });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadDocument = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            background: white;
            color: #333;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
          }
          .content {
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p style="color: #666; margin-bottom: 30px;">Criado em ${new Date().toLocaleDateString('pt-BR')} - DocManager</p>
        <div class="content">${content.replace(/\n/g, '<br>')}</div>
        <div class="footer">
          <p>Documento gerado pelo DocManager</p>
          <p>Palavras: ${wordCount} | Caracteres: ${content.length}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    updateWordCount(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <FileText className="w-6 h-6 text-blue-500" />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium border-none bg-transparent px-0 focus-visible:ring-0 flex-1"
              placeholder="Título do documento"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <Badge variant="outline" className="text-xs">
                Salvo {lastSaved.toLocaleTimeString()}
              </Badge>
            )}
            <Button
              onClick={saveDocument}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={downloadDocument}>
              <Download className="w-4 h-4 mr-2" />
              HTML
            </Button>
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center space-x-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => insertText('**', '**')}
            title="Negrito (Markdown)"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => insertText('*', '*')}
            title="Itálico (Markdown)"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => insertText('# ', '')}
            title="Título"
          >
            <Type className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => insertText('- ', '')}
            title="Lista"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center space-x-4">
            <span>Palavras: {wordCount}</span>
            <span>Caracteres: {content.length}</span>
          </div>
          <div>
            Editor de Texto Simples
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4">
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Comece a escrever seu documento aqui..."
          className="w-full h-full resize-none border-none focus-visible:ring-0 text-base leading-relaxed"
          style={{ minHeight: 'calc(100vh - 250px)' }}
        />
      </div>
    </div>
  );
}
