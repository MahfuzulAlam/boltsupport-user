# BoltSupport
## Product Requirements Document

| | |
|---|---|
| **Product** | BoltSupport |
| **Type** | Shared inbox customer support helpdesk with built in AI assistance |
| **Document version** | 1.0 |
| **Date** | 31 July 2026 |
| **Status** | Draft for build |
| **Owner** | Product |
| **Related documents** | BoltSupport Claude Design Prompt Package (build specification), BoltSupport Ready-to-Paste Prompts |

---

## 1. Overview

### 1.1 Summary

BoltSupport is a shared inbox helpdesk for small and mid sized software companies. Multiple support agents work a common queue of customer conversations arriving from email, live chat, and messaging channels, with AI assisting at every step without ever acting on the customer's behalf unsupervised.

The product competes directly with Help Scout, Front, and Freshdesk. It differentiates on three axes: native SLA management, which is the single most cited gap in the incumbent; AI that is genuinely useful because it suggests rather than acts; and a keyboard first interface fast enough that agents stop reaching for the mouse.

### 1.2 Problem statement

Support teams at growing software companies outgrow a shared Gmail inbox at roughly five agents. At that point they hit four problems simultaneously:

1. **Collision and duplication.** Two agents reply to the same customer. Nobody knows who owns what.
2. **No accountability on time.** There is no way to say "enterprise customers get a reply in four business hours" and then know whether that happened.
3. **Repetitive work.** Sixty to eighty percent of inbound volume is variations on the same twenty questions, retyped by hand every time.
4. **No visibility.** Leads cannot see which conversations are going badly until the angry escalation lands.

Existing tools solve one to three of these. Help Scout solves collision well and time poorly. Zendesk solves time well and is heavy enough that small teams resent it. AI features across the category are either absent or so aggressive that agents disable them after the first embarrassing auto sent reply.

### 1.3 Product principles

These principles resolve disputes during build. When a decision is contested, the higher principle wins.

1. **Speed is a feature.** Agents live in this UI eight hours a day. Any interaction slower than roughly 100ms is a bug, not a performance nice to have. Optimistic UI with undo beats loading spinners everywhere.
2. **AI suggests, humans decide.** No AI output reaches a customer without a deliberate human send. This is not a v1 limitation to be relaxed later. It is the product position.
3. **Origin is never ambiguous.** An agent must never confuse an internal note with a customer reply, or AI text with human text. This is the failure mode that destroys trust in everything else.
4. **Density without clutter.** Show more per screen than a consumer app would, but never at the cost of scannability.
5. **Earn each automation.** Every automatic behavior starts as a suggestion, accumulates an acceptance rate, and is only promoted to automatic once the data supports it.

---

## 2. Target users

### 2.1 Primary persona: the support agent

**Who.** Handles 40 to 80 conversations per day. Lives in the inbox from login to logout. Moderately technical. Cares about clearing the queue and not looking stupid in front of customers.

**Needs.** Move fast. Know what to work on next. Avoid duplicating a teammate. Get the facts of a long thread without reading twenty messages. Not have to retype the same answer.

**Frustrations with current tools.** Slow search. Having to leave the conversation to find context. Being blamed for missing an SLA nobody told them about. AI features that produce confidently wrong text they then have to fully rewrite.

**What success looks like.** They stop using the mouse. They trust the AI summary enough to skip reading the thread.

### 2.2 Secondary persona: the support lead

**Who.** Manages three to fifteen agents. Half their time is in the queue, half is in reports and coaching.

**Needs.** Know which conversations are at risk before the customer complains. See which agents need coaching and on what. Prove the team hit its response commitments. Configure automation without engineering help.

**Frustrations.** Reports that show volume but not quality. No way to define or track SLAs. Automation builders that require boolean logic expertise.

**What success looks like.** They catch at risk conversations proactively. Coaching conversations start from data rather than vibes.

### 2.3 Tertiary persona: the admin or founder

**Who.** Sets the tool up, connects the mailbox, invites the team, then rarely logs in.

**Needs.** Get from signup to first reply in under fifteen minutes. Connect channels without reading documentation. Understand what the AI will and will not do before turning it on.

**What success looks like.** They never file a support ticket about the support tool.

### 2.4 Non-user: the customer

The customer never logs into BoltSupport. They receive email, chat, or messaging replies, and optionally interact with the AI Agent through the chat widget. They may see a public knowledge base. Everything internal, including AI summaries, predicted satisfaction scores, and quality scores, is invisible to them by hard requirement.

---

## 3. Goals and non-goals

### 3.1 Goals

| # | Goal | Rationale |
|---|---|---|
| G1 | A team of ten can run their entire support operation in BoltSupport without a second tool | Table stakes for replacing the incumbent |
| G2 | Native SLA definition, live tracking, and reporting | The clearest competitive gap |
| G3 | AI that agents voluntarily keep enabled after 30 days | The differentiator, and the hardest to earn |
| G4 | Full keyboard operation of the core triage loop | Drives the speed principle and creates switching cost |
| G5 | Admin can go from signup to first reply in under fifteen minutes | Determines trial conversion |

### 3.2 Non-goals for v1

| # | Non-goal | Reasoning |
|---|---|---|
| N1 | Voice or phone channel | Different infrastructure, different product. Revisit post launch |
| N2 | Full CRM functionality | We store contact properties, we are not the system of record |
| N3 | Customer facing portal with ticket history login | Email and chat cover the need for the target segment |
| N4 | AI that executes account actions such as refunds or cancellations | Deliberate safety position, not a scope cut |
| N5 | Native mobile applications | Responsive web first. Native apps only if usage data demands it |
| N6 | Multi language UI | English UI in v1. The AI handles multi language customer content |
| N7 | On premise deployment | Cloud only |

---

## 4. Success metrics

### 4.1 Product health

| Metric | Definition | v1 target |
|---|---|---|
| Time to first reply (onboarding) | Signup to first customer reply sent | Under 15 minutes, median |
| Weekly active agents | Agents sending at least one reply per week | 80% of seats |
| Keyboard adoption | Share of triage actions performed via keyboard rather than mouse | 40% by day 30 |
| Search to result | p95 latency for global search | Under 400ms |
| List interaction latency | p95 for row navigation, selection, and open | Under 100ms |

### 4.2 AI adoption and trust

These are the metrics that determine whether the AI investment paid off. Track each per workspace.

| Metric | Definition | v1 target |
|---|---|---|
| AI kept enabled at day 30 | Workspaces with at least one AI feature still on | 70% |
| Summary usefulness | Thumbs up rate on AI summaries | 75% positive |
| Auto Draft acceptance | Drafts sent with under 30% of text edited | 40% |
| Auto Tag acceptance | Suggested tags accepted rather than rejected | 80% |
| Auto Assign retention | AI assignments not overridden by a human within 1 hour | 85% |
| Predicted CSAT accuracy | Predictions matching the eventual actual rating | 70% |

**Promotion gates.** Auto Tag and Auto Assign only ship an auto apply mode once the acceptance metric holds above 70% for 30 consecutive days in production. Below that they remain suggestion only.

### 4.3 Customer outcome metrics

| Metric | Definition |
|---|---|
| First response time | Time from customer message to first human reply. Auto acknowledgements do not count |
| Resolution time | Time from conversation creation to closed |
| Resolved on first reply | Share of conversations closed after exactly one agent reply |
| Happiness score | Percentage of Great ratings minus percentage of Not good ratings, NPS style |
| SLA attainment | Share of conversations meeting their policy target |

---

## 5. Scope and release plan

### 5.1 Phase 1: usable helpdesk

**Goal.** A team can fully replace their shared inbox. No AI yet.

| Item | Description |
|---|---|
| Project foundation | Vite scaffold, feature sliced architecture, design tokens, MSW mock layer, sanitized iframe renderer |
| Authentication | Login, forgot password, signup |
| Workspace dashboard | Inbox cards with live counts, knowledge base cards |
| Conversation list | Virtualized 72px rows, folders, saved views, bulk actions, keyboard navigation |
| Conversation detail | Threaded messages with the provenance rail, collision detection, customer sidebar |
| Composer | Reply and note modes, saved replies, slash commands, split send, undo send |
| New conversation | Outbound composer |

**Exit criteria.** An agent can receive, triage, reply to, and close a conversation entirely by keyboard. Two agents cannot silently collide. List latency p95 under 100ms with 5,000 conversations loaded.

### 5.2 Phase 2: organization and self service

| Item | Description |
|---|---|
| Contacts | Searchable contact table, contact profile with history and custom properties |
| Knowledge base | Collections, categories, article editor, draft and publish, SEO fields |
| Workspace objects | Saved replies, tags, custom fields |
| Global search | Filtered search across conversations, contacts, and docs |
| Onboarding | First run stepper, shortcut cheat sheet, empty states |

**Exit criteria.** An admin completes setup unaided. Agents insert a knowledge base article into a reply without leaving the composer.

### 5.3 Phase 3: the AI layer

Built in this order deliberately. Each feature earns the trust the next one needs.

| Order | Feature | Why this position |
|---|---|---|
| 1 | AI Ticket Summary | Read only, zero risk, immediate daily value |
| 2 | Auto Tag (suggest only) | Low stakes, builds the suggestion interaction pattern |
| 3 | Auto Assign (suggest only) | Higher stakes, reuses the now familiar pattern |
| 4 | Auto Draft | The highest value and highest risk feature. Ships only after agents already trust AI suggestions |
| 5 | Predicted Satisfaction | Requires historical rating data to calibrate against |
| 6 | Response Evaluation | Requires draft and reply volume to sample from |

**Exit criteria.** Every AI feature has a visible acceptance metric in its settings page. No auto apply mode is enabled by default.

### 5.4 Phase 4: automation and channels

| Item | Description |
|---|---|
| Workflow builder | Four step wizard, Match ALL or ANY conditions, ordered actions |
| SLA management | Policies, per priority targets, business hours clock, live countdown badges, escalation |
| Routing | Round robin, load balanced, AI assisted, manual |
| Channel connections | Email, live chat widget, Instagram, Messenger, SMS, WhatsApp with OAuth and scope disclosure |
| Inbox settings | Edit inbox, permissions, outgoing email with DKIM and DMARC, auto reply |

**Exit criteria.** A lead defines an SLA policy without documentation. Breach countdowns are visible in the list and header.

### 5.5 Phase 5: agent and analytics

| Item | Description |
|---|---|
| AI Agent | Landing, three step setup wizard, knowledge sources, guardrails, test console, management |
| Reports | All channels, Email, Happiness, Company, AI, Satisfaction |

**Exit criteria.** An admin configures and launches a customer facing AI agent in under ten minutes. Every report exports to CSV and supports compare to previous period.

---

## 6. Functional requirements

### 6.1 Conversation management

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | Conversations arrive into an inbox from a connected channel and appear in the Unassigned folder by default | Must |
| FR-1.2 | Each conversation has exactly one status: Active, Pending, Closed, or Spam | Must |
| FR-1.3 | Each conversation has exactly one priority: Urgent, High, Normal, or Low, defaulting to Normal | Must |
| FR-1.4 | A conversation may be assigned to exactly zero or one agent | Must |
| FR-1.5 | A conversation may carry zero or more tags | Must |
| FR-1.6 | System folders are computed, not stored: Chats, Unassigned, Mine, Drafts, Needs Attention, Assigned, Closed, Spam | Must |
| FR-1.7 | Users can create saved views with Match ALL or Match ANY filter logic, scoped private or shared | Must |
| FR-1.8 | The list supports multi select with bulk assign, status, tag, snooze, move, and delete | Must |
| FR-1.9 | The list virtualizes and supports infinite scroll without a visible loading jump | Must |
| FR-1.10 | Row density is user switchable between 72px and 84px and persists per user | Should |
| FR-1.11 | Conversations can be merged, moved between inboxes, and snoozed to a future time | Should |

### 6.2 Collision prevention

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | When a teammate is viewing a conversation, show their avatar with a yellow ring in the list and header | Must |
| FR-2.2 | When a teammate is actively composing, escalate to a red ring and a banner in the conversation | Must |
| FR-2.3 | If the conversation changes while an agent is composing, block the send, preserve the draft, and surface a review state | Must |
| FR-2.4 | Blocked sends route the conversation into the Needs Attention folder | Must |

### 6.3 Composer

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Two visually distinct modes: Reply (customer visible) and Note (internal only) | Must |
| FR-3.2 | Note mode is unmistakable: amber background and amber provenance rail | Must |
| FR-3.3 | Slash commands insert saved replies, knowledge base articles, variables, and attachments | Must |
| FR-3.4 | Merge fields support fallback syntax, for example `{%customer.firstName,fallback=there%}` | Must |
| FR-3.5 | Split send offers Send, Send and close, Send and snooze, and Send later | Must |
| FR-3.6 | Undo send is available for six seconds after send | Must |
| FR-3.7 | Drafts persist across page reload and are recoverable | Must |
| FR-3.8 | Attachments validate MIME type and size and reject executables | Must |

### 6.4 AI features

Each requirement below applies in addition to the AI safety requirements in section 7.

#### 6.4.1 AI Ticket Summary

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Renders in the conversation right sidebar, pinned above all other panels | Must |
| FR-4.2 | Structured output: TL;DR bullets, Customer wants, Already tried, Blocked on, Suggested next step, sentiment badge | Must |
| FR-4.3 | Auto generates when a thread exceeds four messages; otherwise offers a manual generate button | Must |
| FR-4.4 | Regenerable at any time, including on a fresh summary | Must |
| FR-4.5 | Staleness derived by comparing the conversation's last message id to the summary's source message id | Must |
| FR-4.6 | A stale summary remains visible and dimmed with a refresh prompt, rather than disappearing | Must |
| FR-4.7 | Streams progressively as it generates | Should |
| FR-4.8 | Thumbs up and down feedback, with a reason picker on negative | Should |
| FR-4.9 | Can be inserted into the composer as an internal note, requiring a human send | Should |
| FR-4.10 | Below md breakpoint, surfaces as a collapsible bar under the header rather than being lost in a drawer | Must |

#### 6.4.2 Auto Draft

| ID | Requirement | Priority |
|---|---|---|
| FR-4.11 | Invoked explicitly from the composer toolbar, slash menu, or command palette. Never automatic | Must |
| FR-4.12 | Options selected before generation: tone, length, language, use knowledge base, include next steps | Must |
| FR-4.13 | The generated draft renders in a visually distinct state with a violet rail and a review banner | Must |
| FR-4.14 | Displays source citations for every knowledge base article or saved reply used | Must |
| FR-4.15 | When no sources matched, states so explicitly so the agent verifies claims | Must |
| FR-4.16 | Below the configured confidence threshold, one click accept is disabled and an amber warning replaces the banner | Must |
| FR-4.17 | Sending an entirely unedited draft surfaces a non blocking notice, making the choice conscious | Should |
| FR-4.18 | Records model, tone, and edited ratio on the sent message for reporting | Must |

#### 6.4.3 Auto Assign

| ID | Requirement | Priority |
|---|---|---|
| FR-4.19 | Suggests an assignee with a confidence value and an expandable rationale showing weighted signals | Must |
| FR-4.20 | Signals are configurable: skills and tags, resolution history, current workload, availability, language | Must |
| FR-4.21 | Two modes: suggest only (default) and auto apply above a confidence threshold | Must |
| FR-4.22 | Below threshold, conversations remain unassigned for human routing | Must |
| FR-4.23 | Auto applied assignments write an audit event and offer 30 second undo | Must |
| FR-4.24 | Bulk assign shows a per conversation preview with deselect before applying | Must |
| FR-4.25 | Settings display a rolling 30 day retention rate, the promotion gate metric | Must |

#### 6.4.4 Auto Tag

| ID | Requirement | Priority |
|---|---|---|
| FR-4.26 | Suggested tags render as dashed chips distinct from applied tags, with accept and reject affordances | Must |
| FR-4.27 | An allowed tag set is mandatory. The model may only select from it and can never create a tag | Must |
| FR-4.28 | Auto apply cannot be enabled while the allowed tag set is empty | Must |
| FR-4.29 | Optional per tag descriptions improve model accuracy | Should |
| FR-4.30 | A review queue supports bulk acceptance above a confidence threshold | Should |
| FR-4.31 | Settings show per tag acceptance rate over 30 days | Must |

#### 6.4.5 Response Evaluation

| ID | Requirement | Priority |
|---|---|---|
| FR-4.32 | Pre send check scores a draft on accuracy, completeness, tone, clarity, and policy compliance | Must |
| FR-4.33 | Evaluation is advisory. It never blocks or disables send | Must |
| FR-4.34 | Failing criteria highlight the specific text span and offer a proposed fix | Should |
| FR-4.35 | An unanswered customer question is surfaced with visual priority above the numeric score | Must |
| FR-4.36 | A QA dashboard aggregates scores by agent and period with drilldown and CSV export | Must |
| FR-4.37 | Agents can mark disagreement with a reason, feeding calibration | Should |
| FR-4.38 | The dashboard states in visible copy that scores are for coaching, not performance management | Must |

#### 6.4.6 Predicted Satisfaction

| ID | Requirement | Priority |
|---|---|---|
| FR-4.39 | Predicts Great, Okay, or Not good with a confidence value and contributing drivers | Must |
| FR-4.40 | Always labelled as predicted and visually subordinate to any actual rating | Must |
| FR-4.41 | An At risk saved view surfaces open conversations predicted to end badly | Must |
| FR-4.42 | The satisfaction report includes a calibration panel comparing predictions to actual outcomes | Must |
| FR-4.43 | Predicted scores never appear in agent performance rankings. Only actual ratings do | Must |
| FR-4.44 | Visibility is configurable between all agents and leads only | Should |

#### 6.4.7 AI Agent (customer facing)

| ID | Requirement | Priority |
|---|---|---|
| FR-4.45 | Three step setup: knowledge sources, identity, test and launch | Must |
| FR-4.46 | Knowledge sources: website crawl, manual snippets, and existing knowledge base collections | Must |
| FR-4.47 | Remains in draft and invisible to customers until explicitly launched | Must |
| FR-4.48 | Escalates to a human on low confidence, repeated questions, or restricted topics | Must |
| FR-4.49 | Escalation carries the full transcript plus an AI summary into the human inbox | Must |
| FR-4.50 | Answers questions only. Never executes account actions such as refunds or cancellations | Must |
| FR-4.51 | A test console is available before and after launch | Must |

### 6.5 SLA management

| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | Policies define first response and resolution targets per priority level | Must |
| FR-5.2 | Policies apply to conversations matching a Match ALL or ANY condition set | Must |
| FR-5.3 | Clock is selectable between business hours and calendar (24/7) | Must |
| FR-5.4 | SLA may pause while awaiting a customer reply | Should |
| FR-5.5 | A live countdown renders in the list and conversation header, transitioning through muted, warning, and danger | Must |
| FR-5.6 | Breached conversations show a distinct state with overdue duration | Must |
| FR-5.7 | Escalation actions fire at risk and on breach: notify, reassign, tag | Should |

### 6.6 Channels

| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | Supported channels: email, live chat widget, Instagram, Messenger, SMS, WhatsApp | Must |
| FR-6.2 | Connection uses OAuth with the requested scopes disclosed before redirect | Must |
| FR-6.3 | Connected channels display account, connection date, granted scopes, and last sync | Must |
| FR-6.4 | Disconnection requires explicit confirmation | Must |
| FR-6.5 | WhatsApp and SMS surface the 24 hour service window and template message constraints in plain language | Must |
| FR-6.6 | Unsupported channels display a Coming soon state rather than being hidden | Should |

### 6.7 Reporting

| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | Six reports: All channels, Email, Happiness, Company, AI, Satisfaction | Must |
| FR-7.2 | Every report supports a custom date range and compare to previous period | Must |
| FR-7.3 | Every report exports to CSV | Must |
| FR-7.4 | Time based metrics offer a business hours toggle | Must |
| FR-7.5 | Happiness score computes as percentage Great minus percentage Not good | Must |
| FR-7.6 | Rating coverage is stated alongside any satisfaction figure | Must |
| FR-7.7 | Reports can be saved as custom views | Should |

---

## 7. AI safety requirements

These are hard requirements, not guidelines. A violation is a release blocker.

| ID | Requirement |
|---|---|
| AI-1 | No AI generated content is delivered to a customer without an explicit human send action. There is no configuration that changes this |
| AI-2 | All customer authored content passed to a model is wrapped in delimited, labelled blocks and treated as data. Instructions found inside it are ignored |
| AI-3 | When an injection attempt is detected, the UI states that instructions were ignored rather than hiding the event |
| AI-4 | Every AI action that changes state writes an audit event and offers undo |
| AI-5 | AI generated and AI proposed content uses the reserved violet accent and sparkle marker and is never styled ad hoc |
| AI-6 | Internal AI artifacts (summaries, predicted satisfaction, quality scores) are never exposed in any customer facing surface |
| AI-7 | Auto apply modes default to off and are gated behind a configurable confidence threshold |
| AI-8 | Auto Tag can only select from an explicitly configured allowed tag set |
| AI-9 | The AI Agent has no capability to execute account actions. It answers and escalates only |
| AI-10 | Every AI feature degrades gracefully. Model failure never blocks the underlying workflow |
| AI-11 | A workspace level kill switch disables all AI features and produces a calm disabled state, not errors |

---

## 8. Non-functional requirements

### 8.1 Performance

| ID | Requirement |
|---|---|
| NFR-1.1 | List interaction (navigate, select, open) p95 under 100ms |
| NFR-1.2 | Conversation open to interactive p95 under 300ms |
| NFR-1.3 | Global search first result p95 under 400ms |
| NFR-1.4 | Lists over 100 items are virtualized |
| NFR-1.5 | All mutations are optimistic with rollback on failure |
| NFR-1.6 | Initial bundle under 250KB gzipped, with route level code splitting |

### 8.2 Security

| ID | Requirement |
|---|---|
| NFR-2.1 | Untrusted HTML renders only through a single shared component that sanitizes with DOMPurify and mounts in a sandboxed iframe without `allow-same-origin` and without `allow-scripts` |
| NFR-2.2 | `dangerouslySetInnerHTML` is forbidden outside that component, enforced by lint |
| NFR-2.3 | Remote images and external stylesheets in email bodies are blocked by default, with per message opt in. Tracking pixels are stripped |
| NFR-2.4 | URL schemes are allowlisted to http, https, and mailto. External links carry `rel="noopener noreferrer"` |
| NFR-2.5 | Auth tokens are never stored in localStorage. httpOnly, Secure, SameSite cookies only |
| NFR-2.6 | No secrets or model keys exist in client code or the bundle |
| NFR-2.7 | Every API response is parsed with zod before entering application state |
| NFR-2.8 | Authorization is enforced server side. Client permission checks are UX only |
| NFR-2.9 | File uploads validate extension and MIME, cap size, and block executables |
| NFR-2.10 | Message bodies, tokens, and PII are never written to logs or analytics |
| NFR-2.11 | A Content Security Policy is enforced in production |

### 8.3 Accessibility

| ID | Requirement |
|---|---|
| NFR-3.1 | WCAG 2.1 AA contrast on all text and meaningful UI |
| NFR-3.2 | Every interactive element is keyboard reachable with a visible focus indicator |
| NFR-3.3 | The conversation list uses a listbox pattern with roving tabindex |
| NFR-3.4 | New inbound messages announce through a polite live region |
| NFR-3.5 | Icon only controls carry both an accessible label and a tooltip |
| NFR-3.6 | `prefers-reduced-motion` disables transforms, retaining opacity transitions only |
| NFR-3.7 | Minimum type size is 11px, reserved for keyboard chips and micro labels |

### 8.4 Compatibility

| ID | Requirement |
|---|---|
| NFR-4.1 | Latest two major versions of Chrome, Edge, Firefox, and Safari |
| NFR-4.2 | Responsive from 360px to ultrawide. Full triage capability at tablet width |
| NFR-4.3 | Light and dark themes, honoring system preference on first load |

---

## 9. Design system

### 9.1 Signature element: the provenance rail

Every authored content block carries a 3px left rail whose color encodes origin.

| Origin | Rail |
|---|---|
| Customer message | Neutral border |
| Agent reply | Brand accent |
| Internal note | Amber |
| AI generated or proposed | Violet |
| System event | No rail, compact centered line |

No other left rail treatment may be introduced, as it would dilute the signal. This device exists specifically to prevent the product's worst failure mode.

### 9.2 Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | `222 24% 11%` | `210 20% 96%` | Ink buttons, high contrast |
| `--accent-brand` | `222 89% 55%` | `218 92% 66%` | Links, active nav, focus, the bolt mark |
| `--ai` | `268 74% 58%` | same | AI content only, never anything else |
| Note amber | `hsl(45 96% 91%)` | `hsl(42 88% 18% / 0.4)` | Internal notes |
| success | `152 62% 40%` | | |
| warning | `38 92% 50%` | | |
| danger | `0 72% 51%` | | Needs Attention counts, SLA breach |

Three accent colors, three meanings, no overlap. Ink primary buttons keep a dense interface calm and leave violet unambiguously owned by AI.

### 9.3 Typography

| Face | Use |
|---|---|
| IBM Plex Sans | All UI chrome and human content |
| IBM Plex Mono | Machine data only: ticket numbers, SLA countdowns, counts, percentages, confidence values, KPI figures, `<kbd>` keys |
| Instrument Serif | Exactly two places at 36px: the AI Agent landing headline and the SLA zero state headline |

If it is monospaced, a machine produced it or it is a precise quantity. This is a structural signal, not decoration.

| Size | Application |
|---|---|
| 14px | Base UI text (root), line height 1.5 |
| 15px | Nav labels, list subjects, message bodies (line height 1.6), composer text |
| 13px | Secondary text, dense controls, table cells, mono metadata |
| 12px | Uppercase section labels, status chips, inline tooltips |
| 11px | `<kbd>` chips and micro labels. Hard floor |
| 16 / 18 / 20 / 24px | Headings, tracking −0.01em to −0.015em |
| 26px | Mono, KPI figures |
| 36px | Serif, the two zero state headlines |

Fonts are self hosted in production via `@fontsource` with no external CDN calls, consistent with the CSP. The Google Fonts CDN is acceptable in throwaway artifacts and previews.

### 9.4 Density anchors

| Element | Height |
|---|---|
| Top bar | 56px |
| Sidebar rows | 40px |
| Conversation rows | 72px default, 84px comfortable (persisted per user) |
| Reading pane | 760px max width |

Rows are separated by 1px borders, not gaps. No card inside a card. App chrome is full width.

The 72px conversation row supports a three line anatomy: identity and metadata, subject, then snippet with tags. This is a deliberate trade of raw row count for scannability, since the row must carry an SLA countdown, a satisfaction indicator, and tag chips alongside the core content.

---

## 10. Technical architecture

### 10.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 18 + Vite + TypeScript strict | SPA behind login. No SEO requirement, so no meta framework |
| Routing | React Router (`createBrowserRouter`) | Explicitly not Next.js |
| Styling | Tailwind CSS + shadcn/ui | Owned components, no runtime theme dependency |
| Server state | TanStack Query | Optimistic updates and cache invalidation are core to the speed principle |
| UI state | Zustand | Lightweight, no provider nesting |
| Forms | react-hook-form + zod | Zod schemas double as API response validators |
| Rich text | Tiptap | Composer and knowledge base editor |
| Charts | Recharts | Reporting |
| Command palette | cmdk | Keyboard first requirement |
| Virtualization | @tanstack/react-virtual | List performance requirement |
| Mocking | MSW | Frontend developed against a mock layer before the API exists |

### 10.2 Architecture contract

Feature sliced. Each feature exposes a single public barrel.

```
src/
  app/            router, providers, error boundary, query client
  components/ui/  shadcn primitives only
  components/     shared cross feature composites
  features/       auth, inbox, conversations, composer, contacts, docs,
                  reports, automation, ai, channels, settings
    api/          typed requests plus zod schemas
    components/   feature local UI
    hooks/        data and behavior hooks
    types.ts      feature domain types
    index.ts      public barrel, the only cross feature import surface
  hooks/          global hooks
  lib/            api client, sanitize, permissions, format, ai helpers
  types/          shared domain types
  mocks/          MSW handlers and seed data
```

A feature may import from `@/components`, `@/hooks`, `@/lib`, `@/types`, and from another feature only through its `index.ts`. Reaching into another feature's internals is forbidden. No circular imports.

### 10.3 Engineering standards

- TypeScript strict. No `any`, no non null assertions, no `@ts-ignore`. Variant state uses discriminated unions.
- Components under roughly 200 lines, hooks under roughly 100. A component renders or orchestrates, never both.
- Presentational components take props and do no data fetching.
- Every list key is a stable domain id, never an array index.
- Every async surface implements loading, empty, error, and populated explicitly.
- Vitest and React Testing Library for hooks and non trivial components. Playwright for flow happy paths.
- ESLint with typescript-eslint, react-hooks, and jsx-a11y. Prettier. Conventional Commits.

---

## 11. Data model

Core entities and their relationships.

| Entity | Key relationships |
|---|---|
| `User` | Belongs to workspace, has role, skills, availability, open count |
| `Inbox` | Has many Channels, has computed folder counts |
| `Channel` | Belongs to Inbox, typed by ChannelType, holds OAuth scopes |
| `Contact` | Aggregates conversations across inboxes, holds custom properties |
| `Conversation` | Belongs to Inbox and Contact, has status, priority, assignee, tags, SLA state, AI state |
| `Message` | Belongs to Conversation, typed customer, reply, note, system, or ai_event |
| `AiSummary` | One per Conversation, carries `sourceLastMessageId` for staleness derivation |
| `AiSuggestion` | Many per Conversation, typed assign, tag, or priority, with confidence and rationale |
| `Evaluation` | Scores a Message across five criteria |
| `PredictedSatisfaction` | Embedded on Conversation, reconciled against actual rating |
| `AiAgent` | Has many KnowledgeSources, guardrails, deployment channels |
| `Workflow`, `SlaPolicy`, `View` | Share a common Condition structure |
| `Collection`, `Article` | Knowledge base hierarchy |

Full TypeScript definitions and seed data are in the build specification, section 24.

---

## 12. Risks and mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Agents disable AI after a bad output | Loses the primary differentiator | High | Suggestion first architecture, confidence gating, visible acceptance metrics, no auto send under any configuration |
| Prompt injection through customer email | Reputational and security | Medium | Delimited untrusted data blocks, human in the loop as the actual control, visible ignored instruction notices |
| Predicted satisfaction used punitively against agents | Destroys team trust, drives churn | Medium | Excluded from performance rankings by requirement, lead only visibility option, explicit UI copy on intent |
| Perceived slowness at scale | Undermines the core positioning | Medium | Virtualization, optimistic updates, a hard 100ms budget treated as a bug threshold |
| Scope creep in reporting | Delays launch | High | Six defined reports. Custom report builder is explicitly post v1 |
| Channel OAuth complexity, particularly WhatsApp | Blocks a phase 4 deliverable | High | Email and chat ship first. Messaging channels sequenced last within the phase |
| Knowledge base editor quality | Repeats the incumbent's most cited complaint | Medium | Tiptap with a distraction free surface, treated as a phase 2 exit criterion |

---

## 13. Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | Pricing model for AI Agent: per resolution, or bundled into seats? | Product | Phase 5 |
| Q2 | Do we need per agent AI feature opt out, or is workspace level sufficient? | Product | Phase 3 |
| Q3 | Data retention policy for AI artifacts such as summaries and evaluations | Legal | Phase 3 |
| Q4 | Which model provider and does it need to be configurable per workspace for enterprise? | Engineering | Phase 3 |
| Q5 | Is live chat a phase 1 channel or phase 4? Affects the widget build | Product | Phase 1 |
| Q6 | Do we support custom domains for the public knowledge base in v1? | Product | Phase 2 |

---

## 14. Appendix

### 14.1 Keyboard shortcut map

**Global.** Command palette `Cmd+K`. Search `/`. Help `?`. Compose `C`. Navigation `G` then `I` / `D` / `R` / `C` / `A` / `H`.

**Conversation list.** Move `J` / `K`. Select `X` or `Space`. Open `Enter`. Select all `*` then `A`. Select none `*` then `N`. Assign `A`. Status `S` then `A` / `P` / `C` / `X`. Tag `T`. Snooze `H`. Delete `D`. Move `M`. Edit draft `E`.

**Conversation.** Reply `R`. Note `N`. Forward `F`. Assign `A`. Snooze `H`. Tag `T`. Status `S`. Undo send `Z`. Previous and next `K` / `J`. Regenerate summary `Cmd+Shift+U`.

**Composer.** Send `Cmd+Enter`. Draft with AI `Cmd+Shift+G`. Check reply `Cmd+Shift+E`. Save draft `Cmd+Shift+D`. Saved replies `Cmd+Shift+S`. Docs search `Cmd+/`. Cc `Cmd+Shift+C`. Bcc `Cmd+Shift+B`. Bold `Cmd+B`. Italic `Cmd+I`. Link `Cmd+K` in editor context. Discard `Esc`.

`Cmd+K` is context aware: inside a rich text editor it inserts a link, everywhere else it opens the palette.

### 14.2 Competitive positioning

| Capability | Help Scout | Front | Freshdesk | BoltSupport |
|---|---|---|---|---|
| Shared inbox and collision detection | Strong | Strong | Adequate | Strong |
| Native SLA management | Absent | Limited | Strong | Strong |
| Keyboard first operation | Partial | Strong | Weak | Strong |
| Knowledge base editor quality | Widely criticised | Adequate | Adequate | Priority |
| AI with human in the loop | Emerging | Emerging | Aggressive | Core position |
| Reporting depth | Criticised as shallow | Adequate | Strong | Six reports with export |
| Setup time for a small team | Fast | Moderate | Slow | Under 15 minutes target |

### 14.3 Referenced documents

- **BoltSupport Claude Design Prompt Package**: the full build specification containing the context block, twenty one screen specifications, component inventory, routing map, and domain model
- **BoltSupport Ready-to-Paste Prompts**: the same screen specifications with the context block pre-injected into each, for direct use in a generation tool
