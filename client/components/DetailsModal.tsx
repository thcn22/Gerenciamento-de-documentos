import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  User,
  Edit,
  FolderOpen,
  FileText,
  User2,
} from "lucide-react";

interface BaseItem {
  id: string;
  name: string;
  created?: string;
  createdBy?: string;
  lastModified?: string;
  lastModifiedBy?: string;
}

interface FolderDetails extends BaseItem {
  type: "folder";
  color?: string;
  description?: string;
  documentCount?: number;
}

interface DocumentDetails extends BaseItem {
  type: "document";
  size?: string;
  mimeType?: string;
  owner?: string;
}

type ItemDetails = FolderDetails | DocumentDetails;

interface DetailsModalProps {
  item: ItemDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DetailsModal({
  item,
  isOpen,
  onClose,
}: DetailsModalProps) {
  if (!item) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("pt-BR");
    } catch {
      return "Data inválida";
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="w-5 h-5 text-gray-500" />;

    if (mimeType.includes("pdf")) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) {
      return <FileText className="w-5 h-5 text-green-500" />;
    } else if (mimeType.includes("word") || mimeType.includes("doc")) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else {
      return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {item.type === "folder" ? (
              <div className="flex items-center gap-2">
                <FolderOpen
                  className="w-6 h-6"
                  style={{ color: (item as FolderDetails).color || "#6b7280" }}
                />
                <span>Detalhes da Pasta</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {getFileIcon((item as DocumentDetails).mimeType)}
                <span>Detalhes do Documento</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informações Básicas
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Nome
                </label>
                <p className="text-gray-900 mt-1">{item.name}</p>
              </div>

              {item.type === "folder" && (
                <>
                  {(item as FolderDetails).description && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Descrição
                      </label>
                      <p className="text-gray-900 mt-1">
                        {(item as FolderDetails).description}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Cor
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{
                          backgroundColor:
                            (item as FolderDetails).color || "#6b7280",
                        }}
                      />
                      <span className="text-gray-900">
                        {(item as FolderDetails).color || "#6b7280"}
                      </span>
                    </div>
                  </div>
                  {(item as FolderDetails).documentCount !== undefined && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Itens na Pasta
                      </label>
                      <p className="text-gray-900 mt-1">
                        {(item as FolderDetails).documentCount} itens
                      </p>
                    </div>
                  )}
                </>
              )}

              {item.type === "document" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Tipo de Arquivo
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      {getFileIcon((item as DocumentDetails).mimeType)}
                      <span className="text-gray-900">
                        {(item as DocumentDetails).mimeType || "Desconhecido"}
                      </span>
                    </div>
                  </div>
                  {(item as DocumentDetails).size && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Tamanho
                      </label>
                      <p className="text-gray-900 mt-1">
                        {(item as DocumentDetails).size}
                      </p>
                    </div>
                  )}
                  {(item as DocumentDetails).owner && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Proprietário
                      </label>
                      <p className="text-gray-900 mt-1">
                        {(item as DocumentDetails).owner}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Audit Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Histórico de Alterações
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Criado</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(item.created)}
                  </p>
                  {item.createdBy && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        por {item.createdBy}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-start gap-3">
                  <Edit className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Última Modificação
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(item.lastModified)}
                    </p>
                    {item.lastModifiedBy && (
                      <div className="flex items-center gap-1 mt-1">
                        <User2 className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          por {item.lastModifiedBy}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Type Badge */}
          <div className="flex justify-start">
            <Badge variant="outline" className="flex items-center gap-2">
              {item.type === "folder" ? (
                <>
                  <FolderOpen className="w-3 h-3" />
                  Pasta
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3" />
                  Documento
                </>
              )}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { ItemDetails, FolderDetails, DocumentDetails };
