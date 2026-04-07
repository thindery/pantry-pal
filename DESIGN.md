# PantryPal Frontend - DESIGN.md

## Architecture Overview

PantryPal Frontend is a **React SPA** that communicates with the `pantry-pal-api` backend. This document covers frontend-specific architecture. Backend design lives in `pantry-pal-api/`.

## Frontend-Only Responsibilities

This repo handles:
- ✅ UI rendering and component composition
- ✅ Client-side state management (useState, useMemo)
- ✅ User interactions and form handling
- ✅ Camera access for barcode scanning
- ✅ Image processing before sending to APIs
- ✅ Clerk authentication integration
- ✅ Responsive design (mobile-first)

Delegated to backend (`pantry-pal-api`):
- ❌ Database operations
- ❌ Business logic validation
- ❌ Subscription tier enforcement
- ❌ Webhook handling (Stripe)
- ❌ User session management

## Frontend Architecture

### State Management

**Local State** (useState):
- Form inputs (AddItemForm, Search)
- UI state (modals, toasts, loading)
- Current view/routing

**Global State** (Clerk + API):
- User authentication (Clerk context)
- Pantry items (fetched from API)
- Activities (fetched from API)
- Subscription tier (fetched from API)

**Derived State** (useMemo):
- Filtered items based on search/category
- Low stock calculations
- Shopping list generation
- Stats aggregations

### Component Hierarchy

```
App (Main container, view routing)
├── ClerkProvider (Auth wrapper)
    ├── SignedOut
    │   └── LandingPage
    └── SignedIn
        ├── Navbar (Navigation)
        ├── ToastContainer (Notifications)
        └── View Components:
            ├── DashboardView (Quick actions, stats, previews)
            ├── InventoryCard (Item grid, CRUD)
            ├── ActivityLedger (Activity history)
            ├── BarcodeScanner (Camera scanning)
            ├── PricingPage (Subscription plans)
            ├── AdminDashboard (Admin tools)
            └── Modals:
                ├── ProductInfoModal
                ├── LinkBarcodeModal
                └── UpgradePrompt
```

### View Routing

The app uses a `View` type union for routing (not React Router):

```typescript
type View = 'landing' | 'dashboard' | 'inventory' | 'ledger' | 
            'scan-receipt' | 'scan-usage' | 'add-item' | 
            'scan-barcode' | 'shopping-list' | 'pricing' | 
            'checkout-success' | 'checkout-cancel' | 'admin';
```

View state managed in `App.tsx` with `useState<View>('dashboard')`.

## Data Flow

### Inventory Operations

```
User Action → App State → API Call → Backend → Database
                 ↓
            Optimistic UI Update
                 ↓
            Activity Logged
```

### Receipt Scanning

```
User Uploads Photo
    ↓
Base64 Encoding
    ↓
Gemini API (gemini-2.0-flash)
    ↓
JSON Extraction (ScanResult[])
    ↓
User Confirmation
    ↓
Batch Create Items
    ↓
Activity Log (RECEIPT_SCAN)
```

### Barcode Scanning

```
Camera Stream (ZXing)
    ↓
Barcode Detection
    ↓
Product API Lookup (Cache → Live)
    ↓
ProductInfoModal Display
    ↓
User Confirms → Create/Update Item
```

## Authentication Flow

```
User Visits App
    ↓
ClerkProvider Checks Session
    ↓
SignedOut? → LandingPage
SignedIn?  → Dashboard
    ↓
API Calls Include JWT
    ↓
Backend Validates with Clerk
```

## Subscription System

### Tier Structure

| Feature | Free | Pro | Family |
|---------|------|-----|--------|
| Max Items | 50 | Unlimited | Unlimited |
| Receipt Scans | 5/month | Unlimited | Unlimited |
| Voice Assistant | No | Yes | Yes |
| Multi-Device | No | No | Yes |
| Shared Inventory | No | No | Yes |

### Subscription Flow

```
User Clicks "Upgrade"
    ↓
Create Checkout Session (Stripe)
    ↓
Redirect to Stripe Checkout
    ↓
Payment Success
    ↓
Webhook Updates Database
    ↓
User Redirected to checkout-success
    ↓
Frontend Refreshes Tier Info
```

## API Integration

### Service Layer Pattern

All API calls centralized in `services/`:

```typescript
// apiService.ts
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getToken(); // Clerk
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}`, ... },
    ...options,
  });
  return response.json();
}
```

### Error Handling

- API errors bubble up to components
- Toast notifications for user feedback
- ErrorBoundary for React errors
- Console logging for debugging

## Database Schema (Backend)

### Core Tables

```sql
-- Items
items (id, name, quantity, unit, category, lastUpdated, user_id)

-- Activity Ledger
activities (id, itemId, itemName, type, amount, timestamp, source, user_id)

-- Subscriptions
user_subscriptions (id, user_id, tier, stripe_customer_id, 
                    stripe_subscription_id, status, ...)

-- Usage Tracking
usage_limits (id, user_id, month, receipt_scans, ai_calls, voice_sessions)

-- Barcode Cache
barcode_cache (barcode, name, brand, category, nutrition, ...)
```

## Security Considerations

- **Authentication**: Clerk JWT tokens on all API calls
- **Authorization**: Backend validates user ownership of resources
- **Payment**: Stripe handles all payment data (PCI compliant)
- **Webhooks**: Signature verification for Stripe webhooks
- **CORS**: Backend restricts origins
- **HTTPS**: Required for camera access (barcode scanning)

## Performance Optimizations

- **Memoization**: `useMemo` for filtered lists, stats
- **Lazy Loading**: Views loaded on-demand
- **Debouncing**: Search input debounced
- **Caching**: Barcode lookups cached in backend
- **Pagination**: Activity ledger paginated

## Build & Deployment

### Vite Configuration

- **Development**: HTTPS with local certificates
- **Production**: Static file generation
- **Define**: API keys injected at build time

### Output Structure

```
dist/
├── index.html
├── index.css
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── (static files)
```

### Deployment Options

1. **Static Hosting**: Upload `dist/` to Vercel, Netlify, S3
2. **Docker**: Build image with nginx
3. **CDN**: CloudFront/Cloudflare in front

## Extension Points

- **New Views**: Add to `View` type and `renderView()` switch
- **New Services**: Add to `services/` directory
- **New Components**: Add to `components/` directory
- **New Categories**: Update `CATEGORIES` constant
- **New Units**: Update `UNITS` constant

## Technology Decisions

| Decision | Rationale |
|----------|-----------|
| Vite over CRA | Faster builds, modern tooling |
| Tailwind CDN | Rapid prototyping, no build step |
| Clerk over Auth0 | Better React integration, simpler API |
| Gemini over OpenAI | Google ecosystem, multimodal support |
| SQLite (dev) / PostgreSQL (prod) | Simple dev setup, scalable prod |
| Vitest over Jest | Native Vite integration |
| View state over React Router | Simpler for mobile SPA |
