---
target: frontend/src/app/page.tsx
total_score: 21
p0_count: 1
p1_count: 2
timestamp: 2026-07-22T03-28-56Z
slug: frontend-src-app-page-tsx
---
# Critique Report: Skeevo Dashboard UI

Method: dual-agent (A: 69cbc53c-92be-4d4a-84be-5fc098229c22 · B: 27afe210-8263-4f8d-a363-e509d86f9b4f)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Header status static ("Whatsapp online") while cards track dynamic status |
| 2 | Match System / Real World | 3/4 | Clean CRM concepts (Leads, Pipeline, Conversão) in pt-BR |
| 3 | User Control and Freedom | 2/4 | No search/filters, no way to pause polling or sort columns |
| 4 | Consistency and Standards | 2/4 | Native browser `alert()` and `confirm()` used instead of Shadcn Toast/Dialog |
| 5 | Error Prevention | 2/4 | Disconnection confirmation exists, but session starting lacks debounce |
| 6 | Recognition Rather Than Recall | 3/4 | Clear stage labels; full messages truncated without inline preview |
| 7 | Flexibility and Efficiency | 1/4 | No table search, status filtering, or batch actions |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean Shadcn layout, but redundant status widgets and scrollbars |
| 9 | Error Recovery | 1/4 | Generic alert error messages without recovery guidance |
| 10 | Help and Documentation | 2/4 | QR scan instructions included, but no tooltips for conversion metrics |
| **Total** | | **21/40** | **Acceptable** |

## Anti-Patterns Verdict

- **LLM Assessment**: Found redundant status indicators between header and dashboard cards, raw browser native dialogs (`alert`/`confirm`), and hardcoded backend API URLs (`http://localhost:8000`).
- **Deterministic Scan**: Detector (`detect.mjs`) returned 0 violations (`[]`), confirming clean code structure without gradient text or side-tab tells.

## Overall Impression

A clean, modern Shadcn React application with clear metric hierarchy and strong domain relevance (CRM leads, pipeline stages). However, hardcoded endpoints, contradictory status indicators (static vs dynamic), and native browser alert dialogs compromise user experience and production resilience.

## What's Working

1. **Clean Component Architecture**: Well-structured separation between dashboard metrics, Recharts visual charts, setup wizard, and data table.
2. **Dynamic Kanban Color Synchronization**: Recharts donut slices and pipeline progress bars gracefully adapt to user-configured Kanban column colors.
3. **Scannable Micro-Metrics**: Clear visual hierarchy on key metric cards with contrasting icon badges.

## Priority Issues

- **[P0] Hardcoded API Endpoints & Uncoordinated Dual Polling**: `http://localhost:8000` is hardcoded across files; independent 8s and 3.5s interval timers cause uncoordinated re-renders. (Suggested: `/impeccable harden`)
- **[P1] Contradictory Header Status Display**: `SiteHeader.tsx` displays static "Whatsapp online" with a green pulse even when disconnected. (Suggested: `/impeccable clarify`)
- **[P1] Native Browser Dialogs (`alert`/`confirm`)**: `WahaConnectionWizard` uses browser `alert()` and `confirm()` for errors and disconnection. (Suggested: `/impeccable polish`)
- **[P2] Hardcoded Colors & Rigid Container Heights**: Fixed heights like `max-h-[300px]` and raw Tailwind color utilities (`text-green-600`) bypass design tokens. (Suggested: `/impeccable layout`)
- **[P3] Restricted Table Interactivity & Accessibility**: `RecentLeadsTable` lacks search, stage filters, or expandable message popovers. (Suggested: `/impeccable adapt`)

## Persona Red Flags

- **Alex (Power User)**: Cannot filter leads, search by phone, or export dashboard metrics.
- **Jordan (First-Timer)**: Confused by contradictory WhatsApp status indicators (Header claims online while Wizard asks to scan QR); startled by native browser `alert()` popups.
- **Sam (Accessibility-Dependent)**: Color-only status indicators; no `aria-live` for QR updates.
- **Casey (Mobile User)**: Nested scrollbars in charts on small screens; message truncation without expand affordance.

## Minor Observations & Provocative Questions

- **Minor**: Inline `<Select>` in card header can overflow if column label is long.
- **Question**: Should `WahaConnectionWizard` remain as a full card on the main dashboard or be moved to a settings page with only a banner when disconnected?
- **Question**: Would WebSockets or Server-Sent Events (SSE) reduce server load by >80% compared to short polling?
