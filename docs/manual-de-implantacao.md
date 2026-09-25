# Manual de implantação

Como subir a plataforma fora da máquina de desenvolvimento (Requisito RNF09). O mesmo
`docker-compose.yml` serve aos três ambientes; o que muda é o `.env` e a origem das imagens.

## 1. Ambientes

| | Desenvolvimento | Staging | Produção |
|---|---|---|---|
| Imagens | compiladas na hora (`--build`) ou publicadas | **só publicadas** | **só publicadas**, com etiqueta de versão |
| `IDENTITY_PERFIL` | `dev` (Empresas A e B e usuários de teste) | vazio | vazio |
| `ADMIN_INICIAL_EMAIL` / `_NOME` | vazio | quem administra o staging | o administrador do cliente |
| `PLATAFORMA_URL` | `http://localhost:8080` | endereço do staging | endereço do cliente |
| `CORS_ORIGENS` | fronts rodando no Vite | vazio | vazio |
| `IDENTITY_EXIGIR_SEGUNDO_FATOR` | vazio (desligado com o perfil `dev`) | vazio (ligado) | vazio (ligado) |
| `IDENTITY_SEGUNDO_FATOR_CHAVE` | pode ficar vazia (chave fixa de desenvolvimento) | **obrigatória** | **obrigatória**, diferente da do staging |
| E-mail | Mailpit | provedor a definir (pendência P6) | provedor a definir |

Sem o perfil `dev`, o identity não cria tenant nem usuário de teste: o único tenant é o de
produção, criado pela migration, e o primeiro acesso é pelo convite do `ADMIN_INICIAL_EMAIL`.

## 2. Primeira subida

```bash
git clone https://github.com/karolAlbuquerque/infra-integrador-2026.git
cd infra-integrador-2026
scripts/gerar-env.sh                          # senhas aleatórias, chave RS256 do JWT e chave do segundo fator
# editar o .env: IDENTITY_PERFIL=, PLATAFORMA_URL, ADMIN_INICIAL_EMAIL e _NOME, CORS_ORIGENS=
docker compose pull
docker compose --profile plataforma --profile modulos up -d
```

- Nunca `--build` nem o `dev/compose.build.yml` do plataforma fora do desenvolvimento: o que roda é
  o que o CI publicou.
- O `.env` fica só no servidor. A chave do JWT (`IDENTITY_JWT_CHAVE_PRIVADA`) assina todos os tokens;
  trocá-la derruba as sessões abertas.
- `IDENTITY_SEGUNDO_FATOR_CHAVE` cifra os segredos do aplicativo autenticador de cada usuário. Sem
  ela o identity não sobe fora do perfil `dev`. **Trocá-la ou perdê-la invalida todos os
  autenticadores cadastrados**: cada usuário precisa que um administrador redefina o seu segundo
  fator. Guarde-a junto das cópias de segurança do banco — um dump sem a chave não recupera os
  autenticadores, e uma chave vazada com o dump permite gerar códigos.
- A verificação em duas etapas é obrigatória para todos (RF10). O primeiro administrador, depois de
  definir a senha pelo convite, cadastra o aplicativo autenticador no primeiro acesso.
- O convite do primeiro administrador sai na primeira subida com o tenant de produção vazio.
  Sem provedor de e-mail, o link aparece no Mailpit (`http://servidor:8025`, não exposto à internet).

## 3. Atualizar

```bash
docker compose pull
docker compose --profile plataforma --profile modulos up -d
```

As migrations rodam sozinhas na subida de cada serviço (Flyway, com o usuário `own_{modulo}`). Um
serviço cuja migration falhar não sobe, e os outros continuam no ar. Para voltar uma versão, fixe a
etiqueta anterior em `IMAGEM_{MODULO}` no `.env` — migration aplicada não é desfeita.

## 4. Portas

Só duas portas precisam ficar abertas para fora: a 8080 (gateway) e, se houver, a 443 do proxy na
frente dele. As demais portas publicadas pelo compose (banco, RabbitMQ, identity, módulos, Mailpit)
existem para o desenvolvimento e devem ficar fechadas no firewall do servidor.

**Proxy na frente do gateway:** o gateway usa o IP da conexão para o limite de requisições em
`/public/**` e o identity para o limite de tentativas de login. Atrás de um proxy, todos os
visitantes teriam o IP dele. Antes de pôr um proxy, configurar `server.forward-headers-strategy` e
os proxies confiáveis do gateway (ver o README do plataforma).

## 5. Logs e métricas

- Todo serviço Spring escreve uma linha JSON (ECS) por evento, com o `requestId` que o gateway gera
  e repassa. Para seguir uma falha relatada: pegue o `X-Request-Id` da resposta e procure-o nos logs
  de todos os serviços.

  ```bash
  docker compose logs --since 30m gateway identity crm | grep '<requestId>'
  docker compose logs -f identity | jq -r '.message'        # leitura no terminal
  ```

  `LOG_FORMATO=logstash` ou `gelf` troca o formato; o padrão é `ecs`.
- O gateway registra uma linha por chamada de API: método, caminho, status, duração, módulo.
- Métricas do Prometheus em `http://identity:9081/actuator/prometheus` e
  `http://gateway:9080/actuator/prometheus`, só dentro da rede `plataforma`. Um Prometheus no mesmo
  compose as lê sem expor nada.

## 6. Cópia de segurança

Ainda sem rotina automática (RNF10, espera a definição do servidor, P7). Manualmente, com o compose no ar:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc plataforma > plataforma-$(date +%F).dump
```

Restaurar num banco vazio (apaga o que houver):

```bash
docker compose down && docker volume rm plataforma_pgdata && docker compose up -d postgres
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d plataforma --clean --if-exists < plataforma-AAAA-MM-DD.dump
docker compose --profile plataforma --profile modulos up -d
```

O dump leva os dados de todos os módulos e a auditoria. Guarde-o fora do servidor e com o mesmo
cuidado do `.env`.

## 7. Em aberto

| Pendência | Com quem |
|---|---|
| Onde roda o staging (P7) | Professores e Grupo 2 |
| Provedor de e-mail do staging e da produção (P6); o compose hoje aponta o identity para o Mailpit | Professores |
| Proxy com HTTPS na frente do gateway | Grupo 2, quando houver servidor |
| Rotina de cópia de segurança com retenção de sete dias (RNF10) | Grupo 2, quando a P7 definir o servidor |
