// Email service for sending password reset emails
import nodemailer from 'nodemailer';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || '',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
};

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@docmanager.com';
const FROM_NAME = process.env.FROM_NAME || 'DocManager System';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private useRealEmail: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email configuration is provided
    if (EMAIL_CONFIG.host && EMAIL_CONFIG.auth.user && EMAIL_CONFIG.auth.pass) {
      try {
  this.transporter = nodemailer.createTransport(EMAIL_CONFIG);
        this.useRealEmail = true;
        console.log('✅ Serviço de email configurado - emails serão enviados');
      } catch (error) {
        console.error('❌ Erro ao configurar serviço de email:', error);
        this.useRealEmail = false;
      }
    } else {
      console.log('📧 Serviço de email em modo desenvolvimento - emails serão exibidos no console');
      this.useRealEmail = false;
    }
  }

  // Send email using real service or development mode
  private async sendEmail(emailOptions: EmailOptions): Promise<{ success: boolean; message: string; emailContent?: any }> {
    try {
      if (this.useRealEmail && this.transporter) {
        // Send real email
        const mailOptions = {
          from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
          to: emailOptions.to,
          subject: emailOptions.subject,
          html: emailOptions.html,
          text: emailOptions.text
        };

        const result = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Email enviado para ${emailOptions.to}:`, result.messageId);

        return {
          success: true,
          message: 'Email enviado com sucesso'
        };
      } else {
        // Development mode - log to console and return content for UI display
        console.log('\n📧 EMAIL ENVIADO (Modo Desenvolvimento)');
        console.log('═══════════════════════════════════════');
        console.log(`Para: ${emailOptions.to}`);
        console.log(`Assunto: ${emailOptions.subject}`);
        console.log('\n--- CONTEÚDO DO EMAIL ---');
        console.log(emailOptions.text);
        console.log('═══════════════════════════════════════\n');

        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
          success: true,
          message: 'Email simulado enviado (modo desenvolvimento)',
          emailContent: {
            to: emailOptions.to,
            subject: emailOptions.subject,
            html: emailOptions.html,
            text: emailOptions.text
          }
        };
      }
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return {
        success: false,
        message: 'Erro ao enviar email'
      };
    }
  }

  // Send password reset email
  async sendPasswordReset(email: string, resetToken: string, userName: string): Promise<{ success: boolean; message: string; emailContent?: any; resetToken?: string; resetUrl?: string }> {
    try {
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

      const emailOptions: EmailOptions = {
        to: email,
        subject: 'DocManager - Recuperação de Senha',
        html: this.generatePasswordResetHTML(userName, resetUrl, resetToken),
        text: this.generatePasswordResetText(userName, resetUrl, resetToken)
      };

      // Show token in development mode
      if (!this.useRealEmail) {
        console.log('\n--- INFORMAÇÕES DE DESENVOLVIMENTO ---');
        console.log(`🔗 Link: ${resetUrl}`);
        console.log(`🔑 Token: ${resetToken}`);
        console.log('───────────────────────────────────────\n');
      }

      const result = await this.sendEmail(emailOptions);

      // Return extra info for development mode
      if (!this.useRealEmail) {
        return {
          ...result,
          resetToken,
          resetUrl
        };
      }

      return result;

    } catch (error) {
      console.error('Password reset email error:', error);
      return {
        success: false,
        message: 'Erro ao enviar email de recuperação'
      };
    }
  }

  // Public generic notification method
  async sendNotification(to: string, subject: string, text: string, html?: string): Promise<{ success: boolean; message: string }> {
    const emailOptions: EmailOptions = {
      to,
      subject,
      text,
      html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`
    };
    return await this.sendEmail(emailOptions);
  }

  // Generate HTML email template
  private generatePasswordResetHTML(userName: string, resetUrl: string, resetToken: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha - DocManager</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .token-box { background: #e2e8f0; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace; word-break: break-all; }
        .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 DocManager</h1>
        <p>Recuperação de Senha</p>
    </div>
    
    <div class="content">
        <h2>Olá, ${userName}!</h2>
        
        <p>Você solicitou a recuperação de senha para sua conta no DocManager. Para redefinir sua senha, clique no botão abaixo:</p>
        
        <div style="text-align: center;">
            <a href="${resetUrl}" class="button">🔄 Redefinir Senha</a>
        </div>
        
        <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
                <li>Este link expira em <strong>1 hora</strong></li>
                <li>Use apenas se você solicitou a recuperação</li>
                <li>Não compartilhe este link com ninguém</li>
            </ul>
        </div>
        
        <p><strong>Alternativamente, você pode usar o token abaixo na página de recuperação:</strong></p>
        
        <div class="token-box">
            <strong>Token de Recuperação:</strong><br>
            ${resetToken}
        </div>
        
        <p>Se você não solicitou esta recuperação, pode ignorar este email com segurança.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        
        <p><strong>Precisa de ajuda?</strong><br>
        Entre em contato conosco em: <a href="mailto:suporte@docmanager.com">suporte@docmanager.com</a></p>
    </div>
    
    <div class="footer">
        <p>© 2024 DocManager - Sistema de Gerenciamento de Documentos</p>
        <p>Este é um email automático, não responda a esta mensagem.</p>
    </div>
</body>
</html>`;
  }

  // Generate plain text email
  private generatePasswordResetText(userName: string, resetUrl: string, resetToken: string): string {
    return `
DocManager - Recuperação de Senha

Olá, ${userName}!

Você solicitou a recuperação de senha para sua conta no DocManager.

Para redefinir sua senha, acesse o link abaixo:
${resetUrl}

Ou use o token de recuperação na página de redefinição:
${resetToken}

IMPORTANTE:
- Este link expira em 1 hora
- Use apenas se você solicitou a recuperação
- Não compartilhe este link com ninguém

Se você não solicitou esta recuperação, pode ignorar este email.

Precisa de ajuda? Entre em contato: suporte@docmanager.com

---
© 2024 DocManager - Sistema de Gerenciamento de Documentos
Este é um email automático, não responda a esta mensagem.
`;
  }

  // Send welcome email for new users
  async sendWelcomeEmail(email: string, userName: string): Promise<{ success: boolean; message: string }> {
    try {
      const emailOptions: EmailOptions = {
        to: email,
        subject: 'Bem-vindo ao DocManager!',
        html: this.generateWelcomeHTML(userName),
        text: this.generateWelcomeText(userName)
      };

      return await this.sendEmail(emailOptions);

    } catch (error) {
      console.error('Welcome email error:', error);
      return { success: false, message: 'Erro ao enviar email de boas-vindas' };
    }
  }

  // Generate welcome email HTML
  private generateWelcomeHTML(userName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao DocManager</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
        .welcome-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Bem-vindo ao DocManager!</h1>
        <p>Sua conta foi criada com sucesso</p>
    </div>

    <div class="content">
        <h2>Olá, ${userName}!</h2>

        <div class="welcome-box">
            <p><strong>Parabéns!</strong> Sua conta no DocManager foi criada com sucesso e você já pode começar a usar nosso sistema de gerenciamento de documentos.</p>
        </div>

        <p><strong>O que você pode fazer agora:</strong></p>
        <ul>
            <li>📄 Criar e editar documentos</li>
            <li>📁 Organizar arquivos em pastas</li>
            <li>🔍 Buscar e navegar por seus documentos</li>
            <li>⚙️ Personalizar suas configurações</li>
        </ul>

        <p>Se precisar de ajuda, nossa documentação está sempre disponível ou entre em contato conosco.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">

        <p><strong>Precisa de ajuda?</strong><br>
        Entre em contato conosco em: <a href="mailto:suporte@docmanager.com">suporte@docmanager.com</a></p>
    </div>

    <div class="footer">
        <p>© 2024 DocManager - Sistema de Gerenciamento de Documentos</p>
        <p>Este é um email automático, não responda a esta mensagem.</p>
    </div>
</body>
</html>`;
  }

  // Generate welcome email text
  private generateWelcomeText(userName: string): string {
    return `
DocManager - Bem-vindo!

Olá, ${userName}!

Parabéns! Sua conta no DocManager foi criada com sucesso e você já pode começar a usar nosso sistema de gerenciamento de documentos.

O que você pode fazer agora:
- Criar e editar documentos
- Organizar arquivos em pastas
- Buscar e navegar por seus documentos
- Personalizar suas configurações

Se precisar de ajuda, nossa documentação está sempre disponível ou entre em contato conosco.

Precisa de ajuda? Entre em contato: suporte@docmanager.com

---
© 2024 DocManager - Sistema de Gerenciamento de Documentos
Este é um email automático, não responda a esta mensagem.
`;
  }
}

export default new EmailService();
