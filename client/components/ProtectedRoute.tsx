import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, LayoutDashboard } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // Redirect to login with current location
        navigate('/login', { 
          state: { from: location },
          replace: true 
        });
      } else if (requireAdmin && !isAdmin) {
        // Redirect to home if admin required but user is not admin
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, loading, navigate, location, requireAdmin]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.gif" alt="Carregando" className="h-8 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Gerenciador de documentos</h3>
          <p className="text-slate-500">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or admin required but not admin
  if (!isAuthenticated || (requireAdmin && !isAdmin)) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}
