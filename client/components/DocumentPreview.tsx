import React, { useEffect, useMemo, useRef, useState } from "react";
import AppLoader from "@/components/AppLoader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth, useAuthenticatedFetch } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PreviewDoc = {
  id: string;
  name: string;
  mimeType?: string;
  previewUrl?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: PreviewDoc | null;
}

const DocumentPreview: React.FC<Props> = ({ isOpen, onClose, document }) => {
  const { token, isAdmin, isApprover } = useAuth();
  const canUseVersions = !!isAdmin || !!isApprover;
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [versions, setVersions] = useState<Array<{ version: number; label: string; isCurrent: boolean }>>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const authedFetch = useAuthenticatedFetch();

  const mime = document?.mimeType || "";
  const isOffice = useMemo(() => {
    if (!document) return false;
    const lower = (document.name || "").toLowerCase();
    const officeMimes = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.oasis.opendocument.presentation",
      "text/csv",
      "text/plain",
    ];
    const officeExts = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp", ".csv", ".txt"];
    return officeMimes.some((m) => mime === m || mime.startsWith("application/vnd.openxml")) ||
           officeExts.some((ext) => lower.endsWith(ext));
  }, [document, mime]);

  useEffect(() => {
    // Controla overlay e timeout quando o modal abre para docs Office
    if (isOpen && document && isOffice) {
      setPreviewLoading(true);
      setPreviewError(null);
      // Timeout de segurança: se demorar muito, mostra erro amigável
      timeoutRef.current = window.setTimeout(() => {
        setPreviewLoading(false);
        setPreviewError("Não foi possível carregar a pré-visualização. Tente novamente ou faça o download.");
      }, 20000);
    } else {
      setPreviewLoading(false);
      setPreviewError(null);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isOpen, document, isOffice]);

  // Carregar versões quando abrir o modal ou mudar documento
  useEffect(() => {
    const loadVersions = async () => {
      if (!isOpen || !document || !canUseVersions) return;
      try {
  const resp = await authedFetch(`/api/files/documents/${document.id}/versions`);
        if (!resp.ok) return;
        const data = await resp.json();
        const list = (data?.versions || []) as Array<{ version: number; label: string; isCurrent: boolean }>;
        setVersions(list);
        // Versão padrão: a mais recente (assumindo ordenação desc no backend)
        if (list.length) {
          setSelectedVersion(list[0].version);
        } else {
          setSelectedVersion(1);
        }
      } catch (e) {
        // silenciar erro; fallback para versão null (atual)
      }
    };
    loadVersions();
    if (!canUseVersions) {
      setVersions([]);
      setSelectedVersion(null);
    }
  }, [isOpen, document?.id, canUseVersions]);

  // Ao trocar a versão manualmente, se for Office, reexibir overlay
  useEffect(() => {
    if (!isOpen || !document) return;
    if (isOffice) setPreviewLoading(true);
  }, [selectedVersion]);

  const buildSrc = () => {
    if (!document) return "";
    // Monta URL base conforme tipo
    const basePath = isOffice
      ? `/api/files/documents/${document.id}/preview`
      : (document.previewUrl ? document.previewUrl : `/api/files/documents/${document.id}/view`);
    const url = new URL(basePath, window.location.origin);
    // Anexa versão somente para perfis autorizados
    if (canUseVersions && selectedVersion) {
      url.searchParams.set("version", String(selectedVersion));
    }
    // Anexa token para permitir autenticação via query nos iframes
    if (token) {
      url.searchParams.set("token", token);
    }
    return url.toString();
  };

  const renderContent = () => {
    if (!document) return null;
    const src = buildSrc();

    if (mime === "application/pdf" || (!isOffice && mime.startsWith("text/"))) {
      return (
        <div className="relative">
          <iframe src={src} className="w-full h-[75vh] border-0" title={document.name} />
        </div>
      );
    }
    if (!isOffice && mime.startsWith("image/")) {
      return (
        <div className="flex items-center justify-center h-[75vh] p-2 bg-slate-50">
          <img src={src} alt={document.name} className="max-w-full max-h-full object-contain" />
        </div>
      );
    }

    if (isOffice) {
      return (
        <div className="relative">
          <iframe
            src={src}
            className="w-full h-[75vh] border-0"
            title={`${document.name} (pré-visualização)`}
            onLoad={() => {
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              setPreviewLoading(false);
            }}
          />

          {previewLoading && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
              <AppLoader size="lg" alt="Convertendo" label="Convertendo documento… isso pode levar alguns segundos" />
            </div>
          )}

          {previewError && (
            <div className="absolute inset-0 bg-background/90 flex items-center justify-center p-6">
              <div className="text-sm text-foreground text-center max-w-md">
                {previewError}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="p-6 text-sm text-muted-foreground">
        Pré-visualização não disponível para este tipo de arquivo.
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate">{document?.name || "Visualizar documento"}</DialogTitle>
              <DialogDescription>Pré-visualização dentro da página</DialogDescription>
            </div>
            {canUseVersions && versions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Versão</span>
                <Select
                  value={selectedVersion ? String(selectedVersion) : undefined}
                  onValueChange={(val) => setSelectedVersion(Number(val))}
                >
                  <SelectTrigger className="w-60">
                    <SelectValue placeholder="Selecionar versão" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.version} value={String(v.version)}>
                        {v.label}{v.version === versions[0].version ? ' • atual' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;
