# PP-042: Dashboard UX & design kit review

**Status:** 🎨 Designer handoff ready
**Priority:** P1  
**Phase:** 3 — Brand & polish  
**Created:** 2026-07-11  
**Depends on:** PP-040, PP-041  
**Blocks:** —

---

## Product goals (user-confirmed)

1. **Add to inventory** — scan barcode or manually add item, fast
2. **View inventory** — see what's on hand at a glance
3. **Shopping list** — auto-generated from per-category qty thresholds (already built)

Everything else is secondary and should not compete with these three jobs on first open.

---

## Current problems

| Area | Issue |
|------|-------|
| IA | Two homes: `/dashboard/` (overview) vs `/dashboard/inventory/` (real list) |
| Density | Home stacks stats, filters, previews, categories, activity, inline add |
| Duplication | Add/scan appear 3+ times (quick bar, inventory toolbar, inline add) |
| Nav | 4 tabs (Dashboard, Inventory, Shopping, Ledger) — Ledger rarely needed |
| Visual noise | Emoji icons, multiple card styles, competing CTAs |
| Placeholder stats | Expiring/Expired always 0 but still shown |
| Auth bug | Inventory 401 on load — **fixed** (`fc48110`) |

---

## Designer deliverables

### 1. Information architecture (streamline)

**Recommended nav (3 tabs):**

| Tab | Default? | Purpose |
|-----|----------|---------|
| **Pantry** | ✅ Yes | Inventory list + add/scan hero |
| **Shopping** | | Threshold-based list + settings |
| **Account** | | Profile, thresholds, subscription, ledger (demoted) |

- Remove standalone "Dashboard" tab — merge into Pantry
- Demote Ledger to Account or overflow menu
- Receipt scan, voice, session history → secondary / Pro menu

### 2. Pantry screen wireframe (mobile-first)

```
┌─────────────────────────────────┐
│  Pantry Hub          [avatar]   │
├─────────────────────────────────┤
│  ┌───────────┐ ┌──────────────┐ │
│  │ Scan item │ │ Add manually │ │  ← Goal 1, equal prominence
│  └───────────┘ └──────────────┘ │
│  🔍 Search items...             │  ← Goal 2
│  [All] [Low ●] [Out]   Sort ▾   │
├─────────────────────────────────┤
│  Milk        2 cartons    − +   │
│  Eggs        12           − +   │
│  Rice        0      LOW   − +   │
│  ...                            │
└─────────────────────────────────┘
│  Pantry  │ Shopping │ Account   │  ← bottom nav
```

### 3. Shopping screen wireframe

```
┌─────────────────────────────────┐
│  Shopping list        [⚙ thresholds] │
├─────────────────────────────────┤
│  Auto-generated from low stock      │
│  ☐ Milk — need 2 (have 1)          │
│  ☐ Eggs — out of stock             │
│  ☐ Rice — need 2 (have 0)          │
├─────────────────────────────────┤
│  [ Regenerate ]  [ Share ]          │
└─────────────────────────────────┘
```

Threshold settings: per-category defaults (produce 3, pantry 2, etc.) — already in code, needs cleaner UI.

### 4. Design kit upgrade (playbook-aligned, light greens + oranges)

**Keep light mode** (Pantry Hub is consumer/home, not ShipInADay dark glass).

#### Color tokens (extend `globals.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--background` | `#f8fafc` | Page bg (existing) |
| `--foreground` | `#0f172a` | Text (existing) |
| `--primary` | `#059669` | Primary actions, nav active (emerald-600) |
| `--primary-light` | `#d1fae5` | Selected states, badges |
| `--accent` | `#f59e0b` | Low-stock warnings, upgrade CTA (amber-500) |
| `--accent-light` | `#fef3c7` | Low-stock row highlight |
| `--muted` | `#64748b` | Secondary text |
| `--border` | `#e2e8f0` | Cards, dividers |
| `--surface` | `#ffffff` | Card backgrounds |
| `--danger` | `#f43f5e` | Out of stock, errors |

#### Typography (existing)

- **Sans:** Inter (`--font-sans`) — UI, lists, buttons
- **Serif:** Lora (`--font-serif`) — marketing headings only, not dashboard

#### Component patterns (from ShipInADay playbooks, adapted light)

| Component | Spec |
|-----------|------|
| **Primary button** | `bg-primary text-white rounded-xl px-4 py-3 font-semibold` |
| **Secondary button** | `border border-border bg-surface text-foreground rounded-xl` |
| **Accent button** | `bg-accent text-white` — upgrade, low-stock alerts only |
| **Card** | `bg-surface border border-border rounded-2xl shadow-sm` — no glassmorphism |
| **Nav (mobile)** | Bottom fixed, 3 items, active = `text-primary bg-primary-light` |
| **Nav (desktop)** | Top bar, same links horizontal |
| **Status badge** | Low = `accent-light` + `accent` text; Out = `slate-100` + muted |
| **FAB** | Remove — replace with two hero buttons at top |

#### Iconography

- Replace emoji nav/icons with **Lucide** or **Heroicons** (outline, 20px)
- Category icons: optional small colored dots or single-letter chips, not emoji grids

#### Spacing scale

- Page padding: `px-4 sm:px-6`
- Section gap: `space-y-4` (tighter than current `space-y-6`)
- Card padding: `p-4` (not `p-6` on mobile)

### 5. What to remove or demote

| Remove from primary view | Move to |
|--------------------------|---------|
| Stat card row (5 cards) | Filter chips: All / Low / Out |
| Category pills grid | Inventory filter dropdown |
| Recent activity feed | Account → Activity (or drop) |
| Inline quick-add at bottom | Hero "Add manually" button |
| Voice assistant | Pro features menu |
| Receipt scan on home | Inventory overflow menu |
| Table/card view toggle | Pick one default (list rows mobile) |
| Separate Dashboard tab | Eliminate |

### 6. Success criteria

- [ ] User can scan or add within **1 tap** from default landing
- [ ] Inventory list visible **without scrolling** past hero on mobile (≤5 items)
- [ ] Shopping list shows threshold-based items with clear "why it's here"
- [ ] Nav has **≤3 primary destinations**
- [ ] No emoji in nav or primary actions
- [ ] Design tokens documented in `globals.css` + Storybook or reference page
- [ ] Matches marketing site palette (emerald + amber, light bg)

---

## Reference files

- `frontend/app/globals.css` — current tokens
- `frontend/components/dashboard/views/dashboard-home.tsx` — to deprecate/merge
- `frontend/components/dashboard/views/inventory-view.tsx` — merge target
- `frontend/components/dashboard/views/shopping-list-view.tsx` — goal 3
- `frontend/contexts/pantry-provider.tsx` — `generateShoppingList`, `thresholdConfig`
- `shipinaday/playbooks/templates/components-ui/` — nav/footer patterns
- `shipinaday/playbooks/baseline/src/app/globals.css` — token structure reference

## Handoff package

| Asset | Location |
|-------|----------|
| Full designer brief | `.agents/design/PP-042-designer-handoff.md` |
| Live design kit | https://www.mypantryhub.com/design-system/ |
| CSS tokens | `frontend/app/globals.css` |
| Token constants | `frontend/lib/design-tokens.ts` |
| Component preview page | `frontend/app/design-system/page.tsx` |

## Log

- 2026-07-11: Ticket created from user goals 1–3 + playbook design kit guidance
- 2026-07-11: Designer handoff package + live `/design-system/` reference page