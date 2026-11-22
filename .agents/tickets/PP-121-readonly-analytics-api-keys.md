# PP-121: Mint read-only analytics API keys for dashboards / Pantry Hub Lead

**Status:** 📋 Open
**Priority:** P2
**Phase:** Analytics / Search Console (audit 2026-11-22)
**Created:** 2026-11-22
**Owner:** Agent for Keychain / CLI steps already documented; Tylor for the one GA4 Viewer click
**Needs Tylor sign-in:** Yes — add the service account as **Viewer** on the GA4 property (no CLI path). gcloud on the Mini is already `thindery@gmail.com`.
**Depends on:** PP-117 (GA4 property and Measurement / property ID)
**Audit:** `.agents/docs/analytics-and-search-console.md`
**Parent:** PP-109 (split)
**Skill:** `web-analytics-api-keys`

---

## Problem

Pantry Hub Lead and any later traffic dashboard need read-only API access to GA4 (and Cloudflare analytics) without putting keys in git, chat, or client code. Bragle already has this pattern in the Mini Keychain; Pantry Hub did not.

## Already done (2026-11-22)

- Cloudflare account-owned token **`pantry-hub-analytics-read`** created with permission group **Account Analytics Read** only, scoped to account Peak Collective LLC (`2132a66da47ec4ed0e976c8eddbaf418`).
- Stored in the Mini macOS Keychain: account `pantry-hub`, service `pantry-hub-cf-analytics-api-token`. Never print the value.
- `GET /accounts/{id}/tokens/verify` with that token returns `active`.
- Note: `GET /accounts/{id}/rum/site_info/list` still returns 403 with this scope (and with the broader account token). Zone analytics / GraphQL may still work; RUM site management likely needs the dashboard or a user-level token. Do not create a wider token unless Tylor says so.
- Follow the Bragle hex gotcha when reading JSON Keychain items: `security find-generic-password -w` can return multi-line JSON **hex-encoded**. The CF token is a single line and should be used as returned.

No pantry-hub GA4 service-account Keychain item exists yet (`pantry-hub-ga4-service-account-json` was checked and is absent).

## Behavior (GA4 reader — still open)

1. Reuse an existing GCP project. Do **not** run `gcloud projects create` (this Google account is at project quota). Prefer `gen-lang-client-0502314230` (name: **Pantry Pal**) or `peak-collective`.
2. On the Mini, following the skill (check every step; do not pipe through `tail`):

```
P=<project>   # prefer gen-lang-client-0502314230
gcloud services enable analyticsdata.googleapis.com iam.googleapis.com --project "$P"
gcloud iam service-accounts create pantry-hub-ga4-reader --display-name="Pantry Hub GA4 reader" --project "$P"
SA=pantry-hub-ga4-reader@$P.iam.gserviceaccount.com
D=$(mktemp -d); gcloud iam service-accounts keys create "$D/k.json" --iam-account "$SA" --project "$P"
security add-generic-password -U -a pantry-hub -s pantry-hub-ga4-service-account-json -w "$(cat "$D/k.json")"
rm -rf "$D"
```

3. **Tylor (no CLI path):** in analytics.google.com → Admin → the Pantry Hub property → Property access management → add `$SA` as **Viewer**.
4. Verify by minting a JWT (scope `analytics.readonly`) and calling `POST https://analyticsdata.googleapis.com/v1beta/properties/<PROPERTY_ID>:runReport`. A 200 with “no rows” is normal on a new tag.
5. Hand off to Pantry Hub Lead: Keychain service names, GCP project id, SA email, GA4 property ID, and the hex gotcha. Never paste key values in chat.

$0 only. Stop if anything asks for billing.

## Acceptance Criteria

- [x] Cloudflare read-only token is in Keychain (`pantry-hub` / `pantry-hub-cf-analytics-api-token`) and verifies `active`
- [ ] GA4 service account exists in a reused GCP project; JSON is in Keychain as `pantry-hub-ga4-service-account-json`
- [ ] Tylor has added the SA as GA4 Viewer
- [ ] A runReport call succeeds (empty rows are OK)
- [ ] No key values are in git, client code, or chat
