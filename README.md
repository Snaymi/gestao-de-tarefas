# Fluxo — Gestão de Tarefas

Aplicação full stack de gestão de tarefas com autenticação, perfis de acesso, PostgreSQL e interface responsiva.

## Funcionalidades

- Login por e-mail e senha com cookie HTTP-only.
- Perfis `ADMIN` e `USER` validados no backend.
- Cadastro, edição e desativação de usuários pelo administrador.
- Criação, consulta, edição, conclusão, pesquisa, filtro e exclusão de tarefas.
- Dashboard calculado com dados do PostgreSQL.
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

O frontend segue Atomic Design em `frontend/src/components/{atoms,molecules,organisms}` e `frontend/src/pages`. Chamadas HTTP ficam em `frontend/src/services/api.ts`; contratos em `frontend/src/types`. O backend separa controllers e services de autenticação, usuários, tarefas e dashboard. O Prisma fica em `backend/prisma`.

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
- Usuários são desativados, sem exclusão física, para preservar o histórico das tarefas.
- A API nunca inclui o hash da senha nas respostas.

## Comandos de validação

```powershell
cd backend
npm test
npm run build

cd ..\frontend
npm run build
```

O teste de `backend/src/tasks.spec.ts` usa PostgreSQL real e exige `backend/.env`, o banco ativo e a migração aplicada. Ele verifica que uma tarefa concluída permanece no banco após tentativa de exclusão por `ADMIN` e por `USER`, além de cobrir exclusão permitida, acesso negado e conclusão final.

## API

Todas as rotas começam com `/api`.

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/login` | Inicia a sessão |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/auth/me` | Usuário autenticado |
| GET / POST | `/users` | Lista / cadastra usuários (admin) |
| GET / PATCH | `/users/:id` | Consulta / altera usuário (admin) |
| GET / POST | `/tasks` | Lista / cria tarefas |
| GET / PATCH / DELETE | `/tasks/:id` | Consulta / edita / exclui tarefa |
| PATCH | `/tasks/:id/complete` | Conclui tarefa |
| GET | `/dashboard/summary` | Indicadores e atividades recentes |

## Build e deploy

Para gerar o frontend, execute `npm run build` em `frontend`; os arquivos saem em `frontend/dist`. Para gerar a API, execute `npm run db:generate` e `npm run build` em `backend`; o comando `npm run start` executa o resultado.

Em produção, use PostgreSQL gerenciado ou com volume persistente, aplique `npm run db:migrate`, configure `DATABASE_URL`, `JWT_SECRET` (mínimo 32 caracteres), `FRONTEND_ORIGIN` e `PORT`, e sirva o frontend estático por HTTPS com fallback para `index.html`. Defina `VITE_API_URL` no build do frontend como a URL pública da API terminada em `/api`. O cookie de sessão usa `Secure` quando `NODE_ENV=production`, portanto o acesso público deve ser HTTPS. Não execute o seed de demonstração em produção.

O Docker Compose fornecido é voltado ao desenvolvimento. Não há deploy público configurado neste repositório.

## Limitações conhecidas

- A listagem de tarefas ainda não tem paginação para volumes muito grandes.
- O vídeo narrado precisa ser gravado e hospedado manualmente.
- O `npm audit` do backend ainda aponta avisos moderados em dependências de ferramentas; não há avisos altos ou críticos na árvore instalada. O frontend está sem avisos no `npm audit`.

## Vídeo demonstrativo

Link da gravação narrada (3 a 5 minutos): **a adicionar após a gravação**.

Roteiro sugerido: login como usuário, criação/edição/conclusão de tarefa, tentativa de exclusão de concluída, login como administrador, cadastro de usuário, dashboard, responsividade e explicação da regra no backend.
