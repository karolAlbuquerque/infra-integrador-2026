# Views públicas — chamados

*Views* somente-leitura que o módulo publica para relatórios e agregações (Contrato §9.8).
Tela operacional nunca lê *view*: usa API.

## `chamados.vw_pub_chamados`

Chamados ativos, sem os excluídos. Serve para que outros módulos componham indicadores e relatórios
próprios sem depender do serviço de chamados estar no ar.

**Não serve para a ficha de empresa do CRM.** A ficha é tela operacional, e a *view* não aplica
permissão (§9.8). O status técnico da ficha vem de `GET /api/chamados/empresas/{id}/status-tecnico`.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador do chamado |
| `tenant_id` | `uuid` | Tenant dono do registro — **quem lê filtra por ele**, com o valor do token do usuário |
| `numero` | `bigint` | Sequencial por tenant, exibido ao usuário |
| `tipo` | `text` | Ver valores abaixo |
| `empresa_id` | `uuid` | Referência a `crm.empresas`; nulo em chamado interno |
| `categoria_id` | `uuid` | Referência a `chamados.categorias` |
| `prioridade` | `text` | Ver valores abaixo |
| `status` | `text` | Ver valores abaixo |
| `tecnico_id` | `uuid` | Técnico responsável; nulo enquanto o chamado está em `novo` |
| `created_at` | `timestamptz` | Abertura, em UTC |
| `primeira_resposta_em` | `timestamptz` | Primeira interação pública de um técnico |
| `atendimento_iniciado_em` | `timestamptz` | Primeira atribuição a um técnico |
| `resolvido_em` | `timestamptz` | Quando a solução foi registrada |
| `fechado_em` | `timestamptz` | Quando o chamado foi encerrado |
| `vence_primeira_resposta_em` | `timestamptz` | Prazo já ajustado pelas pausas |
| `vence_inicio_atendimento_em` | `timestamptz` | Prazo já ajustado pelas pausas |
| `vence_resolucao_em` | `timestamptz` | Prazo já ajustado pelas pausas |

**Valores possíveis** — fazem parte do contrato. Acrescentar valor é mudança compatível e é avisada no
grupo de gestores; remover ou renomear exige `vw_pub_chamados_v2`.

| Coluna | Valores |
|---|---|
| `tipo` | `interno` (solicitante é usuário do sistema, sem empresa) · `cliente` (solicitante é contato do CRM, com empresa) |
| `prioridade` | `baixa` · `media` · `alta` · `critica` |
| `status` | `novo` · `em_atendimento` · `aguardando_cliente` · `aguardando_fornecedor` · `escalado` · `resolvido` · `fechado` · `reaberto` |

Em aberto é todo status que não seja `resolvido` nem `fechado`.

Descrição, solução e interações **não** são publicadas: contêm texto livre do cliente e não servem a
agregação.

**Quem pode ler:** por enquanto, nenhum outro módulo. O grupo que precisar para relatório ou dashboard
pede por *pull request* aqui — a concessão é uma linha na nossa migration `V1__chamados.sql`, que roda
como `own_chamados`. O `IF EXISTS` deixa a mesma migration rodar nos testes, onde os outros papéis não
existem. Modelo, com o papel do leitor no lugar de `usr_leitor`:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usr_leitor') THEN
    GRANT USAGE  ON SCHEMA chamados            TO usr_leitor;
    GRANT SELECT ON chamados.vw_pub_chamados   TO usr_leitor;
  END IF;
END $$;
```

**Histórico:** criada na versão 0.1.0. Remover ou renomear coluna exige `vw_pub_chamados_v2` convivendo
com esta até o consumidor migrar.
