# Merge Conflict Resolution Instructions

## Remaining Issues to Fix

### 1. App.tsx
- Has conflict markers
- Need to reconcile any Clerk auth differences

### 2. services/apiService.ts
- Has conflict markers at lines 2 and 87
- Need to merge auth token handling with existing API calls

### 3. types.ts
- Has conflict markers at line 10
- Need to merge type definitions

### 4. vite-env.d.ts
- Has conflict markers at line 4
- Type declarations for Clerk

## Commands to Fix

```bash
# Check remaining conflicts
grep -n "<<<<<<<" App.tsx services/apiService.ts types.ts vite-env.d.ts

# After fixing all files:
git add .
git commit -m "Merge feature/clerk-auth with shopping list and barcode scanner"
git push origin main
```

## What Was Already Resolved
- components/BarcodeScanner.tsx - Unified with both camera scanning AND manual entry
