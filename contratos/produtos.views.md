# Views públicas — Produtos e Serviços

Contrato somente-leitura para relatórios do Grupo 3, seguindo o modelo `exemplo.views.md`
e o Contrato de Integração §9.8. Tela operacional usa API e suas permissões.
Este arquivo descreve a interface; a migration e a implementação pertencem ao módulo produtos.

## `produtos.vw_pub_itens`

Uma linha por item, incluindo inativos. Itens nunca são excluídos; `ativo=false` representa
indisponibilidade para venda nova. Preço nulo significa não cadastrado, não zero.
Valores representam o catálogo vigente, não vendas realizadas ou preços de contratos assinados.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador do item |
| `tenant_id` | `uuid` | Obrigatório; consumidor filtra pelo tenant autenticado |
| `sku` | `text` | Código único por tenant, inclusive inativos |
| `nome` | `text` | Nome comercial |
| `categoria` | `text` | Categoria única conforme enum do OpenAPI |
| `unidade` | `text` | Enum do OpenAPI, sem MÊS ou ANO |
| `periodicidade` | `text` | UNICA, MENSAL, TRIMESTRAL, SEMESTRAL ou ANUAL |
| `quantidade_minima` | `numeric(15,4)` | Positiva; precisão limitada pela unidade |
| `casas_decimais_quantidade` | `integer` | 4 para GB, TB e HORA; 0 para as demais |
| `ativo` | `boolean` | Disponível para venda nova |
| `moeda` | `text` | BRL fixo |
| `preco_venda` | `numeric(15,2)` | Preço manual por unidade e período; pode ser null |
| `fabricante_id` | `uuid` | Referência opcional à lista local, sem FK externa |
| `distribuidor_id` | `uuid` | Único distribuidor local opcional por item |
| `updated_at` | `timestamptz` | Última alteração relevante de cadastro ou preço, em UTC |

**Não publicar:** custo, markup, margem, impostos, comissão, preço mínimo, desconto máximo,
histórico ou dados de auditoria de usuários. Usar projeção explícita, nunca `SELECT *`.
Uma view não aplica permissões de campo do JWT. Política comercial é lida pela API.

**Quem pode ler:** `usr_chamados`. Pública significa interface publicada; não conceder acesso
anônimo nem `GRANT` ao papel `PUBLIC`. Sem acesso às tabelas base ou escrita cruzada.

**Isolamento:** o serviço de relatórios autentica o usuário, verifica sua permissão e sempre
filtra `tenant_id` com o valor do token, nunca com um tenant livre enviado pelo navegador.
A view por si só não garante esse isolamento. Testar com dois tenants antes da homologação.

**Concessão prevista na migration do módulo**, executada por `own_produtos`, após criar a view.
O bloco segue o exemplo do repositório e permite testes sem a role de relatórios:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usr_chamados') THEN
    GRANT USAGE ON SCHEMA produtos TO usr_chamados;
    GRANT SELECT ON produtos.vw_pub_itens TO usr_chamados;
  END IF;
END $$;
```

**Aceite:** uma linha por item; inativos preservados; preços null e zero distintos; categoria
única; nenhuma coluna sensível; role sem escrita ou leitura de tabelas base; relatórios de
um tenant não retornam itens de outro. Consultas não reconstroem valores de contratos pela view.

**Histórico:** interface inicial 0.3.0. Remover ou renomear coluna ou mudar seu significado exige
`vw_pub_itens_v2` convivendo com esta até o consumidor migrar.
