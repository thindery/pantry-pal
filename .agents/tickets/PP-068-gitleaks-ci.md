# PP-068: Add Gitleaks secret scan to CI

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-204  
**Created:** 2026-07-25  
**Playbook:** `project-director/playbooks/github_actions_security_scanning.md`

---

## Problem

CI runs typecheck/lint/tests only. No automated secret scanning (Gitleaks) on push/PR.

## Fix Plan

- [ ] Add `.github/workflows/secret-scan.yml` (gitleaks)  
- [ ] Optional: fail PR on findings  
- [ ] Document local scan command in README or AGENTS.md

## Acceptance Criteria

- [ ] Gitleaks runs on PR to main  
- [ ] No false-positive noise from intentional placeholders in `.env.example`
