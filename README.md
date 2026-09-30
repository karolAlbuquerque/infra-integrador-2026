# infra-integrador-2026

O que é de todos os oito grupos do Projeto Integrador 2026: o ambiente que sobe o sistema
inteiro, o banco e o broker já configurados, os contratos entre módulos, o tema visual e um
módulo de exemplo para copiar.

Mantido pelo Grupo 2 — Plataforma e Controle de Usuários. As regras vêm do
**[Contrato de Integração dos Módulos](docs/contrato-de-integracao.md)**; este repositório é
a forma executável delas.

## O que tem aqui

| Pasta | Conteúdo | Quem altera |
|---|---|---|
| `docker-compose.yml` | Sistema inteiro: infraestrutura, plataforma e módulos, por perfis | Grupo 2 |
| `db/init/` | Cria o schema e os dois usuários de banco de cada módulo | Grupo 2 |
| `rabbitmq/` | Cria o vhost, as exchanges e um usuário por módulo no RabbitMQ | Grupo 2 |
| `contratos/` | OpenAPI, AsyncAPI e *views* públicas de cada módulo | Cada grupo, por PR |
| `permissoes/` | Lista de permissões de cada módulo | Cada grupo, por PR |
| `modulos/` | Registro de cada módulo no menu da casca | Cada grupo, por PR |
| `ui/` | Tema Tailwind v4 + shadcn/ui da plataforma | Grupo 2 |
| `exemplo-modulo/` | Back-end e front de um módulo pronto, para copiar | Grupo 2 |
| `docs/` | Contrato de Integração, Mapa de Fronteiras, diagramas C4, usuários de teste e checklist de conformidade | Grupo 2; o Contrato e o Mapa mudam por PR, com prazo de objeção para os gestores |
| `.github/workflows/` | Validação deste repositório e workflow reutilizável de publicação de imagem | Grupo 2 |

## Subir o ambiente

Precisa de Docker e, no Windows, do Git Bash para o primeiro passo.

```bash
git clone https://github.com/karolAlbuquerque/infra-integrador-2026.git
cd infra-integrador-2026
scripts/gerar-env.sh          # cria o .env com senhas aleatórias e a chave do JWT
docker compose up -d          # PostgreSQL, RabbitMQ e Mailpit
```

Os perfis acrescentam serviços:

| Comando | Sobe também |
|---|---|
| `docker compose --profile plataforma up -d` | identity, gateway e casca (Grupo 2) |
| `docker compose --profile modulos up -d` | os sete módulos, pelas imagens publicadas |
| `docker compose --profile exemplo up -d --build` | o módulo de exemplo, compilado deste repositório |

Uma imagem ainda não publicada faz falhar só aquele serviço; os outros sobem normalmente.
Para subir só um módulo: `docker compose --profile modulos up -d crm`.

### Onde acessar

| Serviço | Endereço | Observação |
|---|---|---|
| Plataforma (pelo gateway) | http://localhost:8080 | casca em `/`, módulos em `/modulos/{codigo}/` |
| PostgreSQL | `localhost:5432`, banco `plataforma` | usuários `own_{modulo}` e `usr_{modulo}`, senhas no `.env` |
| RabbitMQ — painel | http://localhost:15672 | `RABBITMQ_ADMIN_USUARIO` e `RABBITMQ_ADMIN_SENHA` do `.env` |
| Mailpit — e-mails enviados | http://localhost:8025 | nada sai para a internet |

As portas de cada módulo seguem a §13.3 do Contrato: API em 8082 a 8088, front em 3002 a 3008.
O exemplo usa 8090 e 3090.

### Recomeçar do zero

O banco só é criado com o volume vazio. Mudou uma senha no `.env` ou quer apagar os dados:

```bash
docker compose down -v
docker compose up -d
```

## Variáveis dos módulos

O `docker-compose.yml` entrega a todo back-end de módulo as mesmas variáveis. Use estes nomes no
`application.yml` — o do exemplo já usa.

| Variável | Exemplo | Para quê |
|---|---|---|
| `SERVER_PORT` | `8082` | Porta do Contrato §13.3 |
| `DB_URL` | `jdbc:postgresql://postgres:5432/plataforma` | Conexão |
| `DB_APP_USER` / `DB_APP_PASSWORD` | `usr_crm` | Aplicação |
| `DB_OWNER_USER` / `DB_OWNER_PASSWORD` | `own_crm` | Flyway |
| `RABBITMQ_HOST` / `RABBITMQ_PORT` / `RABBITMQ_VHOST` | `rabbitmq` / `5672` / `plataforma` | Broker |
| `RABBITMQ_USER` / `RABBITMQ_PASSWORD` | `mq_crm` | Usuário do broker |
| `JWKS_URI` | `http://identity:8081/api/identity/.well-known/jwks.json` | Validar o token |
| `IDENTITY_BASE_URL` | `http://identity:8081` | Pedir token de serviço |
| `SVC_CLIENT_ID` / `SVC_CLIENT_SECRET` | `crm` | Credencial do token de serviço |
| `LOGGING_STRUCTURED_FORMAT_CONSOLE` | `ecs` | Log em JSON, com o `requestId` do MDC (vem de `LOG_FORMATO`) |

O front recebe só `PORTA`.

Toda mensagem publicada no RabbitMQ leva a propriedade `user_id` com o `RABBITMQ_USER` — sem ela, o
identity recusa os pedidos de timeline, notificação e e-mail (Contrato §9.7). O exemplo faz isso num
`RabbitTemplateCustomizer`.

## Como o seu grupo entra

1. **Copie o módulo de exemplo** para o repositório do grupo — veja [exemplo-modulo/README.md](exemplo-modulo/README.md).
2. **Abra um pull request aqui** com:
   - `contratos/{modulo}.yaml` e, se publicar eventos, `contratos/{modulo}.asyncapi.yaml`;
   - `permissoes/{modulo}.yaml`;
   - `modulos/{codigo}.json`;
   - a conta onde publica as imagens, em `.env.example` (`IMAGEM_{MODULO}` e `IMAGEM_{MODULO}_FRONT`).
3. **Publique as imagens** a cada merge na `main`, com o workflow reutilizável
   [publicar-imagem.yml](.github/workflows/publicar-imagem.yml).
4. **Passe no checklist** de [docs/checklist-conformidade.md](docs/checklist-conformidade.md) com o Grupo 2.

Enquanto o identity não estiver publicado, desenvolva contra os contratos com o Prism
([contratos/README.md](contratos/README.md)) e rode os testes com tokens simulados, como o exemplo faz.

## Regras que este repositório torna automáticas

| Regra do Contrato | Como |
|---|---|
| Um schema por grupo, sem ler tabela alheia (§7.1) | `db/init` cria usuários que só enxergam o próprio schema |
| Migrations com o dono, aplicação sem poder alterar estrutura (§7.1) | `own_{modulo}` e `usr_{modulo}` |
| Leitura cruzada só por *view* pública (§9.8) | `GRANT SELECT` só na *view*, feito pela migration do dono |
| Cada módulo publica só na própria exchange (§9.7) | Permissões do `mq_{modulo}` no RabbitMQ |
| Ninguém pede nada à plataforma em nome de outro módulo (§9.7) | `user_id` conferido pelo RabbitMQ e pelo identity |
| Contratos e registros no formato certo | Workflow `Validar` em todo pull request |

## Documentos

- [Contrato de Integração dos Módulos](docs/contrato-de-integracao.md) — as regras que todo
  módulo segue
- [Mapa de Fronteiras](docs/mapa-de-fronteiras.md) — o que é de cada grupo, o que é
  compartilhado e o que ainda não tem dono
- [Diagramas C4](docs/c4-contexto-e-conteineres.md) — contexto, contêineres e componentes do
  identity, em Mermaid, para o desenho mudar junto com o contrato
- [Manual de implantação](docs/manual-de-implantacao.md) — ambientes, variáveis, subida só com
  imagens publicadas, logs, métricas e cópia de segurança

Estes dois arquivos são a versão oficial, mantida pelo Grupo 2. Qualquer mudança entra por
*pull request*, anunciado no grupo de gestores com um prazo para objeções: quem discorda
comenta no PR; sem objeção até o prazo, o Grupo 2 faz o merge e a versão passa a valer
(Contrato §13.2). O histórico do Git mostra o que mudou em cada versão.

Documentos do Grupo 2, sobre a própria plataforma:

- Requisitos da Plataforma e do Controle de Usuários v0.2
- Modelo de Dados da Plataforma v0.2
- Repositório da plataforma: [plataforma-integrador-2026-2](https://github.com/karolAlbuquerque/plataforma-integrador-2026-2)
