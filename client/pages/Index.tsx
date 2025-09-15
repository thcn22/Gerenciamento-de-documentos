import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FolderTree from "@/components/FolderTree";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Scissors, Clipboard } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { useAuth, useAuthenticatedFetch } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Download,
  Share2,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Users,
  Lock,
  FileSpreadsheet,
  Calendar,
  Star,
  Grid3X3,
  List,
  ArrowUpDown,
  LayoutDashboard,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ArrowLeft,
  LogOut,
  Settings,
  User,
  Info,
  Move,
  Menu,
} from "lucide-react";
import ContextMenu, { useContextMenu } from "@/components/ContextMenu";
import DetailsModal, { DocumentDetails } from "@/components/DetailsModal";
import DocumentPreview from "@/components/DocumentPreview";

interface Document {
  id: string;
  name: string;
  type: "pdf" | "doc" | "excel" | "image" | "other";
  size: string;
  sizeBytes?: number;
  lastModified: string;
  owner: string;
  createdBy?: string;
  lastModifiedBy?: string;
  mimeType?: string;
  uploadDate?: string;
  shared: boolean;
  starred: boolean;
  permissions: "view" | "edit" | "admin";
}

interface Subfolder {
  id: string;
  name: string;
  color?: string;
  description?: string;
  created: string;
  documentCount?: number;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Relatório Anual 2024.pdf",
    type: "pdf",
    size: "2.4 MB",
    lastModified: "2 horas atrás",
    owner: "Ana Silva",
    shared: true,
    starred: true,
    permissions: "admin",
  },
  {
    id: "2",
    name: "Planilha Orçamento.xlsx",
    type: "excel",
    size: "1.2 MB",
    lastModified: "1 dia atrás",
    owner: "João Santos",
    shared: false,
    starred: false,
    permissions: "edit",
  },
  {
    id: "3",
    name: "Contrato Fornecedor.docx",
    type: "doc",
    size: "856 KB",
    lastModified: "3 dias atrás",
    owner: "Maria Costa",
    shared: true,
    starred: false,
    permissions: "view",
  },
  {
    id: "4",
    name: "Apresentaç��o Q4.pptx",
    type: "other",
    size: "5.1 MB",
    lastModified: "1 semana atrás",
    owner: "Carlos Lima",
    shared: true,
    starred: true,
    permissions: "edit",
  },
];

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="w-8 h-8 text-red-500" />;
    case "excel":
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    case "doc":
      return <FileText className="w-8 h-8 text-blue-500" />;
    default:
      return <FileText className="w-8 h-8 text-gray-500 dark:text-gray-400" />;
  }
};

export default function Index() {
  const { user, logout, isAdmin, isApprover, token } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [logoVersion] = useState(() => Date.now());
    const logoPrimary = useMemo(() => (import.meta as any).env?.VITE_APP_LOGO || "/logo.png", []);
  const logoWithVersion = useMemo(() => `${logoPrimary}?v=${logoVersion}`, [logoPrimary, logoVersion]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subfolders, setSubfolders] = useState<Subfolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderChanging, setFolderChanging] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "date-desc" | "date-asc" | "name-asc" | "name-desc" | "size-desc" | "size-asc"
  >(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem('docmgr:sortBy');
        if (
          saved === 'date-desc' || saved === 'date-asc' ||
          saved === 'name-asc' || saved === 'name-desc' ||
          saved === 'size-desc' || saved === 'size-asc'
        ) {
          return saved as typeof sortBy;
        }
      }
    } catch {}
  return 'name-asc';
  });
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [currentFolderName, setCurrentFolderName] = useState("Documentos");
  const [folderPath, setFolderPath] = useState<
    Array<{ id: string; name: string }>
  >([{ id: "root", name: "Documentos" }]);
  const [movingDocument, setMovingDocument] = useState<string | null>(null);
  // Moving states placed early so hooks below can reference them safely
  const [movingFolderId, setMovingFolderId] = useState<string | null>(null);
  // Batch move state
  const [movingSelection, setMovingSelection] = useState<{ documents: string[]; folders: string[] } | null>(null);
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [showCreateSubfolderDialog, setShowCreateSubfolderDialog] =
    useState(false);
  const [sharingDocumentId, setSharingDocumentId] = useState<string | null>(null);
  const [sharingSelectedFolders, setSharingSelectedFolders] = useState<Set<string>>(new Set());
  const [sharingTree, setSharingTree] = useState<any[]>([]);
  const [expandedShareNodes, setExpandedShareNodes] = useState<Set<string>>(new Set());
  const [sharingDocumentIds, setSharingDocumentIds] = useState<string[] | null>(null);
  const [managingFoldersDocumentId, setManagingFoldersDocumentId] = useState<string | null>(null);
  const [documentFolders, setDocumentFolders] = useState<any[]>([]);
  const [loadingDocumentFolders, setLoadingDocumentFolders] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [newSubfolderColor, setNewSubfolderColor] = useState("#6b7280");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [showDocumentDetailsModal, setShowDocumentDetailsModal] =
    useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const confirm = useConfirm();
  const [selectedFolderCard, setSelectedFolderCard] = useState<Subfolder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    if (isMobile) setViewMode("list");
  }, [isMobile]);

  // Persistir escolha de ordenação do usuário
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('docmgr:sortBy', sortBy);
      }
    } catch {}
  }, [sortBy]);
  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // documents
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const selectedDocsCount = selectedIds.size;
  const selectedFoldersCount = selectedFolderIds.size;
  const selectedCount = selectedDocsCount + selectedFoldersCount;

  // Reset selection when navigating between pastas
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [currentFolderId]);

  // Prune selection when the list of documentos changes
  useEffect(() => {
    if (!selectionMode) return;
    setSelectedIds((prev) => {
      const currentIds = new Set(documents.map((d) => d.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (currentIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [documents, selectionMode]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to fix encoding issues in document names (UTF-8 decoded as Latin-1)
  const fixEncodingIssues = (name: string): string => {
    try {
      // Convert string to bytes to analyze UTF-8 sequences
      const bytes: number[] = [];
      for (let i = 0; i < name.length; i++) {
        bytes.push(name.charCodeAt(i));
      }
      
      // Check if we have UTF-8 sequences that were interpreted as Latin-1
      let hasUTF8Sequences = false;
      for (let i = 0; i < bytes.length - 1; i++) {
        if (bytes[i] === 195) { // UTF-8 multibyte sequence start
          hasUTF8Sequences = true;
          break;
        }
      }
      
      if (!hasUTF8Sequences) {
        return name; // No UTF-8 issues detected
      }
      
      // Decode UTF-8 sequences back to correct characters
      const result: number[] = [];
      
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        
        // Handle UTF-8 sequences that start with 195 (0xC3)
        if (byte === 195 && i + 1 < bytes.length) {
          const nextByte = bytes[i + 1];
          
          // Map UTF-8 sequences back to correct Unicode code points
          const utf8Map: { [key: number]: number } = {
            135: 199,  // Ç
            131: 195,  // Ã
            137: 201,  // É
            161: 225,  // á
            160: 224,  // à
            163: 227,  // ã
            162: 226,  // â
            169: 233,  // é
            170: 234,  // ê
            173: 237,  // í
            179: 243,  // ó
            181: 245,  // õ
            180: 244,  // ô
            186: 250,  // ú
            167: 231,  // ç
            177: 241,  // ñ
            129: 193,  // Á
            138: 202,  // Ê
            141: 205,  // Í
            147: 211,  // Ó
            149: 213,  // Õ
            148: 212,  // Ô
            154: 218,  // Ú
            145: 209,  // Ñ
          };
          
          if (utf8Map[nextByte]) {
            result.push(utf8Map[nextByte]);
            i++; // Skip next byte as we processed it
            continue;
          }
        }
        
        // Keep other bytes as-is
        result.push(byte);
      }
      
      const fixed = String.fromCharCode(...result);
      if (fixed !== name) {
        console.log('🔧 Fixed encoding client-side:', name, '->', fixed);
      }
      return fixed;
    } catch (e) {
      console.warn('Error fixing encoding for:', name, e);
      return name;
    }
  };

  // Helper function to process document data
  const processDocuments = (documents: any[]): Document[] => {
    return documents.map((doc: any) => ({
      id: doc.id,
      name: fixEncodingIssues(doc.originalName),
      type: doc.mimeType.includes("pdf")
        ? "pdf"
        : doc.mimeType.includes("excel") || doc.mimeType.includes("spreadsheet")
          ? "excel"
          : doc.mimeType.includes("doc") || doc.mimeType.includes("word")
            ? "doc"
            : doc.mimeType.includes("odt")
              ? "doc"
              : doc.mimeType.includes("ods")
                ? "excel"
                : doc.mimeType.includes("odp")
                  ? "other"
                  : "other",
      size: `${(doc.size / 1024 / 1024).toFixed(2)} MB`,
  sizeBytes: Number(doc.size) || 0,
  lastModified: new Date(doc.lastModified || doc.uploadDate).toLocaleDateString("pt-BR"),
      owner: doc.owner,
  createdBy: doc.createdBy || doc.owner,
  lastModifiedBy: doc.lastModifiedBy || doc.owner,
      mimeType: doc.mimeType,
      uploadDate: doc.uploadDate,
      shared: false,
      starred: false,
      permissions: "admin",
    }));
  };

  // Helper to process subfolders from API
  const processSubfolders = (list: any[]): Subfolder[] =>
    list.map((folder: any) => ({
      id: folder.id,
      name: folder.name,
      color: folder.color,
      description: folder.description,
      created: folder.created,
      documentCount: 0,
    }));

  // Shallow-equality helpers to avoid flicker
  const areDocsEqual = (a: Document[], b: Document[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    const mapB = new Map(b.map((d) => [d.id, d]));
    for (const d of a) {
      const o = mapB.get(d.id);
      if (!o) return false;
      if (
        d.name !== o.name ||
        d.sizeBytes !== o.sizeBytes ||
        d.mimeType !== o.mimeType ||
        d.lastModified !== o.lastModified
      )
        return false;
    }
    return true;
  };

  const areFoldersEqual = (a: Subfolder[], b: Subfolder[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    const mapB = new Map(b.map((f) => [f.id, f]));
    for (const f of a) {
      const o = mapB.get(f.id);
      if (!o) return false;
      if (f.name !== o.name || f.color !== o.color || f.created !== o.created)
        return false;
    }
    return true;
  };

  // Load documents from specific folder - optimized version
  const loadDocuments = async (folderId: string = currentFolderId) => {
    try {
      const response = await authenticatedFetch(
        `/api/folders/${folderId}/contents`,
      );
      if (response.ok) {
        const result = await response.json();

        // Update state efficiently
        setCurrentFolderName(result.folder.name || "Documentos");

        // Process subfolders
        const loadedSubfolders: Subfolder[] = result.subfolders.map(
          (folder: any) => ({
            id: folder.id,
            name: folder.name,
            color: folder.color,
            description: folder.description,
            created: folder.created,
            documentCount: 0,
          }),
        );
        setSubfolders(loadedSubfolders);

        // Process documents using helper function
        const loadedDocs = processDocuments(result.documents);
        setDocuments(loadedDocs);

        // Clear cache to ensure fresh data on next navigation
        if (folderHierarchyCache) {
          setFolderHierarchyCache(null);
        }
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      // Simplified fallback
      setDocuments(mockDocuments);
      setSubfolders([]);
    } finally {
      setLoading(false);
    }
  };

  // Load pending review count (admin only)
  const loadPendingCount = async () => {
    try {
      if (!isAdmin && !isApprover) return;
      const response = await authenticatedFetch('/api/reviews/pending/count');
      if (response.ok) {
        const data = await response.json();
        setPendingCount(Number(data.count || 0));
        const el = document.getElementById('review-count-badge');
        if (el) el.classList.toggle('hidden', !(Number(data.count || 0) > 0));
        if (el) el.textContent = String(data.count || 0);
      }
    } catch {}
  };

  useEffect(() => {
    loadPendingCount();
    const t = setInterval(loadPendingCount, 30000);
    return () => clearInterval(t);
  }, [isAdmin, isApprover]);

  useEffect(() => {
    loadDocuments();
  }, []);

  // (moved below)

  // Silent background refresh that doesn't disrupt the user
  const lastFoldersSnapshotRef = useRef<string>("");
  const lastSidebarRefreshAtRef = useRef<number>(0);

  const computeFoldersSnapshot = (folders: any[]): string => {
    // Create a lightweight signature string of the tree
    const out: string[] = [];
    const walk = (nodes: any[], parent: string | null) => {
      for (const n of nodes) {
        out.push(`${n.id}|${n.name}|${parent ?? ""}`);
        if (n.children && n.children.length) walk(n.children, n.id);
      }
    };
    walk(folders, null);
    return out.sort().join(";");
  };

  const inFlightRef = useRef(false);
  const silentRefresh = useCallback(async () => {
    try {
  if (inFlightRef.current) return; // avoid overlapping runs
  if (typeof window !== "undefined" && window.document && window.document.hidden) return; // skip when tab hidden
      if (folderChanging) return; // skip while navigating
      // Skip when user is interacting with modals/menus to avoid disruption
      if (
        showDocumentDetailsModal ||
        previewDoc ||
        movingSelection ||
        movingDocument ||
        movingFolderId ||
        showCreateSubfolderDialog ||
        contextMenu.isVisible
      ) {
        return;
      }

      inFlightRef.current = true;
      const folderIdAtCall = currentFolderId;

      // Refresh current folder contents
      const resp = await authenticatedFetch(`/api/folders/${folderIdAtCall}/contents`);
      if (resp.ok) {
        const result = await resp.json();
        const newFolders = processSubfolders(result.subfolders || []);
        const newDocs = processDocuments(result.documents || []);

        // Only update if there are actual changes
        if (!areFoldersEqual(newFolders, subfolders)) {
          setSubfolders(newFolders);
          // prune selectedFolderIds to existing
          setSelectedFolderIds((prev) => {
            const keep = new Set(newFolders.map((f) => f.id));
            const next = new Set<string>();
            prev.forEach((id) => keep.has(id) && next.add(id));
            return next;
          });
          // keep selectedFolderCard if still exists
          setSelectedFolderCard((prev) => (prev && newFolders.find((f) => f.id === prev.id)) || null);
        }
        if (!areDocsEqual(newDocs, documents)) {
          setDocuments(newDocs);
          // prune selected document IDs
          setSelectedIds((prev) => {
            const keep = new Set(newDocs.map((d) => d.id));
            const next = new Set<string>();
            prev.forEach((id) => keep.has(id) && next.add(id));
            return next;
          });
        }
  }

      // Throttle sidebar refresh checks to at most every 20s
  const now = Date.now();
      if (now - lastSidebarRefreshAtRef.current > 20000) {
        const r = await authenticatedFetch("/api/folders");
        if (r.ok) {
          const json = await r.json();
          const snap = computeFoldersSnapshot(json.folders || []);
          if (snap && snap !== lastFoldersSnapshotRef.current) {
            lastFoldersSnapshotRef.current = snap;
            setSidebarRefreshKey((k) => k + 1);
          }
        }
        lastSidebarRefreshAtRef.current = now;
      }
    } catch (e) {
      // Silent fail; don't disturb user
    } finally {
      inFlightRef.current = false;
    }
  }, [authenticatedFetch, contextMenu.isVisible, currentFolderId, documents, folderChanging, movingDocument, movingFolderId, movingSelection, previewDoc, showCreateSubfolderDialog, showDocumentDetailsModal, subfolders]);

  useEffect(() => {
    const id = setInterval(silentRefresh, 12000); // ~12s
    return () => clearInterval(id);
  }, [silentRefresh]);

  // Realtime SSE subscription for instant updates (after silentRefresh is defined)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(token ? `/api/realtime/events?token=${encodeURIComponent(token)}` : '/api/realtime/events');
      es.onmessage = async (e) => {
        try {
          const evt = JSON.parse(e.data);
          if (!evt || !evt.type) return;
          if (evt.type.startsWith('folder:') || evt.type.startsWith('document:')) {
            await silentRefresh();
          }
        } catch {}
      };
    } catch {}
    return () => {
      try { es?.close(); } catch {}
    };
  }, [silentRefresh, token]);

  // Trigger an immediate refresh when the user refocuses the tab/window
  useEffect(() => {
    const onFocus = () => silentRefresh();
    const onVisibility = () => {
      if (typeof window !== 'undefined' && window.document && !window.document.hidden) silentRefresh();
    };
    window.addEventListener('focus', onFocus);
    window.document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [silentRefresh]);

  // Cache for folder hierarchy to avoid repeated API calls
  const [folderHierarchyCache, setFolderHierarchyCache] = useState<any>(null);

  const buildFolderPath = async (folderId: string) => {
    if (folderId === "root") {
      return [{ id: "root", name: "Documentos" }];
    }

    try {
      // Use cached hierarchy if available
      let folderData = folderHierarchyCache;

      if (!folderData) {
        const response = await authenticatedFetch("/api/folders");
        if (response.ok) {
          const result = await response.json();
          folderData = result.folders;
          setFolderHierarchyCache(folderData);
        }
      }

      if (folderData) {
        // Find folder and build path
        const findFolderPath = (
          folders: any[],
          targetId: string,
          currentPath: any[] = [],
        ): any[] | null => {
          for (const folder of folders) {
            const newPath = [
              ...currentPath,
              { id: folder.id, name: folder.name },
            ];
            if (folder.id === targetId) {
              return newPath;
            }
            if (folder.children) {
              const childPath = findFolderPath(
                folder.children,
                targetId,
                newPath,
              );
              if (childPath) return childPath;
            }
          }
          return null;
        };

        const path = findFolderPath(folderData, folderId);
        if (!path || path.length === 0) {
          return [{ id: "root", name: "Documentos" }];
        }
        // If path already starts with root, don't duplicate it
        const startsWithRoot = path[0]?.id === "root";
        return startsWithRoot
          ? path
          : [{ id: "root", name: "Documentos" }, ...path];
      }
    } catch (error) {
      console.error("Error building folder path:", error);
    }

    return [{ id: "root", name: "Documentos" }];
  };

  const handleFolderSelect = async (folderId: string) => {
    setCurrentFolderId(folderId);
    setFolderChanging(true);

    try {
      // Execute both operations in parallel for better performance
      const [path] = await Promise.all([
        buildFolderPath(folderId),
        loadDocuments(folderId),
      ]);

      setFolderPath(path);
    } finally {
      setFolderChanging(false);
    }
  };

  const loadAvailableFolders = async () => {
    try {
      const response = await authenticatedFetch("/api/folders");
      if (response.ok) {
        const result = await response.json();

        // Flatten folder hierarchy for selection
        const flattenFolders = (folders: any[], level = 0): any[] => {
          return folders.reduce((acc, folder) => {
            acc.push({ ...folder, level });
            if (folder.children) {
              acc.push(...flattenFolders(folder.children, level + 1));
            }
            return acc;
          }, []);
        };

        setAvailableFolders(flattenFolders(result.folders));
      }
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  };

  const startMoveDocument = (documentId: string) => {
    setMovingDocument(documentId);
    loadAvailableFolders();
  };

  const openShareToFolders = async (documentId: string) => {
    try {
      setSharingDocumentId(documentId);
      // load full folder hierarchy for tree view
      const treeResp = await authenticatedFetch('/api/folders');
      if (treeResp.ok) {
        const json = await treeResp.json();
        setSharingTree(json.folders || []);
      } else {
        setSharingTree([]);
      }
      setExpandedShareNodes(new Set()); // start collapsed
      const resp = await authenticatedFetch(`/api/files/documents/${documentId}/folders`);
      if (resp.ok) {
        const data = await resp.json();
        const setIds = new Set<string>((data.folders || []).filter(Boolean));
        setSharingSelectedFolders(setIds);
      } else {
        setSharingSelectedFolders(new Set());
      }
    } catch (e) {
      setSharingSelectedFolders(new Set());
      setSharingTree([]);
      setExpandedShareNodes(new Set());
    }
  };

  // (moved above)

  const openBatchShareToFolders = async (documentIds: string[]) => {
    try {
      setSharingDocumentIds(documentIds);
      // load full folder hierarchy for tree view
      const treeResp = await authenticatedFetch('/api/folders');
      if (treeResp.ok) {
        const json = await treeResp.json();
        setSharingTree(json.folders || []);
      } else {
        setSharingTree([]);
      }
      // start collapsed and with no preselection for batch
      setExpandedShareNodes(new Set());
      setSharingSelectedFolders(new Set());
    } catch (e) {
      setSharingSelectedFolders(new Set());
      setSharingTree([]);
      setExpandedShareNodes(new Set());
    }
  };

  // Function to open document folder management dialog
  const openManageDocumentFolders = async (documentId: string) => {
    try {
      setManagingFoldersDocumentId(documentId);
      setLoadingDocumentFolders(true);
      
      const response = await authenticatedFetch(`/api/files/documents/${documentId}/folders-details`);
      if (response.ok) {
        const data = await response.json();
        setDocumentFolders(data.folders || []);
      } else {
        const error = await response.json().catch(() => ({}));
        toast({ title: 'Erro', description: error.error || 'Erro ao carregar pastas do documento' });
        setDocumentFolders([]);
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Erro ao carregar pastas do documento' });
      setDocumentFolders([]);
    } finally {
      setLoadingDocumentFolders(false);
    }
  };

  // Function to remove document from a specific folder
  const removeDocumentFromFolder = async (documentId: string, folderId: string) => {
    try {
      const response = await authenticatedFetch(`/api/files/documents/${documentId}/folders/${folderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast({ title: 'Sucesso', description: 'Documento removido da pasta com sucesso' });
        // Refresh document folders list
        await openManageDocumentFolders(documentId);
        // Refresh documents in current view
        await loadDocuments(currentFolderId);
        setSidebarRefreshKey((k) => k + 1);
      } else {
        const error = await response.json().catch(() => ({}));
        toast({ title: 'Erro', description: error.error || 'Erro ao remover documento da pasta' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Erro ao remover documento da pasta' });
    }
  };

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

  const createSubfolder = async () => {
    if (!newSubfolderName.trim()) return;

    try {
      const response = await authenticatedFetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSubfolderName,
          parentId: currentFolderId,
          color: newSubfolderColor,
        }),
      });

      if (response.ok) {
        setNewSubfolderName("");
        setNewSubfolderColor("#6b7280");
        setShowCreateSubfolderDialog(false);
        loadDocuments(currentFolderId); // Reload current folder to show new subfolder
        setSidebarRefreshKey((k) => k + 1);
      }
    } catch (error) {
      console.error("Error creating subfolder:", error);
    }
  };

  const handleDocumentContextMenu = (
    event: React.MouseEvent,
    document: Document,
  ) => {
  if (selectionMode) return; // sem menu em modo de seleção
  event.preventDefault();
  event.stopPropagation();
  setSelectedDocument(document);
  showContextMenu(event);
  };

  const deleteDocument = async (documentId: string) => {
  const confirmed = await confirm('Tem certeza que deseja excluir este documento?');
  if (!confirmed) return;

  try {
      const response = await authenticatedFetch(
        `/api/files/documents/${documentId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        loadDocuments(currentFolderId);
        setSidebarRefreshKey((k) => k + 1);
      } else {
        toast({ title: 'Erro', description: 'Erro ao excluir documento' });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({ title: 'Erro', description: 'Erro ao excluir documento' });
    }
  };

  // Folder (main area) context menu handlers
  const handleFolderCardContextMenu = (event: React.MouseEvent, folder: Subfolder) => {
    if (selectionMode) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedFolderCard(folder);
    setSelectedDocument(null);
    showContextMenu(event);
  };

  const updateFolderName = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const response = await authenticatedFetch(`/api/folders/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (response.ok) {
        await loadDocuments(currentFolderId);
        setSidebarRefreshKey((k) => k + 1);
  } else {
        const err = await response.json();
  toast({ title: 'Erro', description: err.error || 'Erro ao renomear pasta' });
      }
    } catch (e) {
      console.error(e);
  toast({ title: 'Erro', description: 'Erro ao renomear pasta' });
    }
  };

  const deleteFolderById = async (folderId: string) => {
  const confirmed = await confirm('Tem certeza que deseja excluir esta pasta?');
  if (!confirmed) return;
    try {
      const response = await authenticatedFetch(`/api/folders/${folderId}`, { method: 'DELETE' });
      if (response.ok) {
        await loadDocuments(currentFolderId);
        setSidebarRefreshKey((k) => k + 1);
      } else {
        const err = await response.json();
  toast({ title: 'Erro', description: err.error || 'Erro ao excluir pasta' });
      }
    } catch (e) {
      console.error(e);
  toast({ title: 'Erro', description: 'Erro ao excluir pasta' });
    }
  };

  const startMoveFolderFromCard = (folderId: string) => {
    setMovingDocument(null);
    setMovingSelection(null);
    setSelectedFolderCard(subfolders.find(f => f.id === folderId) || null);
    setMovingFolderId(folderId);
    loadAvailableFolders();
  };

  // (moved above)

  const requestDocumentDeletion = async (documentId: string) => {
    try {
      const res = await authenticatedFetch(`/api/files/documents/${documentId}/request-delete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar exclusão');
  toast({ title: 'Sucesso', description: data.message || 'Solicitação enviada ao proprietário.' });
    } catch (e: any) {
  toast({ title: 'Erro', description: e?.message || 'Erro ao solicitar exclusão' });
    }
  };

  const getDocumentContextMenuItems = (document: Document) => {
  const items: any[] = [
  {
      id: "details",
      label: "Ver Detalhes",
      icon: <Info className="w-4 h-4" />,
      onClick: () => {
        setSelectedDocument(document);
        setShowDocumentDetailsModal(true);
      },
    },
    {
      id: "download",
      label: "Download",
      icon: <Download className="w-4 h-4" />,
      onClick: () => {
  const link = window.document.createElement("a");
  link.href = token ? `/api/files/documents/${document.id}/download?token=${encodeURIComponent(token)}` : `/api/files/documents/${document.id}/download`;
  link.download = document.name;
        link.click();
      },
    },
    {
      id: "move",
      label: "Mover",
      icon: <Move className="w-4 h-4" />,
      onClick: () => startMoveDocument(document.id),
    },
    {
      id: "share-folders",
      label: "Adicionar a outras pastas",
      icon: <FolderPlus className="w-4 h-4" />,
      onClick: () => openShareToFolders(document.id),
    },
    {
      id: "manage-folders",
      label: "Gerenciar pastas",
      icon: <Settings className="w-4 h-4" />,
      onClick: () => openManageDocumentFolders(document.id),
    },
    ];

    const canApproverDelete = isApprover && user?.email && ((document as any).owner === user.email || (document as any).createdBy === user.email);
    if (isAdmin) {
      items.push({ id: 'delete', label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, className: 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20', adminOnly: true, onClick: () => deleteDocument(document.id) });
    } else if (canApproverDelete) {
      items.push({ id: 'delete', label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, className: 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20', adminOnly: false, onClick: () => deleteDocument(document.id) });
    } else {
      items.push({ id: 'request-delete', label: 'Solicitar exclusão', icon: <Trash2 className="w-4 h-4" />, onClick: () => requestDocumentDeletion(document.id) });
    }
    return items;
  };

  const getFolderContextMenuItems = (folder: Subfolder) => {
    const items: any[] = [
      { id: 'open', label: 'Abrir', icon: <FolderOpen className="w-4 h-4" />, onClick: () => handleFolderSelect(folder.id) },
      { id: 'copy', label: 'Copiar', icon: <Copy className="w-4 h-4" />, onClick: () => {
        // If user has multiple folders selected, copy them; otherwise copy the clicked folder
        const ids = selectedFolderIds && selectedFolderIds.size > 0 ? Array.from(selectedFolderIds) : [folder.id];
        setFolderClipboard({ ids, action: 'copy' });
      }},
      { id: 'cut', label: 'Recortar', icon: <Scissors className="w-4 h-4" />, onClick: () => {
        const ids = selectedFolderIds && selectedFolderIds.size > 0 ? Array.from(selectedFolderIds) : [folder.id];
        setFolderClipboard({ ids, action: 'cut' });
      }},
      { id: 'rename', label: 'Renomear', icon: <Edit className="w-4 h-4" />, onClick: async () => {
        const newName = await confirm('Renomear pasta', { showInput: true, title: 'Renomear pasta', description: 'Novo nome da pasta:', defaultValue: folder.name }) as string | boolean;
        if (typeof newName === 'string' && newName.trim() && newName !== folder.name) updateFolderName(folder.id, newName);
      }},
      { id: 'move', label: 'Mover', icon: <Move className="w-4 h-4" />, adminOnly: true, onClick: () => startMoveFolderFromCard(folder.id) },
    ];
    const canApproverDeleteFolder = isApprover && user?.email && ((folder as any).createdBy === user.email);
    if (isAdmin) {
      items.push({ id: 'delete', label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, className: 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20', adminOnly: true, onClick: () => deleteFolderById(folder.id) });
    } else if (canApproverDeleteFolder) {
      items.push({ id: 'delete', label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, className: 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20', onClick: () => deleteFolderById(folder.id) });
    }
    // If clipboard has something and folder is a valid paste target, show Paste
    if (folderClipboard && folderClipboard.ids && folderClipboard.ids.length > 0 && folderClipboard.action) {
      items.push({ id: 'paste-into', label: 'Colar aqui', icon: <Clipboard className="w-4 h-4" />, onClick: () => handlePasteFolder(folder.id) });
    }
    return items;
  };

  const getFolderAreaContextMenuItems = () => {
    const items: any[] = [];
  items.push({ id: 'create-subfolder', label: 'Criar nova subpasta', icon: <Plus className="w-4 h-4" />, onClick: async () => {
      const name = await confirm('Nome da nova subpasta:', { showInput: true, title: 'Nova Subpasta' }) as string | boolean;
      if (!name || typeof name !== 'string' || !name.trim()) return;
      try {
        const resp = await authenticatedFetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentId: currentFolderId }) });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({} as any));
          throw new Error(err.error || 'Erro ao criar subpasta');
        }
        await loadDocuments(currentFolderId);
        setSidebarRefreshKey(k => k + 1);
      } catch (e: any) {
        toast({ title: 'Erro', description: e?.message || 'Erro ao criar subpasta' });
      }
    }});

    if (folderClipboard && folderClipboard.ids && folderClipboard.ids.length > 0 && folderClipboard.action) {
      items.push({ id: 'paste-here', label: 'Colar', icon: <Clipboard className="w-4 h-4" />, onClick: () => handlePasteFolder(currentFolderId) });
    }
    return items;
  };

  const handleFolderAreaContextMenu = (event: React.MouseEvent) => {
    if (selectionMode) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedFolderCard(null);
    setSelectedDocument(null);
    showContextMenu(event);
  };

  // Clipboard state for folders (copy / cut). Supports multiple ids.
  const [folderClipboard, setFolderClipboard] = React.useState<{ ids: string[]; action: 'copy' | 'cut' } | null>(null);

  // Drag & drop state for uploading files onto a folder
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleDropOnFolder = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    const isReviewer = user?.role === 'reviewer' && !isAdmin;
    
    // Iniciamos o loading
    setUploadLoading(true);
    setUploadProgress(0);
    setUploadingFileName(files.length === 1 ? files[0].name : `${files.length} arquivos`);

    if (isReviewer) {
      const file = files.item(0);
      if (!file) return;
      formData.append('files', file);
      formData.append('targetFolderId', folderId);
      const notes = await confirm('Descreva resumidamente o que foi alterado neste documento (obrigatório):', { showInput: true, title: 'Justificativa' }) as string | boolean;
      if (!notes || typeof notes !== 'string' || !notes.trim()) {
        toast({ title: 'Erro', description: 'Justificativa é obrigatória para envio de revisão.' });
        setUploadLoading(false);
        return;
      }
      formData.append('changeNotes', notes.trim());
    } else {
      Array.from(files).forEach((f) => formData.append('files', f));
      formData.append('targetFolderId', folderId);
    }

    try {
      // Simular progresso inicial
      setUploadProgress(10);
      
      const endpoint = isReviewer ? "/api/reviews/submit" : "/api/files/upload";
      
      // Simular progresso durante upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 80) return prev + Math.random() * 20;
          return prev;
        });
      }, 200);
      
      const resp = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: {},
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(90);

      if (!resp.ok) {
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const err = await resp.json().catch(() => ({} as any));
          const msg = (err as any).error || (err as any).message || `Erro no upload (${resp.status})`;
          throw new Error(msg);
        } else {
          const txt = await resp.text();
          const snippet = txt.replace(/<[^>]*>/g, ' ').slice(0, 200).trim();
          throw new Error(snippet || `Erro no upload (${resp.status})`);
        }
      }

      const result = await resp.json();
      setUploadProgress(100);
      
      if (isReviewer) {
        toast({ title: 'Sucesso', description: result.message || 'Envio enviado para aprovação' });
      } else {
        await loadDocuments(currentFolderId);
        setSidebarRefreshKey((k) => k + 1);
      }
      
      // Pequeno delay para mostrar 100% antes de fechar
      setTimeout(() => {
        setUploadLoading(false);
        setUploadProgress(0);
        setUploadingFileName("");
      }, 1000);
      
    } catch (e: any) {
      console.error('Upload error (drop):', e);
      toast({ title: 'Erro', description: e?.message || 'Erro no upload' });
      setUploadLoading(false);
      setUploadProgress(0);
      setUploadingFileName("");
    }
  };

  const handlePasteFolder = async (targetFolderId: string) => {
    if (!folderClipboard || !folderClipboard.ids || folderClipboard.ids.length === 0) return;
    try {
      // Iterate over all ids in the clipboard and perform the requested action
      for (const id of folderClipboard.ids) {
        if (folderClipboard.action === 'copy') {
          const resp = await authenticatedFetch(`/api/folders/${id}/duplicate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetParentId: targetFolderId }) });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({} as any));
            throw new Error(err.error || `Erro ao duplicar pasta ${id}`);
          }
        } else if (folderClipboard.action === 'cut') {
          const resp = await authenticatedFetch(`/api/folders/move-folder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderId: id, newParentId: targetFolderId }) });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({} as any));
            throw new Error(err.error || `Erro ao mover pasta ${id}`);
          }
        }
      }
      setFolderClipboard(null);
      await loadDocuments(currentFolderId);
      setSidebarRefreshKey(k => k + 1);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Erro ao colar pasta' });
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    const formData = new FormData();
    const isReviewer = user?.role === 'reviewer' && !isAdmin;
    
    // Iniciamos o loading
    setUploadLoading(true);
    setUploadProgress(0);
    setUploadingFileName(files.length === 1 ? files[0].name : `${files.length} arquivos`);

    if (isReviewer) {
      const file = files.item(0);
      if (!file) return;
      formData.append('files', file);
      formData.append('targetFolderId', currentFolderId);
  const notes = await confirm('Descreva resumidamente o que foi alterado neste documento (obrigatório):', { showInput: true, title: 'Justificativa' }) as string | boolean;
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
        toast({ title: 'Erro', description: 'Justificativa é obrigatória para envio de revisão.' });
        setUploadLoading(false);
        return;
      }
      formData.append('changeNotes', notes.trim());
    } else {
      Array.from(files).forEach((f) => formData.append('files', f));
      formData.append('targetFolderId', currentFolderId);
    }

    try {
      // Simular progresso inicial
      setUploadProgress(10);
      
      const endpoint = isReviewer ? "/api/reviews/submit" : "/api/files/upload";
      
      // Simular progresso durante upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 80) return prev + Math.random() * 20;
          return prev;
        });
      }, 200);
      
      const resp = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: {},
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(90);

      if (!resp.ok) {
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const err = await resp.json().catch(() => ({} as any));
          const msg = (err as any).error || (err as any).message || `Erro no upload (${resp.status})`;
          throw new Error(msg);
        } else {
          const txt = await resp.text();
          const snippet = txt.replace(/<[^>]*>/g, ' ').slice(0, 200).trim();
          throw new Error(snippet || `Erro no upload (${resp.status})`);
        }
      }

      const result = await resp.json();
      setUploadProgress(100);
      
      if (isReviewer) {
  toast({ title: 'Sucesso', description: result.message || 'Envio enviado para aprovação' });
      } else {
        await loadDocuments(currentFolderId);
        setSidebarRefreshKey((k) => k + 1);
      }
      
      // Pequeno delay para mostrar 100% antes de fechar
      setTimeout(() => {
        setUploadLoading(false);
        setUploadProgress(0);
        setUploadingFileName("");
      }, 1000);
      
    } catch (e: any) {
      console.error('Upload error:', e);
      toast({ title: 'Erro', description: e?.message || 'Erro no upload' });
      setUploadLoading(false);
      setUploadProgress(0);
      setUploadingFileName("");
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || doc.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const visibleDocuments = useMemo(() => {
    const naturalCompare = (a: string, b: string) =>
      a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
    const toTime = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
    const arr = [...filteredDocuments];
    arr.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return naturalCompare(a.name, b.name);
        case "name-desc":
          return naturalCompare(b.name, a.name);
        case "date-asc":
          return toTime(a.uploadDate) - toTime(b.uploadDate);
        case "date-desc":
          return toTime(b.uploadDate) - toTime(a.uploadDate);
        case "size-asc":
          return (a.sizeBytes || 0) - (b.sizeBytes || 0);
        case "size-desc":
          return (b.sizeBytes || 0) - (a.sizeBytes || 0);
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredDocuments, sortBy]);

  // Ordenação de subpastas
  const sortedSubfolders = useMemo(() => {
    const naturalCompare = (a: string, b: string) =>
      a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
    const arr = [...subfolders];
    const toTime = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
    arr.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return naturalCompare(a.name, b.name);
        case "name-desc":
          return naturalCompare(b.name, a.name);
        case "date-asc":
          return toTime(a.created) - toTime(b.created);
        case "date-desc":
          return toTime(b.created) - toTime(a.created);
        // para tamanho, manter ordem por nome asc como fallback
        case "size-asc":
        case "size-desc":
          return naturalCompare(a.name, b.name);
        default:
          return 0;
      }
    });
    return arr;
  }, [subfolders, sortBy]);

  const toggleStar = (id: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, starred: !doc.starred } : doc,
      ),
    );
  };

  const moveDocument = async (documentId: string, targetFolderId: string) => {
    try {
      const response = await authenticatedFetch("/api/folders/move-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          folderId: targetFolderId,
        }),
      });

      if (response.ok) {
        loadDocuments(currentFolderId);
      } else {
        const error = await response.json().catch(() => ({} as any));
        toast({ title: 'Erro', description: `Erro ao mover documento: ${error.error || error.message || response.status}` });
      }
    } catch (error) {
      console.error("Move error:", error);
      toast({ title: 'Erro', description: 'Erro ao mover documento' });
    }
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const exitSelectionMode = () => {
    setSelectionMode(false);
  clearSelection();
  setSelectedFolderIds(new Set());
  };

  const selectAllVisible = () => {
    // Toggle select all for documents
    setSelectedIds((prev) => {
      const allDocIds = visibleDocuments.map((d) => d.id);
      const isAllSelected = prev.size === allDocIds.length && allDocIds.length > 0 && allDocIds.every(id => prev.has(id));
      return isAllSelected ? new Set() : new Set(allDocIds);
    });
    // Toggle select all for folders (subpastas visíveis na área principal)
    setSelectedFolderIds((prev) => {
      const allFolderIds = sortedSubfolders.map((f) => f.id);
      const isAllSelected = prev.size === allFolderIds.length && allFolderIds.length > 0 && allFolderIds.every(id => prev.has(id));
      return isAllSelected ? new Set() : new Set(allFolderIds);
    });
  };

  // Batch actions
  const moveDocumentsBatch = async (ids: string[], targetFolderId: string) => {
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          authenticatedFetch("/api/folders/move-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId: id, folderId: targetFolderId }),
          }),
        ),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
  if (fail > 0) toast({ title: 'Atenção', description: `Alguns documentos não puderam ser movidos (${fail}).` });
  await loadDocuments(currentFolderId);
  setSidebarRefreshKey((k) => k + 1);
      exitSelectionMode();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Erro ao mover documentos' });
    }
  };

  const deleteDocumentsBatch = async (ids: string[]) => {
  const confirmed = await confirm(`Tem certeza que deseja excluir ${ids.length} documento(s)?`);
  if (!confirmed) return;
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          authenticatedFetch(`/api/files/documents/${id}`, { method: "DELETE" }),
        ),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
  if (fail > 0) toast({ title: 'Atenção', description: `Alguns documentos não puderam ser excluídos (${fail}).` });
  await loadDocuments(currentFolderId);
  setSidebarRefreshKey((k) => k + 1);
      exitSelectionMode();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Erro ao excluir documentos' });
    }
  };

  const downloadDocumentsBatch = (ids: string[]) => {
    ids.forEach((id) => {
      const doc = documents.find((d) => d.id === id);
      const link = window.document.createElement("a");
      link.href = token ? `/api/files/documents/${id}/download?token=${encodeURIComponent(token)}` : `/api/files/documents/${id}/download`;
      if (doc?.name) link.download = doc.name;
      // Necessário anexar ao DOM em alguns navegadores
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  };

  // Folder batch actions
  const moveFoldersBatch = async (ids: string[], targetParentId: string) => {
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          authenticatedFetch("/api/folders/move-folder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId: id, newParentId: targetParentId }),
          }),
        ),
      );
  const fail = results.filter((r) => r.status === "rejected").length;
  if (fail > 0) toast({ title: 'Atenção', description: `Algumas pastas não puderam ser movidas (${fail}).` });
  setSidebarRefreshKey((k) => k + 1);
    } catch (e) {
      console.error(e);
  toast({ title: 'Erro', description: 'Erro ao mover pastas' });
    }
  };

  const deleteFoldersBatch = async (ids: string[]) => {
  const confirmed = await confirm(`Tem certeza que deseja excluir ${ids.length} pasta(s)?`);
  if (!confirmed) return;
    try {
      const results = await Promise.allSettled(
        ids.map((id) => authenticatedFetch(`/api/folders/${id}`, { method: "DELETE" })),
      );
  const fail = results.filter((r) => r.status === "rejected").length;
  if (fail > 0) toast({ title: 'Atenção', description: `Algumas pastas não puderam ser excluídas (${fail}).` });
  setSidebarRefreshKey((k) => k + 1);
    } catch (e) {
      console.error(e);
  toast({ title: 'Erro', description: 'Erro ao excluir pastas' });
    }
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 home-page">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Abrir pastas">
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <div className="h-12 w-12 flex items-center justify-center shrink-0">
              <img
                src={logoWithVersion}
                alt="Logo"
                className="max-h-full max-w-full object-contain"
                data-tried="0"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  const tried = parseInt(img.dataset.tried || "0", 10);
                  const _v = `${logoVersion}`;
                  const fallbacks = [
                    `/site-logo?v=${_v}`,
                    logoPrimary,
                    `/uploads/logo.png?v=${_v}`,
                    `/logo.svg?v=${_v}`,
                    `/logo.jpg?v=${_v}`,
                    `/logo.jpeg?v=${_v}`,
                    `/placeholder.png`,
                  ];
                  if (tried < fallbacks.length) {
                    img.dataset.tried = String(tried + 1);
                    img.src = fallbacks[tried];
                  } else {
                    img.onerror = null;
                    img.src = "/placeholder.png";
                  }
                }}
              />
            </div>
            <div className="ml-0 items-center hidden sm:flex">
              <button className="uiverse-button" data-text="Awesome">
                <span className="actual-text">&nbsp;Venosan&nbsp;</span>
                <span aria-hidden="true" className="hover-text">&nbsp;Venosan&nbsp;</span>
              </button>
            </div>
            <span className="hidden md:block text-sm text-muted-foreground truncate">Gerenciador de documentos</span>
          </div>

          <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
            <div className="relative w-full max-w-[220px] sm:max-w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar documentos..."
                className="pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {(isAdmin || isApprover || (user?.role === 'reviewer' && !isAdmin)) && (
              <>
                {(isAdmin || isApprover) && (
                  <Link to="/admin/reviews" className="hidden md:inline-flex">
                    <Button variant="outline" size="sm" className="relative">
                      Fila de Aprovação
                      <span id="review-count-badge" className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-600 text-white rounded-full min-w-5 h-5 hidden"></span>
                    </Button>
                  </Link>
                )}
                {user?.role === 'reviewer' && !isAdmin && (
                  <Link to="/reviews/mine" className="hidden md:inline-flex">
                    <Button variant="outline" size="sm">Meus Envios</Button>
                  </Link>
                )}
                <Link to="/users" className="hidden md:inline-flex">
                  <Button variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Usuários
                  </Button>
                </Link>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full shrink-0">
                  <Avatar>
                    <AvatarFallback>
                      {user ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    {isAdmin && (
                      <Badge variant="destructive" className="text-xs w-fit">Administrador</Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Folder Sidebar (desktop) */}
        {!isMobile && (
          <FolderTree
            currentFolderId={currentFolderId}
            onFolderSelect={handleFolderSelect}
            onFolderCreate={() => loadDocuments(currentFolderId)}
            onFolderUpdate={() => loadDocuments(currentFolderId)}
            sortBy={(sortBy.startsWith('name') ? sortBy : sortBy.startsWith('date') ? sortBy : 'name-asc') as "date-desc" | "date-asc" | "name-asc" | "name-desc"}
            selectionMode={selectionMode}
            selectedFolderIds={selectedFolderIds}
            onToggleFolderSelect={(id) =>
              setSelectedFolderIds((prev) => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })
            }
            refreshKey={sidebarRefreshKey}
            folderClipboard={folderClipboard}
            setFolderClipboard={setFolderClipboard}
            mainChildOrder={subfolders.map((s) => s.id)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="flex flex-wrap items-center gap-4">
                {(user?.role !== 'reader' || isAdmin) && (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {user?.role === 'reviewer' && !isAdmin ? 'Enviar para aprovação' : 'Upload Arquivo'}
                  </Button>
                )}

                <Dialog
                  open={showCreateSubfolderDialog}
                  onOpenChange={setShowCreateSubfolderDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Nova Subpasta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Subpasta</DialogTitle>
                      <DialogDescription>
                        Criar uma nova subpasta em "{currentFolderName}"
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subfolder-name">Nome da Subpasta</Label>
                        <Input
                          id="subfolder-name"
                          value={newSubfolderName}
                          onChange={(e) => setNewSubfolderName(e.target.value)}
                          placeholder="Digite o nome da subpasta"
                        />
                      </div>

                      <div>
                        <Label>Cor da Subpasta</Label>
                        <div className="flex gap-2 mt-2">
                          {colors.map((color) => (
                            <button
                              key={color.value}
                              className={`w-6 h-6 rounded-full border-2 ${
                                newSubfolderColor === color.value
                                  ? "border-slate-400"
                                  : "border-slate-200"
                              }`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => setNewSubfolderColor(color.value)}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      <Button onClick={createSubfolder} className="w-full">
                        Criar Subpasta
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Documento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Documento</DialogTitle>
                      <DialogDescription>
                        Escolha o tipo de documento que deseja criar
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* Web Editors */}
                      <div>
                        <h4 className="font-medium text-foreground mb-3">
                          Editores de Documentos
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Link to="/text-editor">
                            <Button
                              variant="outline"
                              className="h-24 flex flex-col gap-2 w-full hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700"
                            >
                              <FileText className="w-8 h-8 text-blue-500" />
                              <span className="font-medium">
                                Editor de Texto
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Documentos de texto
                              </span>
                            </Button>
                          </Link>

                          <Link to="/spreadsheet-editor">
                            <Button
                              variant="outline"
                              className="h-24 flex flex-col gap-2 w-full hover:bg-green-50 hover:border-green-300"
                            >
                              <FileSpreadsheet className="w-8 h-8 text-green-500" />
                              <span className="font-medium">
                                Editor de Planilha
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Planilhas e tabelas
                              </span>
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-t pt-4">
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col gap-2 w-full"
                        onClick={async () => {
                          try {
                            const response = await authenticatedFetch(
                              "/api/create/word",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  name: "Novo Documento.txt",
                                  folderId: currentFolderId,
                                }),
                              },
                            );
                            const result = await response.json();
                            if (result.document) {
                              loadDocuments(currentFolderId);
                              // Open in editor
                              window.open(
                                `/text-editor/${result.document.id}`,
                                "_blank",
                              );
                            }
                          } catch (error) {
                            console.error(
                              "Error creating Word document:",
                              error,
                            );
                            toast({ title: "Erro ao criar documento" });
                          }
                        }}
                      >
                        <FileText className="w-6 h-6 text-blue-700" />
                        <span className="text-sm">Novo Documento</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col gap-2 w-full"
                        onClick={async () => {
                          try {
                            const response = await authenticatedFetch(
                              "/api/create/excel",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  name: "Nova Planilha.csv",
                                  folderId: currentFolderId,
                                }),
                              },
                            );
                            const result = await response.json();
                            if (result.document) {
                              loadDocuments(currentFolderId);
                              // Open in editor
                              window.open(
                                `/spreadsheet-editor/${result.document.id}`,
                                "_blank",
                              );
                            }
                          } catch (error) {
                            console.error(
                              "Error creating Excel document:",
                              error,
                            );
                            toast({ title: "Erro ao criar planilha" });
                          }
                        }}
                      >
                        <FileSpreadsheet className="w-6 h-6 text-green-700" />
                        <span className="text-sm">Nova Planilha</span>
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {(user?.role !== 'reader' || isAdmin) && (
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                />)}

                {/* Seleção múltipla */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
                  >
                    {selectionMode ? 'Cancelar seleção' : 'Selecionar'}
                  </Button>
                  {selectionMode && (
                    <>
                      <Button variant="outline" onClick={selectAllVisible}>
                        {selectedCount === (visibleDocuments.length + sortedSubfolders.length) && (visibleDocuments.length + sortedSubfolders.length) > 0
                          ? 'Limpar seleção'
                          : 'Selecionar todos'}
                      </Button>
                      <Badge variant="secondary" className="text-xs">
                        {selectedDocsCount} doc(s), {selectedFoldersCount} pasta(s)
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-28 sm:w-36">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pdf">PDFs</SelectItem>
                    <SelectItem value="doc">Documentos</SelectItem>
                    <SelectItem value="excel">Planilhas</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>

                {/* Botão de Ordenação */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Ordenar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy("date-desc")}>Mais recentes</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("date-asc")}>Mais antigos</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy("name-asc")}>Nome (A–Z)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("name-desc")}>Nome (Z–A)</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy("size-desc")}>Tamanho (maior → menor)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("size-asc")}>Tamanho (menor → maior)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="hidden md:flex border rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Barra de ações em lote */}
            {selectionMode && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2 mb-3">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {selectedCount > 0 ? `${selectedDocsCount} documento(s), ${selectedFoldersCount} pasta(s) selecionado(s)` : 'Nada selecionado'}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedCount === 0}
                    onClick={() => {
                      setMovingSelection({ documents: Array.from(selectedIds), folders: Array.from(selectedFolderIds) });
                      loadAvailableFolders();
                    }}
                  >
                    <Move className="w-4 h-4 mr-2" /> Mover
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={selectedCount === 0}
                      onClick={async () => {
                        if (selectedDocsCount > 0) await deleteDocumentsBatch(Array.from(selectedIds));
                        if (selectedFoldersCount > 0) await deleteFoldersBatch(Array.from(selectedFolderIds));
                        await loadDocuments(currentFolderId);
                        exitSelectionMode();
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedDocsCount === 0}
                    onClick={() => openBatchShareToFolders(Array.from(selectedIds))}
                  >
                    <FolderPlus className="w-4 h-4 mr-2" /> Adicionar a outras pastas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedCount === 0 || selectedDocsCount === 0}
                    onClick={() => downloadDocumentsBatch(Array.from(selectedIds))}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Stats removed */}

            {/* Documents Grid/List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {currentFolderName}
                      {folderChanging && (
                        <img src="/logo.gif" alt="Carregando" className="w-4 h-4" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {currentFolderId === "root"
                        ? "Gerencie todos os seus documentos em um só lugar"
                        : `Documentos na pasta ${currentFolderName}`}
                    </CardDescription>
                  </div>

                  {/* Back Button and Breadcrumbs */}
                  <div className="flex items-center gap-4">
                    {/* Back Button */}
                    {currentFolderId !== "root" && folderPath.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const parentFolder =
                            folderPath[folderPath.length - 2];
                          if (parentFolder) {
                            handleFolderSelect(parentFolder.id);
                          }
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                      </Button>
                    )}

                    {/* Breadcrumbs */}
                    {folderPath.length > 1 && (
                      <nav className="flex items-center text-sm text-gray-600">
                        {folderPath.map((pathItem, index) => (
                          <div key={pathItem.id} className="flex items-center">
                            {index > 0 && (
                              <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                            )}
                            <button
                              onClick={() => handleFolderSelect(pathItem.id)}
                              className={`hover:text-blue-600 transition-colors ${
                                index === folderPath.length - 1
                                  ? "font-medium text-blue-600"
                                  : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              {pathItem.name}
                            </button>
                          </div>
                        ))}
                      </nav>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent onContextMenu={handleFolderAreaContextMenu}>
                {(isMobile ? false : viewMode === "grid") ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Subfolders */}
          {sortedSubfolders.map((folder) => (
                      <Card
                        key={folder.id}
                        className={`group hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-blue-200 hover:border-blue-400 ${selectionMode && selectedFolderIds.has(folder.id) ? 'ring-2 ring-blue-500' : ''} ${dragOverFolderId === folder.id ? 'ring-4 ring-blue-300/50' : ''}`}
                        style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12), inset 0 2px 8px rgba(255,255,255,0.08)' }}
                        onClick={() => {
                          if (selectionMode) {
                            setSelectedFolderIds((prev) => {
                              const next = new Set(prev);
                              next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id);
                              return next;
                            });
                          } else {
                            handleFolderSelect(folder.id);
                          }
                        }}
            onContextMenu={(e) => handleFolderCardContextMenu(e, folder)}
            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => handleDropOnFolder(e, folder.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-3">
                            {selectionMode && (
                              <Checkbox
                                checked={selectedFolderIds.has(folder.id)}
                                onCheckedChange={() =>
                                  setSelectedFolderIds((prev) => {
                                    const next = new Set(prev);
                                    next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id);
                                    return next;
                                  })
                                }
                              />
                            )}
                            <div
                              className="flex items-center justify-center w-12 h-12 rounded-lg"
                              style={{ backgroundColor: `${folder.color}20` }}
                            >
                              <FolderOpen
                                className="w-6 h-6"
                                style={{ color: folder.color || "#6b7280" }}
                              />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm text-foreground line-clamp-2">
                                {folder.name}
                              </h3>
                              {folder.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {folder.description}
                                </p>
                              )}
                              <div className="flex items-center justify-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  Pasta
                                </Badge>
                                {folder.documentCount !== undefined &&
                                  folder.documentCount > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {folder.documentCount} itens
                                    </Badge>
                                  )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Documents */}
                    {visibleDocuments.map((doc) => (
                      <Card
                        key={doc.id}
                        className={`group hover:shadow-lg transition-shadow cursor-pointer ${selectionMode && selectedIds.has(doc.id) ? 'ring-2 ring-blue-500' : ''}`}
                        style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12), inset 0 2px 8px rgba(255,255,255,0.08)' }}
                        onContextMenu={(e) => handleDocumentContextMenu(e, doc)}
                        onClick={() => {
                          if (selectionMode) {
                            toggleSelect(doc.id);
                          } else {
                            setPreviewDoc(doc);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {selectionMode && (
                                <Checkbox
                                  checked={selectedIds.has(doc.id)}
                                  onCheckedChange={() => toggleSelect(doc.id)}
                                  className="mt-1"
                                />
                              )}
                              {getFileIcon(doc.type)}
                              <div className="font-medium text-foreground leading-snug line-clamp-2 break-words">
                                {doc.name}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                            <span>{doc.size}</span>
                            <span>{doc.lastModified}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">
                                Criado por {doc.createdBy}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                Último revisor {doc.lastModifiedBy}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1">
                              {doc.shared && (
                                <Share2 className="w-3 h-3 text-blue-500" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Subfolders in List View */}
          {sortedSubfolders.map((folder) => (
                      <div
                        key={folder.id}
                        className={`flex items-center justify-between p-4 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-600 group cursor-pointer ${dragOverFolderId === folder.id ? 'ring-4 ring-blue-300/50' : ''}`}
                        style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12), inset 0 2px 8px rgba(255,255,255,0.08)' }}
                        onClick={() => {
                          if (selectionMode) {
                            setSelectedFolderIds((prev) => {
                              const next = new Set(prev);
                              next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id);
                              return next;
                            });
                          } else {
                            handleFolderSelect(folder.id);
                          }
                        }}
            onContextMenu={(e) => handleFolderCardContextMenu(e, folder)}
            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => handleDropOnFolder(e, folder.id)}
                      >
                        <div className="flex items-center space-x-4">
                          {selectionMode && (
                            <Checkbox
                              checked={selectedFolderIds.has(folder.id)}
                              onCheckedChange={() =>
                                setSelectedFolderIds((prev) => {
                                  const next = new Set(prev);
                                  next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id);
                                  return next;
                                })
                              }
                            />
                          )}
                          <div
                            className="flex items-center justify-center w-10 h-10 rounded-lg"
                            style={{ backgroundColor: `${folder.color}20` }}
                          >
                            <FolderOpen
                              className="w-5 h-5"
                              style={{ color: folder.color || "#6b7280" }}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">
                              {folder.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {folder.description || "Pasta"} • Criada em{" "}
                              {new Date(folder.created).toLocaleDateString(
                                "pt-BR",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            Pasta
                          </Badge>
                          {folder.documentCount !== undefined &&
                            folder.documentCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {folder.documentCount} itens
                              </Badge>
                            )}
                        </div>
                      </div>
                    ))}

                    {/* Documents in List View */}
                    {visibleDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 group ${selectionMode && selectedIds.has(doc.id) ? 'ring-2 ring-blue-500' : ''}`}
                        style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12)' }}
                        onContextMenu={(e) => handleDocumentContextMenu(e, doc)}
                        onClick={() => {
                          if (selectionMode) {
                            toggleSelect(doc.id);
                          } else {
                            setPreviewDoc(doc);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          {selectionMode && (
                            <Checkbox
                              checked={selectedIds.has(doc.id)}
                              onCheckedChange={() => toggleSelect(doc.id)}
                            />
                          )}
                          {getFileIcon(doc.type)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">
                              {doc.name}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <Badge variant="outline" className="text-[10px]">
                                Criado por {doc.createdBy}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                Último revisor {doc.lastModifiedBy}
                              </Badge>
                              <span className="text-xs text-muted-foreground">• {doc.lastModified}</span>
                            </div>
                          </div>
                        </div>

                          <div className="flex items-center space-x-4">
                          <span className="text-sm text-muted-foreground">
                            {doc.size}
                          </span>
                          <div className="flex items-center space-x-1">
                            {doc.shared && (
                              <Share2 className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {visibleDocuments.length === 0 && sortedSubfolders.length === 0 && (
                  <div
                    className={`text-center py-12 ${dragOverFolderId === currentFolderId ? 'ring-4 ring-blue-300/50 rounded-lg' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(currentFolderId); }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e) => handleDropOnFolder(e, currentFolderId)}
                  >
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Esta pasta está vazia
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm || filterType !== "all"
                        ? "Tente ajustar seus filtros de busca"
                        : "Organize seus documentos criando subpastas ou faça upload de arquivos"}
                    </p>
                    {!searchTerm && filterType === "all" && (
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          onClick={() => setShowCreateSubfolderDialog(true)}
                          variant="outline"
                        >
                          <FolderPlus className="w-4 h-4 mr-2" />
                          Criar Subpasta
                        </Button>
                        <Button onClick={() => fileInputRef.current?.click()}>
                          <Upload className="w-4 h-4 mr-2" />
                          {user?.role === 'reviewer' && !isAdmin ? 'Enviar para aprovação' : 'Upload Arquivo'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {visibleDocuments.length === 0 && sortedSubfolders.length > 0 && (
                  <div className="text-center py-8">
                    <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-base font-medium text-foreground mb-2">
                      Apenas subpastas nesta pasta
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || filterType !== "all"
                        ? "Nenhum documento corresponde aos filtros aplicados"
                        : "Esta pasta contém apenas subpastas. Clique em uma subpasta para ver seu conteúdo"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="w-[85%] max-w-80 bg-card h-full border-r border-border shadow-lg flex flex-col">
              <div className="p-2 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-medium">Pastas</h2>
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>Fechar</Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <FolderTree
                  currentFolderId={currentFolderId}
                  onFolderSelect={async (id) => { await handleFolderSelect(id); setSidebarOpen(false); }}
                  onFolderCreate={() => loadDocuments(currentFolderId)}
                  onFolderUpdate={() => loadDocuments(currentFolderId)}
                  sortBy={(sortBy.startsWith('name') ? sortBy : sortBy.startsWith('date') ? sortBy : 'name-asc') as "date-desc" | "date-asc" | "name-asc" | "name-desc"}
                  selectionMode={selectionMode}
                  selectedFolderIds={selectedFolderIds}
                  onToggleFolderSelect={(id) =>
                    setSelectedFolderIds((prev) => {
                      const next = new Set(prev);
                      next.has(id) ? next.delete(id) : next.add(id);
                      return next;
                    })
                  }
                  refreshKey={sidebarRefreshKey}
                  folderClipboard={folderClipboard}
                  setFolderClipboard={setFolderClipboard}
                  mainChildOrder={subfolders.map((s) => s.id)}
                />
              </div>
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Move Document Dialog */}
        {movingDocument && (
          <Dialog
            open={!!movingDocument}
            onOpenChange={() => setMovingDocument(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mover Documento</DialogTitle>
                <DialogDescription>
                  Selecione a pasta de destino para o documento
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {availableFolders.map((folder) => (
                    <Button
                      key={folder.id}
                      variant="ghost"
                      className="w-full justify-start"
                      style={{ paddingLeft: `${16 + folder.level * 16}px` }}
                      onClick={() => {
                        moveDocument(movingDocument, folder.id);
                        setMovingDocument(null);
                      }}
                    >
                      <FolderOpen
                        className="w-4 h-4 mr-2"
                        style={{ color: folder.color || "#6b7280" }}
                      />
                      {folder.name}
                      {folder.documentCount > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {folder.documentCount}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setMovingDocument(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
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
          items={selectedFolderCard ? getFolderContextMenuItems(selectedFolderCard) : (selectedDocument ? getDocumentContextMenuItems(selectedDocument) : getFolderAreaContextMenuItems())}
          isAdmin={isAdmin}
        />

        {/* Move Documents (batch) Dialog */}
        {movingSelection && (movingSelection.documents.length > 0 || movingSelection.folders.length > 0) && (
          <Dialog
            open={true}
            onOpenChange={() => setMovingSelection(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mover Seleção</DialogTitle>
                <DialogDescription>
                  Selecione a pasta de destino para {movingSelection.documents.length} documento(s) e {movingSelection.folders.length} pasta(s)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {availableFolders.map((folder) => (
                    <Button
                      key={folder.id}
                      variant="ghost"
                      className="w-full justify-start"
                      style={{ paddingLeft: `${16 + folder.level * 16}px` }}
                      onClick={() => {
                        const docs = movingSelection.documents;
                        const fls = movingSelection.folders;
                        Promise.resolve()
                          .then(async () => {
                            if (docs.length > 0) await moveDocumentsBatch(docs, folder.id);
                            if (fls.length > 0) await moveFoldersBatch(fls, folder.id);
                            await loadDocuments(currentFolderId);
                            setSidebarRefreshKey((k) => k + 1);
                            exitSelectionMode();
                          })
                          .finally(() => setMovingSelection(null));
                      }}
                    >
                      <FolderOpen
                        className="w-4 h-4 mr-2"
                        style={{ color: folder.color || "#6b7280" }}
                      />
                      {folder.name}
                      {folder.documentCount > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {folder.documentCount}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setMovingSelection(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Share selection to folders (batch) dialog */}
        {sharingDocumentIds && (
          <Dialog open={!!sharingDocumentIds} onOpenChange={() => setSharingDocumentIds(null)}>
            <DialogContent className="max-w-3xl w-[720px]">
              <DialogHeader>
                <DialogTitle>Adicionar a outras pastas</DialogTitle>
                <DialogDescription>Escolha as pastas onde {sharingDocumentIds.length} documento(s) também devem aparecer.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allIds: string[] = [];
                      const walk = (nodes: any[]) => nodes.forEach(n => { allIds.push(n.id); if (n.children && n.children.length) walk(n.children); });
                      walk(sharingTree);
                      setExpandedShareNodes(new Set(allIds));
                    }}
                  >Expandir tudo</Button>
                  <Button variant="outline" size="sm" onClick={() => setExpandedShareNodes(new Set())}>Recolher tudo</Button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  <label className="flex items-center gap-2 py-1 px-2 hover:bg-muted/40 rounded cursor-pointer">
                    <Checkbox
                      checked={sharingSelectedFolders.has('root')}
                      onCheckedChange={() => {
                        setSharingSelectedFolders(prev => {
                          const next = new Set(prev);
                          if (next.has('root')) next.delete('root'); else next.add('root');
                          return next;
                        });
                      }}
                    />
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm">Documentos (raiz)</span>
                  </label>
                  {sharingTree.map((node: any) => {
                    const renderNode = (n: any, level = 0): React.ReactNode => {
                      const expanded = expandedShareNodes.has(n.id);
                      return (
                        <div key={n.id}>
                          <div className="flex items-center gap-2 py-1 px-2 hover:bg-muted/40 rounded" style={{ paddingLeft: `${(level+1) * 16}px` }}>
                            {n.children && n.children.length > 0 ? (
                              <button
                                className="w-4 h-4 flex items-center justify-center text-muted-foreground"
                                onClick={() => {
                                  setExpandedShareNodes(prev => {
                                    const next = new Set(prev);
                                    if (next.has(n.id)) next.delete(n.id); else next.add(n.id);
                                    return next;
                                  });
                                }}
                                aria-label={expanded ? 'Recolher' : 'Expandir'}
                              >
                                <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                              </button>
                            ) : (
                              <span className="w-4 h-4" />
                            )}
                            <Checkbox
                              checked={sharingSelectedFolders.has(n.id)}
                              onCheckedChange={() => {
                                setSharingSelectedFolders(prev => {
                                  const next = new Set(prev);
                                  if (next.has(n.id)) next.delete(n.id); else next.add(n.id);
                                  return next;
                                });
                              }}
                            />
                            <FolderOpen className="w-4 h-4" style={{ color: n.color || '#6b7280' }} />
                            <span className="text-sm">{n.name}</span>
                          </div>
                          {expanded && n.children && n.children.map((c: any) => renderNode(c, level + 1))}
                        </div>
                      );
                    };
                    return renderNode(node, 0);
                  })}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSharingDocumentIds(null)}>Cancelar</Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      try {
                        const folderIds = Array.from(sharingSelectedFolders);
                        const ids = sharingDocumentIds || [];
                        const results = await Promise.allSettled(ids.map((id) =>
                          authenticatedFetch(`/api/files/documents/${id}/folders`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderIds })
                          })
                        ));
                        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r as PromiseFulfilledResult<Response>).value.ok));
                        if (failed.length > 0) {
                          toast({ title: 'Atenção', description: `${failed.length} documento(s) não puderam ser atualizados.` });
                        } else {
                          toast({ title: 'Sucesso', description: 'Documentos vinculados às pastas selecionadas.' });
                        }
                        setSharingDocumentIds(null);
                        await loadDocuments(currentFolderId);
                        setSidebarRefreshKey((k) => k + 1);
                        exitSelectionMode();
                      } catch (e: any) {
                        toast({ title: 'Erro', description: e?.message || 'Erro ao atualizar pastas' });
                      }
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Share to folders dialog */}
        {sharingDocumentId && (
          <Dialog open={!!sharingDocumentId} onOpenChange={() => setSharingDocumentId(null)}>
            <DialogContent className="max-w-3xl w-[720px]">
              <DialogHeader>
                <DialogTitle>Adicionar a outras pastas</DialogTitle>
                <DialogDescription>Escolha as pastas onde este documento também deve aparecer. As alterações serão sincronizadas automaticamente.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // expandir tudo
                      const allIds: string[] = [];
                      const walk = (nodes: any[]) => nodes.forEach(n => { allIds.push(n.id); if (n.children && n.children.length) walk(n.children); });
                      walk(sharingTree);
                      setExpandedShareNodes(new Set(allIds));
                    }}
                  >Expandir tudo</Button>
                  <Button variant="outline" size="sm" onClick={() => setExpandedShareNodes(new Set())}>Recolher tudo</Button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  {/* Root row */}
                  <label className="flex items-center gap-2 py-1 px-2 hover:bg-muted/40 rounded cursor-pointer">
                    <Checkbox
                      checked={sharingSelectedFolders.has('root')}
                      onCheckedChange={() => {
                        setSharingSelectedFolders(prev => {
                          const next = new Set(prev);
                          if (next.has('root')) next.delete('root'); else next.add('root');
                          return next;
                        });
                      }}
                    />
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm">Documentos (raiz)</span>
                  </label>
                  {/* Tree */}
                  {sharingTree.map((node: any) => {
                    const renderNode = (n: any, level = 0): React.ReactNode => {
                      const expanded = expandedShareNodes.has(n.id);
                      return (
                        <div key={n.id}>
                          <div className="flex items-center gap-2 py-1 px-2 hover:bg-muted/40 rounded" style={{ paddingLeft: `${(level+1) * 16}px` }}>
                            {n.children && n.children.length > 0 ? (
                              <button
                                className="w-4 h-4 flex items-center justify-center text-muted-foreground"
                                onClick={() => {
                                  setExpandedShareNodes(prev => {
                                    const next = new Set(prev);
                                    if (next.has(n.id)) next.delete(n.id); else next.add(n.id);
                                    return next;
                                  });
                                }}
                                aria-label={expanded ? 'Recolher' : 'Expandir'}
                              >
                                <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                              </button>
                            ) : (
                              <span className="w-4 h-4" />
                            )}
                            <Checkbox
                              checked={sharingSelectedFolders.has(n.id)}
                              onCheckedChange={() => {
                                setSharingSelectedFolders(prev => {
                                  const next = new Set(prev);
                                  if (next.has(n.id)) next.delete(n.id); else next.add(n.id);
                                  return next;
                                });
                              }}
                            />
                            <FolderOpen className="w-4 h-4" style={{ color: n.color || '#6b7280' }} />
                            <span className="text-sm">{n.name}</span>
                          </div>
                          {expanded && n.children && n.children.map((c: any) => renderNode(c, level + 1))}
                        </div>
                      );
                    };
                    return renderNode(node, 0);
                  })}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSharingDocumentId(null)}>Cancelar</Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      try {
                        const body = { folderIds: Array.from(sharingSelectedFolders) };
                        const resp = await authenticatedFetch(`/api/files/documents/${sharingDocumentId}/folders`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
                        });
                        if (!resp.ok) {
                          const err = await resp.json().catch(() => ({} as any));
                          throw new Error(err.error || 'Erro ao atualizar pastas');
                        }
                        toast({ title: 'Sucesso', description: 'Documento vinculado às pastas selecionadas.' });
                        setSharingDocumentId(null);
                        await loadDocuments(currentFolderId);
                        setSidebarRefreshKey((k) => k + 1);
                      } catch (e: any) {
                        toast({ title: 'Erro', description: e?.message || 'Erro ao atualizar pastas' });
                      }
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Move Single Folder (from main area) */}
        {movingFolderId && (
          <Dialog open={!!movingFolderId} onOpenChange={() => setMovingFolderId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mover Pasta</DialogTitle>
                <DialogDescription>Selecione a pasta de destino</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {availableFolders.map((folder) => (
                    <Button
                      key={folder.id}
                      variant="ghost"
                      className="w-full justify-start"
                      style={{ paddingLeft: `${16 + folder.level * 16}px` }}
                      onClick={async () => {
                        try {
                          await authenticatedFetch('/api/folders/move-folder', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ folderId: movingFolderId, newParentId: folder.id }),
                          });
                          setMovingFolderId(null);
                          await loadDocuments(currentFolderId);
                          setSidebarRefreshKey((k) => k + 1);
                        } catch (e) {
                          console.error('Error moving folder:', e);
                          toast({ title: 'Erro ao mover pasta' });
                        }
                      }}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" style={{ color: folder.color || '#6b7280' }} />
                      {folder.name}
                      {folder.documentCount > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">{folder.documentCount}</Badge>
                      )}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setMovingFolderId(null)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Document Details Modal */}
        <DetailsModal
          item={
            selectedDocument && showDocumentDetailsModal
              ? {
                  type: "document" as const,
                  id: selectedDocument.id,
                  name: selectedDocument.name,
                  created: selectedDocument.uploadDate,
                  createdBy: selectedDocument.createdBy,
                  lastModified: selectedDocument.lastModified,
                  lastModifiedBy: selectedDocument.lastModifiedBy,
                  size: selectedDocument.size,
                  mimeType: selectedDocument.mimeType,
                  owner: selectedDocument.owner,
                }
              : null
          }
          isOpen={showDocumentDetailsModal}
          onClose={() => setShowDocumentDetailsModal(false)}
        />

        {/* Manage Document Folders Modal */}
        {managingFoldersDocumentId && (
          <Dialog open={!!managingFoldersDocumentId} onOpenChange={() => setManagingFoldersDocumentId(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Gerenciar Pastas do Documento</DialogTitle>
                <DialogDescription>
                  Visualize todas as pastas onde este documento está presente e remova-o de pastas específicas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {loadingDocumentFolders ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
                  </div>
                ) : documentFolders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nenhuma pasta encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentFolders.map((folder: any) => (
                      <div key={folder.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: folder.color }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{folder.name}</span>
                              {folder.isPrimary && (
                                <Badge variant="secondary" className="text-xs">Pasta Principal</Badge>
                              )}
                            </div>
                            {folder.isPrimary && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Esta é a pasta principal do documento
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {folder.canRemove ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const confirmed = await confirm(`Tem certeza que deseja remover este documento da pasta "${folder.name}"?`);
                                if (confirmed) {
                                  removeDocumentFromFolder(managingFoldersDocumentId!, folder.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remover
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Não pode ser removida
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Show hint if only primary folder exists */}
                    {documentFolders.length === 1 && documentFolders[0]?.isPrimary && (
                      <div className="text-center py-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                        <FolderPlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Este documento está apenas em sua pasta principal
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const docId = managingFoldersDocumentId!;
                            setManagingFoldersDocumentId(null);
                            setTimeout(() => openShareToFolders(docId), 100);
                          }}
                        >
                          <FolderPlus className="w-4 h-4 mr-1" />
                          Adicionar a Outras Pastas
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setManagingFoldersDocumentId(null)}>
                    Fechar
                  </Button>
                  <Button onClick={() => {
                    const docId = managingFoldersDocumentId!;
                    setManagingFoldersDocumentId(null);
                    setTimeout(() => openShareToFolders(docId), 100);
                  }}>
                    <FolderPlus className="w-4 h-4 mr-1" />
                    Adicionar a Mais Pastas
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Inline Document Preview */}
        <DocumentPreview
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          document={
            previewDoc
              ? {
                  id: previewDoc.id,
                  name: previewDoc.name,
                  mimeType: previewDoc.mimeType,
                }
              : null
          }
        />

        {/* Upload Loading Overlay */}
        {uploadLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl max-w-md w-full mx-4">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <img 
                    src="/logo.gif" 
                    alt="Importando..."
                    className="w-16 h-16 object-contain"
                  />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Importando documento
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {uploadingFileName}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {uploadProgress.toFixed(0)}% concluído
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
