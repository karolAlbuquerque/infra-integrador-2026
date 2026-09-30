# Contrato de Integração dos Módulos

*Projeto Integrador 2026 · Grupo 2 — Plataforma e Controle de Usuários*

Regras que todo módulo precisa cumprir para funcionar dentro da plataforma: como autenticar, como validar permissão, como usar o banco, como responder na API e como aparecer no menu.

| | |
|---|---|
| Versão | 0.7 |
| Situação | Em vigor desde 25 de setembro de 2026, sem objeção no prazo |
| Vinculado a | 8 grupos |
| Fonte de requisitos | Prompt Mestre, seções 84–92 |

> **Versão 0.5 ratificada por 4 dos 8 grupos**
>
> As quatro decisões estruturais — iframe, schema por grupo, `tenant_id` desde a primeira migration e dono único de Empresas e Contatos — foram aceitas sem objeção pelos grupos abaixo. Os demais ainda não se manifestaram. As seções 4, 6, 7 e 10 já podem ser seguidas; mudá-las depois custa retrabalho de migration em todos os módulos.
>
> ✓ CRM · ✓ Financeiro · ✓ Produtos e Serviços · ✓ Plataforma<br> ⋯ Contratos · ⋯ Chamados · ⋯ Marketing · ⋯ Landing Pages

> **O que as versões 0.6 e 0.7 acrescentam · em vigor desde 25 de setembro, sem objeção no prazo**
>
> - **Busca global**: formato único de resposta, com no máximo cinco resultados e rota relativa ao módulo — §8.6.
> - **Valores monetários e percentuais** num formato só, sem arredondamento silencioso — §8.7.
> - **Download de arquivo** como única exceção ao envelope — §8.2.
> - **Rota relativa ao módulo** em `modulo:navegar`, com o exemplo corrigido — §12.2.
> - **Este contrato passa a viver no repositório**, e uma versão nova é um *pull request* — §13.2.
> - **Erro padronizado do gateway** quando o módulo está fora do ar (`503`) ou não responde em 3 segundos (`504`), com o código do módulo em `errors[0]` — §8.4.
> - **Cabeçalhos que o gateway reescreve**: `X-Forwarded-For` passa a ser só o IP da conexão e `X-Tenant-Id` vindo do navegador é descartado. Por isso token de serviço só funciona na chamada direta entre serviços, nunca pelo gateway — §3 e §9.2.
> - **`user_id` obrigatório** nas mensagens do RabbitMQ, para um módulo não publicar em nome de outro — §9.7.
> - **Sessão recebida antes de a tela existir**: o módulo ouve as mensagens da casca antes de enviar `modulo:pronto` e guarda a sessão fora dos componentes. O `App.tsx` do módulo de exemplo perdia a sessão nessa corrida e foi corrigido em 22/09 — quem o copiou antes precisa da correção — §12.2.
> - **O gateway envia `X-Frame-Options: SAMEORIGIN`**; o front do módulo não pode responder `DENY` nem `frame-ancestors 'none'`, ou não abre dentro da casca — §12.8.

> **O que a versão 0.6 acrescentou · também em vigor desde 25 de setembro**
>
> - **Mensageria com RabbitMQ** para avisar fatos entre módulos, com formato único de evento e consumidor idempotente — §9.7.
> - ***View* pública somente-leitura** para relatórios e agregações; API continua obrigatória onde há usuário, permissão ou regra — §9.8.
> - **Dois usuários de banco por schema**: um para as migrations, outro para a aplicação — §7.1.
> - **Stack e repositórios padronizados**, com as peças comuns em `infra-integrador-2026` — §13.
> - **Um domínio, caminhos por módulo**: fronts servidos em `/modulos/{codigo}/` — §12.8.
> - **Sessão e token**: *refresh token* em cookie, limite de cabeçalho de 32 KB, claim `equipes` e `X-Tenant-Id` no token de serviço — §4, §5.4 e §9.2.

## Índice

- [1. Objetivo e partes](#1-objetivo-e-partes)
- [2. Como ler as regras](#2-como-ler-as-regras)
- [3. Arquitetura](#3-arquitetura)
- [4. Autenticação](#4-autenticação)
- [5. Autorização](#5-autorização)
- [6. Multi-tenant](#6-multi-tenant)
- [7. Banco de dados](#7-banco-de-dados)
- [8. API HTTP](#8-api-http)
- [9. Comunicação entre módulos](#9-comunicação-entre-módulos)
- [10. Empresas e contatos](#10-empresas-e-contatos)
- [11. Registro do módulo](#11-registro-do-módulo)
- [12. Front-end, iframe e superfície pública](#12-front-end-iframe-e-superfície-pública)
- [13. Stack, repositórios e portas](#13-stack-repositórios-e-portas)
- [14. Desenvolver e testar](#14-desenvolver-e-testar)
- [15. Checklist de conformidade](#15-checklist-de-conformidade)
- [16. O que ainda está em aberto](#16-o-que-ainda-está-em-aberto)

## 1. Objetivo e partes

O sistema é construído por oito equipes independentes. Sete entregam módulos de negócio; o Grupo 2 entrega a plataforma que os hospeda — login, menu, permissões, roteamento e o gateway de API.

Este contrato existe para que essas oito partes se integrem sem reuniões constantes. Ele define apenas as *fronteiras*: o que atravessa de um módulo para outro. Tudo que acontece dentro de um módulo — modelagem, camadas, bibliotecas, padrões de código — é decisão de cada equipe.

| Grupo | Módulo | Código |
|---|---|---|
| 1 — Frederico | Produtos e Serviços | `produtos` |
| 2 — Karol | Plataforma e Controle de Usuários | `identity` |
| 3 — Pedro | Chamados e Relatórios | `chamados` |
| 4 — Barnabé | Marketing e Automações | `marketing` |
| 5 — Caique | Contratos e Documentos | `contratos` |
| 6 — Adison | CRM | `crm` |
| 7 — Rafael | Landing Pages e Formulários | `landing` |
| 8 — João Victor | Financeiro | `financeiro` |

O **código** do módulo é usado como prefixo em toda parte: schema do banco, rota da API, nome do container, prefixo das permissões. Ele nunca muda depois de escolhido.

## 2. Como ler as regras

Regras marcadas neste documento têm peso diferente:

> **DEVE**
>
> Obrigatório. Um módulo que não cumpre não integra — o sistema quebra ou fica inseguro.

> **NÃO DEVE**
>
> Proibido. Cria acoplamento ou falha de segurança que fica cara demais para desfazer no fim do semestre.

> **PODE**
>
> Permitido e sugerido, mas cada equipe decide.

## 3. Arquitetura

O navegador conhece um endereço só: o gateway. Ele nunca fala direto com o serviço de um módulo. Isso resolve CORS de uma vez e permite que a plataforma centralize a validação de token.

```
                     ┌──────────────────────────┐
                     │        NAVEGADOR         │
                     └─────────────┬────────────┘
                                   │  um domínio só · :8080 em dev
                     ┌─────────────▼────────────┐
                     │         GATEWAY          │  Grupo 2
                     │  /            → casca    │
                     │  /modulos/**  → fronts   │
                     │  /api/**      → APIs     │
                     └───┬──────────────────┬───┘
                         │                  │
     ┌───────────────────▼──┐   ┌───────────▼──────────────────┐
     │  IDENTITY  :8081     │   │  /api/crm/**        → :8082  │
     │  Grupo 2             │   │  /api/produtos/**   → :8083  │
     │                      │   │  /api/contratos/**  → :8084  │
     │  login · usuários    │   │  /api/financeiro/** → :8085  │
     │  perfis · equipes    │   │  /api/chamados/**   → :8086  │
     │  permissões          │   │  /api/marketing/**  → :8087  │
     │  registro de módulos │   │  /api/landing/**    → :8088  │
     │  JWKS público        │   │                              │
     └──────────┬───────────┘   └──────────────┬───────────────┘
                │                              │
                └──────────────┬───────────────┘
                               │  todos os serviços usam os dois
                ┌──────────────┴──────────────────┐
  ┌─────────────▼──────────────┐    ┌─────────────▼──────────────┐
  │  POSTGRESQL  (um só)       │    │  RABBITMQ  (um só)         │
  │  um schema por grupo       │    │  uma exchange por módulo   │
  │  own_ migra · usr_ roda    │    │  eventos entre módulos     │
  │  views vw_pub_*  (§9.8)    │    │  (§9.7)                    │
  └────────────────────────────┘    └────────────────────────────┘
```

No front, a casca é uma aplicação React servida pelo Grupo 2. Ela renderiza login, barra superior e menu, e embute o front de cada módulo em um `<iframe>` na área de conteúdo. Casca, fronts e APIs saem todos do mesmo endereço, separados por caminho — a seção 12.8 explica por quê.

Atenção a uma assimetria do desenho: o gateway serve ao tráfego que *entra* — o navegador. Um serviço chamando outro serviço vai direto, sem passar por ele, e um fato que interessa a vários módulos viaja pelo RabbitMQ. A seção 9 trata desses dois caminhos.

Por servir ao navegador, o gateway não confia no que ele manda em dois cabeçalhos:

| Cabeçalho | O que o gateway faz | Por quê |
|---|---|---|
| `X-Forwarded-For` | substitui pelo IP de quem se conectou a ele | o cliente poderia inventar um IP e escapar do limite de tentativas de login |
| `X-Tenant-Id` | descarta | só vale com token de serviço, e token de serviço não passa pelo gateway (seção 9.2) |

O gateway também gera um `X-Request-Id` quando a requisição não traz um, repassa ao módulo e o devolve na resposta. O módulo registra esse identificador no log de cada requisição e o repassa nas chamadas que fizer a outros módulos e no `correlacaoId` das mensagens (seção 9.7).

## 4. Autenticação

### 4.1 Fluxo

O usuário faz login apenas na casca. Nenhum módulo tem tela de login, cadastro de senha ou recuperação de acesso.

```
POST /api/identity/auth/login
     { "email": "...", "senha": "..." }

  →  200  { "success": true,
            "data": { "accessToken": "eyJhbGciOiJSUzI1NiIs...",     (15 min)
                      "usuario": { "id": "...", "nome": "...", "tenantId": "..." } },
            "message": null, "errors": [] }

     Set-Cookie: refresh_token=d41f8c...; HttpOnly; Secure; SameSite=Strict;
                 Path=/api/identity/auth; Max-Age=28800                 (8 h)
```

O *refresh token* nunca aparece no corpo da resposta nem fica ao alcance de JavaScript: vai num cookie `HttpOnly`, restrito ao caminho de autenticação. O *access token* vive só na memória da casca e chega ao módulo por `postMessage` (seção 12.1).

### 4.2 Formato do token

JWT assinado em **RS256**. A chave privada só existe no serviço de identidade; os módulos validam com a chave pública, publicada em JWKS.

```
{
  "iss":       "http://identity:8081",
  "aud":       "plataforma",
  "sub":       "9f1c4e2a-...",        // id do usuário
  "tenant_id": "3a7e91b0-...",        // obrigatório em todo token
  "nome":      "Karol Assis",
  "email":     "karol@exemplo.com",
  "roles":     ["VENDEDOR"],
  "perms":     ["crm.oportunidade.ver", "crm.oportunidade.criar"],
  "equipes":   ["b71d20c4-..."],       // seção 5.4
  "iat":       1756400000,
  "exp":       1756400900
}
```

> **DEVE**
>
> Todo módulo valida o token localmente, pela chave pública em `/api/identity/.well-known/jwks.json`. Não é preciso chamar o serviço de identidade a cada requisição.

No Spring Boot, isso é praticamente uma linha de configuração:

```yaml
# application.yml do seu módulo
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: http://identity:8081/api/identity/.well-known/jwks.json
```

> **NÃO DEVE**
>
> Nenhum módulo cria, assina ou renova token. Nenhum módulo guarda senha, hash de senha ou dado de credencial de usuário — isso vive só no schema `identity`.

### 4.3 Renovação e expiração

O *access token* dura 15 minutos. Antes de expirar, a casca chama `POST /api/identity/auth/refresh`; o navegador envia o cookie sozinho, e a resposta traz um novo *access token* e um novo cookie — o anterior é revogado. O módulo não participa disso: se receber um token expirado, responde `401` e a casca cuida do resto.

### 4.4 Tamanho do token

As permissões viajam dentro do token, e isso tem um custo que só aparece com o sistema inteiro cadastrado. Com oito módulos, cerca de oito recursos cada e cinco ações por recurso, um ADMINISTRADOR acumula perto de 320 permissões — um token de uns 15 KB. O limite padrão de cabeçalho HTTP do Tomcat e do Netty é 8 KB. Acima dele a requisição volta `400`, e só para os perfis com mais permissões, o que torna o erro difícil de reproduzir.

> **DEVE**
>
> Todo serviço — gateway, identidade e os sete módulos — aceita cabeçalho HTTP de até 32 KB. O módulo de exemplo já vem configurado.

```yaml
# application.yml de todo serviço
server:
  max-http-request-header-size: 32KB
```

## 5. Autorização

### 5.1 Nome da permissão

Toda permissão segue três níveis, separados por ponto, sempre em minúsculas:

```
modulo.recurso.acao

crm.oportunidade.ver
crm.oportunidade.editar
financeiro.cobranca.aprovar
contratos.contrato.assinar
identity.usuario.administrar
```

As ações vêm da seção 3 do Prompt Mestre: `ver`, `criar`, `editar`, `excluir`, `exportar`, `aprovar`, `administrar`, `compartilhar`. Além dessas, cada módulo tem `modulo.acessar`, que controla se ele aparece no menu.

> **DEVE**
>
> Cada grupo entrega ao Grupo 2 a lista completa das suas permissões até a data combinada. Elas são cadastradas no serviço de identidade para que apareçam na tela de montagem de perfis.

### 5.2 Verificação no módulo

As permissões chegam dentro do token, no claim `perms`. O módulo verifica localmente:

```java
@PreAuthorize("hasAuthority('crm.oportunidade.editar')")
@PutMapping("/oportunidades/{id}")
public ResponseEntity<?> editar(@PathVariable UUID id, ...) { ... }
```

> **DEVE**
>
> A verificação acontece no back-end, sempre. Esconder um botão no React é usabilidade, não segurança — um usuário sem permissão que chamar a API direto precisa receber `403`.

### 5.3 Restrições por dono do registro

O Prompt Mestre pede regras como *“vendedor só vê as próprias oportunidades”*. Isso não cabe no token: depende do registro, não do usuário.

A divisão é esta: a plataforma entrega no token **quem é** o usuário (`sub`), **qual o papel** (`roles`) e **o que pode fazer** (`perms`). Filtrar por dono é responsabilidade do módulo, que tem a coluna `created_by` ou `responsavel_id` na própria tabela.

### 5.4 Equipes

A seção 3 do Prompt Mestre pede também *“gestor visualiza todas as oportunidades da equipe”*. Aqui há duas metades. Saber **quem pertence a qual equipe** é dado de usuário, e por isso é da plataforma. Saber **de qual equipe é cada registro** é dado do registro, e por isso é do módulo.

> **DEVE**
>
> A plataforma cadastra as equipes e seus membros, e envia no claim `equipes` os identificadores das equipes do usuário.
>
> O módulo que precisa desse recorte grava `equipe_id` no registro quando ele é criado ou muda de responsável, e filtra por `equipe_id` contido no claim.

```
GET /api/identity/equipes/{id}/membros     → identity.equipe.ver_resumo
    [ { "id": "...", "nome": "...", "lider": false } ]    // para escolher o responsável
```

Situação: proposta da plataforma, **a confirmar com o CRM**, que é o primeiro módulo a usar.

## 6. Multi-tenant

A seção 86 do Prompt Mestre exige que a plataforma possa, no futuro, atender várias empresas na mesma instalação. Mesmo que o semestre inteiro rode com um tenant só, a estrutura precisa nascer pronta — adicionar `tenant_id` depois, com o banco populado e sete módulos escritos, é inviável.

> **DEVE**
>
> Toda tabela de negócio nasce com a coluna `tenant_id UUID NOT NULL`, já na primeira migration.
>
> Toda consulta filtra por `tenant_id`, sem exceção.
>
> O valor vem **sempre** do claim `tenant_id` do token.

> **NÃO DEVE**
>
> Aceitar `tenantId` vindo do corpo, da query string ou de um header enviado pelo cliente. Quem manda o tenant é o token; qualquer outra fonte é falha de segurança — o usuário passa a poder ler dados de outra empresa só trocando um campo no JSON.

A forma mais segura de não esquecer é resolver isso uma vez, num filtro do Hibernate ou num interceptor, em vez de repetir `where tenant_id = ?` em cada query.

Existem exatamente duas exceções, e as duas pelo mesmo motivo — a origem é um serviço autenticado, nunca o navegador:

- chamada com **token de serviço**, em que o tenant vai no cabeçalho `X-Tenant-Id` (seção 9.2);
- **mensagem do RabbitMQ**, em que o tenant vai no campo `tenantId` do evento (seção 9.7).

## 7. Banco de dados

### 7.1 Um Postgres, um schema por grupo

Existe um único container PostgreSQL. Cada grupo é dono de um schema e recebe **dois usuários de banco**, ambos com acesso somente a ele: um que altera a estrutura e outro que a aplicação usa para rodar.

| Usuário | Usado por | Pode |
|---|---|---|
| `own_crm` | Flyway, ao aplicar migrations | criar, alterar e apagar tabelas e *views* do schema; conceder acesso |
| `usr_crm` | a aplicação, em tempo de execução | ler e gravar dados — nunca alterar estrutura |

A separação existe porque o dono de um objeto no PostgreSQL pode tudo sobre ele, inclusive devolver a si mesmo uma permissão revogada. Com um usuário só, uma regra como “a auditoria só aceita inserção” seria um combinado; com dois, a aplicação fisicamente não consegue apagar um registro de auditoria.

```sql
-- infra-integrador-2026/db/init  ·  roda uma vez, na criação do banco
-- as senhas vêm do .env e nunca ficam no arquivo
CREATE ROLE own_crm LOGIN;
CREATE ROLE usr_crm LOGIN;
CREATE SCHEMA crm AUTHORIZATION own_crm;
REVOKE ALL ON SCHEMA crm FROM PUBLIC;
GRANT USAGE ON SCHEMA crm TO usr_crm;
ALTER DEFAULT PRIVILEGES FOR ROLE own_crm IN SCHEMA crm
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO usr_crm;
```

```yaml
# application.yml do módulo
spring:
  datasource:
    username: ${DB_APP_USER}          # usr_crm
    password: ${DB_APP_PASSWORD}
  flyway:
    user: ${DB_OWNER_USER}            # own_crm
    password: ${DB_OWNER_PASSWORD}
    schemas: crm
```

A restrição é técnica, não apenas combinada: mesmo querendo, um módulo não consegue ler o schema do outro. Schemas e usuários dos oito grupos são criados pelo script de inicialização do repositório `infra-integrador-2026`, mantido pelo Grupo 2 — nenhuma equipe precisa de superusuário.

> **NÃO DEVE**
>
> Fazer `SELECT` ou `JOIN` em tabela de outro schema. A única leitura cruzada permitida é em *view* pública `vw_pub_*`, conforme a seção 9.8.
>
> Criar *foreign key* que atravesse schemas.
>
> Duplicar tabela de outro módulo para “facilitar o join”.

Precisou de dado de outro módulo? Guarde o UUID e chame a API do dono. Sim, é mais trabalhoso que um join. É também a única coisa que faz “serviços separados” ser verdade em vez de enfeite — e a diferença aparece no dia em que um grupo renomear uma coluna.

### 7.2 Colunas obrigatórias

Da seção 88 do Prompt Mestre. Toda tabela de negócio tem:

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `uuid` | chave primária, gerada pela aplicação |
| `tenant_id` | `uuid` | `not null`, sempre indexada |
| `created_at` | `timestamptz` | UTC |
| `updated_at` | `timestamptz` | UTC |
| `deleted_at` | `timestamptz` | nulo = ativo (*soft delete*) |
| `created_by` | `uuid` | id do usuário, vindo do claim `sub` |
| `updated_by` | `uuid` | id do usuário |

Nomes de tabela e coluna em `snake_case`, minúsculas, sem acento. Tabela no plural.

> **DEVE**
>
> Toda alteração de estrutura passa por migration versionada, com Flyway executado pelo usuário `own_`. Ninguém altera tabela por `ALTER TABLE` manual — o banco precisa poder ser recriado do zero em qualquer máquina.

## 8. API HTTP

### 8.1 Rotas

```
/api/{modulo}/{recurso}

/api/crm/oportunidades
/api/crm/oportunidades/{id}
/api/financeiro/cobrancas
/api/contratos/contratos/{id}/aditivos
```

Recursos no plural, em português, sem acento. O gateway roteia pelo segmento `{modulo}` — por isso ele precisa ser exatamente o código da tabela da seção 1.

**Versão.** O caminho não leva número de versão, e a ausência vale como versão 1. Uma mudança incompatível num recurso — campo removido, significado alterado — publica o novo formato em `/api/{modulo}/v2/{recurso}`, que convive com o antigo até os consumidores migrarem. É uma divergência consciente da seção 89 do Prompt Mestre, que sugere `/api/v1/...`: com oito serviços independentes, a versão pertence ao recurso de cada módulo, não ao sistema inteiro.

### 8.2 Envelope de resposta

Formato da seção 90 do Prompt Mestre, obrigatório em todas as respostas, inclusive nas de erro:

```
{
  "success": true,
  "data":    { },
  "message": null,
  "errors":  []
}
```

Em caso de erro, `message` traz o texto que pode ser mostrado ao usuário e `errors` detalha campo a campo:

```
{
  "success": false,
  "data":    null,
  "message": "Não foi possível salvar a oportunidade.",
  "errors": [
    { "campo":  "valorRecorrente",
      "codigo": "VALOR_NEGATIVO",
      "detalhe":"O valor recorrente não pode ser negativo." }
  ]
}
```

**A exceção: download de arquivo.** Um arquivo — relatório em PDF, XLSX ou CSV — não cabe dentro de um JSON. A rota que o devolve responde `200` com o próprio arquivo:

```
GET /api/chamados/relatorios/sla/exportar?formato=xlsx&de=2026-09-01&ate=2026-09-30

  →  200  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
          Content-Disposition: attachment; filename="sla-2026-09.xlsx"
          (o arquivo)
```

> **DEVE**
>
> Só o sucesso sai do envelope. Os erros da mesma rota — `400`, `401`, `403`, `404` — continuam no envelope, para a tela mostrar a mensagem como em qualquer outra chamada.
>
> No OpenAPI, a resposta `200` declara o tipo do arquivo no lugar de `application/json`.

> **NÃO DEVE**
>
> Colocar o token na URL para o navegador baixar direto. URL vai para log e histórico. O front chama a rota com `fetch`, com o token no cabeçalho, e salva o `blob` recebido.

### 8.3 Listagem paginada

```
GET /api/crm/oportunidades?pagina=0&tamanho=20&ordenar=criadoEm,desc

{
  "success": true,
  "data": { "itens": [ ... ], "pagina": 0, "tamanho": 20, "total": 137 },
  "message": null, "errors": []
}
```

> **DEVE**
>
> Toda listagem é paginada, com no máximo 100 itens por página. Nenhum endpoint devolve tabela inteira.

### 8.4 Códigos HTTP

| Código | Quando |
|---|---|
| `200` | sucesso em leitura, alteração ou exclusão |
| `201` | recurso criado, com `Location` no header |
| `400` | dado inválido — preencher `errors` |
| `401` | sem token, token inválido ou expirado |
| `403` | autenticado, mas sem a permissão necessária |
| `404` | não existe *ou* pertence a outro tenant |
| `409` | conflito de regra de negócio (duplicidade, estado inválido) |
| `422` | bem formado, mas viola regra de negócio |
| `503` | respondido pelo **gateway**: o módulo está fora do ar |
| `504` | respondido pelo **gateway**: o módulo não respondeu em 3 segundos |

Os dois últimos vêm do gateway, não do módulo, e trazem no envelope o código do módulo, para a tela dizer qual parte do sistema falhou:

```
HTTP/1.1 503
{ "success": false, "data": null,
  "message": "Módulo crm indisponível.",
  "errors": [ { "campo": "modulo", "codigo": "MODULO_INDISPONIVEL", "detalhe": "crm" } ] }

// 504: "codigo": "MODULO_SEM_RESPOSTA"
```

Repare no `404`: registro de outro tenant responde “não existe”, nunca `403`. Um `403` confirmaria ao usuário que o registro existe em outra empresa.

### 8.5 Saúde do serviço

> **DEVE**
>
> Todo módulo expõe `GET /api/{modulo}/health`, sem exigir token, respondendo `200` quando o serviço está de pé e conectado ao banco. É o que a casca usa para avisar “módulo indisponível” em vez de mostrar tela branca.

### 8.6 Busca global

A seção 79 do Prompt Mestre pede uma caixa de busca no topo que encontre empresa, proposta, contrato, cobrança e chamado. A casca faz a interface: consulta todos os módulos em paralelo e mostra os resultados agrupados por módulo. Cada módulo responde pelo que é dele.

```
GET /api/chamados/busca?q=servidor

  →  200  { "success": true,
            "data": [
              { "id":        "5c2d9e1a-...",
                "titulo":    "#1042 — Servidor de arquivos inacessível",
                "subtitulo": "Em atendimento · Centinela Soluções",
                "rota":      "/chamados/5c2d9e1a-..." }
            ],
            "message": null, "errors": [] }
```

> **DEVE**
>
> Todo módulo com registro que o usuário procura pelo nome ou pelo número expõe `GET /api/{modulo}/busca?q=`, com `q` de pelo menos dois caracteres, e responde neste formato: `id`, `titulo`, `subtitulo` e `rota`, no máximo cinco itens, sem paginação.
>
> `rota` é relativa ao `urlFrontend` do módulo, sem o código: `/chamados/5c2d…`, e não `/modulos/chamados/chamados/5c2d…`. A casca abre o módulo nessa rota.
>
> A busca respeita a permissão e o tenant do token, como qualquer listagem.

A casca aplica o *timeout* da seção 9.6 a cada módulo. Módulo fora do ar, que responde `403` ou que demora simplesmente não aparece no resultado — a busca nunca falha inteira por causa de um deles.

### 8.7 Valores monetários e percentuais

Dinheiro, desconto, comissão e juros passam de um módulo para outro o tempo todo: o preço do catálogo vira item de contrato, que vira cobrança. Um formato diferente em cada módulo é conta errada em algum lugar do caminho.

| Tipo | No JSON | No Java | No banco |
|---|---|---|---|
| Dinheiro | número com até 2 casas: `1890.00` | `BigDecimal` | `numeric(15,2)` |
| Percentual | número em pontos percentuais, até 4 casas: `12.5` significa 12,5% | `BigDecimal` | `numeric(9,4)` |

> **DEVE**
>
> A moeda é o real em todo o sistema, e nenhum campo de moeda é necessário no semestre.
>
> Valor com mais casas do que o tipo permite responde `400`, com `codigo: PRECISAO_EXCEDIDA` em `errors`. O servidor nunca arredonda em silêncio.

> **NÃO DEVE**
>
> Usar `double` ou `float` para dinheiro, nem representar percentual como fração (`0.125`).

## 9. Comunicação entre módulos

### 9.1 Dois caminhos, não um

Uma requisição do **navegador** passa sempre pelo gateway. Uma chamada de **serviço para serviço** vai direto, pelo nome do container na rede do Docker.

| Quem chama | Endereço | Quando |
|---|---|---|
| Navegador, em desenvolvimento | `localhost:8080/api/crm/…` | sempre, via gateway |
| Navegador, em produção | `plataforma.com.br/api/crm/…` | sempre, via gateway |
| Outro serviço (back-end) | `http://crm:8082/api/crm/…` | nome do serviço no compose |
| Equipe testando isolado | `localhost:8082/api/crm/…` | só na máquina de quem desenvolve |

Nenhum grupo precisa de domínio próprio. Existe um endereço só para quem usa o sistema; os outros dois só existem dentro da rede interna.

> **DEVE**
>
> Chamada entre back-ends vai direto ao serviço de destino, sem passar pelo gateway. O gateway existe para o tráfego que entra de fora — fazer o tráfego interno passar por ele o transformaria em ponto único de falha de todo o sistema.

> **NÃO DEVE**
>
> Escrever endereço de outro serviço fixo no código. O *host* vem de variável de ambiente (`CRM_BASE_URL`), com o valor apontando para o nome do container.

### 9.2 Qual token usar

Esta é a parte que costuma ser esquecida e quebra depois. São duas situações diferentes.

**Há um usuário na tela.** O módulo repassa o mesmo token que recebeu. Permissões e `tenant_id` viajam junto, e o módulo de destino valida naturalmente — se o usuário não pode ver aquele registro, a resposta é `404`. Nada novo é necessário.

```
// Financeiro chamando o CRM, no contexto de uma requisição do usuário
GET http://crm:8082/api/crm/empresas/{id}
Authorization: Bearer {mesmo token recebido}
```

**Não há usuário.** É o caso do job noturno que gera as cobranças recorrentes. Aí o módulo pede um token próprio ao serviço de identidade:

```
POST /api/identity/auth/token-servico
     { "clientId": "financeiro", "clientSecret": "..." }   // do ambiente

  →  { "accessToken": "eyJ...", "expiresIn": 900 }

// claims:  sub = "svc:financeiro"   ·   perms = [...]   ·   sem tenant_id
// perms: as cadastradas para a credencial "financeiro" no identity

GET http://crm:8082/api/crm/empresas/resumo?ids=...
Authorization: Bearer {token de serviço}
X-Tenant-Id: 3a7e91b0-...
```

> **DEVE**
>
> Com token de serviço, o tenant vai no cabeçalho `X-Tenant-Id`. O módulo só lê esse cabeçalho quando o `sub` do token começa com `svc:`; em token de usuário, ele é ignorado. É uma das duas exceções à regra da seção 6, e vale só porque a origem é um serviço autenticado, não o navegador.
>
> Toda chamada com token de serviço é registrada em auditoria, com o `clientId` de origem.

> **NÃO DEVE**
>
> Chamar com token de serviço pelo gateway. O gateway descarta o `X-Tenant-Id` que chega por ele (seção 3), e a chamada ficaria sem tenant. Rotina de serviço chama o outro módulo direto, pelo nome do container: `http://crm:8082/api/crm/...`.

### 9.3 Leitura entre módulos e permissão

Um usuário de perfil **FINANCEIRO** provavelmente não tem `crm.empresa.ver` — mas precisa enxergar a razão social na tela de cobranças. Repassando o token, essa tela legítima receberia `403`.

> **DEVE**
>
> Todo módulo dono de entidade compartilhada expõe um endpoint de resumo, protegido por uma permissão fraca de leitura que os perfis operacionais recebem por padrão:

```
GET /api/crm/empresas/{id}/resumo        → crm.empresa.ver_resumo
    { "id": "...", "razaoSocial": "...", "cnpj": "...", "cidade": "..." }

GET /api/crm/empresas/{id}               → crm.empresa.ver
    { objeto completo, com dados comerciais }
```

### 9.4 Consulta em lote

Uma listagem de 50 cobranças não pode fazer 50 chamadas ao CRM. Todo endpoint de resumo aceita vários identificadores de uma vez:

```
GET /api/crm/empresas/resumo?ids=9f1c…,3a7e…,b204…      // máximo 100
```

### 9.5 Cópia de valor não é cópia de tabela

A seção 7.1 proíbe duplicar tabela de outro módulo. Isso não é o mesmo que guardar o valor de um campo no momento em que um fato acontece.

Quando o Financeiro emite uma cobrança, ele grava a razão social *daquele momento* junto do `empresa_id`. Não é otimização: é regra de negócio. Se a empresa mudar de razão social em dezembro, a cobrança de agosto deve continuar mostrando o nome que valia em agosto.

> **PODE**
>
> Guardar cópia de campo como *registro histórico do fato*, junto do UUID de referência.

> **NÃO DEVE**
>
> Manter tabela espelho sincronizada de outro módulo para conseguir fazer `JOIN`. A diferença: uma congela um valor no tempo, a outra tenta replicar um estado que muda.

### 9.6 Quando o outro módulo está fora

> **DEVE**
>
> *Timeout* de 3 segundos em toda chamada entre módulos. Falha não derruba a operação: a tela mostra o que conseguiu e sinaliza o que faltou (“dados da empresa indisponíveis”), em vez de responder `500`.

Isso importa mais do que parece. São oito serviços mantidos por oito equipes, e em qualquer dia útil pelo menos um está reiniciando.

### 9.7 Eventos pelo RabbitMQ

Chamada HTTP serve para **perguntar**, e para **pedir** algo cujo resultado se precisa agora. Para **avisar** que algo aconteceu — um contrato foi assinado, um pagamento caiu — ela é a ferramenta errada: o Contratos teria de conhecer e chamar, um por um, todos os módulos interessados, e ficaria preso se algum deles estivesse fora do ar. Por isso fatos atravessam o sistema como eventos no RabbitMQ.

| Preciso de… | Use | Exemplo |
|---|---|---|
| mostrar numa tela um dado de outro módulo | API | razão social na cobrança (9.3) |
| criar algo em outro módulo e saber o resultado já | API | formulário cria empresa no CRM (10.3) |
| avisar que um fato aconteceu | evento | `contratos.contrato.assinado` |
| registrar na timeline, notificar alguém, mandar e-mail | mensagem para a plataforma | `identity.timeline.registrar` |
| relatório ou agregação sobre muitos registros | *view* pública (9.8) | `financeiro.vw_pub_cobrancas` |

**Topologia.** Cada módulo publica numa exchange própria, do tipo *topic*, e só nela. Quem se interessa cria a própria fila e a liga à exchange de quem publica, escolhendo os tipos de evento pela chave de roteamento. A plataforma tem ainda uma exchange de entrada, onde todos os módulos podem publicar pedidos de timeline, notificação e e-mail.

```
EXCHANGE (topic)       QUEM PUBLICA        CHAVE DE ROTEAMENTO = tipo do evento
contratos.eventos      só Contratos        contratos.contrato.assinado
financeiro.eventos     só Financeiro       financeiro.pagamento.recebido
identity.entrada       todos os módulos    identity.timeline.registrar
                                           identity.notificacao.criar
                                           identity.email.enviar

FILA (do consumidor)                 LIGADA A
financeiro.contrato-assinado         contratos.eventos · contratos.contrato.assinado
financeiro.contrato-assinado.dlq     mensagens que falharam três vezes
```

**Formato.** Toda mensagem, de qualquer módulo, tem o mesmo envelope. O que muda de um evento para outro é só o conteúdo de `dados`.

```
{
  "id":           "0b8e6f3a-...",                  // uuid; chave de idempotência
  "tipo":         "contratos.contrato.assinado",   // modulo.entidade.acao
  "versao":       1,
  "tenantId":     "3a7e91b0-...",
  "moduloOrigem": "contratos",
  "ocorridoEm":   "2026-09-14T13:02:11Z",          // UTC
  "usuarioId":    "9f1c4e2a-...",                  // opcional; nulo em rotina automática
  "correlacaoId": "c41d...",                       // opcional; o X-Request-Id de origem
  "dados": { "contratoId": "...", "empresaId": "...", "valorMensal": 1890.00 }
}
```

> **DEVE**
>
> Evento descreve um fato já ocorrido, com o verbo no particípio: `assinado`, `recebido`, `cancelado`. A exceção são as mensagens para `identity.entrada`, que são pedidos.
>
> Publicar só depois do *commit* da transação que produziu o fato — no Spring, `@TransactionalEventListener(phase = AFTER_COMMIT)`. Evento de algo desfeito por *rollback* é pior do que evento nenhum.
>
> Todo consumidor é idempotente: grava o `id` do evento em `eventos_processados`, na mesma transação do efeito, e ignora um `id` já visto. O RabbitMQ entrega *pelo menos uma vez* — a mesma mensagem pode chegar duas.
>
> Depois de três falhas, a mensagem vai para a fila `.dlq` do consumidor, em vez de voltar à fila para sempre.
>
> Publicar com a propriedade AMQP `user_id` igual ao usuário da conexão, `mq_{modulo}`. O RabbitMQ recusa um `user_id` diferente do usuário autenticado, e o consumidor confere que ele corresponde ao `moduloOrigem` — sem isso, qualquer módulo poderia publicar em `identity.entrada` fingindo ser outro. A plataforma manda para a `.dlq` o pedido sem `user_id` ou com `moduloOrigem` de outro módulo. No Spring AMQP, `mensagem.getMessageProperties().setUserId("mq_crm")`; o módulo de exemplo já faz isso.
>
> Cada módulo descreve os eventos que publica em `infra-integrador-2026/contratos/{modulo}.asyncapi.yaml`, antes de publicá-los.

```sql
-- em todo schema que consome eventos
CREATE TABLE crm.eventos_processados (
  evento_id     uuid PRIMARY KEY,
  tipo          text NOT NULL,
  processado_em timestamptz NOT NULL DEFAULT now()
);
```

> **NÃO DEVE**
>
> Publicar em exchange de outro módulo, ou consumir da fila de outro grupo. As permissões do RabbitMQ impedem as duas coisas (seção 13.3).
>
> Usar evento para perguntar e esperar resposta. Para isso existe API.
>
> Colocar em evento senha, token, segredo ou dado pessoal além do necessário. Mensagem fica em fila, em log e na `.dlq`.
>
> Mudar o formato de `dados` de um tipo existente sem subir `versao`. Uma mudança incompatível publica `versao: 2` ao lado da 1 até os consumidores migrarem.

**O que fica para depois.** Publicar depois do *commit* deixa uma janela: se o serviço cair entre o *commit* e a publicação, o evento se perde. A solução completa é o padrão *outbox* — gravar o evento numa tabela na mesma transação e publicá-lo em seguida. Fica declarado como evolução; no semestre, o risco é conhecido e aceito.

### 9.8 Leitura analítica por *view* pública

Relatório que agrega milhares de registros de outro módulo não deve ser montado por HTTP, página por página. Para esse caso — e só para ele — o dono do dado publica uma *view* somente-leitura, e quem precisa lê direto no banco. A comparação que levou a essa divisão está na seção 16.1.

> **REGRA**
>
> **API** para tudo que envolve um usuário, uma permissão ou uma regra de negócio: leitura de tela, criação, alteração, exclusão.
>
> ***View* pública somente-leitura** para consumo analítico: relatórios, dashboards e agregações.

```sql
-- migration do CRM, rodando como own_crm
CREATE VIEW crm.vw_pub_empresas AS
  SELECT id, tenant_id, razao_social, cnpj, cidade, estado, segmento, created_at
    FROM crm.empresas
   WHERE deleted_at IS NULL;

GRANT USAGE  ON SCHEMA crm           TO usr_chamados;
GRANT SELECT ON crm.vw_pub_empresas  TO usr_chamados;
```

> **DEVE**
>
> A *view* tem prefixo `vw_pub_` e é contrato, não implementação: o dono pode reestruturar a tabela por baixo, desde que mantenha as colunas publicadas. Remover ou renomear coluna publicada exige aviso no grupo de gestores e uma `vw_pub_..._v2` convivendo com a antiga.
>
> `tenant_id` sempre exposto. Quem lê filtra por ele, com o valor vindo do token do usuário que pediu o relatório — o relatório é servido por uma API do módulo leitor, protegida como qualquer outra.
>
> As *views* que cada módulo publica ficam listadas, com suas colunas, em `infra-integrador-2026/contratos/{modulo}.views.md`.

> **NÃO DEVE**
>
> Conceder acesso a tabela. `GRANT` só em *view*, e só de `SELECT`.
>
> Escrever em outro schema em qualquer hipótese: por função, *trigger*, `INSERT` direto ou *view* atualizável.
>
> Usar *view* para montar tela operacional. Tela com usuário usa API, porque a *view* não aplica permissão nem regra do dono.

## 10. Empresas e contatos

Empresa e Contato são as entidades mais compartilhadas do sistema: Contratos, Financeiro, Chamados, Marketing e Landing Pages dependem das duas. Por isso elas têm um dono só, e a especificação vive aqui, no contrato, e não dentro da documentação de um módulo.

> **DONO**
>
> O **CRM** é o dono de `empresas`, `contatos` e `unidades`. É o único módulo que cria as tabelas e escreve nelas.

### 10.1 Endpoints expostos

O CRM publica o OpenAPI destes endpoints em `infra-integrador-2026/contratos/crm.yaml`. A implementação pode vir depois; a assinatura precisa existir para os outros começarem.

```
LEITURA
GET  /api/crm/empresas                      lista paginada, com filtros
GET  /api/crm/empresas/{id}                 cadastro completo
GET  /api/crm/empresas/{id}/resumo          razão social, CNPJ, cidade
GET  /api/crm/empresas/resumo?ids=a,b,c     em lote, até 100 por chamada
GET  /api/crm/empresas/busca?q=             para a busca global da casca
GET  /api/crm/empresas/{id}/contatos        contatos daquela empresa
GET  /api/crm/empresas/{id}/unidades        matriz e filiais
GET  /api/crm/contatos/{id}
GET  /api/crm/contatos/{id}/resumo          nome, cargo, e-mail, telefone

ESCRITA
POST /api/crm/empresas                      criar
POST /api/crm/contatos                      criar
PUT  /api/crm/empresas/{id}                 editar
PUT  /api/crm/contatos/{id}                 editar
```

### 10.2 Quem lê e quem escreve

A resposta curta: **todos podem criar, só o CRM edita.**

| Operação | Permissão | Quem recebe |
|---|---|---|
| Ler resumo | `crm.empresa.ver_resumo` | todo perfil operacional |
| Ler cadastro completo | `crm.empresa.ver` | perfis comerciais e gestão |
| Criar | `crm.empresa.criar` | CRM, Landing Pages, Chamados |
| Editar | `crm.empresa.editar` | somente CRM |

**Por que criar é liberado.** O fluxo real exige. Um formulário de landing page preenchido às duas da manhã precisa virar empresa e contato na hora — se só o CRM pudesse criar, o lead ficaria numa fila esperando alguém digitar, e o Prompt Mestre (seção 57) pede exatamente o contrário.

**Por que editar não é.** Se dois módulos alteram o mesmo campo, o último a escrever ganha, e ninguém consegue explicar depois por que o telefone do cliente mudou sozinho. Precisou corrigir um dado cadastral? A alteração acontece na tela do CRM.

### 10.3 Criação e duplicidade

A seção 106 do Prompt Mestre proíbe empresa duplicada pelo mesmo CNPJ. Como qualquer módulo pode criar, a checagem tem que estar no CRM — não em quem chama.

```
POST /api/crm/empresas
     { "razaoSocial": "...", "cnpj": "12345678000199",
       "origem": "landing", "origemModuloId": "form-abc123" }

  201 → empresa criada

  409 → { "success": false,
          "message": "Já existe empresa com este CNPJ.",
          "errors": [ { "campo": "cnpj", "codigo": "EMPRESA_DUPLICADA",
                        "detalhe": "..." } ],
          "data": { "empresaId": "9f1c4e2a-..." } }   ← reaproveite este id
```

> **DEVE**
>
> Ao receber `409` com `EMPRESA_DUPLICADA`, o módulo usa o `empresaId` devolvido em vez de tentar criar de novo ou registrar erro. É comportamento esperado, não falha.
>
> Toda criação informa `origem` e `origemModuloId`, para que a empresa possa ser rastreada até o formulário, o chamado ou a importação que a gerou.

### 10.4 Os quatro status não ficam no CRM

A seção 4 do Prompt Mestre lista, no cadastro de empresa, os campos *status comercial*, *status financeiro*, *status contratual* e *status técnico*. Lidos ao pé da letra, três deles seriam escritos por módulos que não são donos da tabela — exatamente o conflito que a regra anterior evita.

> **DECISÃO**
>
> Cada status vive no schema de quem o calcula. A empresa não os armazena.

| Status | Dono | Origem do valor |
|---|---|---|
| Comercial | CRM | etapa da oportunidade ativa |
| Contratual | Contratos | situação do contrato vigente |
| Financeiro | Financeiro | inadimplência e cobranças em aberto |
| Técnico | Chamados | chamados críticos e SLA |

A tela de empresa mostra os quatro juntos, mas os busca em paralelo, cada um no seu dono, aplicando o *timeout* da seção 9.6. Um módulo fora do ar deixa o seu status como “indisponível”; os outros três aparecem normalmente.

### 10.5 Como os outros módulos referenciam

```sql
-- no schema do Financeiro
CREATE TABLE financeiro.cobrancas (
  id             uuid PRIMARY KEY,
  tenant_id      uuid NOT NULL,
  empresa_id     uuid NOT NULL,        -- referência ao CRM, sem FK
  empresa_nome   text NOT NULL,        -- valor no momento da emissão (9.5)
  ...
);
```

Sem *foreign key*, porque atravessa schemas. Com o nome copiado, porque a cobrança de agosto deve continuar mostrando a razão social que valia em agosto.

### 10.6 Autenticação nessas chamadas

Vale a seção 9.2, sem exceção: com usuário na tela, repassa-se o token recebido; em rotina sem usuário, usa-se token de serviço. Nenhum módulo precisa de credencial própria para falar com o CRM.

## 11. Registro do módulo

A plataforma não conhece nenhum módulo pelo código-fonte. Ela lê uma tabela de registro e monta o menu a partir dela — por isso um grupo entra no sistema sem que o Grupo 2 recompile nada.

Cada grupo entrega este JSON por *pull request* em `infra-integrador-2026/modulos/{codigo}.json`, e a plataforma o carrega na tabela de registro:

```
{
  "codigo":          "crm",
  "nome":            "CRM",
  "grupo":           "Grupo 6 — Adison",
  "icone":           "kanban",
  "urlFrontend":     "/modulos/crm/",
  "prefixoApi":      "/api/crm",
  "permissaoMenu":   "crm.acessar",
  "ordemMenu":       20,
  "healthcheck":     "/api/crm/health",
  "itensSubmenu": [
    { "rota": "/funil",          "nome": "Funil",         "permissao": "crm.oportunidade.ver" },
    { "rota": "/oportunidades",  "nome": "Oportunidades", "permissao": "crm.oportunidade.ver" },
    { "rota": "/prospeccao",     "nome": "Prospecção",    "permissao": "crm.prospeccao.ver" }
  ]
}
```

O usuário só enxerga o item de menu se tiver a permissão declarada em `permissaoMenu`. Submenus seguem a mesma lógica, item a item.

## 12. Front-end, iframe e superfície pública

Cada grupo entrega sua própria aplicação React, com build e container próprios. A casca embute o módulo em um `<iframe>`. Vantagem prática: cada equipe roda e testa o seu módulo sozinha, e um módulo quebrado não derruba os outros sete.

> **DEVE**
>
> O front do módulo funciona em dois modos: aberto direto no navegador (para a equipe desenvolver) e dentro do iframe da casca (em produção). Em modo direto, use um token real, obtido do identity de desenvolvimento, que sobe com usuários de teste para cada perfil (seção 14.3); em modo embutido, use o token recebido por `postMessage`.

### 12.1 Mensagens da casca para o módulo

```
{ tipo: "plataforma:sessao",
  token: "eyJ...", tenantId: "3a7e...", usuario: { ... }, tema: "claro" }

{ tipo: "plataforma:tema",  tema: "escuro" }
{ tipo: "plataforma:token", token: "eyJ..." }   // após renovação
```

### 12.2 Mensagens do módulo para a casca

```
{ tipo: "modulo:pronto" }                        // carregou, pode enviar a sessão
{ tipo: "modulo:altura",  altura: 1840 }         // a cada mudança de conteúdo
{ tipo: "modulo:navegar", rota: "/oportunidades/9f1c" }  // mudou de tela por dentro
{ tipo: "modulo:token-expirado" }                // casca renova e reenvia
{ tipo: "modulo:notificar", nivel: "sucesso", texto: "Oportunidade salva." }
```

A `rota` de `modulo:navegar` é relativa ao `urlFrontend` do módulo, sem o código — a mesma regra da busca global (seção 8.6). Com ela, a casca atualiza a própria URL para `/app/crm/oportunidades/9f1c`, e recarregar a página ou usar o botão voltar reabre a mesma tela.

> **DEVE**
>
> Verificar, em toda mensagem recebida e dos dois lados, que `event.origin` é a origem da própria plataforma e que `event.source` é a janela esperada — o `contentWindow` do iframe, na casca; `window.parent`, no módulo. Sem isso, outra página com referência à janela consegue conversar com o iframe.
>
> Registrar o ouvinte de `message` antes de enviar `modulo:pronto`, e guardar a sessão recebida fora dos componentes, num objeto que a tela lê ao montar. A casca responde ao `modulo:pronto` na hora: se a tela só se inscreve depois do primeiro *render*, a `plataforma:sessao` chega antes e se perde, e o módulo fica esperando para sempre. Foi o defeito do `App.tsx` do módulo de exemplo, corrigido em 22/09.

> **NÃO DEVE**
>
> Guardar o token em `localStorage` dentro do módulo. Ele vive em memória e chega por `postMessage` — quem persiste sessão é a casca, e só ela.

### 12.3 Identidade visual

A base visual é Tailwind CSS com componentes shadcn/ui. O Grupo 2 mantém em `infra-integrador-2026/ui/` o *preset* do Tailwind com as variáveis da plataforma — cores, tipografia, espaçamento, tema claro e escuro — e os componentes base já ajustados. Cada módulo copia o que usar, que é o modelo de distribuição do próprio shadcn/ui. Usar é recomendado, não obrigatório — mas um módulo que ignora completamente vai parecer colado no sistema, e isso aparece na apresentação final.

### 12.4 Duas superfícies, não uma

Nem tudo que o sistema publica fica atrás de login. Uma landing page é feita para ser encontrada por um visitante anônimo, indexada por buscador e servida em domínio próprio — colocá-la dentro do iframe, atrás da tela de login, seria um contrassenso.

Por isso o sistema tem **duas superfícies**, com regras distintas. A fronteira não é entre módulos: é entre tipos de acesso, e vários módulos têm partes nas duas.

|  | Superfície autenticada | Superfície pública |
|---|---|---|
| Quem acessa | usuário com login | visitante anônimo |
| Onde é servida | dentro da casca, em iframe | domínio ou subdomínio próprio |
| Autenticação | token no cabeçalho | nenhuma |
| Como o tenant é sabido | claim do token | subdomínio ou *slug* da página |
| Prioridade de projeto | densidade e produtividade | SEO, carregamento e conversão |
| Devolve dado de negócio | sim, conforme permissão | **nunca** |

### 12.5 O que vive em cada uma

Dois módulos têm partes nas duas superfícies, e é isso que costuma confundir.

| Módulo | Na plataforma (com login) | Pública (sem login) |
|---|---|---|
| Marketing | construtor de automação, campanhas, listas, templates, relatórios de envio | página de descadastro, pixel de *tracking* |
| Landing Pages | editor de páginas e de formulários, submissões recebidas, publicação | a página publicada e o formulário que o visitante preenche |
| CRM | tudo | link de indicação, `/indicar/CLIENTE123` (seção 53) |
| Contratos | tudo | link de aceite de proposta (seção 19) |

> **REGRA**
>
> Ter parte pública não tira o módulo da plataforma. O *back-office* de Marketing e de Landing Pages é tela de usuário logado como qualquer outra: aparece no menu, respeita permissões, isola por tenant e segue todo este contrato.

### 12.6 Regras da superfície pública

É a única porta do sistema aberta para a internet. Merece tratamento próprio.

> **DEVE**
>
> Rotas públicas ficam sob o prefixo `/public/**`, dispensadas de token no gateway.
>
> O tenant é resolvido pelo subdomínio ou pelo *slug* da página — nunca por parâmetro que o visitante possa alterar.
>
> *Rate limit* por IP em toda rota pública, e captcha em todo formulário.
>
> Escrita no sistema acontece por token de serviço, conforme a seção 9.2.

> **NÃO DEVE**
>
> Devolver dado de negócio em rota pública. A superfície pública **recebe** informação; ela não consulta. Um formulário que valida CNPJ contra a base de clientes vira, na prática, um endpoint de vazamento de carteira.

### 12.7 Como o dado entra

O caminho de um lead capturado, que atravessa quatro módulos:

```
visitante preenche o formulário na landing page   (público, sem login)
        |
Landing valida, aplica captcha e rate limit
        |
        |  token de serviço + X-Tenant-Id
        v
POST /api/crm/empresas        → cria ou reaproveita pelo CNPJ (409)
POST /api/crm/contatos        → cria o contato, com origem e UTM
POST /api/crm/oportunidades   → cria o lead no funil
        |
        |  RabbitMQ
        v
crm.oportunidade.criada       → Marketing dispara a automação de lead novo
landing.formulario.recebido   → Marketing dispara a automação do formulário
identity.timeline.registrar   → a plataforma registra na timeline da empresa
```

O que precisa de resposta imediata é API, com token de serviço; o que é aviso vem depois, como evento. Nada acontece direto no banco de outro schema — e é exatamente o que a seção 57 do Prompt Mestre descreve quando pede que o formulário recebido crie contato, empresa, lead, tarefa e inicie automação.

### 12.8 Um domínio, caminhos por módulo

Na superfície autenticada, casca, fronts e APIs saem todos do mesmo endereço, separados por caminho. O gateway encaminha cada prefixo ao container certo, em desenvolvimento e em produção.

| Caminho | Vai para | Container |
|---|---|---|
| `/` | casca: login, barra, menu | `casca :3000` |
| `/modulos/crm/` | front do CRM, carregado no iframe | `crm-front :3002` |
| `/api/crm/` | API do CRM | `crm :8082` |
| `/public/landing/` | rotas públicas de API, sem token (12.6) | `landing :8088` |

O ganho é ter **uma origem só**. O cookie do *refresh token* funciona sem configuração entre domínios, CORS deixa de existir em produção, a verificação de `event.origin` compara com um valor único e o iframe não precisa liberar domínio externo. As páginas publicadas pelo módulo de Landing Pages continuam podendo usar subdomínio próprio, porque pertencem à superfície pública.

> **DEVE**
>
> O front do módulo funciona servido sob `/modulos/{codigo}/`. No Vite, isso é `base: '/modulos/crm/'`; o roteador do React usa o mesmo prefixo.
>
> O servidor do front envia `Content-Security-Policy: frame-ancestors 'self'`, para que a página só possa ser embutida pela própria plataforma.

> **NÃO DEVE**
>
> Responder `X-Frame-Options: DENY` nem `frame-ancestors 'none'` no front do módulo: a página deixa de abrir dentro da casca. O gateway já envia `X-Frame-Options: SAMEORIGIN` em toda resposta, o que só permite o iframe da própria plataforma.

O custo a registrar: na mesma origem, o iframe isola menos a casca do módulo do que isolaria entre domínios diferentes. É aceitável porque os oito fronts são do mesmo sistema, e o *refresh token* — o que de fato importa proteger — está num cookie que nenhum JavaScript lê.

## 13. Stack, repositórios e portas

### 13.1 Stack padrão

Cada equipe decide bibliotecas e padrões internos, mas a base é a mesma para os oito — é o que permite que o módulo de exemplo sirva a todos e que um aluno ajude outro grupo sem reaprender a ferramenta.

| Camada | Padrão |
|---|---|
| Back-end | Java 21, Spring Boot 3.x, Maven, Flyway, Spring Security como *resource server* JWT, Spring AMQP |
| Front-end | React com Vite e TypeScript, Tailwind CSS e shadcn/ui |
| Gateway | Spring Cloud Gateway, mantido pelo Grupo 2 |
| Banco | PostgreSQL 16, um só |
| Mensageria | RabbitMQ, um só |
| E-mail em desenvolvimento | Mailpit — captura todo e-mail enviado e não entrega nenhum |
| Testes | JUnit 5, Testcontainers (PostgreSQL e RabbitMQ), WireMock |
| Contêineres e CI | Docker, GitHub Actions, imagens no GitHub Container Registry |

### 13.2 Repositórios

Cada grupo tem o seu repositório. O Grupo 2 mantém dois: um com o próprio código e outro com as peças que pertencem a todos.

| Repositório | Conteúdo |
|---|---|
| `plataforma-integrador-2026-2` | identity, gateway e casca |
| `infra-integrador-2026` | `docker-compose.yml` do sistema inteiro · `db/init/` com schemas e usuários · `rabbitmq/` com usuários e permissões · `contratos/` com OpenAPI, AsyncAPI e *views* de cada módulo · `modulos/` com o JSON de registro · `ui/` com o *preset* visual · `exemplo-modulo/` para copiar · `docs/` com este contrato e o Mapa de Fronteiras |
| um por grupo | o módulo: back-end, front-end, migrations e testes |

Alterações em `infra-integrador-2026` entram por *pull request*: cada grupo propõe o próprio contrato, o próprio JSON de registro e o próprio usuário de banco, e o Grupo 2 revisa. É assim que o repositório comum continua sendo de todos sem que ninguém altere o contrato alheio.

Este contrato também vive ali, em `docs/contrato-de-integracao.md`, e é mantido pelo Grupo 2. Uma versão nova é um *pull request*, anunciado no grupo de gestores com um prazo para objeções:

- quem discorda comenta no próprio PR, na linha da regra. O ponto contestado é discutido ali e ajustado ou retirado antes do merge;
- sem objeção até o prazo, o Grupo 2 faz o merge, e a versão passa a valer para todos os grupos.

Aprovar o PR é bem-vindo, mas não obrigatório: o silêncio até o prazo conta como aceite, como aconteceu com a versão 0.5. O histórico do Git mostra exatamente o que mudou de uma versão para outra.

### 13.3 Portas e credenciais

Portas fixas, para que um `docker compose up` no `infra-integrador-2026` suba o sistema inteiro sem conflito.

| Serviço | Porta | Front ou painel | Schema |
|---|---|---|---|
| Gateway | `8080` | — | — |
| Plataforma / Identidade | `8081` | `3000` | `identity` |
| CRM | `8082` | `3002` | `crm` |
| Produtos e Serviços | `8083` | `3003` | `produtos` |
| Contratos e Documentos | `8084` | `3004` | `contratos` |
| Financeiro | `8085` | `3005` | `financeiro` |
| Chamados e Relatórios | `8086` | `3006` | `chamados` |
| Marketing | `8087` | `3007` | `marketing` |
| Landing e Formulários | `8088` | `3008` | `landing` |
| PostgreSQL | `5432` | — | — |
| RabbitMQ | `5672` | `15672` | — |
| Mailpit | `1025` | `8025` | — |

No RabbitMQ, cada grupo recebe um usuário próprio, `mq_{modulo}`, que só publica na própria exchange e em `identity.entrada`, e só lê das próprias filas:

```
# infra-integrador-2026/rabbitmq  ·  permissões de mq_financeiro (expressões regulares)
configurar   ^financeiro\..*
escrever     ^(financeiro\..*|identity\.entrada)$
ler          ^(financeiro\..*|[a-z]+\.eventos)$     # ler a exchange permite ligar fila a ela
```

> **NÃO DEVE**
>
> Colocar senha, chave ou URL de banco no código ou no `application.yml` versionado. Tudo por variável de ambiente, com um `.env.example` no repositório mostrando quais existem — sem os valores. É a seção 116, itens 19 e 20, do Prompt Mestre.

## 14. Desenvolver e testar

Se a comunicação entre módulos é interna, como uma equipe desenvolve contra um serviço que está na máquina de outra equipe — ou que ainda nem existe? Em três camadas, cada uma resolvendo um momento do semestre. Ninguém precisa rodar oito serviços no próprio computador.

### 14.1 Contrato antes de código

> **DEVE**
>
> Cada módulo publica o OpenAPI dos endpoints que os outros consomem **antes** de implementá-los, em `infra-integrador-2026/contratos/{modulo}.yaml`, e os eventos que publica em `{modulo}.asyncapi.yaml`, na mesma pasta. Só a assinatura: rota, parâmetros, formato da resposta e do evento.

É o que destrava o resto. Um contrato publicado na semana 2 permite que outra equipe comece na semana 2, mesmo que a implementação só fique pronta na semana 6.

### 14.2 Camada 1 — stub gerado do contrato

Com o OpenAPI no repositório, quem consome sobe um mock automático a partir dele. Nada é escrito à mão:

```yaml
# docker-compose.dev.yml — no repositório do Financeiro
services:
  financeiro:
    build: .
    ports: ["8085:8085"]
    environment:
      CRM_BASE_URL: http://crm:8082

  crm:                                    # não é o CRM real
    image: stoplight/prism:5
    command: mock -m false -h 0.0.0.0 -p 8082 /specs/crm.yaml
    volumes: ["../infra-integrador-2026/contratos/crm.yaml:/specs/crm.yaml:ro"]
```

O `-m false` desliga o modo multiprocesso do Prism, que não funciona com o Node da imagem `stoplight/prism:5`: sem ele, o container sai com erro logo ao subir.

O Prism responde com dados de exemplo válidos segundo o schema. A vantagem sobre um mock escrito à mão é que este não envelhece calado: se o dono mudar o contrato, o stub muda junto.

Uma exceção: o identity **não** pode ser substituído por *stub*. O Prism devolve exemplos, e um JWT de exemplo não tem assinatura válida — nenhum módulo o aceitaria. Por isso o identity vem sempre como imagem real, descrita a seguir.

### 14.3 Camada 2 — imagem publicada

Quando o módulo existe de verdade, ninguém precisa do código-fonte dele.

> **DEVE**
>
> Todo grupo publica a imagem Docker do seu serviço a cada merge na branch principal, com as tags `:latest` e `:sha-{commit}`, no GitHub Container Registry da conta dona do repositório — com o nome da conta em minúsculas.

```yaml
  crm:
    image: ghcr.io/{conta-do-grupo}/crm:latest
    ports: ["8082:8082"]
```

Assim `docker compose up crm` sobe o CRM real, na última versão, sem clonar nada. É a camada que mais economiza tempo no meio do semestre.

O primeiro serviço a existir nessa camada é o do Grupo 2. Em desenvolvimento, a imagem do identity sobe com dois tenants de teste e, em cada um, um usuário para cada um dos dez perfis, com senhas documentadas no `infra-integrador-2026`. Qualquer equipe obtém um token real com um `POST /api/identity/auth/login`, testa o módulo como Vendedor, Financeiro ou Administrador e prova o isolamento entre empresas usando os dois tenants — sem esperar tela nenhuma.

### 14.4 Camada 3 — staging

Um servidor único rodando o `docker-compose` com as imagens `:latest` de todos os oito módulos. Serve para validar a integração real e para demonstrar ao cliente sem depender do computador de ninguém. Não exige orquestrador nem nuvem cara — uma máquina com endereço fixo basta.

> **DEVE**
>
> O staging sobe apenas imagens publicadas. Um módulo cuja imagem não foi publicada simplesmente não aparece no ambiente — e não é responsabilidade do Grupo 2 fazer o serviço de outra equipe subir.

### 14.5 Testes automatizados

> **NÃO DEVE**
>
> Nenhum teste automatizado depende do serviço de outro grupo estar no ar. Um build que fica vermelho por causa de terceiros é um build que a equipe aprende a ignorar — e aí ele deixa de servir para qualquer coisa.

| Tipo de teste | Banco | Outros módulos | Roda em |
|---|---|---|---|
| Unitário | mockado | mockado | todo commit |
| Integração do módulo | Testcontainers | WireMock | todo pull request |
| Autorização e multi-tenant | Testcontainers | não usa | todo pull request |
| Publicação e consumo de eventos | Testcontainers | RabbitMQ em Testcontainers | todo pull request |
| Ponta a ponta | staging | staging | agendado ou manual |

Os testes de autorização e multi-tenant pedidos na seção 101 do Prompt Mestre merecem atenção: são os únicos que provam que o isolamento entre empresas funciona. O caso mínimo é sempre o mesmo — dois tenants, um registro em cada, e o token de um não enxerga o registro do outro.

Para eventos, o caso mínimo é igualmente simples: entregar a mesma mensagem duas vezes ao consumidor e verificar que o efeito aconteceu uma vez só.

## 15. Checklist de conformidade

Um módulo está integrado quando passa nos dezenove itens abaixo. O Grupo 2 verifica junto com a equipe, em uma sessão de vinte minutos.

1. O serviço sobe pelo `docker-compose` da raiz, na porta atribuída.
2. `GET /api/{modulo}/health` responde `200` sem token.
3. Qualquer outro endpoint sem token responde `401`.
4. Endpoint com token válido, mas sem a permissão exigida, responde `403`.
5. Token de outro tenant não enxerga nenhum registro — responde `404`.
6. `tenantId` enviado no corpo da requisição é ignorado.
7. Todas as tabelas têm as sete colunas obrigatórias da seção 7.2.
8. Nenhuma query ou *foreign key* referencia schema de outro grupo, fora das *views* `vw_pub_*`.
9. Todas as respostas seguem o envelope, inclusive as de erro.
10. Listagens são paginadas e ordenáveis.
11. O front roda sozinho e também dentro do iframe da casca, servido sob `/modulos/{codigo}/`, com altura ajustando.
12. O JSON de registro foi entregue e o módulo aparece no menu de quem tem permissão.
13. O contrato OpenAPI está em `infra-integrador-2026/contratos/{modulo}.yaml` e reflete o que a API faz.
14. A imagem Docker é publicada a cada merge na branch principal.
15. A suíte de testes passa sem nenhum outro módulo estar no ar.
16. As migrations rodam com `own_{modulo}`; a aplicação roda com `usr_{modulo}`.
17. Os eventos publicados seguem o envelope da seção 9.7, levam `user_id` e estão descritos no AsyncAPI.
18. Todo consumidor ignora um evento já processado — testado com a mesma mensagem entregue duas vezes.
19. O serviço aceita cabeçalho de 32 KB e responde normalmente a um token de ADMINISTRADOR.

## 16. O que ainda está em aberto

Pontos em aberto que afetam mais de um grupo. Estão listados aqui de propósito: uma pendência declarada é gerenciável, uma pendência esquecida vira retrabalho em outubro.

| Pendência | Afeta | Situação |
|---|---|---|
| ~~Ratificação das versões 0.6 e 0.7~~ | Todos | **Resolvida.** O prazo de objeção anunciado no grupo de gestores venceu em 24/09 sem objeção, e a versão 0.7 entrou na `main` em 25/09 (seção 13.2). Vale também para os quatro grupos que não se manifestaram sobre a 0.5. |
| Equipes no token (5.4) | CRM e quem filtrar por equipe | Proposta da plataforma, a confirmar com o CRM. |
| Prazo das listas de permissões, OpenAPI e AsyncAPI | Todos | A combinar no grupo de gestores. |
| Provedor de e-mail fora do ambiente de desenvolvimento | Plataforma, Financeiro, Marketing | A plataforma envia o e-mail de sistema, pedido por `identity.email.enviar`; o provedor SMTP de *staging* e produção depende dos professores. |
| Onde roda o *staging*, agora com RabbitMQ | Todos | A definir com os professores até a semana 6. |
| Anexos e documentos (seções 95 e 96) | Contratos, Chamados, Financeiro, CRM | Proposta mantida: serviço genérico no módulo Contratos e Documentos; os outros referenciam por UUID. |

Resolvidos na versão 0.7: busca global, com formato único de resposta (seção 8.6).

Resolvidos na versão 0.6: acesso a dados de outro módulo, por API ou *view* pública (seção 9.8), e comunicação de eventos, pelo RabbitMQ (seção 9.7). Timeline e notificações passam a chegar à plataforma por mensagem, na exchange `identity.entrada`.

### 16.1 Por que API e *view*, e não só uma delas

Registro da comparação que embasou a regra da seção 9.8. Foi levantada a alternativa de um módulo acessar dados de outro através de *view* ou função no próprio PostgreSQL, com `GRANT` cruzado, em lugar de chamada HTTP. É uma pergunta legítima e merece resposta honesta: em vários aspectos, a alternativa é melhor.

| Critério | *View* ou função no banco | API HTTP |
|---|---|---|
| Esforço de implementação | menor | maior |
| Latência | menor | maior |
| Consulta em massa e agregação | **muito melhor** | ruim |
| Funciona com o outro serviço fora do ar | **sim** | não |
| Transação atômica entre módulos | possível | não |
| Aplica permissão do usuário (seção 5) | **não** | sim |
| Garante isolamento por tenant (seção 6) | **não** | sim |
| Aplica regra de negócio do dono | **não** | sim |
| Sobrevive a bancos separados no futuro | não | sim |

As três linhas em destaque na coluna do banco são o problema de fundo. Uma função no PostgreSQL não recebe o token: não sabe qual usuário está pedindo, nem quais permissões ele tem, nem a que tenant pertence. O `tenant_id` teria de ser passado como parâmetro pelo próprio chamador — exatamente o que a seção 6 proíbe, e pela mesma razão: o isolamento entre empresas deixaria de ser garantido pelo sistema e passaria a depender de cada módulo lembrar de fazer certo.

Por outro lado, a coluna do banco vence com folga onde a API é genuinamente ruim: leitura analítica em massa. Um relatório que precisa agregar dezoito mil cobranças por segmento não deveria ser feito por HTTP, e insistir nisso seria dogmatismo.

> **DECISÃO**
>
> Usar os dois, com fronteira clara pelo tipo de acesso — não pelo módulo.
>
> **API** para tudo que envolve um usuário, uma permissão ou uma regra de negócio: leitura de tela, criação, alteração, exclusão.
>
> ***View* pública somente-leitura** para consumo analítico: relatórios, dashboards e agregações.

Assim o Grupo 3 constrói relatórios sem depender de sete serviços estarem no ar, e a segurança de acesso do usuário final continua inteira. As regras de publicação e de uso das *views* estão na seção 9.8.

---

Contrato de Integração dos Módulos · versão 0.7 · em vigor desde 25 de setembro de 2026  
Grupo 2 — Plataforma e Controle de Usuários · Projeto Integrador 2026  
Requisitos derivados do Prompt Mestre do cliente, seções 3, 79, 84 a 92, 105 e 116.
