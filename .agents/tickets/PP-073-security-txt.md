# PP-073: Add security.txt

**Status:** 📋 Open  
**Priority:** P3  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-209  
**Created:** 2026-07-25  

---

## Problem

`/.well-known/security.txt` returns 404.

## Fix Plan

- [ ] Add `frontend/public/.well-known/security.txt` with contact, expires, preferred languages  
- [ ] Use security@ or info@mypantryhub.com per policy

## Acceptance Criteria

- [ ] `GET https://www.mypantryhub.com/.well-known/security.txt` returns 200 text
