#!/usr/bin/env bash
# Sobe ou atualiza o ambiente de staging de forma independente por módulo (Requisitos RNF03 e RNF09).
#
# Uso:
#   scripts/subir-staging.sh
#
# Por que este script existe:
#   No Docker Compose, `docker compose --profile modulos up -d` falha por inteiro se qualquer um
#   dos sete grupos ainda não tiver publicado sua imagem no GHCR (ou a tiver deixado privada).
#   Este script sobe primeiro a infraestrutura e a plataforma (Grupo 2) de forma isolada e, em
#   seguida, tenta atualizar e subir cada módulo individualmente — quem publicou sobe; quem não
#   publicou apenas gera aviso e não impede o restante do sistema.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Arquivo .env não encontrado. Rode antes: scripts/gerar-env.sh --staging" >&2
  exit 1
fi

chmod 600 .env 2>/dev/null || true

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.staging.yml)
MODULOS=(crm produtos contratos financeiro chamados marketing landing)

echo "=== 1/3 · Infraestrutura (PostgreSQL, RabbitMQ e Mailpit local) ==="
"${COMPOSE[@]}" pull postgres rabbitmq rabbitmq-init mailpit
"${COMPOSE[@]}" up -d postgres rabbitmq rabbitmq-init mailpit

echo "=== 2/3 · Plataforma — Grupo 2 (Identity, Gateway, Casca e Caddy HTTPS) ==="
"${COMPOSE[@]}" --profile plataforma pull identity gateway casca caddy
"${COMPOSE[@]}" --profile plataforma up -d identity gateway casca caddy

echo "=== 3/3 · Módulos de negócio (independentes) ==="
for modulo in "${MODULOS[@]}"; do
  var_api="IMAGEM_$(echo "$modulo" | tr '[:lower:]' '[:upper:]')"
  var_front="${var_api}_FRONT"
  img_api=$(grep -E "^${var_api}=" .env | tail -n 1 | cut -d= -f2- || true)
  img_front=$(grep -E "^${var_front}=" .env | tail -n 1 | cut -d= -f2- || true)

  if [[ -z "$img_api" || "$img_api" == *"conta-do-grupo"* ]]; then
    echo "[-] Módulo '$modulo': sem imagem configurada no .env ($var_api) — pulando."
    continue
  fi

  echo "[*] Módulo '$modulo': tentando baixar $img_api e $img_front..."
  if "${COMPOSE[@]}" --profile modulos pull "$modulo" "${modulo}-front"; then
    "${COMPOSE[@]}" --profile modulos up -d "$modulo" "${modulo}-front"
    echo "[+] Módulo '$modulo': no ar."
  else
    echo "[!] Módulo '$modulo': falha ao baixar imagem no GHCR (não publicada ou privada) — ignorado."
  fi
done

echo ""
echo "=== Resumo dos contêineres em execução ==="
"${COMPOSE[@]}" ps
