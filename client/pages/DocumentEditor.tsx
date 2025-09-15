import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  FileSpreadsheet, 
  Download,
  Share2,
  Eye,
  Plus,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table,
  Image,
  Link as LinkIcon
} from "lucide-react";

interface TableCell {
  content: string;
  style?: string;
}

interface TableRow {
  cells: TableCell[];
}

interface ExcelData {
  rows: TableRow[];
}

export default function DocumentEditor() {
  const { type } = useParams<{ type: 'word' | 'excel' }>();
  const navigate = useNavigate();
  
  const [documentName, setDocumentName] = useState(
    type === 'word' ? 'Novo Documento.docx' : 'Nova Planilha.xlsx'
  );
  const [wordContent, setWordContent] = useState('');
  const [excelData, setExcelData] = useState<ExcelData>({
    rows: Array.from({ length: 20 }, () => ({
      cells: Array.from({ length: 10 }, () => ({ content: '' }))
    }))
  });

  const saveDocument = async () => {
    try {
      const endpoint = type === 'word' ? '/api/create/word' : '/api/create/excel';
      const payload = type === 'word'
        ? { name: documentName, content: wordContent }
        : { name: documentName, data: excelData };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar documento');
      }

      const result = await response.json();
      console.log('Document saved:', result);

      // Navigate to the created document viewer
      if (result.document && result.document.id) {
        navigate(`/document/${result.document.id}`);
      } else {
        navigate('/');
      }

    } catch (error) {
      console.error('Save error:', error);
      toast({ title: `Erro ao salvar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}` });
    }
  };

  const updateExcelCell = (rowIndex: number, cellIndex: number, content: string) => {
    setExcelData(prev => ({
      ...prev,
      rows: prev.rows.map((row, rIdx) =>
        rIdx === rowIndex
          ? {
              ...row,
              cells: row.cells.map((cell, cIdx) =>
                cIdx === cellIndex ? { ...cell, content } : cell
              )
            }
          : row
      )
    }));
  };

  const addExcelRow = () => {
    setExcelData(prev => ({
      ...prev,
      rows: [...prev.rows, {
        cells: Array.from({ length: 10 }, () => ({ content: '' }))
      }]
    }));
  };

  const addExcelColumn = () => {
    setExcelData(prev => ({
      ...prev,
      rows: prev.rows.map(row => ({
        ...row,
        cells: [...row.cells, { content: '' }]
      }))
    }));
  };

  const getColumnLabel = (index: number) => {
    let result = '';
    let num = index;
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  };

  if (!type || (type !== 'word' && type !== 'excel')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-4">Tipo de documento inválido</h2>
            <Link to="/">
              <Button>Voltar ao início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              
              <div className="flex items-center space-x-3">
                {type === 'word' ? (
                  <FileText className="w-8 h-8 text-blue-500" />
                ) : (
                  <FileSpreadsheet className="w-8 h-8 text-green-500" />
                )}
                <div>
                  <Input 
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="text-lg font-semibold border-none bg-transparent px-0 focus-visible:ring-0"
                  />
                  <p className="text-sm text-slate-500">
                    {type === 'word' ? 'Documento Word' : 'Planilha Excel'} • Não salvo
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </Button>
              
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              
              <Button onClick={saveDocument} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {type === 'word' ? (
          <div className="space-y-6">
            {/* Word Editor Toolbar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center border-r pr-4 mr-4">
                    <Select defaultValue="arial">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arial">Arial</SelectItem>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                        <SelectItem value="courier">Courier New</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select defaultValue="12">
                      <SelectTrigger className="w-16 ml-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="14">14</SelectItem>
                        <SelectItem value="16">16</SelectItem>
                        <SelectItem value="18">18</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1 border-r pr-4 mr-4">
                    <Button variant="ghost" size="sm">
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Underline className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1 border-r pr-4 mr-4">
                    <Button variant="ghost" size="sm">
                      <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <AlignRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Table className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Image className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Word Editor */}
            <Card>
              <CardContent className="p-0">
                <Textarea
                  value={wordContent}
                  onChange={(e) => setWordContent(e.target.value)}
                  placeholder="Comece a escrever seu documento aqui..."
                  className="min-h-[600px] border-none resize-none focus-visible:ring-0 text-base leading-relaxed p-8"
                  style={{ 
                    fontFamily: 'inherit',
                    lineHeight: '1.6'
                  }}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Excel Editor Toolbar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={addExcelRow}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Linha
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={addExcelColumn}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Coluna
                  </Button>

                  <div className="border-l pl-4 ml-4">
                    <Button variant="ghost" size="sm">
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Underline className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="border-l pl-4 ml-4">
                    <Select defaultValue="sum">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">SOMA</SelectItem>
                        <SelectItem value="average">MÉDIA</SelectItem>
                        <SelectItem value="count">CONTAR</SelectItem>
                        <SelectItem value="max">MÁXIMO</SelectItem>
                        <SelectItem value="min">MÍNIMO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Excel Grid */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[600px]">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="w-12 h-8 border border-slate-300 bg-slate-100 text-xs font-medium text-slate-600"></th>
                        {excelData.rows[0]?.cells.map((_, cellIndex) => (
                          <th key={cellIndex} className="min-w-24 h-8 border border-slate-300 bg-slate-100 text-xs font-medium text-slate-600">
                            {getColumnLabel(cellIndex)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td className="w-12 h-8 border border-slate-300 bg-slate-100 text-xs font-medium text-slate-600 text-center">
                            {rowIndex + 1}
                          </td>
                          {row.cells.map((cell, cellIndex) => (
                            <td key={cellIndex} className="border border-slate-300 p-0">
                              <Input
                                value={cell.content}
                                onChange={(e) => updateExcelCell(rowIndex, cellIndex, e.target.value)}
                                className="border-none rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                                placeholder=""
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-sm text-slate-600">
            <div className="flex items-center space-x-4">
              <span>
                {type === 'word' 
                  ? `${wordContent.length} caracteres` 
                  : `${excelData.rows.length} linhas × ${excelData.rows[0]?.cells.length || 0} colunas`
                }
              </span>
              <span>•</span>
              <span>Última modificação: agora mesmo</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <span className="text-green-600">• Salvamento automático ativo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
