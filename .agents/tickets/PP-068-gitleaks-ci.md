# PP-068: Add Gitleaks secret scan to CI

**Status:** ✅ Done  
**Priority:** P2  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-204  
**Created:** 2026-07-25  
**Completed:** 2026-07-24  

**Playbook:** `project-director/playbooks/github_actions_security_scanning.md`

---

## Problem

CI runs typecheck/lint/tests only. No automated secret scanning (Gitleaks) on push/PR.

## Fix Plan

- [x] Add `.github/workflows/secret-scan.yml` (gitleaks)
- [x] Optional: fail PR on findings
- [x] Document local scan command in README or AGENTS.md

## Acceptance Criteria

- [x] Gitleaks runs on PR to main
- [x] No false-positive noise from intentional placeholders in `.env.example`

## Implementation

- `.github/workflows/secret-scan.yml` — gitleaks-action@v2, full history
- `.gitleaks.toml` — allowlist env placeholders, docs/legacy, `.certs/` (mkcert history)
- README: local `docker run zricethezav/gitleaks` command
