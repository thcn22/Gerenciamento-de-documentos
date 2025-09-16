import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DocumentViewer from "./pages/DocumentViewer";
import DocumentEditor from "./pages/DocumentEditor";
import UserManagement from "./pages/UserManagement";
import PendingApprovals from "./pages/PendingApprovals";
import GroupsPage from "./pages/GroupsPage";
import TextEditorPage from "./pages/TextEditorPage";
import SpreadsheetEditorPage from "./pages/SpreadsheetEditorPage";
import PresentationEditorPage from "./pages/PresentationEditorPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EmailSetupPage from "./pages/EmailSetupPage";
import SettingsPage from "./pages/SettingsPage";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ReviewQueue from "./pages/ReviewQueue";
import MySubmissions from "./pages/MySubmissions";

const SecurityGuards = () => {
  useEffect(() => {
    const onContextMenu = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "p") {
        e.preventDefault();
        try { window.stop?.(); } catch {}
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
        try { void navigator.clipboard.writeText(""); } catch {}
      }
    };
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <DndProvider backend={HTML5Backend}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ConfirmProvider>
          <SecurityGuards />
          <BrowserRouter>
            <Routes>
              {/* Authentication routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document/:id"
                element={
                  <ProtectedRoute>
                    <DocumentViewer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/:type"
                element={
                  <ProtectedRoute>
                    <DocumentEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/text-editor"
                element={
                  <ProtectedRoute>
                    <TextEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/text-editor/:id"
                element={
                  <ProtectedRoute>
                    <TextEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/spreadsheet-editor"
                element={
                  <ProtectedRoute>
                    <SpreadsheetEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/spreadsheet-editor/:id"
                element={
                  <ProtectedRoute>
                    <SpreadsheetEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/presentation-editor"
                element={
                  <ProtectedRoute>
                    <PresentationEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/presentation-editor/:id"
                element={
                  <ProtectedRoute>
                    <PresentationEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requireAdmin>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/groups"
                element={
                  <ProtectedRoute requireAdmin>
                    <GroupsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pending-approvals"
                element={
                  <ProtectedRoute requireAdmin>
                    <PendingApprovals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/email-setup"
                element={
                  <ProtectedRoute requireAdmin>
                    <EmailSetupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reviews"
                element={
                  <ProtectedRoute>
                    <ReviewQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews/mine"
                element={
                  <ProtectedRoute>
                    <MySubmissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </ConfirmProvider>
        </TooltipProvider>
        </DndProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
