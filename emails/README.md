# Modelos de e-mail

A plataforma envia o e-mail de sistema de todos os módulos (Requisito RF58, decisão D18). O
módulo publica `identity.email.enviar` em `identity.entrada` com `para`, `modelo` e
`variaveis` (ver [contratos/identity.asyncapi.yaml](../contratos/identity.asyncapi.yaml)); o
identity monta o e-mail a partir do modelo desta pasta e envia pelo SMTP do ambiente — em
desenvolvimento, o Mailpit (<http://localhost:8025>).

## Como entregar um modelo

Por pull request, como a lista de permissões: um arquivo por modelo em
`emails/{modulo}/{nome}.txt`. Na mensagem, o modelo se chama `{modulo}.{nome}`:

```
emails/financeiro/cobranca-vencida.txt   →   "modelo": "financeiro.cobranca-vencida"
```

- `{modulo}` é o código do módulo e precisa ser o `moduloOrigem` da mensagem — um módulo não
  usa modelo de outro.
- `{nome}` em minúsculas, com letras, números e hífen.
- `identity/` é reservado: convite e recuperação de senha são internos da plataforma.
- O identity lê a pasta ao subir. Modelo com erro é ignorado, com aviso no log.

## Formato

Texto puro, UTF-8. A primeira linha é o assunto; depois dela, uma linha em branco e o corpo.

```
Assunto: Cobrança {{numero}} vencida

Olá, {{nome}}.

A cobrança {{numero}}, de {{valor}}, venceu em {{vencimento}}.
```

- `{{variavel}}` é trocada pelo valor de mesmo nome em `variaveis`. **Toda variável do modelo
  precisa vir na mensagem**; faltando alguma, a mensagem é recusada e vai para a `.dlq`
  depois de três tentativas — melhor do que um e-mail com buracos.
- Variável que sobra na mensagem é ignorada.
- A plataforma acrescenta o rodapé "Mensagem automática da plataforma. Não responda este e-mail."
- Nada de senha, token ou link com token em variável: a mensagem passa pela fila, pela `.dlq`
  e por log (Contrato §9.7).

Mensagem com `modelo` sem ponto (formato da onda 1) continua aceita: assunto na variável
`assunto`, corpo em `mensagem` e as demais variáveis listadas abaixo dele.
