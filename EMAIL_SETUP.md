# Configuração de Email - DocManager

O DocManager suporta envio real de emails para funcionalidades como recuperação de senha e emails de boas-vindas.

## Modo de Desenvolvimento

Por padrão, o sistema opera em **modo de desenvolvimento** onde os emails são exibidos no console do servidor em vez de serem enviados. Isso é útil para desenvolvimento e testes.

## Configuração para Envio Real

Para habilitar o envio real de emails, configure as variáveis de ambiente:

### 1. Criar arquivo .env

Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

### 2. Configurar as variáveis de email

Edite o arquivo `.env` e configure:

```env
# Configuração do servidor SMTP
EMAIL_HOST=smtp.seu-provedor.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@dominio.com
EMAIL_PASS=sua-senha-de-app

# Configuração do remetente
FROM_EMAIL=noreply@seu-dominio.com
FROM_NAME=DocManager System

# URL do frontend (para links nos emails)
FRONTEND_URL=https://seu-dominio.com
```

## Provedores de Email Recomendados

### Gmail
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
```

**Nota:** Para Gmail, você precisa gerar uma "senha de app" nas configurações de segurança.

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@outlook.com
EMAIL_PASS=sua-senha
```

### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=SG.sua-api-key-aqui
```

### Amazon SES
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=sua-access-key-id
EMAIL_PASS=sua-secret-access-key
```

## Configurações de Segurança

### Para Gmail:
1. Ative a verificação em duas etapas
2. Gere uma "senha de app" específica
3. Use a senha de app no lugar da sua senha normal

### Para outros provedores:
- Use sempre senhas de aplicativo quando disponível
- Considere usar provedores profissionais como SendGrid, Mailgun, ou Amazon SES para produção

## Testando a Configuração

1. Configure as variáveis de ambiente
2. Reinicie o servidor
3. Tente usar a função "Esqueci minha senha"
4. Verifique os logs do servidor para confirmar o envio

## Solução de Problemas

### Emails não estão sendo enviados
- Verifique se todas as variáveis de ambiente estão configuradas
- Confirme as credenciais do provedor de email
- Verifique os logs do servidor para mensagens de erro

### Emails indo para spam
- Configure SPF, DKIM e DMARC no seu domínio
- Use um domínio profissional para o remetente
- Considere usar um provedor especializado

### Erros de autenticação
- Verifique se está usando senha de app (quando aplicável)
- Confirme se a autenticação está habilitada no provedor
- Teste as credenciais em um cliente de email

## Logs e Monitoramento

O sistema exibe mensagens informativas no console:
- ✅ Quando emails são enviados com sucesso
- ❌ Quando há erros de envio
- 📧 Quando está em modo desenvolvimento

## Segurança

⚠️ **Importante:**
- Nunca faça commit do arquivo `.env` no controle de versão
- Use senhas de app em vez de senhas principais
- Configure firewalls para permitir conexões SMTP se necessário
- Em produção, use provedores de email profissionais
