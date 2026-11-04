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
scripts/gerar-env.sh --staging                # senhas aleatórias, chaves RS256/AES, perfil limpo e chmod 600
scripts/subir-staging.sh                      # sobe infra, plataforma + Caddy HTTPS e os módulos já publicados
```

- Nunca `--build` nem o `dev/compose.build.yml` do plataforma fora do desenvolvimento: o que roda é
  o que o CI publicou.
- O override `docker-compose.staging.yml` remove o mapeamento de portas no host (`!reset []`) de
  banco, broker, identity, casca, gateway e módulos, adiciona o Caddy nas portas `80` e `443` com
  certificado TLS automático para `PLATAFORMA_DOMINIO`, limita a memória de cada contêiner
  (`mem_limit`) e prende o Mailpit em `127.0.0.1:18025`.
- O `.env` fica só no servidor (`chmod 600`). A chave do JWT (`IDENTITY_JWT_CHAVE_PRIVADA`) assina todos os tokens;
  trocá-la derruba as sessões abertas.
- `IDENTITY_SEGUNDO_FATOR_CHAVE` cifra os segredos do aplicativo autenticador de cada usuário. Sem
  ela o identity não sobe fora do perfil `dev`. **Trocá-la ou perdê-la invalida todos os
  autenticadores cadastrados**: cada usuário precisa que um administrador redefina o seu segundo
  fator. Guarde-a junto das cópias de segurança do banco — um dump sem a chave não recupera os
  autenticadores, e uma chave vazada com o dump permite gerar códigos.
- A verificação em duas etapas é obrigatória para todos (RF10). O primeiro administrador, depois de
  definir a senha pelo convite, cadastra o aplicativo autenticador no primeiro acesso.
- O convite do primeiro administrador sai na primeira subida com o tenant de produção vazio.
  Sem provedor de e-mail, o link aparece no Mailpit (`http://127.0.0.1:18025`, acessível por túnel
  SSH e não exposto à internet).

## 3. Atualizar

```bash
scripts/subir-staging.sh
```

O script atualiza a infraestrutura e a plataforma e tenta baixar cada módulo individualmente: um
grupo cuja imagem ainda não foi publicada no GHCR não impede a plataforma nem os demais módulos de
subirem. As migrations rodam sozinhas na subida de cada serviço (Flyway, com o usuário
`own_{modulo}`). Um serviço cuja migration falhar não sobe, e os outros continuam no ar. Para voltar
uma versão, fixe a etiqueta anterior em `IMAGEM_{MODULO}` no `.env` — migration aplicada não é
desfeita.

## 4. Portas e proxy reverso

Com o `docker-compose.staging.yml`, só as portas `80` e `443` do **Caddy** ficam abertas para fora;
as demais portas do `docker-compose.yml` de desenvolvimento são zeradas (`!reset []`) para não
abrirem regras no `iptables` do servidor nem conflitarem com serviços locais da máquina.

**IP do visitante atrás do Caddy:** o `Caddyfile` sobrescreve `X-Forwarded-For` com `{remote_host}`
(o IP da conexão TCP externa) e o `docker-compose.staging.yml` ativa `CONFIAR_PROXY=true` no
gateway, para que o limite de `/public/**` e o limite de tentativas de login no identity contem por
visitante real e nunca pelo IP interno do proxy.

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

Rotina automatizada em `scripts/backup-banco.sh` (Requisito RNF10), que gera o dump em formato
customizado (`pg_dump -Fc`), aplica permissão `600` e apaga cópias com mais de sete dias:

```bash
scripts/backup-banco.sh /root/centinela/staging/backups
```

Agendamento diário no `cron` do servidor de staging (04h00):

```cron
0 4 * * * /root/centinela/staging/infra-integrador-2026/scripts/backup-banco.sh /root/centinela/staging/backups >> /var/log/centinela-backup.log 2>&1
```

Restaurar num banco vazio (apaga o que houver):

```bash
docker compose down && docker volume rm plataforma_pgdata && docker compose up -d postgres
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d plataforma --clean --if-exists < plataforma-AAAA-MM-DD-HHMMSS.dump
scripts/subir-staging.sh
```

O dump leva os dados de todos os módulos e a auditoria. Guarde-o fora do servidor junto da chave
`IDENTITY_SEGUNDO_FATOR_CHAVE` e com o mesmo cuidado do `.env`.

## 7. Em aberto

| Pendência | Com quem |
|---|---|
| Provedor de e-mail externo para produção (P6); o staging usa o Mailpit local (`127.0.0.1:18025`) | Professores |
