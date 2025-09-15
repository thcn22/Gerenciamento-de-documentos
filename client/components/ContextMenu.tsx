import React, { useState, useRef, useEffect } from "react";
import {
  Edit,
  Trash2,
  Move,
  Info,
  FolderOpen,
  FileText,
  Eye,
  Download,
  Share2,
} from "lucide-react";

interface ContextMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  adminOnly?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  isVisible: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function ContextMenu({
  x,
  y,
  items,
  isVisible,
  onClose,
  isAdmin = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isVisible, onClose]);

  // Adjust position to keep within viewport when visible
  useEffect(() => {
    if (!isVisible) return;
  const adjust = () => {
      const menu = menuRef.current;
      if (!menu) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = menu.getBoundingClientRect();

      let newLeft = x;
      let newTop = y;

      // If menu would overflow right edge, move it left
      if (x + rect.width > vw) {
        newLeft = Math.max(8, vw - rect.width - 8);
      }

      // If menu would overflow bottom edge, move it up
      if (y + rect.height > vh) {
        newTop = Math.max(8, vh - rect.height - 8);
      }

      // Prevent negative positions
      if (newLeft < 8) newLeft = 8;
      if (newTop < 8) newTop = 8;

      setPos({ left: newLeft, top: newTop });
    };

    // Use RAF to ensure DOM is painted and sizes are available
    const raf = requestAnimationFrame(adjust);

    // Re-adjust on resize/scroll while menu is open
    window.addEventListener("resize", adjust);
    window.addEventListener("scroll", adjust, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", adjust);
      window.removeEventListener("scroll", adjust);
    };
  }, [isVisible, x, y]);

  if (!isVisible) return null;

  // Filter items based on admin permissions
  const filteredItems = items.filter(
    (item) => !item.adminOnly || (item.adminOnly && isAdmin),
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Context Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-2 min-w-48"
        style={{
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          transform: "translate(0, 0)",
        }}
      >
        {filteredItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-muted transition-colors ${
                item.className || "text-foreground"
              }`}
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>

            {/* Separator for delete item */}
            {item.adminOnly && index < filteredItems.length - 1 && (
              <div className="border-t border-border my-1" />
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    isVisible: boolean;
  }>({
    x: 0,
    y: 0,
    isVisible: false,
  });

  const showContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Use client coordinates (viewport) so we can adjust against window.innerWidth/Height
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      isVisible: true,
    });
  };

  const hideContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isVisible: false }));
  };

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
}
