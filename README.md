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

# 3. Suba os containers
docker compose up --build -d

# 4. Popule o banco com dados de teste
docker compose exec backend python seed_users.py
docker compose exec backend python seed_points.py
```

Acesse [http://localhost:5173](http://localhost:5173).

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
│   ├── seed_users.py
│   └── seed_points.py
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
docker compose exec frontend sh -c "cd /app && npx vitest run"

# Cobertura
docker compose exec frontend sh -c "cd /app && npx vitest run --coverage"

# TypeScript
docker compose exec frontend sh -c "cd /app && npx tsc --noEmit"

# Lint
docker compose exec frontend sh -c "cd /app && npx biome check src/"
```
