# PP-159: Replace native browser dialogs with in-app confirm and toasts

**Status:** 📋 Open
**Priority:** P2
**Phase:** User-reported bugs
**Created:** 2026-11-23
**Updated:** 2026-11-23, 2:17 PM America/Chicago
**Depends on:** —
**Blocks:** —
**Source:** Tylor, 2026-11-23, ~2:15 PM America/Chicago. Screenshot of the Android Chrome native confirm: “www.mypantryhub.com says: Are you sure you want to clear the entire shopping list? Cancel/OK”, triggered by the “Clear entire list” link on the Shopping list page. Quote: “Also we should not use default alerts boxes like this. Ugly.”

Priority is P2 (UX polish, not a functional break). Shipping now because Tylor just reported it.

---

## Problem

The frontend still uses native `window.confirm` / `window.alert` in several dashboard flows. On mobile Chrome these render as the ugly “www.mypantryhub.com says …” system sheet. Tylor wants them gone everywhere, not just on the shopping-list clear action.

Known call sites (re-verify with `rg` before finishing):

### Confirms (need a styled in-app dialog)

- `frontend/contexts/pantry-provider.tsx` — `clearShoppingList`: “Are you sure you want to clear the entire shopping list?”
- `frontend/components/dashboard/views/recipes-view.tsx` — `handleDelete`: “Are you sure you want to delete this recipe?”
- `frontend/components/dashboard/views/recipe-detail-view.tsx` — `handleDelete`: same copy

### Alerts (should become existing toasts, not a dialog)

`frontend/contexts/pantry-provider.tsx`:

- `addManualShoppingItem`: already in the shopping list
- `copyToClipboard`: empty list; copied successfully (two paths)
- `shareShoppingList`: empty list
- `handleSetToZero`: failed to update item
- `markItemAsBought`: failed to add to inventory
- `handleAddScannedItems`: success count; partial failure with names

Recipe views:

- `recipes-view.tsx` / `recipe-detail-view.tsx` `handleDelete`: “Failed to delete recipe”

No `window.prompt` usages were found. Leave `docs/legacy/vite-spa/App.tsx` alone.

`pantry-provider.tsx` already uses `useToast()` (`success` / `error`) for other inventory actions and mounts `ToastContainer` from the dashboard layout. Reuse that system for every alert. Do not add a second toast stack.

---

## Behavior

Replace every native `confirm` / `alert` / `prompt` in `frontend/` with in-app UI that matches the existing dashboard design.

### Confirm dialog

Add a shared `useConfirm()` hook and provider that returns `Promise<boolean>` so call sites stay close to today’s `if (await confirm(...))` shape. `clearShoppingList` is currently a sync `useCallback` and must become async.

Suggested API (adjust names if a clearer local pattern fits):

```ts
confirm({
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean>
```

Visual language should match existing modals such as `ThresholdSettingsModal`: `fixed inset-0` overlay, `bg-slate-900/50 backdrop-blur-sm`, panel `bg-[var(--surface)] rounded-2xl shadow-2xl`, tokens `--foreground` / `--muted` / `--border` / `--primary`. No new component library.

Requirements:

- Mobile-friendly: full-width-ish panel with comfortable padding, 44px tap targets, works on a phone viewport.
- Destructive actions (`danger: true`, including clear-list and delete-recipe) use a red/rose confirm button. Cancel stays neutral.
- `role="alertdialog"`, labelled by the title, described by the message.
- Focus: move focus into the dialog on open (Cancel is the safer initial focus for destructive actions), trap Tab inside, restore focus to the invoker on close.
- Escape and backdrop click resolve `false` (cancel). Confirm resolves `true` and then runs the existing action.
- Only one confirm at a time.

Copy can stay close to today’s wording. Confirm button labels may be more specific than “OK” (e.g. “Clear list”, “Delete recipe”).

### Alerts → toasts

Swap `alert(...)` for the existing `success` / `error` (or `info`) helpers from `useToast`.

- Success / “copied” / “added N items” → `success(...)`
- Failures and “already in your shopping list” / “Shopping list is empty!” → `error(...)` or `info(...)` as fits
- Recipe delete failures need access to the same toast system. Recipe pages already sit under `PantryProvider`, so `usePantry().success` / `error` is acceptable. A small shared toast provider is also fine if it avoids coupling and does not break the existing dashboard `ToastContainer`.

Do not introduce `window.prompt` replacements unless a new prompt usage appears (none expected).

---

## Tests

Add a focused frontend test for the confirm dialog / `useConfirm` hook (Vitest + Testing Library, same style as `frontend/tests/shopping-list-row.test.tsx`):

- Confirm resolves `true`; cancel, Escape, and backdrop click resolve `false`.
- Destructive confirm button is visually the danger style (class assertion is enough).
- Dialog has the expected accessible name.

If any existing test would hang or fail because `confirm` / `alert` changed, update it. No backend tests required.

Before calling the work done, re-run:

```
rg -n 'window\.(confirm|alert|prompt)|\b(confirm|alert|prompt)\(' frontend
```

Zero matches may remain in `frontend/` (ignore comments/docs). Then:

- `npm run typecheck -w @pantry-pal/frontend`
- `npm run test:run -w @pantry-pal/frontend`
- `npm run build -w @pantry-pal/frontend`

---

## Out of scope

- New npm packages (no Radix, Headless UI, shadcn, sonner, etc.). Tailwind and `lucide-react` are already in `package.json`.
- Backend, Docker, or `docs/legacy/`.
- Commits, pushes, secrets, or dependency changes.
- Redesigning the shopping list or recipe pages beyond dialog/toast replacement.

---

## Acceptance Criteria

- [ ] No `window.confirm`, `window.alert`, or `window.prompt` (or bare `confirm`/`alert`/`prompt(`) remain in `frontend/`.
- [ ] Shared in-app confirm dialog matches existing modal styling, is mobile-friendly, supports Esc/backdrop/focus trap/restore, and uses a red confirm button for destructive actions.
- [ ] `useConfirm()` (or equivalent) returns `Promise<boolean>` and is used at all previous confirm call sites.
- [ ] All previous `alert` call sites use the existing toast system.
- [ ] Frontend typecheck, Vitest, and production build pass.
- [ ] No new dependencies.

