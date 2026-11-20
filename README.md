# Fluxo — Gestão de Tarefas

Aplicação full stack de gestão de tarefas com autenticação, perfis de acesso, PostgreSQL e interface responsiva.

## Acesso à demonstração online

Acesse o [Fluxo — Gestão de Tarefas](https://fluxo-gestao-tarefas.vercel.app/login) para avaliar a plataforma online.

> **Primeiro acesso após inatividade.** A Vercel serve a interface, e a API roda no plano Free do Render. Após 15 minutos sem tráfego, a API entra em repouso. O próximo acesso leva cerca de 1 minuto para reativá-la (53 segundos no teste em produção). [Saiba mais sobre o plano Free do Render](https://render.com/docs/free#spinning-down-on-idle).
>
> Ao abrir a página inicial ou uma área protegida, **“Verificando sua sessão…”** é uma etapa normal e costuma durar poucos segundos quando a API já está ativa. Assim que a API responder, o sistema abre a página solicitada se a sessão for válida ou mostra o login. O [link direto para o login](https://fluxo-gestao-tarefas.vercel.app/login) deixa o formulário disponível durante a espera. Se a API não responder em até 90 segundos, a tela oferece **Tentar novamente**.

A conta preparada para a avaliação tem perfil `ADMIN` e usa o e-mail `admin@demo.com.br`. Os dados de acesso, incluindo a senha, são fornecidos diretamente aos avaliadores por canal privado.

As contas `@demo.local` descritas na seção [Contas de demonstração](#contas-de-demonstração) são exclusivas do ambiente de desenvolvimento local.

## Funcionalidades

- Login por e-mail e senha com cookie HTTP-only.
- Perfis `ADMIN` e `USER` validados no backend.
- Cadastro, edição e desativação de usuários pelo administrador.
- Criação, consulta, edição, conclusão, pesquisa, filtro e exclusão de tarefas.
- Dashboard calculado com dados do PostgreSQL.
- Auditoria paginada de autenticação, usuários e tarefas, acessível apenas ao administrador.
- Tema claro/escuro com preferência persistida no navegador.
- Interfaces para desktop, tablet e celular, com estados de carregamento, erro e vazio.

**Regra principal:** tarefa concluída não pode ser excluída por ninguém, inclusive administrador. A API retorna `409 Conflict`. A exclusão usa `deleteMany` condicionado a `status = PENDING` no banco para preservar a regra também diante de operações concorrentes. Conclusão é final; não há reabertura.

## Tecnologias e organização

| Camada | Tecnologias |
| --- | --- |
| Frontend | Vue 3, TypeScript, Vite, Vue Router, Pinia, Tailwind CSS 4, Lucide |
| Backend | NestJS, TypeScript, DTOs com class-validator, Jest |
| Dados | PostgreSQL 16, Prisma 6.19.3, migração versionada |
| Ambiente | Docker Compose |

O frontend segue Atomic Design em `frontend/src/components/{atoms,molecules,organisms}` e `frontend/src/pages`. Chamadas HTTP ficam em `frontend/src/services/api.ts`; contratos em `frontend/src/types`. O backend é organizado em módulos NestJS por domínio (`auth`, `users`, `tasks`, `dashboard` e `audit`), com controllers, services e DTOs separados; `PrismaModule` fornece o acesso compartilhado ao banco.

## Início rápido com Docker

Requer Docker Desktop com Compose.

```powershell
docker compose up --build
```

Depois de subir, acesse **http://localhost:5173**. A API responde em **http://localhost:3000/api**. O Compose aguarda o PostgreSQL, aplica a migração e executa o seed de demonstração. O volume `postgres_data` mantém os dados entre reinicializações.

Se a porta 5173 estiver ocupada, defina `FRONTEND_PORT` e `FRONTEND_ORIGIN` para a mesma porta antes de iniciar, por exemplo:

```powershell
$env:FRONTEND_PORT='5180'
$env:FRONTEND_ORIGIN='http://localhost:5180'
docker compose up --build
```

Se a porta 3000 também estiver ocupada, defina `API_PORT` para outra porta; o frontend do Compose usará esse valor automaticamente.

## Rodar a API e o frontend separadamente

Requer Node.js 22 ou 24, npm e Docker para o PostgreSQL. No PowerShell, a partir da raiz do projeto:

**1. Banco de dados**

```powershell
docker compose up -d db
```

**2. Backend / API** — abra um terminal:

```powershell
cd backend
Copy-Item ..\.env.example .env
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

A API inicia em `http://localhost:3000/api`. Nas próximas execuções, basta `cd backend` e `npm run dev`; migração e seed só precisam ser repetidos após mudanças no banco ou para preparar outro ambiente. Edite `backend/.env` para usar outra conexão, origem do frontend ou segredo JWT. Não publique esse arquivo.

**3. Frontend** — abra outro terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`. Se a porta estiver ocupada, o Vite escolherá outra. No desenvolvimento local, o proxy de `/api` aponta para `http://localhost:3000`, então o frontend continua funcionando nessa outra porta.

### Contas de demonstração

| Perfil | E-mail | Senha inicial |
| --- | --- | --- |
| Administrador | `admin@demo.local` | `Admin123!` |
| Usuário | `usuario@demo.local` | `User123!` |

Essas credenciais são **apenas para desenvolvimento**. Podem ser alteradas antes do primeiro seed com `SEED_ADMIN_PASSWORD` e `SEED_USER_PASSWORD`. O seed é idempotente e recusa execução quando `NODE_ENV=production`.

## Permissões

- `ADMIN`: lista e cadastra usuários, altera nome, perfil e ativação, e gerencia tarefas de todos. Não pode desativar nem retirar seu próprio perfil administrativo.
- `USER`: gerencia apenas as próprias tarefas e não acessa a administração de usuários.
- A auditoria registra ações de autenticação, usuários e tarefas. Apenas `ADMIN` pode consultar `/api/audit`.
- Usuários são desativados, sem exclusão física, para preservar o histórico das tarefas.
- A API nunca inclui o hash da senha nas respostas.

## Comandos de validação

```powershell
cd backend
npm run db:generate
npm test
npm run build

cd ..\frontend
npm test
npm run build
```

O teste de `backend/src/tasks/tasks.spec.ts` usa PostgreSQL real e exige `backend/.env`, o banco local ativo e a migração aplicada. Antes de executá-lo, confirme que `DATABASE_URL` aponta para `localhost`; não rode essa suíte contra produção. Ele verifica que uma tarefa concluída permanece no banco após tentativa de exclusão por `ADMIN` e por `USER`, além de cobrir exclusão permitida, acesso negado e conclusão final. Os testes de autenticação, usuários, auditoria e bootstrap usam mocks e não criam contas em produção. O teste do frontend é executado pelo Vitest.

## API

Todas as rotas começam com `/api`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Verificação pública de disponibilidade |
| POST | `/auth/login` | Inicia a sessão |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/auth/me` | Usuário autenticado |
| GET / POST | `/users` | Lista / cadastra usuários (admin) |
| GET / PATCH | `/users/:id` | Consulta / altera usuário (admin) |
| GET / POST | `/tasks` | Lista / cria tarefas |
| GET / PATCH / DELETE | `/tasks/:id` | Consulta / edita / exclui tarefa |
| PATCH | `/tasks/:id/complete` | Conclui tarefa |
| GET | `/dashboard/summary` | Indicadores e atividades recentes |
| GET | `/audit` | Auditoria paginada, com busca e filtro por ação (admin) |

## Build e deploy

Para gerar o frontend, execute `npm run build` em `frontend`; os arquivos saem em `frontend/dist`. Para gerar a API, execute `npm run db:generate` e `npm run build` em `backend`; `npm run start` executa o resultado compilado. O Render usa `npm run start:production`, que aplica as migrations pendentes antes de iniciar a API.

### Demonstração pública gratuita

O Blueprint de [render.yaml](render.yaml) define a API Node e o PostgreSQL no plano Free do Render, na região Virginia. A implantação gratuita pode ser suspensa e serve para demonstração técnica, não para produção comercial ou alta disponibilidade.

- O serviço web gratuito suspende após 15 minutos sem acessos e pode levar cerca de um minuto para voltar.
- O PostgreSQL gratuito tem limite de 1 GB, 25 MB de RAM e 50 conexões, não oferece backups gerenciados e expira 30 dias após a criação. Há um período de 14 dias após a expiração para upgrade; depois disso, o Render exclui o banco e seus dados. Exporte os dados antes do prazo.
- O Render oferece 750 horas gratuitas de serviço por workspace e cotas mensais compartilhadas de banda de saída e minutos de build. Sem método de pagamento vinculado, exceder cotas suspende o serviço ou pausa novos builds; não adicione cartão nem aceite upgrade para esta demonstração.
- A Vercel Hobby é gratuita para uso pessoal e não comercial. Confira as condições da conta antes de publicar; ao exceder limites gratuitos, o uso pode ser pausado.

#### Frontend na Vercel

O projeto está publicado em [fluxo-gestao-tarefas.vercel.app](https://fluxo-gestao-tarefas.vercel.app). O diretório raiz é `frontend`, com Vite, build `npm run build` e saída `dist`. `VITE_API_URL` permanece sem definir: o navegador usa `/api`. O rewrite em `frontend/vercel.json` aponta para a API real em [fluxo-gestao-api-qsd9.onrender.com](https://fluxo-gestao-api-qsd9.onrender.com/api/health), seguido pelo fallback `/(.*)` para `/index.html`. Previews ficam desativados para não acessar dados de produção.

#### API e banco no Render

Crie o Blueprint a partir da branch `main` e confirme que API e PostgreSQL aparecem como `Free` antes de aplicar. O serviço usa `backend` como raiz, Node.js 22.22.0, build `npm ci --include=dev && npm run db:generate && npm run build` e start `npm run start:production`. Esse comando aplica `prisma migrate deploy` antes de iniciar a API. Como o Free não tem pre-deploy, as migrations versionadas são reaplicadas de forma idempotente quando a instância inicia; uma falha de migração impede a API de subir. O seed de demonstração nunca é executado.

O Render fornece `DATABASE_URL` pela conexão interna do banco, `JWT_SECRET` gerado no provedor, `NODE_ENV=production` e `PORT`. Depois de conhecer o domínio da Vercel, defina `FRONTEND_ORIGIN` com a origem exata (sem wildcard). Mantenha o banco com acesso externo bloqueado, como definido no Blueprint; a API na mesma região acessa o banco pela rede privada.

#### Primeiro administrador

Não há endpoint público de bootstrap e o seed de desenvolvimento não pode ser executado em produção. Depois que o PostgreSQL estiver ativo e as migrations terminarem, abra temporariamente a lista de IPs externos do banco no painel do Render, permitindo apenas o IP atual (`/32`). Em um terminal PowerShell interativo:

```powershell
cd backend
npm ci
npm run admin:create
```

O comando solicita a URL externa do PostgreSQL sem exibi-la, exige TLS, mostra apenas host e nome do banco para confirmação e pede nome, e-mail e senha (sem ecoar a senha). Só cria o primeiro ADMIN se o banco estiver vazio; usa bcrypt e uma transação com lock. Mensagens seguras distinguem falhas de conexão, autenticação PostgreSQL, senha e transação sem mostrar erros internos. Nunca passe conexão ou senha como argumento, não salve em `.env` e não cole no chat. Ao concluir, remova o IP temporário do acesso externo. Se já houver usuário ou ADMIN, o comando não cria outro.

#### Atualizações, logs e substituição do banco

Commits na branch configurada disparam novos builds. Consulte logs de build/runtime no painel de cada provedor e valide `/api/health`, login, sessão após recarga, logout, rotas `/tarefas`, `/usuarios` e `/auditoria`, operações de tarefas e permissões. A migration de auditoria cria tabela, enums e índices sem alterar as tabelas existentes; o Render a aplica via `prisma migrate deploy` na inicialização. O banco gratuito não tem backup gerenciado: antes do 30º dia, exporte o PostgreSQL com `pg_dump` por TLS para um arquivo local protegido. Para substituir por outro PostgreSQL gratuito, restaure esse dump com `pg_restore`, atualize `DATABASE_URL` do Render pelo painel seguro e confirme saúde e dados antes de desativar o banco antigo. Não use `prisma migrate reset` nem `prisma db push` em produção.

O Docker Compose fornecido continua destinado ao desenvolvimento local. Nunca publique `backend/.env`, connection strings ou valores de segredos no GitHub.

## Limitações conhecidas

- A listagem de tarefas ainda não tem paginação para volumes muito grandes.

## Vídeo demonstrativo

Link da gravação narrada (3 a 5 minutos):
drive: https://drive.google.com/file/d/1upc6oE1FKvegdO_smiduAwqM_rgsbrNl/view?usp=sharing

se o drive não funcionar tentei o YouTube:
https://youtu.be/FRtaeDjKqjU?is=G9Mt1Y_YXTNZ7d0B
