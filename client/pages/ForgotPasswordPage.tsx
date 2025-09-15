import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, ArrowLeft, LayoutDashboard, CheckCircle, Info } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [developmentMode, setDevelopmentMode] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setEmailSent(true);

        // Capture development mode data
        if (data.developmentMode && data.resetToken && data.resetUrl) {
          setDevelopmentMode(true);
          setResetToken(data.resetToken);
          setResetUrl(data.resetUrl);
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DocManager</h1>
          </div>

          {/* Success Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-800">Email Enviado!</CardTitle>
              <CardDescription>
                Verifique sua caixa de entrada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  O que fazer agora?
                </h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Verifique sua caixa de entrada de email</li>
                  <li>Procure por um email do DocManager</li>
                  <li>Clique no link ou use o token fornecido</li>
                  <li>Defina sua nova senha</li>
                </ol>
              </div>

              {developmentMode && resetToken && resetUrl ? (
                // Development Mode - Show email content directly
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-3 flex items-center gap-2">
                    🚧 Modo Desenvolvimento - Email Simulado
                  </h4>

                  <div className="space-y-3">
                    <div className="bg-white border border-orange-200 rounded p-3">
                      <p className="text-sm text-orange-700 mb-2">
                        <strong>Como o email está em modo de desenvolvimento, use o link abaixo diretamente:</strong>
                      </p>

                      <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">
                        {resetUrl}
                      </div>

                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => window.open(resetUrl, '_self')}
                          className="text-xs"
                        >
                          Usar Link Agora
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(resetUrl)}
                          className="text-xs"
                        >
                          Copiar Link
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-orange-600">
                      <strong>Token de recuperação:</strong> {resetToken}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-2">⚠️ Importante</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• O link expira em 1 hora</li>
                    <li>• Verifique também a pasta de spam</li>
                    <li>• Você pode solicitar um novo link a qualquer momento</li>
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setDevelopmentMode(false);
                    setResetToken(null);
                    setResetUrl(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Enviar Novamente
                </Button>
                
                <Link to="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DocManager</h1>
          <p className="text-gray-600">Recuperar acesso à sua conta</p>
        </div>

        {/* Forgot Password Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Esqueci Minha Senha</CardTitle>
            <CardDescription className="text-center">
              Digite seu email para receber um link de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <img src="/logo.gif" alt="Carregando" className="w-4 h-4 mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Link de Recuperação
                  </>
                )}
              </Button>
            </form>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">📧 Como funciona</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Enviaremos um email com um link seguro</li>
                <li>• O link expira em 1 hora por segurança</li>
                <li>��� Você poderá definir uma nova senha</li>
              </ul>
            </div>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar ao login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          © 2024 DocManager - Sistema de Gerenciamento de Documentos
        </div>
      </div>
    </div>
  );
}
