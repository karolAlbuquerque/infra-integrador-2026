# Contratos

O que um módulo expõe aos outros, publicado **antes** de implementar (Contrato de
Integração §14.1). Cada grupo mantém os próprios arquivos, por *pull request*.

| Arquivo | O que descreve | Regra do Contrato |
|---|---|---|
| `{modulo}.yaml` | Endpoints HTTP que outros módulos ou a casca consomem, em OpenAPI 3.1 | §8, §14.1 |
| `{modulo}.asyncapi.yaml` | Eventos que o módulo publica no RabbitMQ, em AsyncAPI 3.0 | §9.7 |
| `{modulo}.views.md` | *Views* `vw_pub_*` publicadas para relatórios, com colunas e quem pode ler | §9.8 |

Para começar, copie os arquivos `exemplo.*` e troque `exemplo` pelo código do módulo.
Só publique o que outro módulo realmente usa — endpoint interno do próprio front não
precisa estar aqui.

## Regras

- **Mudança compatível** (campo novo opcional, endpoint novo): altere o arquivo e avise no
  grupo de gestores.
- **Mudança incompatível** (campo removido, tipo ou significado alterado): publique
  `/api/{modulo}/v2/...`, `versao: 2` do evento ou `vw_pub_..._v2`, **ao lado** da versão
  antiga, até os consumidores migrarem.
- Todo endpoint usa o envelope `{ success, data, message, errors }` e os códigos da §8.4.
- Todo evento usa o envelope da §9.7 e o tipo `modulo.entidade.acao`, com verbo no particípio.

## Desenvolver contra o contrato de outro módulo

Suba um *stub* com o Prism a partir do arquivo — ele responde com os exemplos do contrato:

```yaml
# docker-compose.dev.yml, no repositório do seu módulo
services:
  crm:                                   # não é o CRM real
    image: stoplight/prism:5
    command: mock -m false -h 0.0.0.0 -p 8082 /specs/crm.yaml
    volumes: ["../infra-integrador-2026/contratos/crm.yaml:/specs/crm.yaml:ro"]
```

Não tire o `-m false`: sem ele, o Prism 5 tenta rodar em vários processos, o que não funciona
com o Node da imagem, e o container sai com erro ao subir.

Para testar rápido, sem compose, a partir desta pasta:

```bash
docker run --rm -v "$PWD:/specs:ro" -p 8082:8082 stoplight/prism:5 \
  mock -m false -h 0.0.0.0 -p 8082 /specs/crm.yaml
```

No Git Bash do Windows, prefixe o comando com `MSYS_NO_PATHCONV=1`; sem isso, o caminho
`/specs/crm.yaml` é convertido num caminho do Windows antes de chegar ao Docker.

A exceção é o identity: um JWT de exemplo não tem assinatura válida. Use a imagem real,
com os usuários de [docs/usuarios-de-teste.md](../docs/usuarios-de-teste.md).
