import { useEffect, useMemo, useState } from 'react';
import { useAuthenticatedFetch } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DocumentPreview from '@/components/DocumentPreview';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReviewQueue() {
  const authFetch = useAuthenticatedFetch();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [rejectNotesMap, setRejectNotesMap] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/reviews/pending');
      const data = await res.json();
      if (data.success) setItems(data.submissions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id: string, action: 'approve' | 'reject') => {
    const body: any = action === 'reject' ? { notes: (rejectNotesMap[id] || '') } : {};
    const res = await authFetch(`/api/reviews/${id}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
  toast({ title: data.message || (action === 'approve' ? 'Aprovado' : 'Rejeitado') });
    setRejectNotesMap((m) => ({ ...m, [id]: '' }));
    load();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fila de Aprovação</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="inline-flex items-center gap-2">
              <X className="w-4 h-4" /> Fechar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? 'Carregando...' : (
            <div className="space-y-3">
              {items.length === 0 && <div>Nenhum envio pendente.</div>}
              {items.map((s: any) => (
                <div key={s.id} className="border p-3 rounded-md bg-white" style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{s.originalName}</div>
                      <div className="text-sm text-slate-500">
                        Por: {s.uploadedBy} • Caminho: {Array.isArray(s.folderPath) ? s.folderPath.join(' / ') : s.targetFolderId}
                        {' '}• {new Date(s.uploadedAt).toLocaleString('pt-BR')}
                      </div>
                      {s.changeNotes && (
                        <div className="text-xs text-slate-600 mt-1">
                          <span className="font-medium">Justificativa do revisor:</span> {s.changeNotes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setSelected(s); setShowPreview(true); }}>Visualizar</Button>
                      <Button onClick={() => act(s.id, 'approve')}>Aprovar</Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <textarea
                      className="w-full border rounded-md p-2 text-sm review-justificativa"
                      placeholder="Justificativa (obrigatória ao rejeitar)"
                      rows={2}
                      value={rejectNotesMap[s.id] || ''}
                      onChange={(e) => setRejectNotesMap((m) => ({ ...m, [s.id]: e.target.value }))}
                    />
                    <div className="flex justify-end mt-2">
                      <Button variant="secondary" onClick={() => act(s.id, 'reject')} disabled={!((rejectNotesMap[s.id] || '').trim())}>Rejeitar</Button>
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
