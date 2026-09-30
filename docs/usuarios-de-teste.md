# Usuários de teste

Criados pelo identity quando sobe com `IDENTITY_PERFIL=dev` (Requisito RF60). **Existem só em
desenvolvimento** — a imagem de produção não cria nenhum deles.

Servem para qualquer grupo obter um token real e testar o módulo como cada perfil, sem
esperar tela nenhuma do Grupo 2.

## Tenants

| Tenant | id | Para quê |
|---|---|---|
| Empresa A | `a0000000-0000-4000-8000-00000000000a` | Uso normal |
| Empresa B | `b0000000-0000-4000-8000-00000000000b` | Provar que um tenant não enxerga o outro |

## Usuários

Senha de todos: **`Plataforma2026`**

O e-mail segue `{perfil}@empresa-a.dev` ou `{perfil}@empresa-b.dev`:

| Perfil | Empresa A | Empresa B |
|---|---|---|
| ADMINISTRADOR | `administrador@empresa-a.dev` | `administrador@empresa-b.dev` |
| GESTOR | `gestor@empresa-a.dev` | `gestor@empresa-b.dev` |
| VENDEDOR | `vendedor@empresa-a.dev` | `vendedor@empresa-b.dev` |
| PRE_VENDAS | `pre-vendas@empresa-a.dev` | `pre-vendas@empresa-b.dev` |
| FINANCEIRO | `financeiro@empresa-a.dev` | `financeiro@empresa-b.dev` |
| TECNICO | `tecnico@empresa-a.dev` | `tecnico@empresa-b.dev` |
| CONTABILIDADE | `contabilidade@empresa-a.dev` | `contabilidade@empresa-b.dev` |
| MARKETING | `marketing@empresa-a.dev` | `marketing@empresa-b.dev` |
| PARCEIRO | `parceiro@empresa-a.dev` | `parceiro@empresa-b.dev` |
| CLIENTE | `cliente@empresa-a.dev` | `cliente@empresa-b.dev` |

Cada usuário recebe as permissões marcadas com o seu perfil em `perfisPadrao`, nas listas de
[permissoes/](../permissoes). Permissão nova no arquivo passa a valer na próxima subida do identity.

## Equipes

Uma equipe "Comercial" em cada tenant, para testar o recorte "gestor vê a equipe" (Contrato §5.4).
O id da equipe chega no claim `equipes` do token de cada membro.

| Tenant | id da equipe | Membros |
|---|---|---|
| Empresa A | `a0000000-0000-4000-8000-0000000000e1` | gestor (líder), vendedor, pré-vendas |
| Empresa B | `b0000000-0000-4000-8000-0000000000e1` | gestor (líder), vendedor, pré-vendas |

Para listar os membros: `GET /api/identity/equipes/{id}/membros`, com a permissão
`identity.equipe.ver_resumo`.

## Obter um token

```bash
curl -s -X POST http://localhost:8080/api/identity/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"vendedor@empresa-a.dev","senha":"Plataforma2026"}'
```

O `accessToken` da resposta vai no cabeçalho `Authorization: Bearer ...` das chamadas ao seu
módulo. Ele dura 15 minutos.

**Verificação em duas etapas.** Fora do desenvolvimento, todo usuário cadastra um aplicativo
autenticador e o login devolve um `desafio` em vez do token (contrato `identity.yaml` 0.4.0). No
perfil `dev`, com `IDENTITY_EXIGIR_SEGUNDO_FATOR` vazio, a obrigação fica desligada e o POST acima
continua entregando o token direto. Se você ativar o segundo fator de um usuário de teste pela
tela Minha conta, ele passa a pedir o código também no dev — para voltar, um administrador redefine
em Administração → Usuários, ou recrie o banco com `docker compose down -v`.

## Token de serviço

`clientId` é o código do módulo; `clientSecret` é o `SVC_{MODULO}_SEGREDO` do `.env`.

```bash
curl -s -X POST http://localhost:8080/api/identity/auth/token-servico \
  -H 'Content-Type: application/json' \
  -d '{"clientId":"financeiro","clientSecret":"<SVC_FINANCEIRO_SEGREDO do .env>"}'
```

Nas chamadas feitas com esse token, informe o tenant em `X-Tenant-Id` (Contrato §9.2).
