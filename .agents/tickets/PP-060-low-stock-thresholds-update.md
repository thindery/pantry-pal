# PP-060: Update Default Low Stock Thresholds to 1

**Status:** Completed  
**Type:** Dev Task  
**Priority:** High

## Summary

Changed all category default low stock thresholds from mixed values (3, 2, 1) to a uniform value of 1. Users can still customize per-item thresholds via UI overrides.

## Changes Made

### Files Modified

1. **`frontend/lib/constants.ts`**
   - Updated `DEFAULT_THRESHOLDS` - all categories now default to 1
   - Categories affected: produce, pantry, dairy, frozen, meat, beverages, snacks, other

2. **`frontend/tests/smoke.test.ts`**
   - Updated test expectation: `DEFAULT_THRESHOLDS.pantry` from 2 to 1

3. **`frontend/tests/threshold-utils.test.ts`**
   - Updated test expectations for dairy threshold (2 → 1)
   - Updated test data: milk quantity (2 → 1) to match new threshold behavior

## User Impact

- Items will now be flagged as "low stock" when quantity reaches 1 (instead of previous higher thresholds)
- Existing user customizations (item-level overrides) are preserved in localStorage
- Users can still set custom thresholds per item as needed via the UI

## Technical Details

The low stock logic uses these thresholds to:
1. **UI highlighting** - Low stock items get a yellow/orange background
2. **Shopping list generation** - Auto-populates based on low/out of stock items
3. **Dashboard filters** - Filter views to show only low stock items
4. **Suggested quantities** - When generating shopping lists, suggests `threshold * 2` as a restock target

Per-user customization already exists via `setItemThreshold()` which stores overrides in `localStorage` key `pantry_item_threshold_overrides`.

## Deployment

- [x] Code committed to main
- [ ] Deploy to production

## Git Reference

Commit: `9c52961` - PP-XXX: Update default low stock thresholds to 1 for all categories