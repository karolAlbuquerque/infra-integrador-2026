#!/usr/bin/env bash
# Rotina de cópia de segurança diária do PostgreSQL com retenção de 7 dias (Requisito RNF10).
#
# Uso manual ou via cron:
#   scripts/backup-banco.sh [pasta-de-destino]
#
# Exemplo no crontab (todo dia às 04h00):
#   0 4 * * * /root/centinela/staging/infra-integrador-2026/scripts/backup-banco.sh /root/centinela/backups >> /var/log/centinela-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Arquivo .env não encontrado." >&2
  exit 1
fi

destino="${1:-./backups}"
retencao="${RETENCAO_DIAS:-7}"

mkdir -p "$destino"
chmod 700 "$destino" 2>/dev/null || true

pg_user=$(grep -E '^POSTGRES_USER=' .env | tail -n 1 | cut -d= -f2- || echo "postgres")
pg_db=$(grep -E '^POSTGRES_DB=' .env | tail -n 1 | cut -d= -f2- || echo "plataforma")
data_hora=$(date +%F-%H%M%S)
arquivo="${destino}/plataforma-${data_hora}.dump"

inicio=$(date +%s)
docker compose exec -T postgres pg_dump -U "$pg_user" -Fc "$pg_db" > "$arquivo"
chmod 600 "$arquivo" 2>/dev/null || true
fim=$(date +%s)

find "$destino" -name 'plataforma-*.dump' -type f -mtime +"$retencao" -delete

echo "[$(date -Iseconds)] Backup concluído em $((fim - inicio))s: $arquivo (retenção: ${retencao} dias)."
