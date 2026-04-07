# Feature: Dashboard Filter Buttons (Snap-Filters)

**Status:** Ready for Implementation  
**Priority:** High  
**Estimated Effort:** 2-3 hours  

---

## Overview

Transform the dashboard stat cards from navigation triggers into inline data filters. Clicking a stat card ("Low Stock", "Out of Stock", etc.) immediately filters the inventory table below without navigating away from the dashboard.

---

## Current Behavior vs Desired Behavior

| Aspect | Current | Desired |
|--------|---------|---------|
| Stat Card Click | Navigates to `/inventory` | Filters table inline (no navigation) |
| Active Filter Visual | None | Highlighted border + ring on active card |
| Clear Filter | Navigate away/back | "Clear Filters" button appears |
| View All | Same page (inventory) | Navigates to dedicated `/inventory` page |
| Filter Indicator | None | Text chip: "Showing: Low Stock Items" |

---

## Filter Type Definition

```typescript
// Add to types.ts (or keep local if preferred)
type DashboardFilter = 'all' | 'low-stock' | 'out-of-stock' | 'expiring' | 'in-stock';

interface DashboardFiltersState {
  activeFilter: DashboardFilter | null;
  filterLabel: string;
}
```

---

## Filter Logic

```typescript
const DEFAULT_THRESHOLDS: ThresholdConfig = {
  produce: 3,
  pantry: 2,
  dairy: 2,
  frozen: 1,
  meat: 1,
  beverages: 2,
  snacks: 2,
  other: 2,
};

function filterInventory(
  items: PantryItem[],
  filter: DashboardFilter,
  thresholds: ThresholdConfig
): PantryItem[] {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  switch (filter) {
    case 'all':
      return items;

    case 'out-of-stock':
      return items.filter(item => item.quantity === 0);

    case 'low-stock':
      return items.filter(item => {
        if (item.quantity === 0) return false;
        const threshold = thresholds[item.category] || 2;
        return item.quantity <= threshold;
      });

    case 'in-stock':
      return items.filter(item => {
        const threshold = thresholds[item.category] || 2;
        return item.quantity > threshold;
      });

    case 'expiring':
      // Note: Requires `expiresAt` field on PantryItem
      // Fallback: Show items approaching low stock threshold
      return items.filter(item => {
        const threshold = thresholds[item.category] || 2;
        const isLowStock = item.quantity > 0 && item.quantity <= threshold * 1.5;
        // If item has expiration date, check if within 7 days
        if ('expiresAt' in item && item.expiresAt) {
          const expiryDate = new Date(item.expiresAt);
          return expiryDate <= sevenDaysFromNow;
        }
        return isLowStock; // Fallback to "approaching low stock"
      });

    default:
      return items;
  }
}
```

---

## Component Changes

### 1. `StatCardMini` Component (Update)

**File:** `components/DashboardComponents.tsx`

**Changes:**
- Add support for `filter` prop mapping
- Add color variants: red, orange (for new stat cards)
- Support `isActive` prop for visual state
- Ensure touch-friendly sizing (min 44px hit target)

```typescript
// Updated DashboardStatData interface
export interface DashboardStatData {
  label: string;
  value: number;
  color: 'emerald' | 'amber' | 'slate' | 'sky' | 'red' | 'orange';
  icon?: string;
  filter: DashboardFilter; // NEW: Map to filter type
}

// Updated StatCardMiniProps
interface StatCardMiniProps {
  stats: DashboardStatData[];
  onStatClick?: (filter: DashboardFilter) => void; // CHANGED: Pass filter instead of label
  activeFilter?: DashboardFilter | null; // NEW
}

// Add color styles (in StatCardMini component)
const colorStyles = {
  emerald: { /* existing - In Stock */ },
  amber: { /* existing - Low Stock */ },
  slate: { /* existing - All Items */ },
  sky: { /* existing - */ },
  red: { // NEW - Out of Stock
    base: 'text-red-600 bg-red-50 border-red-100',
    active: 'ring-2 ring-red-500 ring-offset-2 bg-red-100 border-red-300 shadow-md',
  },
  orange: { // NEW - Expiring
    base: 'text-orange-600 bg-orange-50 border-orange-100',
    active: 'ring-2 ring-orange-500 ring-offset-2 bg-orange-100 border-orange-300 shadow-md',
  },
};

// Inside render, click handler passes filter:
<button
  key={stat.label}
  onClick={() => onStatClick?.(stat.filter)}
  className={`... ${colorStyles[stat.color].base} ${isActive ? colorStyles[stat.color].active : ''}`}
>
  {/* content */}
</button>
```

---

### 2. Dashboard View Component (Modify)

**File:** `App.tsx` (within Dashboard view section)

**State Management:**

```typescript
// Add to Dashboard component state
const [activeFilter, setActiveFilter] = useState<DashboardFilter | null>(null);

// Stat data configuration with filter mappings
const dashboardStats: DashboardStatData[] = useMemo(() => {
  const totalItems = items.length;
  const outOfStock = items.filter(i => i.quantity === 0).length;
  const lowStock = items.filter(i => {
    if (i.quantity === 0) return false;
    const threshold = thresholds[i.category] || 2;
    return i.quantity <= threshold;
  }).length;
  const wellStocked = items.filter(i => {
    const threshold = thresholds[i.category] || 2;
    return i.quantity > threshold;
  }).length;

  return [
    { 
      label: 'All Items', 
      value: totalItems, 
      color: 'slate', 
      icon: '📦',
      filter: 'all' 
    },
    { 
      label: 'Out of Stock', 
      value: outOfStock, 
      color: 'red', 
      icon: '🚨',
      filter: 'out-of-stock' 
    },
    { 
      label: 'Low Stock', 
      value: lowStock, 
      color: 'amber', 
      icon: '⚠️',
      filter: 'low-stock' 
    },
    { 
      label: 'Expiring Soon', 
      value: items.filter(i => isExpiringSoon(i)).length, 
      color: 'orange', 
      icon: '⏰',
      filter: 'expiring' 
    },
    { 
      label: 'In Stock', 
      value: wellStocked, 
      color: 'emerald', 
      icon: '✅',
      filter: 'in-stock' 
    },
  ];
}, [items, thresholds]);

// Filtered items for display
const filteredItems = useMemo(() => {
  if (!activeFilter || activeFilter === 'all') return items;
  return filterInventory(items, activeFilter, thresholds);
}, [items, activeFilter, thresholds]);

// Handler for stat card click
const handleStatClick = useCallback((filter: DashboardFilter) => {
  // Toggle: click same filter to clear
  setActiveFilter(current => current === filter ? null : filter);
}, []);

// Clear filter handler
const clearFilter = useCallback(() => {
  setActiveFilter(null);
}, []);
```

---

### 3. Filter Indicator Component (New)

**Add to `components/DashboardComponents.tsx`:**

```typescript
// --- Component: FilterIndicator ---
interface FilterIndicatorProps {
  filter: DashboardFilter | null;
  itemCount: number;
  totalCount: number;
  onClear: () => void;
}

export const FilterIndicator: React.FC<FilterIndicatorProps> = ({
  filter,
  itemCount,
  totalCount,
  onClear,
}) => {
  if (!filter || filter === 'all') return null;

  const filterLabels: Record<DashboardFilter, { text: string; color: string }> = {
    all: { text: 'All Items', color: 'slate' },
    'low-stock': { text: 'Low Stock Items', color: 'amber' },
    'out-of-stock': { text: 'Out of Stock Items', color: 'red' },
    expiring: { text: 'Expiring Soon', color: 'orange' },
    'in-stock': { text: 'In Stock Items', color: 'emerald' },
  };

  const { text, color } = filterLabels[filter];
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-3 mb-4">
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${colorClasses[color]}`}>
          <span className="text-xs">🔍</span>
          Showing: {text}
          <span className="text-xs opacity-70 ml-1">({itemCount} of {totalCount})</span>
        </span>
      </div>
      <button
        onClick={onClear}
        className="text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
      >
        <span>✕</span>
        Clear Filter
      </button>
    </div>
  );
};
```

---

### 4. Inventory Table Integration

**In Dashboard view (`App.tsx`):**

```typescript
// Replace existing inventory display with filtered version
<div className="mt-6">
  {/* Filter Indicator */}
  <FilterIndicator
    filter={activeFilter}
    itemCount={filteredItems.length}
    totalCount={items.length}
    onClear={clearFilter}
  />

  {/* Inventory Grid - uses filteredItems */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {filteredItems.map(item => (
      <InventoryCard
        key={item.id}
        item={item}
        onAdjustQuantity={handleAdjustQuantity}
        onSetToZero={handleSetToZero}
        /* ... other handlers */
      />
    ))}
  </div>

  {/* Empty State (when filter returns no items) */}
  {filteredItems.length === 0 && activeFilter && activeFilter !== 'all' && (
    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
      <span className="text-4xl mb-3 block">🔍</span>
      <h3 className="text-lg font-medium text-slate-700 mb-1">
        No items match this filter
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Try adjusting your filter or add new items.
      </p>
      <button
        onClick={clearFilter}
        className="text-emerald-600 font-medium hover:text-emerald-700"
      >
        Show all items →
      </button>
    </div>
  )}

  {/* View All Button */}
  <div className="mt-6 text-center">
    <button
      onClick={() => setView('inventory')}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
    >
      View Full Inventory
      <span>→</span>
    </button>
  </div>
</div>
```

---

## UI Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  PANTRY PAL                           👤 Profile    │
├─────────────────────────────────────────────────────────────────┤
│  [All Items]  [Out of Stock]  [Low Stock]  [Expiring]  [✅ In] │
│   📦 45        🚨 3            ⚠️ 8          ⏰ 5        Stock 12│
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│   │ Active: ring-2 + shadow + bg tint (sky/emerald/etc) │      │
│   └────────────────────────────────────────────────────────      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 🔍 Showing: Low Stock Items (8 of 45)      [✕ Clear] │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 🍞 Bread        │  │ 🥛 Milk         │  │ 🥚 Eggs         │ │
│  │ Pantry          │  │ Dairy           │  │ Dairy           │ │
│  │ ┌─┐ 2 units ┌─┐ │  │ ┌─┐ 1 cup   ┌─┐ │  │ ┌─┐ 6 units ┌─┐ │ │
│  │ │−│         │+│ │  │ │−│         │+│ │  │ │−│         │+│ │ │
│  │ └─┘         └─┘ │  │ └─┘         └─┘ │  │ └─┘         └─┘ │ │
│  │ [Edit] [Barcode]│  │ [Edit] [Barcode]│  │ [Edit] [Barcode]│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                        │
│  │ 🍯 Honey        │  │ 🥣 Cereal       │                        │
│  │ ...             │  │ ...             │                        │
│  └─────────────────┘  └─────────────────┘                        │
│                                                                  │
│              [View Full Inventory →]                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mobile Considerations

### Touch Targets
- Stat cards: Min 72px height, full-width on small screens
- Clear filter button: Min 44px touch target
- Use `active:scale-95` for tactile feedback

### Responsive Layout
```
Mobile (< 640px):
┌─────────────────────────────────┐
│ [All]    [Out]    [Low]         │ <- 3-col grid, smaller text
│ [Expiring] [In Stock]           │
├─────────────────────────────────┤
│ 🔍 Showing: Low Stock    [✕]    │ <- chip row, scrollable
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Inventory card full width   │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Mobile Filter Chip
On mobile, the filter indicator can collapse to a single row:
```typescript
// Mobile-optimized filter indicator variant
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium">
  🔍 Low Stock <span className="opacity-70">(8)</span>
</span>
```

---

## Implementation Steps

### Phase 1: Types & Filter Logic (15 min)
1. Add `DashboardFilter` type to `types.ts`
2. Create `filterInventory()` utility function
3. Export from `utils/filterUtils.ts` (or add to DashboardComponents)

### Phase 2: Update StatCardMini (20 min)
1. Add color variants (red, orange) to `colorStyles`
2. Update interface to include `filter` prop
3. Update click handler to pass filter value
4. Add `isActive` prop support with visual states

### Phase 3: Create FilterIndicator (15 min)
1. Create new component in DashboardComponents.tsx
2. Style with appropriate color mappings
3. Add "Clear Filter" button functionality

### Phase 4: Dashboard Integration (30 min)
1. Add `activeFilter` state to Dashboard component
2. Create stat data with filter mappings
3. Add `filteredItems` computed value
4. Insert FilterIndicator above inventory grid
5. Wire up stat card click handlers
6. Add empty state for filtered results

### Phase 5: Polish & Testing (30 min)
1. Add smooth transitions (CSS `transition-all duration-200`)
2. Test all filter combinations
3. Verify mobile layout
4. Test "View All" navigation still works
5. Add keyboard accessibility (Enter/Space to activate)

---

## Files Modified

| File | Changes |
|------|---------|
| `types.ts` | Add `DashboardFilter` type |
| `components/DashboardComponents.tsx` | Update `StatCardMini`, add `FilterIndicator`, add `filterInventory` utility |
| `App.tsx` | Add filter state, wire up handlers, use filtered items |

---

## Accessibility

- **Keyboard:** Stat cards are `<button>` elements (already implemented)
- **ARIA:** Add `aria-pressed="true"` when active
- **Screen Readers:** Include descriptive text: "Filter by low stock, 8 items"
- **Focus:** Ensure visible focus ring matches active state style

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Click already active filter | Toggles off (clears filter) |
| Filter returns 0 items | Show empty state with "No items match" message |
| User adds item while filtered | Table updates (filteredItems recomputes) |
| Navigate away and back | Filter is reset (activeFilter = null) |
| View All clicked | Navigates to /inventory with NO filter applied |

---

## Future Enhancements

1. **Persist Filter**: Save to localStorage and restore on return
2. **URL Sync**: Add query param `?filter=low-stock` for shareable filtered views
3. **Multi-Filter**: Allow combining filters (e.g., "Low Stock" + "Expiring")
4. **Sort Options**: Add sort dropdown when filtered (by name, quantity, expiry)

---

## Acceptance Criteria Checklist

- [ ] Click stat card → table filters inline immediately
- [ ] Click active stat card → clears filter
- [ ] No page navigation occurs when filtering
- [ ] Active stat card has visual highlight (ring + bg tint)
- [ ] Filter indicator shows "Showing: X Items" with count
- [ ] Clear Filters button appears and works
- [ ] View All button still navigates to /inventory
- [ ] Mobile: Touch-friendly sizing, horizontal scroll for stat cards
- [ ] Empty state shown when filter returns no results
- [ ] All existing functionality preserved

---

## Notes

- The existing `StatCardMini` already supports `onStatClick` - we just need to change what data is passed
- The `InventoryCard` component can remain unchanged - it receives items as props
- Consider adding `useMemo` for filtered items to avoid re-computation
- The `LowStockPreview` and inventory grid can coexist - filtered grid replaces/reuses the preview logic
