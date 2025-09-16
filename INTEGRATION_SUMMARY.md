# Integração Completa: OnlyOffice + Collabora Online + Editores Simples

## Visão Geral da Solução

O sistema agora possui uma arquitetura robusta de edição de documentos com **fallback inteligente em três níveis**:

1. **OnlyOffice Document Server** (Prioridade 1)
2. **Collabora Online** (Prioridade 2) 
3. **Editores Simples** (Fallback sempre disponível)

## Componentes Implementados

### 🔧 Backend Services

#### OnlyOffice Service (`server/services/onlyoffice.ts`)
- Integração completa com OnlyOffice Document Server
- Geração de JWT tokens para segurança
- Suporte a callbacks para salvamento automático
- Detecção automática de tipos de documento

#### Collabora Service (`server/services/collabora.ts`)
- Implementação completa do protocolo WOPI
- Geração de tokens de acesso seguros (HMAC-SHA256)
- Suporte a Word, Excel, PowerPoint via iframe
- Health checks e status monitoring

#### API Routes
- **OnlyOffice**: `/api/onlyoffice/*` (config, status, samples, callbacks)
- **Collabora**: `/api/collabora/*` (config, status, samples, WOPI endpoints)
- **Create Documents**: `/api/create/*` (word, excel, powerpoint)

### 🎨 Frontend Components

#### Smart Document Editor (`SmartDocumentEditor.tsx`)
- **Sistema de fallback inteligente automático**
- Detecção de disponibilidade de ambos editores
- Switch manual entre editores quando disponíveis
- Interface clara de status e configuração

#### OnlyOffice Editor (`OnlyOfficeEditor.tsx`)
- Integração completa via JavaScript API
- Carregamento dinâmico de scripts
- Eventos de callback para status

#### Collabora Editor (`CollaboraEditor.tsx`)
- Integração via iframe com WOPI
- Sandbox security configurado
- Comunicação via postMessage

### 📄 Páginas e Rotas

- `/create-document` - Criação inteligente de documentos
- `/onlyoffice-editor/:id` - Editor OnlyOffice dedicado
- `/collabora-editor/:id` - Editor Collabora com fallback
- `/onlyoffice-samples` - Testes OnlyOffice
- `/collabora-samples` - Testes Collabora

## Como Funciona o Sistema de Fallback

### 1. Detecção Automática
```typescript
// O sistema verifica disponibilidade em paralelo
const [onlyOfficeStatus, collaboraStatus] = await Promise.allSettled([
  fetch('/api/onlyoffice/status'),
  fetch('/api/collabora/status')
]);
```

### 2. Seleção Inteligente de Editor
```typescript
if (onlyOfficeAvailable) {
  selectedEditor = 'onlyoffice';        // Prioridade 1
} else if (collaboraAvailable) {
  selectedEditor = 'collabora';         // Prioridade 2  
} else {
  selectedEditor = 'simple';            // Fallback
}
```

### 3. Switch Manual Entre Editores
O usuário pode trocar entre editores disponíveis com um clique.

## Configuração via Docker

### Collabora Online
```bash
# Comando simples
docker run -t -d -p 9980:9980 \
  -e "domain=localhost:8080" \
  --name collabora \
  collabora/code

# Ou usando Docker Compose
docker-compose -f docker-compose.collabora.yml up -d
```

### OnlyOffice Document Server
```bash
docker run -i -t -d -p 80:80 \
  --name onlyoffice \
  onlyoffice/documentserver
```

## Protocolo WOPI (Collabora)

### Endpoints Implementados
- `GET /api/collabora/wopi/files/:fileId` - File info
- `GET /api/collabora/wopi/files/:fileId/contents` - Download file
- `POST /api/collabora/wopi/files/:fileId/contents` - Save file
- `POST /api/collabora/wopi/files/:fileId` - File operations

### Segurança WOPI
- Tokens assinados com HMAC-SHA256
- Validação de origem e permissões
- Controle de tempo de expiração

## Recursos Suportados

### Tipos de Documento
- ✅ **Word**: .docx, .doc, .odt, .txt
- ✅ **Excel**: .xlsx, .xls, .ods, .csv  
- ✅ **PowerPoint**: .pptx, .ppt, .odp

### Funcionalidades OnlyOffice
- ✅ Edição colaborativa em tempo real
- ✅ Comentários e revisões
- ✅ Formatação rica completa
- ✅ Inserção de imagens e objetos
- ✅ Fórmulas e gráficos avançados
- ✅ Salvamento automático via callbacks

### Funcionalidades Collabora
- ✅ Edição profissional via LibreOffice Online
- ✅ Protocolo WOPI para integração nativa
- ✅ Interface familiar do LibreOffice
- ✅ Salvamento via WOPI endpoints
- ✅ Suporte completo a formatos Office

### Funcionalidades Editores Simples
- ✅ Edição básica sempre disponível
- ✅ Compatibilidade universal
- ✅ Interface responsiva
- ✅ Salvamento local

## Integração na Interface

### Página Principal
- Botão "Editor Inteligente" usa fallback automático
- Botão "Collabora Online" testa especificamente Collabora
- Menu de contexto com opções de editor para cada documento

### Criação de Documentos
1. Tenta OnlyOffice primeiro
2. Se falhar, tenta Collabora
3. Se ambos falharem, usa editores simples
4. Feedback claro sobre qual editor está sendo usado

### Status Visual
- **Verde**: Editor profissional conectado
- **Azul**: OnlyOffice (prioridade 1)  
- **Verde**: Collabora (prioridade 2)
- **Amarelo**: Apenas editores simples

## Variáveis de Ambiente

```env
# OnlyOffice
DOCUMENT_SERVER_URL=http://localhost:8080
JWT_SECRET=your-secret-key-here
CALLBACK_URL=http://localhost:8080

# Collabora
COLLABORA_SERVER=http://localhost:9980
COLLABORA_DOMAIN=localhost:8080
WOPI_SECRET=your-secure-wopi-secret-key
HOST_URL=http://localhost:8080
```

## Cenários de Uso

### 1. Desenvolvimento Local
- Sem editores profissionais: Usa editores simples
- Com OnlyOffice: Prioriza OnlyOffice
- Com Collabora: Usa Collabora como alternativa
- Com ambos: OnlyOffice tem prioridade, switch manual disponível

### 2. Produção
- Configure pelo menos um editor profissional
- OnlyOffice para máxima compatibilidade Office
- Collabora para alternativa open source
- Editores simples sempre como fallback

### 3. Migração Gradual
- Comece com editores simples
- Adicione Collabora facilmente via Docker
- Evolua para OnlyOffice se necessário
- Sistema adapta automaticamente

## Monitoramento e Debug

### Health Checks
```bash
# Verificar OnlyOffice
curl http://localhost:8080/api/onlyoffice/status

# Verificar Collabora  
curl http://localhost:8080/api/collabora/status
```

### Logs do Sistema
- Status de cada editor logado no console
- Erros de conexão claramente identificados
- Fallbacks automáticos registrados

## Próximos Passos Opcionais

### Melhorias Futuras
- [ ] Integração com autenticação de usuários
- [ ] Controle granular de permissões via WOPI
- [ ] Histórico de versões de documentos
- [ ] Notificações de colaboração em tempo real
- [ ] Métricas de uso dos editores
- [ ] Configuração automática via Docker Compose

### Otimizações
- [ ] Cache de status dos editores
- [ ] Preload de scripts OnlyOffice
- [ ] Compression de arquivos WOPI
- [ ] CDN para assets estáticos

## Conclusão

A integração está **100% funcional** com:

✅ **Sistema robusto de fallback** que garante que documentos sempre possam ser editados
✅ **Experiência fluida** sem necessidade de sair da página
✅ **Configuração flexível** via Docker ou serviços externos  
✅ **Interface intuitiva** com feedback claro de status
✅ **Segurança adequada** via tokens assinados e WOPI
✅ **Compatibilidade máxima** com formatos Office

O usuário agora tem a melhor experiência possível independente de qual(is) editor(es) estiver(em) disponível(is)! 🎉
