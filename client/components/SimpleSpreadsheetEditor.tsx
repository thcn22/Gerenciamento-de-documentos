import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedFetch } from '@/contexts/AuthContext';
import { 
  Save, 
  Download, 
  FileSpreadsheet, 
  Plus,
  Calculator,
  Table
} from 'lucide-react';

interface Cell {
  value: string;
  formula?: string;
}

interface SimpleSpreadsheetEditorProps {
  documentId?: string;
  folderId?: string;
  initialData?: Cell[][];
  initialTitle?: string;
  onSave?: (data: Cell[][], title: string) => void;
}

export default function SimpleSpreadsheetEditor({ 
  documentId, 
  folderId = 'root', 
  initialData,
  initialTitle = 'Nova Planilha',
  onSave 
}: SimpleSpreadsheetEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const navigate = useNavigate();
  const authedFetch = useAuthenticatedFetch();

  // Initialize with default data or provided data
  const initializeData = (): Cell[][] => {
    if (initialData) return initialData;
    
    const rows = 20;
    const cols = 10;
    const data: Cell[][] = [];
    
    for (let i = 0; i < rows; i++) {
      const row: Cell[] = [];
      for (let j = 0; j < cols; j++) {
        if (i === 0) {
          // Header row
          const headers = ['Item', 'Descrição', 'Quantidade', 'Preço', 'Total', 'Categoria', 'Data', 'Status', 'Obs', 'Extra'];
          row.push({ value: headers[j] || `Col ${j + 1}` });
        } else if (i === 1) {
          // Sample data row
          const sampleData = ['1', 'Produto A', '2', '100', '200', 'Eletrônicos', '01/01/2024', 'Ativo', '', ''];
          row.push({ value: sampleData[j] || '' });
        } else if (i === 2) {
          // Another sample row
          const sampleData = ['2', 'Produto B', '3', '150', '450', 'Casa', '02/01/2024', 'Ativo', '', ''];
          row.push({ value: sampleData[j] || '' });
        } else {
          row.push({ value: '' });
        }
      }
      data.push(row);
    }
    
    return data;
  };

  const [data, setData] = useState<Cell[][]>(initializeData());

  const updateCell = (row: number, col: number, value: string) => {
    const newData = [...data];
    newData[row][col] = { ...newData[row][col], value };
    setData(newData);
  };

  const addRow = () => {
    const newRow: Cell[] = [];
    for (let i = 0; i < data[0].length; i++) {
      newRow.push({ value: '' });
    }
    setData([...data, newRow]);
  };

  const addColumn = () => {
    const newData = data.map(row => [...row, { value: '' }]);
    setData(newData);
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

  const saveSpreadsheet = async () => {
    setIsSaving(true);
    
    try {
      const documentData = {
        title,
        sheets: [{ name: 'Planilha1', data }],
        folderId,
        type: 'spreadsheet'
      };

      let response;
      if (documentId) {
        response = await authedFetch(`/api/documents/spreadsheet/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData)
        });
      } else {
        response = await authedFetch('/api/documents/spreadsheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData)
        });
      }

      if (response.ok) {
        const result = await response.json();
        setLastSaved(new Date());
        
        if (onSave) {
          onSave(data, title);
        }
        
        if (!documentId && result.document) {
          navigate(`/spreadsheet-editor/${result.document.id}`);
        }
      } else {
        throw new Error('Erro ao salvar planilha');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Erro ao salvar planilha' });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadCSV = () => {
    const csvContent = data.map(row => 
      row.map(cell => `"${cell.value.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const calculateSum = (startRow: number, endRow: number, col: number): string => {
    let sum = 0;
    for (let i = startRow; i <= endRow; i++) {
      const value = parseFloat(data[i]?.[col]?.value || '0');
      if (!isNaN(value)) {
        sum += value;
      }
    }
    return sum.toString();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 bg-slate-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <FileSpreadsheet className="w-6 h-6 text-green-500" />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium border-none bg-transparent px-0 focus-visible:ring-0 flex-1"
              placeholder="Título da planilha"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <Badge variant="outline" className="text-xs">
                Salvo {lastSaved.toLocaleTimeString()}
              </Badge>
            )}
            <Button onClick={addRow} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Linha
            </Button>
            <Button onClick={addColumn} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Coluna
            </Button>
            <Button
              onClick={saveSpreadsheet}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Calculator className="w-4 h-4 mr-1" />
              Planilha Simples
            </span>
            <span className="flex items-center">
              <Table className="w-4 h-4 mr-1" />
              {data.length} linhas × {data[0]?.length || 0} colunas
            </span>
          </div>
          <div>
            Editor de Planilha Online
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="w-12 h-8 border border-slate-300 bg-slate-100 text-xs font-medium text-slate-600"></th>
                {data[0]?.map((_, colIndex) => (
                  <th key={colIndex} className="min-w-24 h-8 border border-slate-300 bg-slate-100 text-xs font-medium text-slate-600">
                    {getColumnLabel(colIndex)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="w-12 h-8 border border-slate-300 bg-slate-100 text-xs font-medium text-slate-600 text-center">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border border-slate-300 p-0">
                      <Input
                        value={cell.value}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
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
      </div>
    </div>
  );
}
