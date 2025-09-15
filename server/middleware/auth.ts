import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        isAdmin: boolean;
  role?: 'reader' | 'reviewer' | 'approver' | 'admin';
      };
    }
  }
}

// Middleware to authenticate JWT token (Authorization header only)
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso necessário'
    });
  }

  const result = AuthService.verifyToken(token);

  if (!result.success) {
    return res.status(403).json({
      success: false,
      message: result.message || 'Token inválido'
    });
  }

  req.user = result.user;
  next();
};

// Middleware to require admin privileges
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Usuário não autenticado' 
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Acesso negado: privilégios de administrador necessários' 
    });
  }

  next();
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  // Allow token via query param for iframe/get requests
  if (!token && typeof (req.query as any)?.token === 'string') {
    token = String((req.query as any).token);
  }

  if (token) {
    const result = AuthService.verifyToken(token);
    if (result.success) {
      req.user = result.user;
    }
  }

  next();
};

// Strict authentication allowing token via query param (useful for iframes/EventSource)
export const authenticateTokenAllowQuery = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && typeof (req.query as any)?.token === 'string') {
    token = String((req.query as any).token);
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de acesso necessário' });
  }
  const result = AuthService.verifyToken(token);
  if (!result.success) {
    return res.status(403).json({ success: false, message: result.message || 'Token inválido' });
  }
  req.user = result.user;
  next();
};

// Require specific role or admin
export const requireRole = (roles: Array<'reader' | 'reviewer' | 'approver' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
    const role = req.user.role || (req.user.isAdmin ? 'admin' : 'reader');
    if (req.user.isAdmin || roles.includes(role as any)) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Acesso negado: permissões insuficientes' });
  };
};
