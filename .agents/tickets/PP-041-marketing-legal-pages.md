# PP-041: Marketing pages & legal links audit

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** 3 — Brand & polish  
**Created:** 2026-07-11  
**Depends on:** PP-040  
**Blocks:** —

---

## Audit findings (pre-fix)

| Route / link | Status before |
|--------------|---------------|
| `/` landing | ✅ Working |
| `/pricing/` | ✅ Working (close redirected to `/dashboard/` — fixed → `/`) |
| `/privacy/` | ❌ Missing (footer `href="#"`) |
| `/terms/` | ❌ Missing (footer `href="#"`) |
| Twitter / Instagram footer | ❌ Dead `#` links — removed |
| `info@mypantryhub.com` | ✅ mailto working |
| `/sitemap.xml` | ❌ Missing |
| `/robots.txt` | ❌ Missing |

## Acceptance Criteria

- [x] `/privacy` and `/terms` pages with Peak Collective LLC dba Pantry Hub
- [x] Shared `MarketingFooter` with real links on landing + legal pages
- [x] Middleware public routes for legal pages
- [x] `sitemap.ts` + `robots.ts`
- [x] Remove placeholder social links

## Log

- 2026-07-11: Ticket created; legal pages and footer wired