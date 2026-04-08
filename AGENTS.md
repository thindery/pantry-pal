# PantryPal Frontend - AGENTS.md

## Project Overview

**PantryPal Frontend** is a React SPA for the PantryPal inventory tracking system. This repo contains the user-facing web application for managing pantry items, shopping lists, and AI-powered receipt scanning. The backend API lives in a separate repo (`pantry-pal-api`).

## Architecture Overview (from DESIGN.md)

PantryPal Frontend is a **React SPA** that communicates with the `pantry-pal-api` backend.

### Frontend-Only Responsibilities
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

### State Management
**Local State** (useState): Form inputs, UI state, routing.
**Global State** (Clerk + API): Auth, items, activities, subscription tier.
**Derived State** (useMemo): Filtered lists, stock calculations, stats.

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
            ├── DashboardView
            ├── InventoryCard
            ├── ActivityLedger
            ├── BarcodeScanner
            ├── PricingPage
            ├── AdminDashboard
            └── Modals
```

### Data Flow
- **Inventory Operations**: User → App State → API Call → Backend → DB (Optimistic updates).
- **Receipt Scanning**: Upload → Gemini API → JSON Extraction → Confirm → Batch Create.
- **Barcode Scanning**: Camera → ZXing → Product API Lookup → Confirm.

### Authentication & Subscriptions
- **Auth**: Clerk JWT tokens on all API calls.
- **Stripe**: Frontend creates checkout session → Stripe UI → Success redirect → Webhook update.

## Tech Stack

### Core Technologies
- **Framework**: React 19 (with TypeScript)
- **Build Tool**: Vite 6.x
- **Styling**: Tailwind CSS (via CDN)
- **Authentication**: Clerk (@clerk/clerk-react)
- **AI Integration**: Google Gemini API (@google/genai) - for receipt/usage image processing
- **Charts**: Recharts
- **Barcode Scanning**: @zxing/browser, @zxing/library
- **Search**: Fuse.js (client-side fuzzy search)
- **Icons**: lucide-react

### What This Repo Does NOT Do
- ❌ Database storage (handled by `pantry-pal-api`)
- ❌ User authentication (delegated to Clerk)
- ❌ Payment processing (Stripe integration via backend)
- ❌ Server-side logic (all API calls go to backend)

### Development Tools
- **Testing**: Vitest + React Testing Library + jsdom
- **TypeScript**: ~5.8.2
- **Mocking**: MSW (Mock Service Worker)

## Project Structure

```
pantry-pal/
├── App.tsx                 # Main app component, routing, state management
├── index.tsx               # Entry point with ClerkProvider
├── index.html              # HTML template with Tailwind CDN
├── index.css               # Global styles
├── types.ts                # Core TypeScript interfaces
├── vite.config.ts          # Vite configuration with HTTPS
├── vitest.config.ts       # Test configuration
├── components/             # React components
│   ├── InventoryCard.tsx
│   ├── ActivityLedger.tsx
│   ├── BarcodeScanner.tsx
│   ├── DashboardComponents.tsx
│   ├── LandingPage.tsx
│   ├── PricingPage.tsx
│   ├── AdminDashboard.tsx
│   ├── QuickActionBar.tsx
│   ├── Toast.tsx
│   ├── UpgradePrompt.tsx
│   └── ...
├── services/               # Business logic & API integration
│   ├── apiService.ts       # Backend API client
│   ├── geminiService.ts    # Google Gemini AI integration
│   ├── subscription.ts     # Stripe subscription management
│   ├── barcodeService.ts   # Barcode scanning & lookup
│   └── adminService.ts     # Admin dashboard API
├── types/                  # Additional type definitions
│   └── admin.ts
├── tests/                  # Vitest test files
├── docs/                   # Feature specs & architecture docs
└── dist/                   # Production build output
```

## Environment Variables

Required in `.env.local`:
- `VITE_GEMINI_API_KEY` - Google Gemini API key
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk auth key
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)

## Key Features

### Inventory Management
- Add/edit/delete pantry items
- Track quantity, unit, category
- Categories: produce, pantry, dairy, frozen, meat, beverages, snacks, other
- Units: units, lbs, oz, grams, kg, cups, bottles, cans, boxes, other

### Activity Ledger
- Tracks ADD, REMOVE, ADJUST actions
- Sources: MANUAL, RECEIPT_SCAN, VISUAL_USAGE
- Full audit trail with timestamps

### AI-Powered Scanning
- **Receipt Scanning**: Extract items from receipt photos (Gemini 2.0 Flash)
- **Visual Usage**: Identify items being used from photos

### Barcode Scanning
- Camera-based barcode scanning
- Product lookup with caching
- Manual barcode linking

### Shopping List
- Auto-generated based on low stock thresholds
- Manual item addition
- Category-based organization

### Subscriptions (Stripe)
- **Free Tier**: 50 items, 5 receipt scans/month
- **Pro Tier**: Unlimited items, unlimited scans, voice assistant
- **Family Tier**: Multi-device, shared inventory

### Admin Dashboard
- User tier management
- System analytics
- Feature flags

## Backend API

Separate repository: `pantry-pal-api`
- Base URL: http://localhost:3001 (development)
- Authentication: Clerk JWT tokens
- Endpoints:
  - `/api/items` - CRUD operations
  - `/api/activities` - Activity logging
  - `/api/receipts/scan` - Receipt OCR
  - `/api/products/barcode/:code` - Product lookup
  - `/api/subscription/*` - Stripe integration

## Common Tasks

### Running Tests
```bash
npm test          # Run vitest
npm run test:ui   # UI mode
npm run test:coverage
```

### Building
```bash
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

### Development
```bash
npm run dev       # Vite dev server with HTTPS (port 5173)
```

### Ticket Workflow (via remy-tracker)
All tickets are tracked in the remy-tracker repo. Development follows Ralph workflow:

1. **Get ticket**: Check remy-tracker for assigned tickets
2. **Branch**: `git checkout -b feature/REMY-XXX-brief-desc`
3. **Develop**: Implement changes in this repo
4. **Commit**: `git commit -m "REMY-XXX: Description"`
5. **PR**: Create PR, link to remy-tracker ticket
6. **Merge**: After review, merge to main
7. **Update ticket**: In remy-tracker, advance Ralph phases and close ticket

**Important**: Code changes here → ticket updates in remy-tracker.

## Architecture Notes

- **Single-Page App**: React Router via view state (`View` type)
- **Mobile-First**: Bottom nav on mobile, top nav on desktop
- **HTTPS Local Dev**: Uses `.certs/` directory for local SSL
- **AI-First**: Heavy reliance on Gemini for intelligent features
- **Subscription-Gated**: Features limited by user tier

## Testing

- Vitest with jsdom environment
- React Testing Library for component tests
- MSW for API mocking
- Test files: `tests/*.test.{ts,tsx}`

## Related Documentation

- `README.md` - Quick start guide
- `TESTING.md` - Testing, building, deployment guide
- `TECH_REVIEW.md` - Security and architecture review
- `docs/FEATURE-*` - Feature specifications
- `docs/frontend-architecture.md` - Detailed architecture
