# 🌿 EcoLixo

Mapeamento colaborativo de pontos de coleta de resíduos eletrônicos.

## Stack

- **Frontend:** React 19, TypeScript, TanStack Query, Leaflet, Recharts
- **Backend:** FastAPI, SQLAlchemy async, PostgreSQL + PostGIS
- **Infra:** Docker Compose

## Quick start

```bash
# 1. Clone e entre no diretório
git clone <url>
cd ecolixo

# 2. Copie o .env
cp .env.example backend/.env

# 3. Suba os containers (o backend aplica as migrações ao iniciar)
docker compose up --build -d

# 4. Popule o banco com dados de teste
docker compose exec backend python seed_users.py
docker compose exec backend python seed_points.py
```

Acesse [http://localhost:5173](http://localhost:5173).

## Serviços de retirada (MVP)

Após entrar, acesse **Serviços** no menu ou `/services`.

- Cadastro de prestadores (pessoa ou empresa), contato, região de atendimento,
  materiais aceitos e retirada gratuita, cobrada ou sob consulta.
- Consulta e filtro por material; edição e remoção somente pelo autor.
- Edição em `/services/:id/edit`, com opção de exibir uma referência pública
  aproximada e raio de atendimento entre 1 e 100 km. Selecione no mapa ou informe
  latitude/longitude; não informe endereço residencial.
- No mapa, ative **Mostrar serviços de retirada**. Círculos azuis e ícone de caminhão
  representam serviços, não pontos de coleta. O filtro de material vale para ambos;
  status e mapa de calor são exclusivos dos pontos de coleta.
- Sem referência geográfica, o anúncio permanece apenas no catálogo. Desativar a
  opção e salvar remove a referência. Exemplos fictícios não recebem coordenadas
  automaticamente. A área é aproximada: confirme disponibilidade com o prestador.
- O contato é visível aos usuários autenticados. Os anúncios não são certificados
  pelo EcoLixo. Disponibilidade e custos são combinados diretamente com o prestador.
- Não inclui agendamento, pagamento ou avaliações.

## Minha jornada (gamificação)

Cidadãos acessam **Minha jornada** (`/journey`): missões educativas (10 pontos cada,
uma vez, com respostas validadas no servidor), conquistas e histórico de pontos.
Um ponto de coleta rende 30 pontos somente depois de **aprovado** por um gestor no
painel; rejeitar ou voltar para revisão revoga a pontuação, que continua no histórico.
Os pontos reconhecem participação: não medem quantidade reciclada nem certificam locais.
Registros rejeitados não aparecem no mapa dos cidadãos.

## Banco de dados e migrações

O esquema é versionado com Alembic (`backend/migrations/`). O backend executa
`alembic upgrade head` ao iniciar, então bancos novos e existentes são atualizados
sem apagar dados nem volumes. As migrações são idempotentes e também adotam bancos
criados com os antigos scripts `database/*.sql`.

```bash
docker compose exec backend alembic current           # versão aplicada
docker compose exec backend alembic upgrade head      # aplicar manualmente
docker compose exec backend alembic revision -m "..." # nova migração
```

Testes HTTP com PostgreSQL (dados de teste revertidos por transação):

```bash
docker compose exec -T backend python -m unittest discover -s tests -v
```

## Produção

`docker-compose.prod.yml` sobe três serviços: Caddy (HTTPS automático e frontend
estático), API e PostgreSQL/PostGIS. Só o Caddy expõe portas (80/443); a API fica
em `/api` na mesma origem, sem CORS e sem `/docs` público.

```bash
cp .env.prod.example .env.prod   # troque todos os valores (openssl rand -hex 32)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

- `DOMAIN` precisa apontar para o IP público da VPS antes de subir, para o Caddy
  emitir o certificado.
- As migrações rodam ao iniciar o backend. Não rode `seed_users.py`, `seed_points.py`
  nem `seed_services.py` em produção (criam contas com senha pública).
- Dados de demonstração para apresentação: `python seed_demo.py` (contas sem senha
  conhecida, tudo marcado `[DEMO]`, sem pontuação); remova com `python seed_demo.py --remove`.
- Backup do banco: `docker compose -f docker-compose.prod.yml exec -T db pg_dump -U ecolixo -Fc ecolixo > backup.dump`.

### Deploy automático

Cada push na `main` que passa na CI publica na VPS (job `deploy` em
`.github/workflows/ci.yml`, ambiente `production` do GitHub). O job entra por SSH
com uma chave que só executa `deploy/deploy.sh` (copiado para `~/deploy.sh` no
servidor): `git merge --ff-only`, rebuild e checagem de saúde.

Configuração única no servidor, com a chave pública de deploy:

```bash
cp deploy/deploy.sh ~/deploy.sh && chmod 700 ~/deploy.sh
echo 'restrict,command="/home/rafael/deploy.sh" ssh-ed25519 AAAA... github-actions-deploy' >> ~/.ssh/authorized_keys
```

No GitHub, ambiente `production` (restrito à `main`): secrets `DEPLOY_SSH_KEY`
(chave privada) e `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan` do servidor, conferido) e a
variável `DEPLOY_HOST`.

## Usuários de teste

| Tipo    | Nome             | Email              | Senha   |
|---------|------------------|--------------------|---------|
| Cidadão | Maria            | maria@teste.com    | 123456  |
| Cidadão | João             | joao@teste.com     | 123456  |
| Cidadão | Ana              | ana@teste.com      | 123456  |
| Gestor  | Roberto Almeida  | roberto@teste.com  | 123456  |
| Gestor  | Carla Souza      | carla@teste.com    | 123456  |

> Para cadastrar um gestor, use o código de registro: `ecolixo@2026`

## Scripts

```bash
docker compose exec backend python seed_users.py    # Cria 7 usuários
docker compose exec backend python seed_points.py   # Cria 22 pontos em SP
docker compose exec backend python seed_services.py # Cria 6 serviços fictícios (sem duplicar)
```

## Estrutura

```
ecolixo/
├── backend/
│   ├── app/
│   │   ├── models/       # ORM (SQLAlchemy)
│   │   ├── schemas/      # Validação (Pydantic)
│   │   ├── services/     # Lógica de negócio
│   │   ├── routers/      # Controllers (thin)
│   │   ├── auth/         # JWT
│   │   └── ...
│   ├── migrations/       # Alembic
│   ├── tests/            # Integração HTTP + PostgreSQL
│   ├── seed_users.py
│   ├── seed_points.py
│   └── seed_services.py
├── frontend/
│   ├── src/
│   │   ├── pages/        # Views
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── services/     # API calls tipadas
│   │   ├── hooks/        # Custom hooks (React Query)
│   │   ├── contexts/     # Auth context
│   │   └── api/          # Axios client
│   └── ...
├── docker-compose.yml
└── README.md
```

## Comandos úteis

```bash
# Backend
docker compose logs backend -f
docker compose exec backend bash

# Frontend
docker compose logs frontend -f
docker compose exec frontend sh

# Testes
docker compose exec -T frontend pnpm exec vitest run

# Cobertura
docker compose exec -T frontend pnpm test:coverage

# TypeScript
docker compose exec -T frontend pnpm exec tsc --noEmit

# Lint
docker compose exec -T frontend pnpm exec biome check src/
```
