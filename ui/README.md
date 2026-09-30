# Tema visual

Base visual compartilhada pelos oito fronts (Contrato §12.3): o **Design System da Centinela
Soluções** (`design-systemfinal.md`, aprovado em 21/09/2026) sobre **Tailwind CSS v4**, com ícones
**lucide-react** e a fonte **Inter**. Ele substitui o shadcn/ui da onda 1. Usar é recomendado,
não obrigatório — mas um módulo que ignora o tema parece colado no sistema, e isso aparece na
apresentação.

## Como usar no seu front

1. Crie o projeto com Vite, React e TypeScript, e instale o Tailwind v4
   (`tailwindcss` e `@tailwindcss/vite`) e o `lucide-react`.
2. Copie [plataforma.css](plataforma.css) para `src/tema/plataforma.css` e importe:

   ```css
   @import "tailwindcss";
   @import "./tema/plataforma.css";
   ```

3. Carregue a Inter no `index.html`:

   ```html
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&display=swap" />
   ```

4. Aplique o tema recebido da casca no `<html>`:

   ```ts
   document.documentElement.dataset.tema = sessao.tema // "claro" | "escuro"
   ```

O módulo de exemplo (`exemplo-modulo/front`) já faz os quatro passos. Os componentes do design
system (`Button`, `Modal`, `FormSection`, `FormField`, `PageHeader`, `Badge`...) estão prontos em
`casca/src/components/ui/index.tsx` do repositório `plataforma-integrador-2026-2` — copie o arquivo
para o seu front, se quiser os mesmos componentes da casca.

## Cores

| Família | Classes | Uso |
|---|---|---|
| Marca | `bg-brand-950` … `bg-brand-50` (e `text-`, `border-`) | sidebar e cabeçalho de página (`brand-950`), botão primário (`brand-800`, hover `brand-700`), item ativo (`brand-700`), destaque sobre fundo escuro (`brand-400`, `brand-300`) |
| Neutros | `bg-fundo`, `bg-superficie`, `bg-superficie-2`, `text-texto`, `text-texto-2`, `text-texto-3`, `text-titulo`, `border-borda`, `border-borda-forte` | fundo da página, cartões e modais, textos e bordas |

A marca é a mesma nos dois temas. Os neutros mudam no tema escuro: use-os no lugar de `bg-white`,
`text-gray-700` e `border-gray-200` e a tela funciona nos dois temas sem retrabalho. Para um
ajuste pontual, a variante `dark:` segue o mesmo atributo (`dark:bg-brand-900`).

## Regras de uso

- Nunca hex no componente: `bg-brand-950`, não `#0C1A2E` (design system §2 e §13).
- Arredondamento: `rounded-lg` em botão, campo e badge; `rounded-xl` em cartão e modal;
  `rounded-full` em avatar e contador.
- Criar e editar em modal com título; detalhe em modal sem padding com cabeçalho `brand-950`;
  confirmação em modal pequeno. Nova rota só quando a ação não cabe no contexto (Regra 104).
- Vermelho é para ação irreversível e erro, não para destaque.
- As seções 9 e 11 do design system (registrar o módulo num `App.tsx` único, `VITE_API_URL`)
  **não valem** aqui: cada módulo é uma aplicação própria, embutida pela casca em iframe
  (decisões D1 e D14), e chama a API pelo caminho relativo `/api/{modulo}/`.
