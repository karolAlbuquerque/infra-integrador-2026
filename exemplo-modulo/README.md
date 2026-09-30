# Módulo de exemplo

Ponto de partida para os sete grupos. Um módulo pequeno — um cadastro de itens — que já cumpre
as regras do Contrato de Integração v0.6. Copie a pasta para o repositório do seu grupo,
renomeie e comece a escrever o seu domínio em cima.

## O que já vem resolvido

| Regra | Onde está |
|---|---|
| Valida o JWT pela chave pública do identity; permissões do claim `perms` viram authorities | `api/.../seguranca/SegurancaConfig.java` |
| Tenant vem do token (ou de `X-Tenant-Id` com token de serviço), nunca do corpo | `api/.../seguranca/TenantFiltro.java` |
| Filtro de tenant resolvido num lugar só, com `@TenantId` do Hibernate | `api/.../tenant/ResolvedorDeTenant.java`, `item/Item.java` |
| Envelope `{ success, data, message, errors }` em toda resposta, inclusive 401 e 403 | `api/.../api/Resposta.java`, `TratadorDeErros.java` |
| Listagem paginada, até 100 por página | `api/.../item/ItemController.java` |
| Sete colunas obrigatórias, *soft delete* e *view* pública | `api/src/main/resources/db/migration/V1__exemplo.sql` |
| Dois usuários de banco: Flyway com `own_`, aplicação com `usr_` | `api/src/main/resources/application.yml` |
| Evento publicado só depois do commit, com o envelope padrão | `api/.../eventos/PublicadorDeEventos.java` |
| Consumidor idempotente, com fila `.dlq` após três falhas | `api/.../eventos/ProcessadorContratoAssinado.java`, `TopologiaMensageria.java` |
| `X-Request-Id` em todo log | `api/.../observabilidade/CorrelacaoFiltro.java` |
| Cabeçalho de 32 KB | `application.yml` |
| Testes de 401, 403, isolamento, tenant no corpo, token de serviço e idempotência | `api/src/test` |
| Front que recebe a sessão da casca, ajusta a altura e avisa token expirado | `front/src/plataforma/sessao.ts` |
| Servido sob `/modulos/exemplo/`, com `frame-ancestors 'self'` | `front/vite.config.ts`, `front/nginx/` |
| Tema da plataforma (design system da Centinela) com Tailwind v4 | `front/src/tema/plataforma.css` |

## Rodar junto com a infraestrutura

Na raiz do `infra-integrador-2026`:

```bash
docker compose --profile exemplo up -d --build
```

- API: http://localhost:8090/api/exemplo/health
- Front: http://localhost:3090/modulos/exemplo/

## Rodar os testes

Precisa de Java 21, Maven e Docker (para o Testcontainers):

```bash
cd api
mvn verify
```

## Copiar para o seu módulo

1. Copie `api/`, `front/` e `.github/` para a raiz do repositório do seu grupo.
2. Troque `exemplo` pelo código do seu módulo em:
   - `api/pom.xml` (`artifactId`, `name`);
   - o pacote Java `br.com.plataforma.exemplo` (renomeie as pastas);
   - `application.yml` (`modulo.codigo`, usuários, schema, porta);
   - `V1__exemplo.sql` (nome do arquivo e o schema em cada comando);
   - `@SQLDelete` em cada entidade e as rotas `/api/exemplo` dos controllers;
   - `TopologiaMensageria.java` (exchange, DLX e filas);
   - `front/vite.config.ts` (`CODIGO` e `PORTA`), `front/nginx/default.conf.template` e `front/Dockerfile`.
3. Apague `Item*` e o consumidor de contrato assinado quando tiver as suas próprias entidades —
   mantenha os testes de segurança e isolamento, adaptados às suas rotas.
4. Em `.github/workflows/ci.yml`, ajuste os nomes das imagens.
5. Abra *pull request* no `infra-integrador-2026` com `contratos/`, `permissoes/` e `modulos/`
   do seu módulo, e com a imagem publicada no `.env.example`.
