# Mapa de Fronteiras

*Projeto Integrador 2026 · Grupo 2 — Plataforma e Controle de Usuários*

As 120 seções do Prompt Mestre distribuídas entre os oito grupos — o que cada um constrói, o que é compartilhado e o que ainda não tem dono.

| | |
|---|---|
| Versão | 0.2 |
| Situação | Proposta · atualizada em 14 de setembro |
| Base | Prompt Mestre, 120 seções |
| Complementa | Contrato de Integração |

**Cobertura do Prompt Mestre pela divisão atual dos grupos**

- **~62%** tem dono claro
- **~13%** atravessa vários módulos
- **~25%** não foi atribuído a nenhum grupo

## Índice

- [1. Para que serve este mapa](#1-para-que-serve-este-mapa)
- [2. A regra do dono único](#2-a-regra-do-dono-único)
- [3. Fronteira da plataforma](#3-fronteira-da-plataforma)
- [4. Mapa por grupo](#4-mapa-por-grupo)
- [5. Zonas compartilhadas](#5-zonas-compartilhadas)
- [6. O que ficou sem dono](#6-o-que-ficou-sem-dono)
- [7. O que levar à reunião](#7-o-que-levar-à-reunião)

## 1. Para que serve este mapa

O Prompt Mestre tem 120 seções e cerca de quinhentos requisitos. A divisão em oito grupos foi feita por área de negócio — CRM, Financeiro, Contratos — mas o documento não é organizado assim. Ele mistura, na mesma seção, coisas que pertencem a três equipes diferentes.

Sem um mapa, duas coisas acontecem, e ambas custam caro: dois grupos constroem a mesma coisa, ou os dois presumem que era do outro e ninguém constrói.

Este documento existe para tornar isso explícito antes de virar código. Ele responde três perguntas: **o que é meu**, **o que é compartilhado** e **o que não é de ninguém**.

## 2. A regra do dono único

> **REGRA**
>
> Cada entidade do sistema tem exatamente um grupo dono. O dono é o único que cria a tabela, escreve nela e expõe a API. Todos os outros guardam o UUID e consultam por API.

Isso vale sobretudo para as entidades que muita gente usa. O caso mais claro é **Empresa**: CRM precisa dela para oportunidade, Contratos para o contratante, Financeiro para o sacado, Chamados para o solicitante, Marketing para segmentar. São cinco grupos que precisam do mesmo dado.

Se cada um criar a sua tabela, o sistema terá cinco cadastros de cliente. Na demonstração final, cadastrar uma empresa no CRM não a fará existir no Financeiro — e não existe conserto rápido para isso em novembro.

> **NÃO DEVE**
>
> Copiar tabela de outro grupo “só para não depender”. Se a dependência incomoda, a conversa é sobre a fronteira, não sobre duplicar o dado.

## 3. Fronteira da plataforma

O Grupo 2 é o mais fácil de confundir, porque “plataforma” soa como “tudo”. Não é. A plataforma é a moldura e as regras; o miolo é sempre de outro grupo.

**É da plataforma**

- Tela de login, logout, recuperação de senha, 2FA
- Cadastro de usuários do sistema
- Perfis, papéis e permissões (RBAC)
- Emissão e validação de token
- Gateway de API
- Casca: barra superior, menu, roteamento
- Registro de módulos e montagem do menu
- Tenants e isolamento multi-empresa
- Identidade visual e componentes base
- Notificações e timeline, recebidas por mensagem
- Interface da busca global
- Formato de auditoria e de log
- RabbitMQ e o padrão de eventos entre módulos
- Envio de e-mail de sistema: convite, senha, avisos
- Equipes de usuários
- Repositório `infra-integrador-2026`: compose, banco, contratos, exemplo

**Não é da plataforma**

- Qualquer tela de negócio
- Cadastro de empresas e contatos (é cliente, não usuário)
- Regras de negócio de qualquer módulo
- Relatórios e dashboards de conteúdo
- O que cada permissão significa dentro do módulo
- Filtro por dono do registro
- Integrações com bancos, WhatsApp e caixas de e-mail
- Campanhas e listas de e-mail de marketing
- Filas internas de trabalho de cada módulo
- Corrigir o módulo de outro grupo

> **DISTINÇÃO IMPORTANTE**
>
> **Usuário** é quem faz login no sistema — funcionário da empresa que usa a plataforma. Vive no schema `identity`, é do Grupo 2.
>
> **Contato** é uma pessoa da empresa cliente, que aparece no CRM e nunca faz login. É de outro grupo. As duas coisas se parecem e têm nome, e-mail e telefone — mas são entidades diferentes, com donos diferentes.

## 4. Mapa por grupo

Seções do Prompt Mestre atribuídas a cada equipe. Onde há dúvida, o item aparece também na seção 5 ou 6 deste mapa.

### Grupo 1 — Produtos e Serviços · Frederico

| Escopo | Seções | Situação |
|---|---|---|
| Catálogo de produtos e serviços | 16 | definido |
| Precificação, margem, markup, política de desconto | 17 | definido |
| Licenças como item de catálogo | 40 | a confirmar |

### Grupo 2 — Plataforma e Controle de Usuários · Karol

| Escopo | Seções | Situação |
|---|---|---|
| Perfis de acesso e RBAC | 3 | definido |
| Segurança, credenciais, LGPD | 83–85 | definido |
| Multi-tenancy | 86 | definido |
| Padrão de banco, de API e de resposta | 87–90 | definido |
| Base de front-end e back-end | 93–94 | definido |
| Observabilidade, backup, ambientes | 98–100 | definido |
| Busca global, notificações, timeline, auditoria | 79–82 | compartilhado |
| Motor de configurações | 113 | compartilhado |
| Jobs, filas e eventos entre módulos | 92, 105 | compartilhado |

### Grupo 3 — Chamados e Relatórios · Pedro

| Escopo | Seções | Situação |
|---|---|---|
| Help desk, fila e ciclo de vida do chamado | 44 | definido |
| SLA por contrato | 45 | definido |
| Motor de relatórios e exportação | 77–78 | compartilhado |
| Home do técnico | 110 | definido |

### Grupo 4 — Marketing e Automações · Barnabé

| Escopo | Seções | Situação |
|---|---|---|
| Construtor visual de automação | 60 | definido |
| Gatilhos e ações | 61–62 | compartilhado |
| Campanhas de e-mail e opt-out | 63–64 | definido |
| Tracking e UTM | 58–59 | com grupo 7 |
| Canais: WhatsApp, e-mail, telefonia | 65–67 | sem dono |

### Grupo 5 — Contratos e Documentos · Caique

| Escopo | Seções | Situação |
|---|---|---|
| Contratos, modelos, ciclo de vida | 20 | definido |
| Automação de contrato e aditivos | 21–22 | definido |
| Armazenamento e biblioteca de documentos | 95–96 | compartilhado |
| Propostas e envio de proposta | 18–19 | sem dono |
| Reajustes contratuais | 69 | sem dono |

### Grupo 6 — CRM · Adison

| Escopo | Seções | Situação |
|---|---|---|
| Funis, etapas, kanban | 7 | definido |
| Oportunidades e regras do CRM | 8–9 | definido |
| Área de trabalho comercial | 10 | definido |
| Prospecção e importação | 11–12 | definido |
| Reuniões, tarefas, objeções | 13–15 | definido |
| Home do vendedor e dashboard comercial | 73, 109 | definido |
| Empresas, contatos e unidades | 4–6 | decisão urgente |

### Grupo 7 — Landing Pages e Formulários · Rafael

| Escopo | Seções | Situação |
|---|---|---|
| Editor de landing pages por blocos | 54 | definido |
| Publicação e domínio | 55 | definido |
| Editor de formulários | 56 | definido |
| Automação após envio do formulário | 57 | com grupos 4 e 6 |

### Grupo 8 — Financeiro · João Victor

| Escopo | Seções | Situação |
|---|---|---|
| Contas a receber e a pagar | 23–25 | definido |
| Cobrança recorrente e meios de pagamento | 26–27 | definido |
| Integração bancária e baixa automática | 28–29 | definido |
| Régua de cobrança e inadimplência | 30–31 | definido |
| Conciliação financeira | 32 | definido |
| MRR, churn, dashboard financeiro | 74–76 | definido |
| Comissões | 71 | sem dono |

## 5. Zonas compartilhadas

Seis casos em que uma funcionalidade atravessa vários módulos. Todos seguem o mesmo padrão de solução: **a plataforma dá o mecanismo, cada módulo alimenta** — nunca o contrário.

#### Empresas, contatos e unidades

*Seções 4 a 6 · afeta Grupos 3, 4, 5, 6, 8*

A entidade mais compartilhada do sistema. Cinco grupos precisam dela e nenhum a recebeu explicitamente.

> **Decidido (D4, ratificado por 4 de 8):** dono é o CRM. Publica `GET /api/crm/empresas` e `/contatos` logo na primeira semana, mesmo que só com o cadastro básico. Os demais guardam `empresa_id` e consultam. Falta a manifestação de Contratos, Chamados, Marketing e Landing Pages.

#### Relatórios

*Seções 77 e 78 · afeta todos*

Relatório de vendas precisa de CRM, Financeiro e Produtos ao mesmo tempo. O contrato proíbe ler tabela alheia, e com razão — mas agregar por HTTP, página por página, também não serve.

> **Decidido (D9):** cada módulo publica *views* somente-leitura com prefixo `vw_pub_` e concede `SELECT` a quem precisa. O Grupo 3 constrói o motor sobre elas: a tela de filtros, a composição entre fontes e a exportação em PDF, XLSX e CSV, servidas por uma API que filtra pelo tenant do token. É um módulo de *apresentação*, não de dados.

#### Busca global

*Seção 79 · afeta todos*

Uma caixa de busca no topo que encontra empresa, proposta, contrato, cobrança e chamado.

> **Proposta:** a casca faz a interface e agrega. Cada módulo expõe `GET /api/{modulo}/busca?q=` devolvendo no máximo cinco resultados com título, subtítulo e rota. A casca consulta todos em paralelo e mostra agrupado.

#### Timeline e notificações

*Seções 80 e 81 · afeta todos*

O Prompt Mestre é explícito: “todos os módulos devem alimentar a timeline”. Toda empresa tem um histórico único, alimentado por sete fontes.

> **Decidido (D10):** a plataforma hospeda a timeline e as notificações. Os módulos publicam as mensagens `identity.timeline.registrar` e `identity.notificacao.criar` no RabbitMQ, com tipo, empresa, texto e rota de destino. Nenhum módulo guarda timeline própria.

#### Auditoria

*Seção 82 · afeta todos*

Registrar usuário, IP, data, tipo de ação, valor anterior e valor novo.

> **Proposta:** cada módulo audita as próprias alterações, na própria tabela `audit_logs` do seu schema. A plataforma define o formato e as colunas obrigatórias. Centralizar geraria dependência de escrita entre módulos sem ganho real no escopo do semestre.

#### Documentos e anexos

*Seções 95 e 96 · afeta Grupos 3, 5, 6, 8*

Anexo aparece em empresa, proposta, contrato, chamado e lançamento financeiro. Arquivo grande nunca vai para o banco.

> **Proposta:** o Grupo 5 constrói um serviço genérico de documentos sobre MinIO, com upload, download e vínculo por `(tipo_origem, origem_id)`. Os outros módulos só guardam o UUID do documento.

## 6. O que ficou sem dono

Cerca de um quarto do Prompt Mestre não foi atribuído a nenhum grupo. São áreas inteiras, não detalhes soltos.

Isso não é necessariamente um erro — pode ser corte de escopo deliberado, e um semestre não comporta 120 seções. Mas precisa ser **explícito**: a diferença entre “decidimos não fazer” e “achamos que alguém estava fazendo” só aparece na entrega final, quando não dá mais para corrigir.

| Área | Seções | Quem sente a falta |
|---|---|---|
| Propostas — construtor, variáveis, envio, aceite | 18–19 | CRM e Contratos: o funil termina em proposta |
| Contabilidade — portal, fechamento, integração | 33–37 | Financeiro |
| Clientes MSP — ambientes, ativos, servidores, endpoints | 38, 39, 41 | Chamados e Contratos |
| Licenças — controle, renovação, vínculo com cliente | 40 | Produtos e Financeiro |
| Onboarding e offboarding | 42–43 | Contratos e Chamados |
| Portal do cliente | 46 | Chamados e Financeiro |
| Parceiros e oportunidades de parceiro | 47–49 | CRM |
| Indicações, recompensas, link de indicação | 50–53 | CRM e Financeiro |
| Canais: WhatsApp, e-mail, telefonia | 65–67 | CRM e Marketing |
| Renovações e reajustes | 68–69 | Contratos |
| Expansão — upsell e cross-sell | 70 | CRM |
| Comissões e metas | 71–72 | Financeiro e CRM |
| Dashboard executivo e home do gestor | 108, 112 | Gestão |

> **PERGUNTA PARA OS PROFESSORES**
>
> Estas áreas estão **fora do escopo do semestre**, ou ficaram sem dono por descuido na divisão?
>
> Duas delas merecem atenção especial, porque quebram a jornada que o próprio cliente define como critério de aceite na seção 115 do Prompt Mestre: **Propostas** (o CRM fecha uma oportunidade e não há o que gerar) e **Licenças e Serviços contratados** (o contrato é assinado e não há o que ativar).

Uma saída possível, se o escopo for mesmo reduzido: assumir explicitamente que a jornada demonstrável do semestre vai de **lead até pagamento recebido**, deixando MSP, contabilidade, parceiros e indicações declarados como fase seguinte. Isso é defensável na apresentação — muito mais do que descobrir a lacuna no dia da entrega.

## 7. O que levar à reunião

Quatro perguntas, em ordem de urgência. Desde a primeira versão deste mapa, duas avançaram.

1. **Quem é o dono de Empresas e Contatos?** *Respondida:* o CRM, pela decisão D4, ratificada por quatro dos oito grupos. Falta a manifestação de Contratos, Chamados, Marketing e Landing Pages.
2. **As zonas compartilhadas da seção 5 estão aceitas?** *Em parte:* relatórios por *view* pública e timeline por mensagem estão decididos e entraram no Contrato de Integração v0.6. Busca global, auditoria e documentos continuam como proposta.
3. **Propostas (seções 18 e 19) ficam com o Grupo 5?** Continua em aberto. É a lacuna que mais atrapalha o fluxo: sem ela, oportunidade ganha no CRM não vira contrato.
4. **Qual é o escopo real do semestre?** Continua em aberto. Se as treze áreas da seção 6 estão fora, isso precisa estar escrito — inclusive para a avaliação, porque o critério de aceite do cliente pressupõe todas elas.

Uma sugestão de método: leve as perguntas com uma proposta já formulada para cada uma, como está neste documento. Reunião que começa com uma proposta concreta termina em decisão; reunião que começa com uma pergunta aberta termina em outra reunião.

---

Mapa de Fronteiras · versão 0.2 · 14 de setembro de 2026  
Grupo 2 — Plataforma e Controle de Usuários · Projeto Integrador 2026  
Percentuais de cobertura são estimativa por contagem de seções do Prompt Mestre, não medida exata de esforço.
