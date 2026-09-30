# Diagramas C4 — Sistema Integrado de Gestão

> Projeto Integrador 2026 · Grupo 2 — Plataforma e Controle de Usuários
> Etapa **Arquitetura da solução (Documentação)** da matriz de acompanhamento
> Versão 1.0 · 25 de setembro de 2026

O modelo C4 descreve a arquitetura em níveis, do mais amplo ao mais detalhado. Aqui estão os
três primeiros: **contexto**, **contêineres** e **componentes**. O quarto nível, de código, não
é mantido como desenho — ele vive nos contratos OpenAPI e no próprio código.

As regras citadas por `§` são do [Contrato de Integração dos Módulos v0.7](https://github.com/karolAlbuquerque/infra-integrador-2026/blob/main/docs/contrato-de-integracao.md),
que está em vigor para os oito grupos.

---

## Nível 1 — Contexto

Quem usa o sistema e com que outros sistemas ele fala.

```mermaid
flowchart TB
    funcionario["<b>Funcionário da empresa cliente</b><br/>vendedor, técnico, financeiro,<br/>gestor, administrador"]
    visitante["<b>Visitante anônimo</b><br/>preenche formulário<br/>de landing page"]

    sistema["<b>Sistema Integrado de Gestão</b><br/>comercial, financeiro, MSP,<br/>marketing, contábil e atendimento<br/><i>oito módulos, uma plataforma</i>"]

    email["<b>Servidor de e-mail</b><br/>Mailpit em desenvolvimento;<br/>provedor SMTP a definir"]
    pagamento["<b>Provedor de pagamento</b><br/>Pix, boleto e cartão<br/><i>webhook de confirmação</i>"]
    registry["<b>GitHub Container Registry</b><br/>imagens publicadas a cada merge"]

    funcionario -->|"usa pelo navegador,<br/>com login e permissões"| sistema
    visitante -->|"envia formulário<br/>em rota pública (§12.6)"| sistema
    sistema -->|"envia convite, recuperação<br/>de senha e avisos"| email
    pagamento -->|"avisa pagamento confirmado,<br/>atrasado ou estornado"| sistema
    registry -.->|"fornece as imagens<br/>que o ambiente sobe"| sistema
```

**Fronteira do sistema.** Tudo o que os oito grupos constroem está dentro do retângulo central.
O que está fora são serviços de terceiros: e-mail, meio de pagamento e o registro de imagens.
Redes sociais, telefonia e WhatsApp ficaram fora do escopo do semestre.

---

## Nível 2 — Contêineres

Cada caixa é algo que roda sozinho: um serviço, um front ou uma peça de infraestrutura.
As portas são fixas (§13.3), para um `docker compose up` subir o sistema inteiro sem conflito.

```mermaid
flowchart TB
    navegador(["Navegador do funcionário"])
    visitante(["Visitante anônimo"])

    subgraph plataforma["Plataforma — Grupo 2"]
        gateway["<b>Gateway</b> :8080<br/>Spring Cloud Gateway<br/><i>única porta de entrada;<br/>valida o token e roteia</i>"]
        casca["<b>Casca</b> :3000<br/>React + Vite<br/><i>login, barra, menu;<br/>embute o módulo em iframe</i>"]
        identity["<b>Identity</b> :8081<br/>Spring Boot<br/><i>usuários, perfis, permissões,<br/>equipes, tenants, JWKS,<br/>timeline, notificações, e-mail</i>"]
    end

    subgraph modulos["Módulos de negócio — Grupos 1 e 3 a 8"]
        api["<b>API do módulo</b> :8082 a :8088<br/>Spring Boot<br/><i>crm, produtos, contratos,<br/>financeiro, chamados,<br/>marketing, landing</i>"]
        front["<b>Front do módulo</b> :3002 a :3008<br/>React + Vite<br/><i>servido em /modulos/{codigo}/</i>"]
    end

    subgraph infra["Infraestrutura compartilhada"]
        postgres[("<b>PostgreSQL 16</b> :5432<br/><i>um banco, um schema por grupo,<br/>own_ migra e usr_ roda</i>")]
        rabbit["<b>RabbitMQ 4.1</b> :5672<br/><i>uma exchange por módulo<br/>+ identity.entrada</i>"]
        mailpit["<b>Mailpit</b> :1025<br/><i>captura o e-mail em dev</i>"]
    end

    navegador -->|HTTPS, um domínio só| gateway
    visitante -->|"/public/**, sem token"| gateway
    gateway -->|"/"| casca
    gateway -->|"/api/identity/**"| identity
    gateway -->|"/api/{modulo}/**"| api
    gateway -->|"/modulos/{codigo}/**"| front
    casca -.->|"postMessage: sessão, token e tema"| front
    api -->|"chamada direta entre serviços,<br/>sem passar pelo gateway (§9.1)"| identity
    api -->|"lê o resumo de outro módulo (§9.3)"| api
    identity --> postgres
    api --> postgres
    identity <-->|"eventos e pedidos (§9.7)"| rabbit
    api <-->|"eventos e pedidos (§9.7)"| rabbit
    identity --> mailpit
```

**Três decisões que o desenho mostra:**

1. **O navegador conhece um endereço só.** Casca, fronts e APIs saem do mesmo domínio, separados
   por caminho (§12.8). Isso elimina CORS, deixa o cookie do refresh token funcionar sem
   configuração e faz a verificação de origem do iframe comparar com um valor único.
2. **Serviço fala com serviço direto**, pelo nome do contêiner. O gateway existe para o tráfego
   que entra; se o tráfego interno passasse por ele, viraria ponto único de falha (§9.1).
3. **O banco é um só, com um schema por grupo e dois usuários por schema** (§7.1). Nenhum módulo
   consegue ler o schema do outro — é restrição do banco, não combinado. A única leitura cruzada
   permitida é em *view* pública `vw_pub_*`, para relatórios (§9.8).

---

## Nível 3 — Componentes do Identity

Detalhe do contêiner que o Grupo 2 implementa. Os demais grupos desenham o seu da mesma forma.

```mermaid
flowchart TB
    subgraph identity["Identity :8081 — Spring Boot"]
        auth["<b>Autenticação</b><br/>login, renovação, logout,<br/>token de serviço, JWKS<br/><i>RS256, refresh em cookie</i>"]
        rbac["<b>Perfis e permissões</b><br/>catálogo global, perfis por tenant,<br/>montagem do menu"]
        equipes["<b>Equipes</b><br/>membros e líderes;<br/>claim equipes no token"]
        registro["<b>Registro de módulos</b><br/>lê permissoes/ e modulos/<br/>a cada subida"]
        consumidores["<b>Consumidores de mensagem</b><br/>timeline, notificação e e-mail<br/><i>idempotentes, com DLQ</i>"]
        auditoria["<b>Auditoria</b><br/>só inserção, por restrição<br/>do próprio banco"]
    end

    catalogo[/"permissoes/*.yaml<br/>modulos/*.json<br/><i>entregues por PR no infra</i>"/]
    schema[("schema identity<br/>19 tabelas")]
    entrada["identity.entrada<br/><i>exchange de pedidos</i>"]

    auth --> schema
    rbac --> schema
    equipes --> schema
    auditoria --> schema
    registro --> catalogo
    registro --> schema
    consumidores --> entrada
    consumidores --> schema
    auth -.->|"assina o token que<br/>todo módulo valida"| rbac
```

**Por que o registro de módulos é um componente e não uma tabela escrita à mão:** a plataforma não
conhece nenhum módulo pelo código-fonte. Ela lê, a cada subida, os arquivos que cada grupo entrega
por pull request e monta o menu a partir deles (§11). Um grupo novo entra no sistema sem o Grupo 2
recompilar nada.

---

## Como estes diagramas se mantêm vivos

| Nível | Muda quando | Onde conferir |
|---|---|---|
| Contexto | entra ou sai um ator ou sistema externo | Mapa de Fronteiras |
| Contêineres | entra um módulo, muda porta ou peça de infraestrutura | Contrato §13.3 e `docker-compose.yml` |
| Componentes | muda a divisão interna do identity | código do `identity` e Requisitos da Plataforma |

Os diagramas estão em Mermaid, dentro do repositório, e não como imagem: assim a alteração
aparece no *diff* do pull request, como qualquer outra mudança de contrato.
