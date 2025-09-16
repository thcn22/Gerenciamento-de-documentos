import { useEffect, useState } from 'react';
import { useAuthenticatedFetch, useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DocumentPreview from '@/components/DocumentPreview';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MySubmissions() {
  const authFetch = useAuthenticatedFetch();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/reviews/mine');
      const data = await res.json();
      if (data.success) setItems(data.submissions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statusBadge = (s: string) => {
    if (s === 'approved') return <Badge className="bg-green-600">Aprovado</Badge>;
    if (s === 'rejected') return <Badge className="bg-red-600">Reprovado</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Meus Envios para Aprovação</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="inline-flex items-center gap-2">
              <X className="w-4 h-4" /> Fechar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? 'Carregando...' : (
            <div className="space-y-3">
              {items.length === 0 && <div>Você ainda não enviou documentos para aprovação.</div>}
              {items.map((s: any) => (
                <div key={s.id} className="border p-3 rounded-md bg-white" style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{s.originalName} {statusBadge(s.status)}</div>
                      <div className="text-sm text-slate-500">
                        Enviado em {new Date(s.uploadedAt).toLocaleString('pt-BR')}
                      </div>
                      {s.changeNotes && (
                        <div className="text-xs text-slate-600 mt-1">
                          <span className="font-medium">Justificativa enviada:</span> {s.changeNotes}
                        </div>
                      )}
                      {s.status === 'rejected' && s.reviewNotes && (
                        <div className="text-xs text-red-700 mt-2">
                          <span className="font-medium">Motivo da reprovação:</span> {s.reviewNotes}
                        </div>
                      )}
                      {s.status === 'approved' && s.reviewNotes && (
                        <div className="text-xs text-green-700 mt-2">
                          <span className="font-medium">Observações:</span> {s.reviewNotes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setSelected(s); setShowPreview(true); }}>Visualizar</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        document={selected ? { id: selected.id, name: selected.originalName, mimeType: selected.mimeType, previewUrl: selected.previewUrl } : null}
      />
    </div>
  );
}
