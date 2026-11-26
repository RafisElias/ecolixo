#!/bin/sh
# Deploy do EcoLixo. Executado pela chave do GitHub Actions como comando
# forçado (authorized_keys): ignora qualquer comando enviado pelo cliente.
set -eu
cd "$HOME/ecolixo"

# Um deploy por vez.
exec 9>"$HOME/.deploy.lock"
flock -n 9 || { echo "Outro deploy está em andamento."; exit 1; }

git fetch --quiet origin main
# Só avança: recusa histórico reescrito e alterações locais.
git merge --ff-only --quiet origin/main
echo "Versão: $(git log --oneline -1)"

C="docker compose -f docker-compose.prod.yml --env-file .env.prod"
$C up -d --build --remove-orphans
docker image prune -f >/dev/null

# Saudável quando o Caddy responde a página e a API exige login (401).
DOMAIN=$(sed -n "s/^DOMAIN=//p" .env.prod)
for i in $(seq 1 30); do
  page=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/" || true)
  api=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/categories" || true)
  if [ "$page" = 200 ] && [ "$api" = 401 ]; then
    echo "Deploy concluído: https://$DOMAIN"
    exit 0
  fi
  sleep 2
done
echo "Site não respondeu após o deploy (página=$page, api=$api)."
$C ps
$C logs --tail 30 backend
exit 1
