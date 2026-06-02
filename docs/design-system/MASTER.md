# 🏛️ NeoMissio: MASTER Design System

Este documento é a **Fonte Única da Verdade** para a identidade visual do NeoMissio.
Válido para: **Zafen CRM** e futuras instâncias multi-tenant da plataforma.

---

## 🎨 Paleta de Cores (Educação + Fintech)

Adotamos uma abordagem híbrida que transmite **confiança** (Fintech) e **engajamento** (Educação).

| Token | Nome Oficial | Finalidade | Hex | HSL (Tailwind) | Mood |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `primary` | **Atividade** | Ação / CTA / Destaque | `#E6003C` | `340 100% 45%` | Energia e Movimento |
| `secondary` | **Conversa** | Elementos Secundários | `#FFC20E` | `43 100% 52%` | Troca e Comunicação |
| `accent` | **Escuta** | Detalhes / Apoio | `#00B0D9` | `191 100% 43%` | Empatia e Acolhimento |
| `info` | **Quietude** | Informação / Institucional | `#1E3A8A` | `224 66% 33%` | Confiança e Estabilidade |
| `conhecimento` | **Conhecimento** | Áreas de Estudo | `#6B5CE7` | `248 75% 63%` | Aprendizado e Evolução |
| `foreground` | **Seriedade** | Textos Principais | `#1E293B` | `217 32% 17%` | Profissionalismo |
| `success` | — | Confirmação / Financeiro | `#10B981` | `153 60% 45%` | Saúde e Aprovação |
| `background` | — | **Fundo da Plataforma** | `#F8FAFC` | `210 40% 98%` | Ice Blue Institucional |

> ⚠️ **Regra multi-tenant:** `--background`, `--card`, `--border`, `--foreground` são tokens da **plataforma** — não são sobrescritos por tenant. Apenas `--primary` e derivados podem variar por tenant.

---

## 🏢 Arquitetura Multi-Tenant

O sistema suporta múltiplas escolas/organizações na mesma plataforma. A estratégia de theming:

### Tokens fixos (plataforma — não alterar por tenant)

```css
--background:  210 40% 98%;   /* Ice Blue — identidade da plataforma */
--card:        0 0% 100%;     /* branco puro */
--border:      214 32% 91%;   /* slate-200 sutil */
--foreground:  217 32% 17%;   /* slate-800 */
--muted-foreground: 215 16% 47%;
```

### Tokens por tenant (sobrescrevem via `[data-tenant="slug"]`)

```css
[data-tenant="escola-abc"] {
  --primary:            220 100% 45%;   /* azul corporativo da escola */
  --primary-foreground: 0 0% 100%;
  --sidebar-primary:    220 100% 45%;
  --ring:               220 100% 45%;
}
```

### Implementação no React

```tsx
// Aplicar no root do tenant após login
document.documentElement.setAttribute('data-tenant', tenant.slug);

// ou via className no layout
<div data-tenant={tenant.slug}>
  <DashboardLayout />
</div>
```

---

## ✍️ Tipografia

| Tipo | Fonte | Fallback | Mood |
| :--- | :--- | :--- | :--- |
| **Headings** | `Plus Jakarta Sans` | `Poppins` | Jovial, moderna, assertiva |
| **Body** | `Poppins` | `Inter` | Geométrica, limpa, legível |

> Nota: `Komet` permanece como referência aspiracional — usar `Plus Jakarta Sans` como substituto até licença.

---

## 🧩 Componentes — Design Tokens Aplicados

### DashboardCard (KPI Card)

Layout: **ícone à esquerda** + label + valor + trend empilhados à direita (padrão SmartHR/Linear).

| Variante | Icon BG | Icon Color | Accent Bar |
| :--- | :--- | :--- | :--- |
| `alunos` | `bg-teal-100` | `text-teal-700` | `bg-teal-400` |
| `financeiro` | `bg-emerald-100` | `text-emerald-700` | `bg-success` |
| `atividades` | `bg-violet-100` | `text-violet-700` | `bg-conhecimento` |
| `ocupacao` | `bg-amber-100` | `text-amber-700` | `bg-amber-400` |

Dark mode: sufixos `dark:bg-[cor]-900/40` e `dark:text-[cor]-400`.

### Sidebar

- Light: `bg-white border-r border-sidebar-border`
- Dark: `bg-[240_10%_4%]`
- Nav ativo light: `bg-primary/10 text-primary`
- Nav ativo dark: `bg-primary text-white`

---

## ✨ Micro-interações & Efeitos

Princípio: **"Premium Softness"** — suave mas presente.

| Elemento | Efeito |
| :--- | :--- |
| Cards (resting) | `shadow-soft` (indigo-tinted 10px 40px -10px) |
| Cards (hover) | `shadow-md` + `translateY(-2px)` |
| Botões | `transition-all 250ms cubic-bezier(0.4, 0, 0.2, 1)` |
| Modais | `duration-300` + fade + scale |
| Border radius padrão | `0.75rem` (12px) |

---

## 🚫 Anti-padrões

- **NÃO** usar cores neon no módulo financeiro
- **NÃO** usar emojis como ícones primários (usar Lucide)
- **NÃO** transições instantâneas (sempre `duration-200` mínimo)
- **NÃO** texto muted abaixo de 4.5:1 de contraste (acessibilidade)
- **NÃO** sobrescrever `--background` por tenant (quebra identidade da plataforma)
- **NÃO** usar `border` em cards — usar `shadow-soft` (Card usa `border-none`)

---

## 🛠️ Overrides por Página

Se uma página precisar de "Mood" diferente, criar `docs/design-system/pages/[nome].md` documentando apenas as divergências.

Exemplo: `docs/design-system/pages/dashboard-direcao.md`

---

**Última atualização:** Junho 2026 — Squad: CMO Architect (paleta) + CTO Architect (tokens) + Vision Chief (aprovação)
