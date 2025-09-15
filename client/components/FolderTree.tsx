import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  FolderPlus,
  FolderOpen,
  MoreHorizontal,
  Edit,
  Trash2,
  Move,
  Scissors,
  Clipboard as ClipboardIcon,
  ChevronRight,
  ChevronDown,
  FileText,
  Home,
  Info,
} from "lucide-react";
import ContextMenu, { useContextMenu } from "@/components/ContextMenu";
import { Checkbox } from "@/components/ui/checkbox";
import DetailsModal, { FolderDetails } from "@/components/DetailsModal";
import { useAuth, useAuthenticatedFetch } from "@/contexts/AuthContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/hooks/use-toast";

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  created?: string;
  createdBy?: string;
  lastModified?: string;
  lastModifiedBy?: string;
  color?: string;
  description?: string;
  children?: FolderNode[];
  documentCount?: number;
}


interface FolderTreeProps {
  currentFolderId: string;
  onFolderSelect: (folderId: string) => void;
  onFolderCreate?: () => void;
  onFolderUpdate?: () => void;
  sortBy?: "date-desc" | "date-asc" | "name-asc" | "name-desc";
  // Multi-select support
  selectionMode?: boolean;
  selectedFolderIds?: Set<string>;
  onToggleFolderSelect?: (folderId: string) => void;
  // External refresh signal
  refreshKey?: number;
  // Clipboard from parent (optional)
  folderClipboard?: { ids: string[]; action: 'copy' | 'cut' } | null;
  setFolderClipboard?: (c: { ids: string[]; action: 'copy' | 'cut' } | null) => void;
  // Order of children for the currently open folder (ids array) to mirror main area
  mainChildOrder?: string[];
}

export default function FolderTree({
  currentFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderUpdate,
  sortBy = "name-asc",
  selectionMode = false,
  selectedFolderIds = new Set<string>(),
  onToggleFolderSelect,
  refreshKey,
  folderClipboard,
  setFolderClipboard,
  mainChildOrder,
}: FolderTreeProps) {
  const { isAdmin, user, isApprover } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["root"]),
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState("root");
  const [newFolderColor, setNewFolderColor] = useState("#6b7280");
  const [editingFolder, setEditingFolder] = useState<FolderNode | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [movingFolder, setMovingFolder] = useState<FolderNode | null>(null);

  const colors = [
    { name: "Azul", value: "#3b82f6" },
    { name: "Verde", value: "#10b981" },
    { name: "Vermelho", value: "#ef4444" },
    { name: "Amarelo", value: "#f59e0b" },
    { name: "Roxo", value: "#8b5cf6" },
    { name: "Rosa", value: "#ec4899" },
    { name: "Cinza", value: "#6b7280" },
    { name: "Laranja", value: "#f97316" },
  ];

  useEffect(() => {
    loadFolders();
  }, []);

  // When currentFolderId changes (e.g., user opened a folder in main area),
  // expand ancestors so the selected folder is visible in the sidebar.
  useEffect(() => {
    if (!currentFolderId || currentFolderId === 'root') return;
    const findPathToFolder = (id: string, nodes: FolderNode[]): string[] | null => {
      for (const n of nodes) {
        if (n.id === id) return [n.id];
        if (n.children && n.children.length > 0) {
          const childPath = findPathToFolder(id, n.children as FolderNode[]);
          if (childPath) return [n.id, ...childPath];
        }
      }
      return null;
    };

    const path = findPathToFolder(currentFolderId, folders);
    if (path && path.length > 0) {
      const newExpanded = new Set(expandedFolders);
      path.forEach((p) => newExpanded.add(p));
      setExpandedFolders(newExpanded);
    }
  }, [currentFolderId, folders]);

  // Scroll the selected folder into view when it becomes current
  useEffect(() => {
    try {
      const el = document.getElementById(`folder-node-${currentFolderId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      // ignore
    }
  }, [currentFolderId]);

  // Refresh folders when the key changes (external changes)
  useEffect(() => {
    if (typeof refreshKey !== 'undefined') {
      loadFolders();
    }
  }, [refreshKey]);

  const loadFolders = async () => {
    try {
      const response = await authenticatedFetch("/api/folders");
      if (response.ok) {
        const result = await response.json();
        setFolders(result.folders);
      }
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  };

  // Função para ordenar pastas recursivamente
  function sortFolders(list: FolderNode[]): FolderNode[] {
    const arr = [...list];
    const toTime = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
    arr.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" });
        case "name-desc":
          return b.name.localeCompare(a.name, "pt-BR", { numeric: true, sensitivity: "base" });
        case "date-asc":
          return toTime(a.created) - toTime(b.created);
        case "date-desc":
          return toTime(b.created) - toTime(a.created);
        default:
          return 0;
      }
    });
    return arr.map(f => ({ ...f, children: f.children ? sortFolders(f.children) : [] }));
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await authenticatedFetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
            parentId: newFolderParent || currentFolderId || 'root',
          color: newFolderColor,
        }),
      });

      if (response.ok) {
        setNewFolderName("");
        setNewFolderParent("root");
        setNewFolderColor("#6b7280");
        setShowCreateDialog(false);
  // reload and ensure the parent is expanded and selected
  await loadFolders();
  const parentId = newFolderParent || currentFolderId || 'root';
  const newExpanded = new Set(expandedFolders);
  newExpanded.add(parentId);
  setExpandedFolders(newExpanded);
  onFolderCreate?.();
      }
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const updateFolder = async (folder: FolderNode) => {
    try {
      const response = await authenticatedFetch(`/api/folders/${folder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folder.name,
          color: folder.color,
          description: folder.description,
        }),
      });

      if (response.ok) {
        setEditingFolder(null);
        loadFolders();
        onFolderUpdate?.();
      }
    } catch (error) {
      console.error("Error updating folder:", error);
    }
  };

  const confirm = useConfirm();

  const deleteFolder = async (folderId: string) => {
    const confirmed = await confirm(
      "Tem certeza que deseja excluir esta pasta? Os documentos serão movidos para a pasta raiz.",
    );
    if (!confirmed) return;

    try {
      const response = await authenticatedFetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadFolders();
        if (currentFolderId === folderId) {
          onFolderSelect("root");
        }
        onFolderUpdate?.();
        toast({ title: 'Pasta excluída', description: 'A pasta foi movida para a lixeira.' });
      } else {
        const err = await response.text();
        toast({ title: 'Erro', description: err || 'Não foi possível excluir a pasta.' });
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast({ title: 'Erro', description: 'Erro ao excluir pasta' });
    }
  };

  const toggleExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderContextMenu = (
    event: React.MouseEvent,
    folder: FolderNode,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedFolder(folder);
    showContextMenu(event);
  };

  const getContextMenuItems = (folder: FolderNode) => [
    {
      id: "details",
      label: "Ver Detalhes",
      icon: <Info className="w-4 h-4" />,
      onClick: () => {
        setSelectedFolder(folder);
        setShowDetailsModal(true);
      },
    },
    {
      id: "rename",
      label: "Renomear",
      icon: <Edit className="w-4 h-4" />,
      onClick: () => setEditingFolder(folder),
    },
    {
      id: "new-subfolder",
      label: "Nova Subpasta",
      icon: <FolderPlus className="w-4 h-4" />,
      onClick: () => {
        setNewFolderParent(folder.id);
        setShowCreateDialog(true);
      },
    },
    {
      id: "move",
      label: "Mover",
      icon: <Move className="w-4 h-4" />,
      adminOnly: true,
      onClick: () => setMovingFolder(folder),
    },
    {
      id: 'copy',
      label: 'Copiar',
      icon: <Folder className="w-4 h-4" />,
      onClick: () => {
        const ids = selectedFolderIds && selectedFolderIds.size > 0 ? Array.from(selectedFolderIds) : [folder.id];
        setFolderClipboard?.({ ids, action: 'copy' });
      }
    },
    {
      id: 'cut',
      label: 'Recortar',
      icon: <Scissors className="w-4 h-4" />,
      onClick: () => {
        const ids = selectedFolderIds && selectedFolderIds.size > 0 ? Array.from(selectedFolderIds) : [folder.id];
        setFolderClipboard?.({ ids, action: 'cut' });
      }
    },
    (() => {
      const canApproverDelete = isApprover && user?.email && folder.createdBy === user.email;
      return {
        id: "delete",
        label: "Excluir",
        icon: <Trash2 className="w-4 h-4" />,
        className: "text-red-600 hover:text-red-700 hover:bg-red-50",
        // visible to admin; and to approver if they created the folder
        adminOnly: !canApproverDelete, // if approver owns, don't require admin flag
        onClick: () => deleteFolder(folder.id),
      } as const;
    })(),
  ];

  const renderFolder = (
    folder: FolderNode,
    level: number = 0,
    isLast: boolean = false,
  ) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = currentFolderId === folder.id;

    return (
      <div key={folder.id} id={`folder-node-${folder.id}`}>
        <div
          className={`flex items-center gap-1 p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group ${
            isSelected ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 shadow-sm" : ""
          }`}
          style={{
            paddingLeft: `${8 + level * 16}px`,
            borderLeft: level > 0 ? "2px solid hsl(var(--border))" : "none",
            marginLeft: level > 0 ? "8px" : "0",
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.08)',
          }}
          onClick={() => {
            if (selectionMode && folder.id !== 'root') {
              onToggleFolderSelect?.(folder.id);
            } else {
              onFolderSelect(folder.id);
            }
          }}
          onContextMenu={(e) =>
            folder.id !== "root" && handleFolderContextMenu(e, folder)
          }
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto w-4 hover:bg-slate-200 dark:hover:bg-slate-700 rounded z-10"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(folder.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </Button>
          ) : (
            <div className="w-4 flex justify-center">
              <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
            </div>
          )}

          {folder.id === "root" ? (
            <Home className="w-4 h-4 text-blue-500 mr-2" />
          ) : isExpanded ? (
            <FolderOpen
              className="w-4 h-4 mr-2"
              style={{ color: folder.color }}
            />
          ) : (
            <Folder className="w-4 h-4 mr-2" style={{ color: folder.color }} />
          )}

          {selectionMode && folder.id !== 'root' && (
            <Checkbox
              className="mr-2"
              checked={selectedFolderIds.has(folder.id)}
              onCheckedChange={() => onToggleFolderSelect?.(folder.id)}
            />
          )}

          <span
            className={`flex-1 text-sm truncate ${isSelected ? "font-medium text-blue-700 dark:text-blue-300" : "text-foreground"}`}
          >
            {folder.name}
          </span>

          {folder.documentCount !== undefined && folder.documentCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {folder.documentCount}
            </Badge>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {(() => {
              // Ensure children use the sidebar's sort order by default
              let childrenToRender = folder.children ? sortFolders(folder.children) : [];
              // If this folder is the one currently shown in main area and a mainChildOrder
              // was provided, reorder children to match that order (keep extras at end).
              // However, if the sidebar is using a name-based sort, prefer the sidebar order
              // and do NOT mirror the main area ordering to avoid confusing rearrangements
              // when the user expects alphabetical order.
              if (
                folder.id === currentFolderId &&
                mainChildOrder &&
                mainChildOrder.length > 0 &&
                !sortBy.startsWith("name")
              ) {
                const map = new Map((childrenToRender || []).map((c) => [c.id, c]));
                const ordered: FolderNode[] = [];
                for (const id of mainChildOrder) {
                  const node = map.get(id);
                  if (node) {
                    ordered.push(node);
                    map.delete(id);
                  }
                }
                // append any remaining children preserving original order
                for (const c of childrenToRender) if (map.has(c.id)) ordered.push(c);
                childrenToRender = ordered;
              }
              return childrenToRender.map((child, index) => {
                const isLastChild = index === (childrenToRender || []).length - 1;
                return renderFolder(child, level + 1, isLastChild);
              });
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Pastas</h3>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const parent = selectedFolder?.id || currentFolderId || 'root';
                  setNewFolderParent(parent);
                }}
              >
                <FolderPlus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Pasta</DialogTitle>
                <DialogDescription>
                  Crie uma nova pasta para organizar seus documentos
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="folder-name">Nome da Pasta</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Digite o nome da pasta"
                  />
                </div>

                <div>
                  <Label>Cor da Pasta</Label>
                  <div className="flex gap-2 mt-2">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newFolderColor === color.value
                            ? "border-border"
                            : "border-muted"
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setNewFolderColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <Button onClick={createFolder} className="w-full">
                  Criar Pasta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

  <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
        {sortFolders(folders).map((folder, index) => {
          const isLast = index === folders.length - 1;
          return renderFolder(folder, 0, isLast);
        })}
      </div>

      {/* Edit Folder Dialog */}
      {editingFolder && (
        <Dialog
          open={!!editingFolder}
          onOpenChange={() => setEditingFolder(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Pasta</DialogTitle>
              <DialogDescription>
                Modifique as propriedades da pasta
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-folder-name">Nome da Pasta</Label>
                <Input
                  id="edit-folder-name"
                  value={editingFolder.name}
                  onChange={(e) =>
                    setEditingFolder({
                      ...editingFolder,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Cor da Pasta</Label>
                <div className="flex gap-2 mt-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      className={`w-6 h-6 rounded-full border-2 ${
                        editingFolder.color === color.value
                          ? "border-border"
                          : "border-muted"
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() =>
                        setEditingFolder({
                          ...editingFolder,
                          color: color.value,
                        })
                      }
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={() => updateFolder(editingFolder)}
                className="w-full"
              >
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isVisible={contextMenu.isVisible}
        onClose={hideContextMenu}
        items={selectedFolder ? getContextMenuItems(selectedFolder) : []}
  isAdmin={isAdmin || false}
      />

      {/* Details Modal */}
      <DetailsModal
        item={
          selectedFolder && showDetailsModal
            ? {
                type: "folder" as const,
                id: selectedFolder.id,
                name: selectedFolder.name,
                created: selectedFolder.created,
                createdBy: selectedFolder.createdBy,
                lastModified: selectedFolder.lastModified,
                lastModifiedBy: selectedFolder.lastModifiedBy,
                color: selectedFolder.color,
                description: selectedFolder.description,
                documentCount: selectedFolder.documentCount,
              }
            : null
        }
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Move Folder Dialog */}
      {movingFolder && (
        <Dialog open={!!movingFolder} onOpenChange={() => setMovingFolder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mover Pasta</DialogTitle>
              <DialogDescription>
                Selecione a pasta de destino. Mover para outra pasta de raiz a transforma em subpasta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {/* Opção raiz */}
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={async () => {
                  try {
                    await authenticatedFetch('/api/folders/move-folder', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ folderId: movingFolder.id, newParentId: 'root' }),
                    });
            setMovingFolder(null);
            loadFolders();
            onFolderUpdate?.();
                  } catch (e) {
                    console.error('Error moving folder:', e);
          toast({ title: 'Erro', description: 'Erro ao mover pasta' });
                  }
                }}
              >
                <Home className="w-4 h-4 mr-2 text-blue-600" /> Documentos (Raiz)
              </Button>

              {/* Lista de pastas destino (exclui a própria e descendentes) */}
              {(() => {
                const tree = sortFolders(folders);
                const flatten = (nodes: FolderNode[], level = 0, excludeIds = new Set<string>()): any[] => {
                  return nodes.flatMap((n) => {
                    if (excludeIds.has(n.id)) return [] as any[];
                    const item = { ...n, level };
                    const childExclude = new Set<string>([...excludeIds]);
                    // se o nó é a própria pasta em movimento, adiciona todos os seus filhos ao exclude
                    if (n.id === movingFolder.id) {
                      const collect = (m?: FolderNode) => {
                        if (!m?.children) return;
                        for (const c of m.children) {
                          childExclude.add(c.id);
                          collect(c as FolderNode);
                        }
                      };
                      collect(n);
                    }
                    const children = flatten((n.children || []) as FolderNode[], level + 1, childExclude);
                    return [item, ...children];
                  });
                };
                const flat = flatten(tree).filter(f => f.id !== movingFolder.id);
                return flat.map((f) => (
                  <Button
                    key={f.id}
                    variant="ghost"
                    className="w-full justify-start"
                    style={{ paddingLeft: `${16 + f.level * 16}px` }}
                    onClick={async () => {
                      try {
                        await authenticatedFetch('/api/folders/move-folder', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ folderId: movingFolder.id, newParentId: f.id }),
                        });
                        setMovingFolder(null);
                        loadFolders();
                        onFolderUpdate?.();
                      } catch (e) {
                        console.error('Error moving folder:', e);
                        toast({ title: 'Erro', description: 'Erro ao mover pasta' });
                      }
                    }}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" style={{ color: f.color }} />
                    {f.name}
                    {typeof f.documentCount === 'number' && (
                      <Badge variant="secondary" className="ml-auto text-xs">{f.documentCount}</Badge>
                    )}
                  </Button>
                ));
              })()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMovingFolder(null)}>Cancelar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
