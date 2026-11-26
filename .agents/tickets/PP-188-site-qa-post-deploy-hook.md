# PP-188: Run site-qa after every deploy

Priority: P2
Status: ✅ Done (2026-11-26; deploy-script only, no app deploy needed)
Note: renumbered from a duplicate PP-178 (PP-178 is Instacart).
Filed: 2026-11-25 by Grok Bot (site-qa setup)

## Goal
After each production deploy, run the shared live-site QA (sitemap smoke, critical flows, visual diff, broken links) so bugs are caught by automation, not by Tylor or customers. site-qa lives in `/Users/thindery/projects/site-qa` (local repo, read-only against prod; see its README).

## Change
Add as the last step of `deploy/deploy-docker.sh`, after the existing health check passes:

```bash
bash /Users/thindery/projects/site-qa/hooks/post-deploy.sh pantry-hub || echo "site-qa: P0/P1 after deploy — see /Users/thindery/projects/site-qa/BUGS.md"
```

- Waits 20 s, runs QA for site id(s) `pantry-hub`, updates `site-qa/BUGS.md`, exits 2 on P0/P1. It never rolls back.
- Skip on infra-only deploys with `SITE_QA_SKIP=1`.
- After an intended visual redesign: `cd /Users/thindery/projects/site-qa && ./run-qa.sh <id> --update-snapshots` and commit the new baselines there.

## Acceptance
- [x] Deploy script calls the hook; a deploy prints the site-qa summary path.
- [x] A forced failure (stub hook exiting 2: deploy script continues and prints the BUGS.md pointer) (e.g. temporarily wrong flow text in site-qa sites.json) makes the hook exit 2 and the deploy log shows it.
- [x] Existing (no app code changed; live run of the hook on 2026-11-26 12:51 PM CT: 0 findings) Playwright/e2e in this repo still pass.
