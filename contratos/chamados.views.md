# Views públicas — chamados

*Views* somente-leitura que o módulo publica para relatórios e agregações (Contrato §9.8).
Tela operacional nunca lê *view*: usa API.

## `chamados.vw_pub_chamados`

Chamados ativos, sem os excluídos. Serve para que outros módulos componham indicadores próprios sem
depender do serviço de chamados estar no ar.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador do chamado |
| `tenant_id` | `uuid` | Tenant dono do registro — **quem lê filtra por ele**, com o valor do token do usuário |
| `numero` | `bigint` | Sequencial por tenant, exibido ao usuário |
| `tipo` | `text` | `interno` ou `cliente` |
| `empresa_id` | `uuid` | Referência a `crm.empresas`; nulo em chamado interno |
| `categoria_id` | `uuid` | Referência a `chamados.categorias` |
| `prioridade` | `text` | `baixa`, `media`, `alta`, `critica` |
| `status` | `text` | Um dos oito status do ciclo de vida |
| `tecnico_id` | `uuid` | Técnico responsável; nulo enquanto o chamado está em `novo` |
| `created_at` | `timestamptz` | Abertura, em UTC |
| `primeira_resposta_em` | `timestamptz` | Primeira interação pública de um técnico |
| `resolvido_em` | `timestamptz` | Quando a solução foi registrada |
| `fechado_em` | `timestamptz` | Quando o chamado foi encerrado |
| `vence_primeira_resposta_em` | `timestamptz` | Prazo já ajustado pelas pausas |
| `vence_resolucao_em` | `timestamptz` | Prazo já ajustado pelas pausas |

Descrição, solução e interações **não** são publicadas: contêm texto livre do cliente e não servem a
agregação.

**Quem pode ler:** `usr_crm`, para compor o histórico técnico na ficha da empresa. Outros grupos que
precisarem podem pedir por *pull request* aqui — a concessão é uma linha na nossa migration.

**Concedido na migration** `V1__chamados.sql`, rodando como `own_chamados`. O `IF EXISTS` deixa a mesma
migration rodar nos testes, onde os outros papéis não existem:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usr_crm') THEN
    GRANT USAGE  ON SCHEMA chamados            TO usr_crm;
    GRANT SELECT ON chamados.vw_pub_chamados   TO usr_crm;
  END IF;
END $$;
```

**Histórico:** criada na versão 0.1.0. Remover ou renomear coluna exige `vw_pub_chamados_v2` convivendo
com esta até o consumidor migrar.
