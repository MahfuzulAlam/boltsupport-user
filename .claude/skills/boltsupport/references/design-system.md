# BoltSupport design system

Source: PRD §0 (L146-223). This file turns that prose into paste-ready code and resolves the places
where the PRD gives more than one number.

**Direction.** This is a working tool, not a marketing site. It should feel like a precision
instrument: quiet, dense, fast, with all the boldness spent in exactly one place. Prefer 1px borders
over shadows. No card inside a card. Rows separated by borders, not gaps.

## The provenance rail (the signature element)

Every block of content that has an author carries a 3px left rail whose color encodes who produced
it:

| Origin | Rail | Also |
|---|---|---|
| Customer message | `border` (neutral) | default card |
| Agent reply | `--accent-brand` | small "AI assisted" sparkle chip if drafted with AI, internal only |
| Internal note | amber | amber background tint, "Note" chip, lock icon |
| AI generated or proposed | `--ai` violet | sparkle icon, `data-ai-generated` attribute |
| System event | no rail | compact centered muted line with an icon |

This runs consistently across messages, drafts, suggestion strips, and the AI summary panel. It
exists because the single worst failure in a helpdesk is confusing an internal note with a customer
reply, or AI text with human text, and a rail is readable at a glance and at any zoom level. Do not
add other left-rail treatments and do not spend violet or amber on anything else, or the signal stops
meaning anything.

Implement it once as `components/ProvenanceRail.tsx`, and have every AI component wrap in
`features/ai/components/AiSurface.tsx`, which applies the violet rail, the sparkle, and
`data-ai-generated`. AI output is never styled ad hoc.

## Color tokens

Three accent colors, three meanings, no overlap. Near-black primary buttons keep a dense UI calm and
leave cobalt, violet, and amber each unambiguously owned. Default indigo-everywhere reads as a
template, which is why primary is ink.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 24% 11%;
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;
  --border: 220 13% 91%;
  --card: 0 0% 100%;
  --primary: 222 24% 11%;           /* ink buttons, high contrast */
  --primary-foreground: 0 0% 100%;
  --accent-brand: 222 89% 55%;      /* electric cobalt: links, active nav, focus, the bolt mark */
  --ring: 222 89% 55%;

  --ai: 268 74% 58%;                /* violet. AI generated or proposed content ONLY */
  --note: 45 96% 91%;               /* internal note tint */

  --success: 152 62% 40%;
  --warning: 38 92% 50%;
  --danger: 0 72% 51%;              /* also "Needs Attention" counts */
  --info: 199 89% 48%;

  --radius: 0.5rem;                 /* lg 8px, md 6px, sm 4px derived */
}

.dark {
  --background: 224 26% 8%;
  --foreground: 210 20% 96%;
  --muted: 224 18% 15%;
  --muted-foreground: 218 11% 65%;
  --border: 224 16% 19%;
  --card: 224 22% 11%;
  --primary: 210 20% 96%;
  --primary-foreground: 224 26% 8%;
  --accent-brand: 218 92% 66%;
  --ring: 218 92% 66%;

  --note: 42 88% 18%;               /* apply at 0.4 alpha */
}
```

`--accent-brand`, `--ai`, and `--note` are not stock shadcn tokens, so extend the Tailwind theme
alongside the standard ones:

```js
// tailwind.config.ts, theme.extend.colors
{
  brand: "hsl(var(--accent-brand) / <alpha-value>)",
  ai:    "hsl(var(--ai) / <alpha-value>)",
  note:  "hsl(var(--note) / <alpha-value>)",
  success: "hsl(var(--success) / <alpha-value>)",
  warning: "hsl(var(--warning) / <alpha-value>)",
  danger:  "hsl(var(--danger) / <alpha-value>)",
  info:    "hsl(var(--info) / <alpha-value>)",
}
```

Dark mode toggles a `dark` class on the root, persists to localStorage, and honors
`prefers-color-scheme` on first load.

## Typography

Two working faces plus one that only appears twice in the entire product.

- **IBM Plex Sans** for all UI chrome and human content.
- **IBM Plex Mono** for machine data only: ticket numbers, SLA countdowns, counts, percentages,
  confidence values, KPI figures, and `<kbd>` keys. The rule an agent can feel without being told:
  if it is monospaced, a machine produced it. Do not reach for mono as decoration.
- **Instrument Serif** in exactly two places, both persuading rather than working, both 36px: the
  AI Agent landing headline (§11) and the SLA zero state headline (§13). Using it anywhere else
  removes the reason those two screens feel different.

Self-host all three via `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`, and
`@fontsource/instrument-serif`. No external font CDN calls; the CSP forbids them.

| Size | Use |
|---|---|
| 14px | base UI text (root), line-height 1.5 |
| 15px | nav labels, list subjects, message bodies (1.6), composer text |
| 13px | secondary text, dense controls, table cells, mono metadata |
| 12px | uppercase section labels, status chips, inline tooltips |
| 11px | `<kbd>` chips and micro labels (the floor, do not go smaller) |
| 16 / 18 / 20 / 24px | headings, tracking -0.01 to -0.015em |
| 26px mono | KPI figures |
| 36px serif | the two zero-state headlines only |

`<kbd>` renders as: rounded 4px, `bg-muted`, IBM Plex Mono, `text-xs`, `px-1.5`.

## Density anchors

Authoritative source is `prd/boltsupport-prd.md` §9.4 and FR-1.10.

| Element | Height / width |
|---|---|
| Top bar | 56px (`h-14`), `border-b`, sticky, `z-40` |
| Sidebar / folder rows | 40px |
| Conversation list rows | **72px default, 84px comfortable**, user switchable and persisted |
| Inbox left sidebar | `w-60` |
| Conversation right sidebar | `w-80`, `border-l` |
| Reading pane / thread | 760px max |

App chrome runs full width; only reading surfaces are capped.

The 72px row is deliberate and worth defending: it carries a three line anatomy (identity and
metadata, then subject, then snippet with tag chips) because the row also has to hold an SLA
countdown, a predicted satisfaction dot, and collision avatars. Compressing it to a single 40px line
trades scannability for row count, which is the wrong trade for a queue an agent reads all day. Since
the list is virtualized, pick one fixed height per density mode and measure from it.

## Motion

120 to 180ms ease-out. At most one orchestrated moment per screen. Respect
`prefers-reduced-motion` by disabling transforms and keeping opacity changes only. Motion here is
feedback, not personality; the interaction budget is roughly 100ms, so prefer optimistic UI with an
Undo over a spinner.

## Copy rules

Active voice, sentence case, no filler. A control says exactly what happens ("Save changes", not
"Submit"), and the same verb carries into its toast ("Publish" produces "Published"). Errors state
what happened and how to fix it. Empty states invite an action. **No em dashes anywhere in UI copy
or code comments.**

## Resolved conflicts between the documents

The design spec gives more than one value in a few places. `prd/boltsupport-prd.md` §9.4 settles all
of them, and the numbers in the table above already reflect the resolution. Recorded here so nobody
re-opens them from a stale reading of the older document.

1. **Conversation row height.** The design spec says 72/84 in its typography block and 40/48 in its
   density block and §3. The PRD and `design-files/CLAUDE.md` both say **72 / 84**, and the PRD
   explains why. Settled.
2. **Sidebar row height.** Design spec says 40px in one place and 32px in another. PRD says **40px**.
3. **Reading pane width.** Design spec gives 760px, 720px, and `max-w-3xl` in three places. PRD says
   **760px**. Define it once as a `--reading-max` token rather than repeating a literal.
4. **Font delivery.** The design spec mentions a Google CDN "in these artifacts" but also requires
   @fontsource. PRD §9.3 is explicit: **self-host in production**, CDN is only acceptable in
   throwaway previews. The CSP has no font CDN origin.
5. **Minimum type size.** `design-files/CLAUDE.md` says never below 12px; PRD NFR-3.7 sets an 11px
   hard floor reserved for `<kbd>` chips and micro labels. Use **11px, for those two uses only**.

## Component inventory

shadcn primitives in use: NavigationMenu, DropdownMenu, Sheet, Avatar, Tooltip, Separator, Command,
Dialog, AlertDialog, Table, Card, Badge, ScrollArea, Collapsible, Popover, Select, Combobox,
Calendar, Tabs, Form, Input, Textarea, Switch, RadioGroup, Checkbox, Slider, Skeleton, Alert, Toast
(sonner), Resizable, Progress. Full per-feature component list is PRD §22 (L1075).
