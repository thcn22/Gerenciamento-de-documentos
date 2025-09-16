import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';

const EmailSetupPage: React.FC = () => {
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null);

  const copyToClipboard = (text: string, provider: string) => {
    navigator.clipboard.writeText(text);
    setCopiedProvider(provider);
    setTimeout(() => setCopiedProvider(null), 2000);
  };

  const providers = [
    {
      name: 'Gmail',
      config: `EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app`,
      note: 'Requer senha de app. Ative 2FA e gere uma senha específica.',
      popular: true
    },
    {
      name: 'Outlook',
      config: `EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@outlook.com
EMAIL_PASS=sua-senha`,
      note: 'Use sua senha normal ou senha de app se habilitada.',
      popular: true
    },
    {
      name: 'SendGrid',
      config: `EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=SG.sua-api-key-aqui`,
      note: 'Provedor profissional recomendado para produção.',
      popular: false
    },
    {
      name: 'Amazon SES',
      config: `EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=sua-access-key-id
EMAIL_PASS=sua-secret-access-key`,
      note: 'Serviço da AWS, recomendado para aplicações em produção.',
      popular: false
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link to="/admin/users" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Gerenciamento de Usuários
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <Mail className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configuração de Email</h1>
        </div>
        <p className="text-gray-600">Configure o envio de emails para recuperação de senha e notificações</p>
      </div>

      <div className="grid gap-6">
        {/* Status Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Status Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Modo Desenvolvimento:</strong> Os emails são exibidos apenas no console do servidor. 
                Para enviar emails reais, configure as variáveis de ambiente abaixo.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Instruções Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Como Configurar</CardTitle>
            <CardDescription>
              Siga estes passos para habilitar o envio real de emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">1</span>
                <div>
                  <p className="font-medium">Crie ou edite o arquivo .env</p>
                  <p className="text-sm text-gray-600">Na raiz do projeto, crie um arquivo .env com as configurações do provedor escolhido</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">2</span>
                <div>
                  <p className="font-medium">Configure as variáveis de ambiente</p>
                  <p className="text-sm text-gray-600">Adicione as configurações do provedor de email escolhido</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">3</span>
                <div>
                  <p className="font-medium">Reinicie o servidor</p>
                  <p className="text-sm text-gray-600">Após salvar o arquivo .env, reinicie o servidor para aplicar as configurações</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">4</span>
                <div>
                  <p className="font-medium">Teste a funcionalidade</p>
                  <p className="text-sm text-gray-600">Use a função "Esqueci minha senha" para testar o envio</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provedores de Email */}
        <Card>
          <CardHeader>
            <CardTitle>Provedores de Email</CardTitle>
            <CardDescription>
              Escolha um provedor e copie a configuração correspondente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {providers.map((provider) => (
                <div key={provider.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      {provider.popular && (
                        <Badge variant="secondary" className="text-xs">Popular</Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(provider.config, provider.name)}
                      className="flex items-center gap-2"
                    >
                      {copiedProvider === provider.name ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copiedProvider === provider.name ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto mb-3">
                    <code>{provider.config}</code>
                  </pre>
                  
                  <p className="text-sm text-gray-600">{provider.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configurações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Configuração do Remetente</h4>
                <pre className="bg-gray-50 p-3 rounded text-sm">
                  <code>{`FROM_EMAIL=noreply@seu-dominio.com
FROM_NAME=DocManager System`}</code>
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">URL do Frontend</h4>
                <pre className="bg-gray-50 p-3 rounded text-sm">
                  <code>FRONTEND_URL=https://seu-dominio.com</code>
                </pre>
                <p className="text-sm text-gray-600 mt-1">
                  URL usada nos links dos emails de recuperação de senha
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links Úteis */}
        <Card>
          <CardHeader>
            <CardTitle>Documentação e Ajuda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a 
                href="https://support.google.com/accounts/answer/185833" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
                Como criar senha de app no Gmail
              </a>
              <a 
                href="https://docs.sendgrid.com/for-developers/sending-email/integrations" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
                Documentação do SendGrid
              </a>
              <a 
                href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-email-smtp.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
                Configuração do Amazon SES
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailSetupPage;
