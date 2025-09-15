# Gerenciador de Documentos

Plataforma full-stack para criação, visualização, edição colaborativa e gestão de documentos (texto, planilhas, apresentações e arquivos diversos), com autenticação, filas de revisão e suporte a diferentes editores.

## Tecnologias Principais
- Frontend: React 18, React Router 6 (SPA), TypeScript, Vite, TailwindCSS, Radix UI
- Backend: Express + integração com Vite (single dev server)
- Testes: Vitest
- UI: Componentes reutilizáveis + Tailwind + ícones Lucide
- Compartilhamento de Tipos: Pasta `shared/`

## Estrutura
```
client/           # SPA React
server/           # API Express + scripts
shared/           # Tipos compartilhados
public/           # Assets públicos
netlify/          # Funções serverless (se usadas)
uploads/          # (Ignorado) uploads de usuários
```

## Principais Páginas (client/pages)
- Login / Registro / Recuperação de senha
- Dashboard (Index)
- Edição de Documentos (texto / planilha / apresentação)
- Visualizador de Documentos
- Gestão de Usuários / Perfil / Configurações
- Fila de Revisões / Aprovações

## Scripts
```
npm run dev       # Ambiente de desenvolvimento (frontend + backend)
npm run build     # Build de produção
npm run start     # Servir build de produção
npm run test      # Rodar testes (Vitest)
npm run typecheck # Checagem de tipos
```

## Variáveis de Ambiente
Copie `.env.example` para `.env` e ajuste conforme necessário.

## Convenções
- Código TypeScript em todo o stack
- Componentes React em `client/components`
- Rotas Express em `server/routes`
- Serviços em `server/services`
- Scripts utilitários em `server/scripts`

## Como Adicionar uma Rota API
1. Criar handler em `server/routes/`.
2. Registrar em `server/index.ts` com prefixo `/api`.
3. (Opcional) Tipar resposta em `shared/api.ts`.

## Como Adicionar uma Página
1. Criar componente em `client/pages/NomeDaPagina.tsx`.
2. Adicionar rota em `client/App.tsx` antes do catch-all `*`.

## Testes
Exemplo em `client/lib/utils.spec.ts`. Crie novos testes próximos ao código ou em uma pasta `__tests__`.

## Deploy
- Netlify / Vercel suportados
- Build padrão: `npm run build` e depois `npm start`

## Licença
Defina uma licença (ex: MIT) e adicione um arquivo `LICENSE` se for público.

---
Contribuições e melhorias são bem-vindas!
