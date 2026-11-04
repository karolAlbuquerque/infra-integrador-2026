#!/usr/bin/env bash
# Cria o .env a partir do .env.example, com senhas aleatórias, uma chave RS256 nova e a chave
# AES que cifra os segredos do segundo fator.
# Uso: scripts/gerar-env.sh [--staging] [--forcar]
# No Windows, rode pelo Git Bash, que já traz openssl e base64.
set -euo pipefail
cd "$(dirname "$0")/.."

modo_staging=false
forcar=false
for arg in "$@"; do
  case "$arg" in
    --staging) modo_staging=true ;;
    --forcar)  forcar=true ;;
    *)
      echo "Argumento desconhecido: $arg" >&2
      echo "Uso: scripts/gerar-env.sh [--staging] [--forcar]" >&2
      exit 1
      ;;
  esac
done

if [[ -f .env && "$forcar" != true ]]; then
  echo ".env já existe. Use --forcar para recriar — as senhas mudam e o banco precisa ser"
  echo "recriado com: docker compose down -v"
  exit 1
fi

command -v openssl >/dev/null || { echo "openssl não encontrado."; exit 1; }

chave=$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 2>/dev/null | base64 | tr -d '\r\n')
dominio="${PLATAFORMA_DOMINIO:-centinela-pi.duckdns.org}"
admin_email="${ADMIN_INICIAL_EMAIL:-admin@centinela.com.br}"
admin_nome="${ADMIN_INICIAL_NOME:-Admin}"

while IFS= read -r linha || [[ -n "$linha" ]]; do
  linha=${linha%$'\r'}
  if [[ "$linha" =~ ^([A-Z0-9_]+)=troque$ ]]; then
    echo "${BASH_REMATCH[1]}=$(openssl rand -hex 16)"
  elif [[ "$linha" == IDENTITY_JWT_CHAVE_PRIVADA=* ]]; then
    echo "IDENTITY_JWT_CHAVE_PRIVADA=$chave"
  elif [[ "$linha" == IDENTITY_SEGUNDO_FATOR_CHAVE=* ]]; then
    echo "IDENTITY_SEGUNDO_FATOR_CHAVE=$(openssl rand -base64 32)"
  elif [[ "$modo_staging" == true && "$linha" == IDENTITY_PERFIL=* ]]; then
    echo "IDENTITY_PERFIL="
  elif [[ "$modo_staging" == true && "$linha" == PLATAFORMA_DOMINIO=* ]]; then
    echo "PLATAFORMA_DOMINIO=$dominio"
  elif [[ "$modo_staging" == true && "$linha" == PLATAFORMA_URL=* ]]; then
    echo "PLATAFORMA_URL=https://$dominio"
  elif [[ "$modo_staging" == true && "$linha" == ADMIN_INICIAL_EMAIL=* ]]; then
    echo "ADMIN_INICIAL_EMAIL=$admin_email"
  elif [[ "$modo_staging" == true && "$linha" == ADMIN_INICIAL_NOME=* ]]; then
    echo "ADMIN_INICIAL_NOME=$admin_nome"
  elif [[ "$modo_staging" == true && "$linha" == CORS_ORIGENS=* ]]; then
    echo "CORS_ORIGENS="
  else
    echo "$linha"
  fi
done < .env.example > .env

chmod 600 .env 2>/dev/null || true

if [[ "$modo_staging" == true ]]; then
  echo ".env de staging criado (chmod 600) para https://$dominio com convite para $admin_email."
else
  echo ".env criado com senhas aleatórias, chave do JWT e chave do segundo fator."
fi
