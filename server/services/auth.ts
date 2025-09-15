import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const TOKEN_EXPIRY = '7d';
const RESET_TOKEN_EXPIRY = '1h';

// User storage (in production, use a real database)
const usersFile = path.join(process.cwd(), 'data', 'users.json');
const passwordResetsFile = path.join(process.cwd(), 'data', 'password_resets.json');

// Ensure data directory exists
fs.ensureDirSync(path.dirname(usersFile));

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  isAdmin: boolean;
  role?: 'reader' | 'reviewer' | 'approver' | 'admin';
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface PasswordReset {
  email: string;
  token: string;
  expiresAt: string;
  used: boolean;
}

class AuthService {
  
  // Load users from file
  private loadUsers(): User[] {
    try {
      if (fs.existsSync(usersFile)) {
        const data = fs.readFileSync(usersFile, 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  // Save users to file
  private saveUsers(users: User[]): void {
    try {
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  // Load password resets
  private loadPasswordResets(): PasswordReset[] {
    try {
      if (fs.existsSync(passwordResetsFile)) {
        const data = fs.readFileSync(passwordResetsFile, 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Error loading password resets:', error);
      return [];
    }
  }

  // Save password resets
  private savePasswordResets(resets: PasswordReset[]): void {
    try {
      fs.writeFileSync(passwordResetsFile, JSON.stringify(resets, null, 2));
    } catch (error) {
      console.error('Error saving password resets:', error);
    }
  }

  // Initialize with default admin user
  async initializeDefaultAdmin(): Promise<void> {
    const users = this.loadUsers();
    
    // Check if admin already exists
    const adminExists = users.some(user => user.email === 'admin@docmanager.com');
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser: User = {
        id: 'admin-' + Date.now(),
        email: 'admin@docmanager.com',
        password: hashedPassword,
        name: 'Administrador',
        isAdmin: true,
        role: 'admin',
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      users.push(adminUser);
      this.saveUsers(users);
      console.log('✅ Default admin user created: admin@docmanager.com / admin123');
    }
  }

  // Register new user
  async register(email: string, password: string, name: string): Promise<{ success: boolean; message: string; user?: Omit<User, 'password'> }> {
    try {
      const users = this.loadUsers();
      
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        return { success: false, message: 'Email já está em uso' };
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Enforce allowed email domain
      const allowedDomain = '@venosan.com.br';
      if (!email.toLowerCase().endsWith(allowedDomain)) {
        return { success: false, message: `Somente emails do domínio ${allowedDomain} são permitidos` };
      }

      // Create new user (start as inactive/pending approval)
      const newUser: User = {
        id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        email,
        password: hashedPassword,
        name,
        isAdmin: false,
        role: 'reader',
        createdAt: new Date().toISOString(),
        isActive: false // pending admin approval
      };
      
      users.push(newUser);
      this.saveUsers(users);
      
      const { password: _, ...userWithoutPassword } = newUser;
      return { 
        success: true, 
        message: 'Usuário cadastrado com sucesso',
        user: userWithoutPassword
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Login user
  async login(email: string, password: string): Promise<{ success: boolean; message: string; token?: string; user?: Omit<User, 'password'> }> {
    try {
      const users = this.loadUsers();
      
      // Find user
      const user = users.find(u => u.email === email && u.isActive);
      if (!user) {
        return { success: false, message: 'Email ou senha incorretos' };
      }
      
      // Check password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return { success: false, message: 'Email ou senha incorretos' };
      }
      
      // Update last login
      user.lastLogin = new Date().toISOString();
      this.saveUsers(users);
      
      // Generate JWT token
    // Derive role for backward compatibility
    const role = (user as any).role || (user.isAdmin ? 'admin' : 'reader');
    const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
      isAdmin: user.isAdmin,
      role
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );
      
  const { password: _, ...userWithoutPassword } = user as any;
  (userWithoutPassword as any).role = role;
      return {
        success: true,
        message: 'Login realizado com sucesso',
        token,
        user: userWithoutPassword
      };
      
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Verify JWT token
  verifyToken(token: string): { success: boolean; user?: any; message?: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { success: true, user: decoded };
    } catch (error) {
      return { success: false, message: 'Token inválido ou expirado' };
    }
  }

  // Get user by ID
  getUserById(userId: string): Omit<User, 'password'> | null {
    const users = this.loadUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
  const { password: _, ...userWithoutPassword } = user as any;
  (userWithoutPassword as any).role = (user as any).role || (user.isAdmin ? 'admin' : 'reader');
      return userWithoutPassword;
    }
    return null;
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    try {
      const users = this.loadUsers();
      const user = users.find(u => u.email === email && u.isActive);
      
      if (!user) {
        // Don't reveal if email exists or not for security
        return { success: true, message: 'Se o email estiver cadastrado, você receberá um link de recuperação' };
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      
      const resets = this.loadPasswordResets();
      
      // Remove any existing resets for this email
      const filteredResets = resets.filter(r => r.email !== email);
      
      // Add new reset request
      filteredResets.push({
        email,
        token: resetToken,
        expiresAt,
        used: false
      });
      
      this.savePasswordResets(filteredResets);
      
      return {
        success: true,
        message: 'Link de recuperação enviado para seu email',
        resetToken // In production, this would be sent via email
      };
      
    } catch (error) {
      console.error('Password reset request error:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const resets = this.loadPasswordResets();
      const resetRequest = resets.find(r => r.token === token && !r.used);
      
      if (!resetRequest) {
        return { success: false, message: 'Token de recuperação inválido' };
      }
      
      // Check if token expired
      if (new Date() > new Date(resetRequest.expiresAt)) {
        return { success: false, message: 'Token de recuperação expirado' };
      }
      
      // Update user password
      const users = this.loadUsers();
      const userIndex = users.findIndex(u => u.email === resetRequest.email);
      
      if (userIndex === -1) {
        return { success: false, message: 'Usuário não encontrado' };
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      users[userIndex].password = hashedPassword;
      
      // Mark reset as used
      resetRequest.used = true;
      
      // Save changes
      this.saveUsers(users);
      this.savePasswordResets(resets);
      
      return { success: true, message: 'Senha alterada com sucesso' };
      
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Admin: Get all users
  getAllUsers(): Omit<User, 'password'>[] {
    const users = this.loadUsers();
    return users.map(user => {
      const { password: _, ...userWithoutPassword } = user as any;
      // Garantir campo role para usuários antigos
      (userWithoutPassword as any).role = (user as any).role || (user.isAdmin ? 'admin' : 'reader');
      return userWithoutPassword;
    });
  }

  // Admin: Toggle user admin status
  async toggleUserAdmin(targetUserId: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      const users = this.loadUsers();
      
      // Check if the admin user exists and is admin
      const adminUser = users.find(u => u.id === adminUserId && u.isAdmin);
      if (!adminUser) {
        return { success: false, message: 'Acesso negado' };
      }
      
      // Find target user
      const targetUserIndex = users.findIndex(u => u.id === targetUserId);
      if (targetUserIndex === -1) {
        return { success: false, message: 'Usuário não encontrado' };
      }
      
      // Don't allow admin to remove their own admin privileges
      if (targetUserId === adminUserId) {
        return { success: false, message: 'Não é possível alterar seus próprios privilégios' };
      }
      
      // Toggle admin status and sync role when applicable
      users[targetUserIndex].isAdmin = !users[targetUserIndex].isAdmin;
      const currentRole = (users[targetUserIndex] as any).role || (users[targetUserIndex].isAdmin ? 'admin' : 'reader');
      if (users[targetUserIndex].isAdmin) {
        (users[targetUserIndex] as any).role = 'admin';
      } else if (currentRole === 'admin') {
        // Downgrade to reader if role was admin
        (users[targetUserIndex] as any).role = 'reader';
      }
      this.saveUsers(users);
      
      const action = users[targetUserIndex].isAdmin ? 'concedidos' : 'removidos';
      return { 
        success: true, 
        message: `Privilégios de administrador ${action} para ${users[targetUserIndex].name}` 
      };
      
    } catch (error) {
      console.error('Toggle admin error:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Admin: Toggle user active status
  async toggleUserActive(targetUserId: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      const users = this.loadUsers();
      
      // Check if the admin user exists and is admin
      const adminUser = users.find(u => u.id === adminUserId && u.isAdmin);
      if (!adminUser) {
        return { success: false, message: 'Acesso negado' };
      }
      
      // Find target user
      const targetUserIndex = users.findIndex(u => u.id === targetUserId);
      if (targetUserIndex === -1) {
        return { success: false, message: 'Usuário não encontrado' };
      }
      
      // Don't allow admin to deactivate themselves
      if (targetUserId === adminUserId) {
        return { success: false, message: 'Não é possível desativar sua própria conta' };
      }
      
      // Toggle active status
      users[targetUserIndex].isActive = !users[targetUserIndex].isActive;
      this.saveUsers(users);
      
      const action = users[targetUserIndex].isActive ? 'ativada' : 'desativada';
      return { 
        success: true, 
        message: `Conta ${action} para ${users[targetUserIndex].name}` 
      };
      
    } catch (error) {
      console.error('Toggle active error:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Admin: Set user role (reader | reviewer | approver | admin)
  async setUserRole(targetUserId: string, role: 'reader' | 'reviewer' | 'approver' | 'admin'): Promise<{ success: boolean; message: string }> {
    try {
      const users = this.loadUsers();
      const idx = users.findIndex(u => u.id === targetUserId);
      if (idx === -1) return { success: false, message: 'Usuário não encontrado' };
      (users[idx] as any).role = role;
      // Keep isAdmin in sync for compatibility
      users[idx].isAdmin = role === 'admin';
      this.saveUsers(users);
      return { success: true, message: `Papel atualizado para ${role}` };
    } catch (error) {
      console.error('Set role error:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Admin: Approve (activate) a pending user
  async approveUser(targetUserId: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      const users = this.loadUsers();
      const adminUser = users.find(u => u.id === adminUserId && u.isAdmin);
      if (!adminUser) return { success: false, message: 'Acesso negado' };

      const idx = users.findIndex(u => u.id === targetUserId);
      if (idx === -1) return { success: false, message: 'Usuário não encontrado' };

      if (users[idx].isActive) return { success: false, message: 'Usuário já está ativo' };

      users[idx].isActive = true;
      this.saveUsers(users);

      return { success: true, message: `Usuário ${users[idx].name} aprovado e ativado` };
    } catch (error) {
      console.error('Approve user error:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  // Admin: Delete user
  async deleteUser(targetUserId: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      const users = this.loadUsers();
      
      // Check if the admin user exists and is admin
      const adminUser = users.find(u => u.id === adminUserId && u.isAdmin);
      if (!adminUser) {
        return { success: false, message: 'Acesso negado' };
      }
      
      // Find target user
      const targetUserIndex = users.findIndex(u => u.id === targetUserId);
      if (targetUserIndex === -1) {
        return { success: false, message: 'Usuário não encontrado' };
      }
      
      // Don't allow admin to delete themselves
      if (targetUserId === adminUserId) {
        return { success: false, message: 'Não é possível excluir sua própria conta' };
      }
      
      // Don't allow deleting the last admin
      const adminCount = users.filter(u => u.isAdmin && u.id !== targetUserId).length;
      if (users[targetUserIndex].isAdmin && adminCount === 0) {
        return { success: false, message: 'Não é possível excluir o último administrador do sistema' };
      }
      
      const userName = users[targetUserIndex].name;
      
      // Remove user from array
      users.splice(targetUserIndex, 1);
      this.saveUsers(users);
      
      return { 
        success: true, 
        message: `Usuário ${userName} foi excluído com sucesso` 
      };
      
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }
}

export default new AuthService();
