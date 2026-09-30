# Checklist de conformidade

Um módulo está integrado quando passa nos dezenove itens (Contrato de Integração §15). O Grupo 2
verifica junto com a equipe, numa sessão de vinte minutos. Copie esta lista para a descrição do
*pull request* que registra o módulo em `modulos/`.

Nos comandos, `$TOKEN_A` é um token de `docs/usuarios-de-teste.md` da Empresa A e `$TOKEN_B`, da
Empresa B. Troque `crm` e a porta pelo seu módulo.

## Ambiente

- [ ] **1.** O serviço sobe pelo `docker compose` do infra, na porta atribuída.
- [ ] **2.** `GET /api/{modulo}/health` responde 200 sem token.
  `curl -i localhost:8082/api/crm/health`
- [ ] **14.** A imagem Docker é publicada a cada merge na `main`.
- [ ] **16.** As migrations rodam com `own_{modulo}`; a aplicação roda com `usr_{modulo}`.

## Autenticação e autorização

- [ ] **3.** Qualquer outro endpoint sem token responde 401.
  `curl -i localhost:8082/api/crm/oportunidades`
- [ ] **4.** Token válido, mas sem a permissão exigida, responde 403.
- [ ] **19.** O serviço aceita cabeçalho de 32 KB e responde normalmente a um token de ADMINISTRADOR.

## Isolamento entre empresas

- [ ] **5.** Token de outro tenant não enxerga nenhum registro — responde 404.
  Crie com `$TOKEN_A`, busque pelo id com `$TOKEN_B`.
- [ ] **6.** `tenantId` enviado no corpo da requisição é ignorado.

## Banco

- [ ] **7.** Todas as tabelas têm as sete colunas obrigatórias da §7.2.
- [ ] **8.** Nenhuma query ou *foreign key* referencia schema de outro grupo, fora das *views* `vw_pub_*`.

## API

- [ ] **9.** Todas as respostas seguem o envelope, inclusive as de erro.
- [ ] **10.** Listagens são paginadas (máximo 100 por página) e ordenáveis.
- [ ] **13.** O OpenAPI está em `contratos/{modulo}.yaml` e reflete o que a API faz.

## Front

- [ ] **11.** O front roda sozinho e dentro do iframe da casca, servido sob `/modulos/{codigo}/`, com altura ajustando.
- [ ] **12.** O JSON de registro está em `modulos/{codigo}.json` e o módulo aparece no menu de quem tem permissão.

## Mensageria e testes

- [ ] **15.** A suíte de testes passa sem nenhum outro módulo no ar.
- [ ] **17.** Os eventos publicados seguem o envelope da §9.7, levam a propriedade `user_id` = `mq_{modulo}` e estão descritos em `contratos/{modulo}.asyncapi.yaml`.
- [ ] **18.** Todo consumidor ignora um evento já processado — testado com a mesma mensagem entregue duas vezes.

O módulo de exemplo cobre os itens 2 a 6, 9, 10, 15 e 18 com testes automatizados
(`exemplo-modulo/api/src/test`). Copiar esses testes é o jeito mais curto de cumpri-los.
