# Pantry-Pal Frontend Data Architecture
## Product Info Display - Design Document

**Date:** 2026-02-12  
**Option:** B (items link to products table)  
**Designer:** Frontend Architect (Subagent)

---

## 1. Data Flow Design

### Selected Approach: Option C — Hybrid

**Lightweight list + fetch detail on modal open**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW DIAGRAM                                    │
└─────────────────────────────────────────────────────────────────────────────┘

1. INVENTORY LIST VIEW (Lightweight)
   ┌──────────────────────────────────────┐
   │ GET /api/items                       │
   │ Response: [{id, name, quantity,      │
   │   unit, category, barcode}]           │
   │   ↑ No product data inline           │
   └──────────────┬───────────────────────┘
                  │
                  │ User clicks item info
                  ▼
2. PRODUCT INFO MODAL (On-Demand Fetch)
   ┌──────────────────────────────────────┐
   │ IF item.barcode EXISTS:              │
   │   GET /api/products/:barcode         │
   │   Response: {Product} or null        │
   │                                      │
   │ Modal manages:                       │
   │ • loading state                      │
   │ • error state                        │
   │ • product cache (in component)       │
   └──────────────────────────────────────┘

3. BARCODE SCAN FLOW
   ┌────────────────────────────────────────────────────────────┐
   │ 1. Scan barcode                                            │
   │ 2. GET /api/products/:barcode (backend checks cache)       │
   │    • Cache HIT → return cached Product                     │
   │    • Cache MISS → fetch OpenFoodFacts → save → return      │
   │ 3. Create item with barcode linked to product              │
   └────────────────────────────────────────────────────────────┘
```

### Why Hybrid (Option C)?

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| A: Inline Join | Single request | Slow list loads; wasted bandwidth for items without barcodes | ❌ |
| B: Modal Fetch | Clean separation; no wasted data | Extra API call on every open | ⚠️ |
| C: **Hybrid** | Fast list; fetch only when needed | Slight delay on first modal open | ✅ **Best** |

**Hybrid is optimal for PantryPal because:**
- Most items may not have barcodes initially
- Product info is only viewed occasionally
- Barcode scan flow already pre-fetches product data
- Minimal latency impact with proper loading UX

---

## 2. TypeScript Types

### Updated `types.ts`

```typescript
// PANTRY ITEM (from items table)
export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  lastUpdated: string;
  barcode?: string;           // Links to products table
  productId?: string;         // Optional: direct FK reference
  productInfo?: Product;      // Populated on-demand (not in list fetch)
}

// PRODUCT (from products table)
export interface Product {
  id?: string;                // Database ID
  barcode: string;            // Primary lookup key
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  image?: string;             // Alias for compatibility
  ingredients?: string;
  nutrition?: NutritionFacts;
  source: 'openfoodfacts' | 'manual';
  infoLastSynced: string;
  cached?: boolean;           // Frontend flag
  stale?: boolean;            // >7 days old
}

// NUTRITION FACTS (structured)
export interface NutritionFacts {
  calories?: number;          // kcal
  protein?: number;           // g
  carbs?: number;             // g
  fat?: number;               // g
  fiber?: number;             // g
  sugar?: number;             // g
  sodium?: number;            // mg
  servingSize?: string;
}

// BARCODE LOOKUP (service response)
export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  image?: string;
  imageUrl?: string;
  ingredients?: string;
  nutrition?: Record<string, number>;
  source?: string;
  cached?: boolean;
  stale?: boolean;
  infoLastSynced?: string;
}

// CACHE STATUS TYPES (existing)
export type CacheStatus = 'live' | 'cached' | 'stale';

export interface CacheStatusInfo {
  status: CacheStatus;
  label: string;
  color: string;
  icon: string;
}
```

### Type Compatibility Notes

- `BarcodeProduct` and `Product` are interoperable (use spread/satisfies)
- `image`/`imageUrl` aliases prevent breaking changes
- `Product` is the canonical type for the modal

---

## 3. Component Props/Interfaces

### ProductInfoModal

```typescript
interface ProductInfoModalProps {
  item: PantryItem;           // The inventory item (barcode may be present)
  isOpen: boolean;
  onClose: () => void;
  onProductUpdate?: (barcode: string, product: Product) => void; // Optional callback
}

// Internal State
interface ProductInfoModalState {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  cacheStatus: CacheStatusInfo | null;
}
```

### BarcodeScanner (Existing - No Change)

```typescript
interface BarcodeScannerProps {
  onBarcodeDetected: (product: BarcodeProduct) => void;
  onCancel: () => void;
}
```

### LinkBarcodeModal (Existing - Minor Update)

```typescript
interface LinkBarcodeModalProps {
  item: PantryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, barcode: string, updates?: Partial<PantryItem>) => Promise<void>;
  isLoading: boolean;
}
```

---

## 4. API Service Updates

### Add to `services/apiService.ts`

```typescript
// Product lookup by barcode
export const getProductByBarcode = (barcode: string): Promise<Product | null> =>
  fetchApi<Product | null>(`/api/products/${barcode}`);

// Alternative: unified lookup with cache status
export interface ProductLookupResponse {
  success: boolean;
  product?: Product;
  cached?: boolean;
  stale?: boolean;
  infoLastSynced?: string;
  error?: string;
}

export const lookupProduct = (barcode: string): Promise<ProductLookupResponse> =>
  fetchApi<ProductLookupResponse>(`/api/products/${barcode}`);
```

### Current barcodeService.ts (Compatible)

The existing `barcodeService.ts` already implements the correct pattern:
- `lookupBarcode()` calls backend `/api/products/:barcode`
- Falls back to OpenFoodFacts if backend unavailable
- Returns `BarcodeProduct` which satisfies `Product` interface

**No changes required to barcodeService.ts** — it already works with Option B architecture.

---

## 5. State Management Approach

### Component-Level State (Recommended)

**Why React Context/Redux is overkill:**
- Product data is ephemeral (viewed briefly in modal)
- No cross-component sharing needed beyond item list
- Simple React state with fetch-on-mount is sufficient

### ProductInfoModal State Flow

```typescript
const ProductInfoModal: React.FC<ProductInfoModalProps> = ({ item, isOpen, onClose }) => {
  // Component state
  const [product, setProduct] = useState<Product | null>(item.productInfo || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch product on open (if not already present)
  useEffect(() => {
    if (isOpen && item.barcode && !item.productInfo && !product) {
      fetchProduct(item.barcode);
    }
  }, [isOpen, item.barcode]);

  const fetchProduct = async (barcode: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await lookupProduct(barcode);
      if (result.success && result.product) {
        setProduct(result.product);
      } else {
        setError(result.error || 'Product not found');
      }
    } catch (err) {
      setError('Failed to load product information');
    } finally {
      setIsLoading(false);
    }
  };

  // Render with loading states...
};
```

### Memory Cache (Optional Enhancement)

For frequently viewed products, add a simple in-memory cache:

```typescript
// services/productCache.ts
const productCache = new Map<string, { product: Product; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getCachedProduct = (barcode: string): Product | null => {
  const cached = productCache.get(barcode);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.product;
  }
  return null;
};

export const setCachedProduct = (barcode: string, product: Product): void => {
  productCache.set(barcode, { product, timestamp: Date.now() });
};
```

---

## 6. Barcode Scan Flow (Detailed)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ USER SCANS BARCODE                                                           │
└────────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────┐
│ BarcodeScanner Component             │
│ • Capture barcode (camera/image)     │
│ • Calls lookupBarcode(barcode)       │
└──────────────┬───────────────────────┘
               │
               │ lookupBarcode()
               ▼
┌──────────────────────────────────────┐
│ barcodeService.ts                    │
│ 1. Try backend: GET /api/products/:id│
│    • Check local products table      │
│    • If found → return cached data   │
│    • If not found → continue         │
│                                      │
│ 2. Backend calls OpenFoodFacts       │
│ 3. Backend saves to products table   │
│ 4. Backend returns product data      │
│    {success, product, cached, stale} │
└──────────────┬───────────────────────┘
               │
               │ onBarcodeDetected(product)
               ▼
┌──────────────────────────────────────┐
│ App.tsx / Create Item Flow           │
│ • BarcodeProduct mapped to item      │
│ • POST /api/items                    │
│   body: {                            │
│     name, quantity, unit, category,  │
│     barcode,                         │
│     productInfo (optional full data) │
│   }                                  │
└──────────────────────────────────────┘
```

### Data Mapping

```typescript
// BarcodeProduct → PantryItem (create)
const createItemFromBarcode = (barcodeProduct: BarcodeProduct): Partial<PantryItem> => {
  return {
    name: barcodeProduct.name,
    barcode: barcodeProduct.barcode,
    category: barcodeProduct.category || 'other',
    quantity: 1,
    unit: 'units',
    productInfo: barcodeProduct satisfies Product,
  };
};
```

---

## 7. Visual Design Integration Points

### ProductInfoModal Display Structure

```tsx
<div className="product-info-modal">
  {/* 1. Header */}
  <Header item={item} cacheStatus={cacheStatus} />
  
  {/* 2. Product Image (if available) */}
  <ProductImage imageUrl={product?.imageUrl} name={item.name} />
  
  {/* 3. Basic Info */}
  <ProductBasics 
    name={product?.name || item.name}
    brand={product?.brand}
    category={item.category}
    barcode={item.barcode}
  />
  
  {/* 4. Nutrition Facts (collapsible) */}
  <NutritionFacts nutrition={product?.nutrition} />
  
  {/* 5. Ingredients (collapsible) */}
  <Ingredients ingredients={product?.ingredients} />
  
  {/* 6. Cache Status Footer */}
  <CacheFooter 
    source={product?.source}
    lastSynced={product?.infoLastSynced}
    isCached={product?.cached}
  />
</div>
```

### Data-to-Component Mapping

| Designer Spec | Data Source | Component |
|--------------|-------------|-----------|
| Product image | `product.imageUrl` | `<img>` with fallback |
| Brand name | `product.brand` | Text display |
| Nutrition facts | `product.nutrition` | Collapsible grid |
| Ingredients list | `product.ingredients` | Collapsible text |
| "From cache" / "Live" indicator | `product.cached` + `cacheStatus` | Badge component |

---

## 8. Files to Modify

| File | Changes |
|------|---------|
| `types.ts` | Update `PantryItem.productInfo` comment to clarify on-demand population |
| `services/apiService.ts` | Add `getProductByBarcode()` and `lookupProduct()` functions |
| `components/ProductInfoModal.tsx` | **Major**: Add fetch-on-mount logic, loading states, error handling |
| `App.tsx` | Minor: Pass `productInfo` when available from scanner flow |
| `components/LinkBarcodeModal.tsx` | Minor: Use new API functions for consistency |

---

## 9. Implementation Checklist

### Phase 1: API Layer
- [ ] Add `getProductByBarcode()` to `apiService.ts`
- [ ] Test API contract with backend
- [ ] Ensure consistent error handling

### Phase 2: Modal Updates
- [ ] Add loading spinner to `ProductInfoModal`
- [ ] Implement `useEffect` fetch on mount
- [ ] Add error state UI
- [ ] Add cache status badge (reuse existing)
- [ ] Test with items that have/don't have barcodes

### Phase 3: Integration
- [ ] Update `App.tsx` to pass product data from scanner
- [ ] Test full flow: Scan → Create → View Product Info
- [ ] Verify offline/missing product scenarios

### Phase 4: Optimization (Optional)
- [ ] Add memory cache layer
- [ ] Add prefetch on inventory list hover

---

## 10. Error Handling Strategy

| Scenario | UX Behavior |
|----------|-------------|
| No barcode | Show "No barcode linked" message |
| Barcode not found | Show "Product not found" + link to edit |
| API timeout | Retry once, then show "Try again" button |
| Network offline | Show cached data if available, else offline message |

---

## Coordination Notes

### API Architect Agreement Required
1. Confirm `GET /api/products/:barcode` response shape matches `Product` type
2. Ensure 404 response for unknown barcodes (not 500)
3. Include `cached`, `stale`, and `infoLastSynced` flags in response

### Designer Handoff
- `ProductInfoModal` ready to receive layout spec
- All data fields from `Product` type available
- Collapsible sections ready for ingredients/nutrition
- Badge component ready for cache status styling

---

## Summary

**Recommended Architecture: Option C (Hybrid)**

- ✅ Lightweight inventory list (no joins)
- ✅ On-demand product fetch in modal
- ✅ Minimal code changes required
- ✅ Leverages existing barcodeService implementation
- ✅ Good UX with proper loading states
- ✅ Scales well as product data grows
