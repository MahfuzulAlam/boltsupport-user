# BoltSupport project notes

## Look and feel (standing instruction)
Match the ergonomics of the Help Scout screenshots in `uploads/` for every future change:
- Dark chrome top bar, light nav labels, icon-only actions on the right, avatar last.
- Generous type: 14px base UI text, 15px nav and list subjects, 18 to 24px screen titles. Never below 12px.
- Roomy two-line conversation rows (about 72px) with customer, subject, preview, ticket number, waiting time, and a checkbox column.
- Left sidebar: inbox name, icon plus label plus count rows (40px), "Needs Attention" in danger with a pill badge, a Views section, and a footer with settings and compose icon buttons.
- Workflow: inbox list, click a row to open the conversation, back or Esc returns. Conversation view = thread plus right rail of customer and AI cards. Reply and Note as footer buttons carrying their key badges (R, N).
- Cards: white surface, 1px border, 8px radius, generous padding. Big numbers on reports.
Keep BoltSupport's own tokens (IBM Plex Sans and Mono, ink primary, cobalt accent, amber notes, violet reserved for AI) and the 3px provenance rail. Do not copy Help Scout branding.

## Current files
`BoltSupport 06 Agent and automation.dc.html` is the live baseline. Build on it and keep the earlier
numbered files untouched as reference. It adds the Satisfaction report, AI Agent landing plus setup
wizard plus management console, the Workflow builder, SLA zero state and editor, and Routing.
Native `<select>` ignores a DOM value attribute, so selects in these screens are uncontrolled with an
onChange that writes state; seed state to the first option.
- `BoltSupport 01 Global shell.dc.html` — top bar, nav, command palette, shortcuts, dark mode.
- `BoltSupport 02 Inbox and conversation.dc.html` — Help Scout density, list to conversation workflow.
- `BoltSupport 03 Workspace and screens.dc.html` — workspace dashboard, rich list, conversation rail.
- `BoltSupport 04 Composer and Auto Draft.dc.html` — full composer, Auto Draft, AI summary module.
- `BoltSupport 05 AI features.dc.html` — Auto assign, Auto tag, Response evaluation, plus the floating
  Reply and Note buttons that open the composer.
- `BoltSupport 06 Agent and automation.dc.html` — Satisfaction report, AI Agent (landing, wizard,
  console), Workflow builder, SLAs, Routing.
Navigate the current file via the wordmark (workspace), the AI nav menu or hamburger sheet (AI pages),
a folder (list), a row (conversation), Cmd+K for everything.
