import { Router, Request, Response } from 'express';
import AuthService from '../services/auth';
import EmailService from '../services/email';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, senha e nome são obrigatórios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    // Register user
    const result = await AuthService.register(email, password, name);
    
    if (result.success && result.user) {
      // Inform user that account is pending admin approval
      res.status(201).json({ success: true, message: 'Cadastro recebido. Sua conta está pendente de aprovação pelo administrador.' });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Login user
    const result = await AuthService.login(email, password);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const user = AuthService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    // Request password reset
    const result = await AuthService.requestPasswordReset(email);

    let emailResult: any = null;

    if (result.success && result.resetToken) {
      // Send reset email
      const user = AuthService.getAllUsers().find(u => u.email === email);
      if (user) {
        emailResult = await EmailService.sendPasswordReset(email, result.resetToken, user.name);
      }
    }

    // In development mode, return email details for UI display
    const isDevelopment = !process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS;

    if (isDevelopment && emailResult && emailResult.resetToken && emailResult.resetUrl) {
      res.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação',
        developmentMode: true,
        emailSent: result.success,
        resetToken: emailResult.resetToken,
        resetUrl: emailResult.resetUrl,
        userEmail: result.success ? email : undefined
      });
    } else {
      // Always return success to not reveal if email exists
      res.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token e nova senha são obrigatórios'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    // Reset password
    const result = await AuthService.resetPassword(token, newPassword);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/auth/users
 * Get all users (Admin only)
 */
router.get('/users', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const users = AuthService.getAllUsers();
    
    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * PUT /api/auth/users/:userId/toggle-admin
 * Toggle user admin status (Admin only)
 */
router.put('/users/:userId/toggle-admin', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.user!.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário é obrigatório'
      });
    }

    const result = await AuthService.toggleUserAdmin(userId, adminUserId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Toggle admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * PUT /api/auth/users/:userId/toggle-active
 * Toggle user active status (Admin only)
 */
router.put('/users/:userId/toggle-active', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.user!.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário é obrigatório'
      });
    }

    const result = await AuthService.toggleUserActive(userId, adminUserId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Toggle active error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * PUT /api/auth/users/:userId/role
 * Set user role (Admin only)
 */
router.put('/users/:userId/role', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
  const { role } = req.body as any;
  if (!userId || !role || !['reader','reviewer','approver','admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Parâmetros inválidos' });
    }
    const result = await AuthService.setUserRole(userId, role);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Set role error:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/auth/users/:userId/approve
 * Approve (activate) a pending user (Admin only)
 */
router.put('/users/:userId/approve', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.user!.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'ID do usuário é obrigatório' });
    }

    const result = await AuthService.approveUser(userId, adminUserId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/auth/users/:userId
 * Delete user (Admin only)
 */
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.user!.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário é obrigatório'
      });
    }

    const result = await AuthService.deleteUser(userId, adminUserId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (for completeness, client handles token removal)
 */
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

export default router;

