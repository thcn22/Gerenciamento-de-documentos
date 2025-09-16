import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, LayoutDashboard, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get token from URL or allow manual input
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setFormData(prev => ({ ...prev, token }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!formData.token) {
      setError('Token de recuperação é obrigatório');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: formData.token,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        // Redirect to login after successful reset
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Senha alterada com sucesso! Faça login com sua nova senha.' }
          });
        }, 3000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '', color: '' };
    if (password.length < 6) return { strength: 1, text: 'Muito fraca', color: 'text-red-500' };
    if (password.length < 8) return { strength: 2, text: 'Fraca', color: 'text-orange-500' };
    if (password.length < 12) return { strength: 3, text: 'Média', color: 'text-yellow-500' };
    return { strength: 4, text: 'Forte', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  if (success) {
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
              <CardTitle className="text-2xl font-bold text-green-800">Senha Alterada!</CardTitle>
              <CardDescription>
                Sua senha foi alterada com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Você será redirecionado para a página de login em alguns segundos...
                </p>
                
                <Link to="/login">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Ir para Login
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
          <p className="text-gray-600">Defina sua nova senha</p>
        </div>

        {/* Reset Password Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Nova Senha</CardTitle>
            <CardDescription className="text-center">
              Digite uma nova senha segura para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!formData.token && (
                <div className="space-y-2">
                  <Label htmlFor="token">Token de Recuperação</Label>
                  <Input
                    id="token"
                    name="token"
                    type="text"
                    placeholder="Cole o token do email aqui"
                    value={formData.token}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500">
                    Verifique o email que você recebeu e cole o token acima
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.newPassword && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                          passwordStrength.strength === 2 ? 'bg-orange-500 w-2/4' :
                          passwordStrength.strength === 3 ? 'bg-yellow-500 w-3/4' :
                          passwordStrength.strength === 4 ? 'bg-green-500 w-full' : 'w-0'
                        }`}
                      />
                    </div>
                    <span className={passwordStrength.color}>{passwordStrength.text}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite a senha novamente"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="text-red-500 text-sm">As senhas não coincidem</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={loading || formData.newPassword !== formData.confirmPassword || !formData.token}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Alterando senha...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </form>

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
