# Pantry Pal - Coupon Code System Specification

## Overview
A coupon code system that allows users to receive percentage discounts on their subscriptions. Designed primarily for "early beta access" distribution to friends and early adopters.

---

## Database Schema

### 1. `coupon_codes` Table

Stores all available coupon codes and their configurations.

```sql
CREATE TABLE coupon_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited
    used_count INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE, -- NULL = no expiration
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT, -- Internal note (e.g., "Early beta access for friends")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_coupon_codes_code ON coupon_codes(code);
CREATE INDEX idx_coupon_codes_active ON coupon_codes(is_active) WHERE is_active = TRUE;
```

#### Example Data

```sql
-- 50% off for friends (limited to 100 uses)
INSERT INTO coupon_codes (code, discount_type, discount_value, max_uses, valid_until, description)
VALUES ('FRIEND50', 'percentage', 50.00, 100, '2026-12-31 23:59:59+00', 'Friends early access');

-- 100% free (unlimited uses, no expiration)
INSERT INTO coupon_codes (code, discount_type, discount_value, max_uses, description)
VALUES ('BETA100', 'percentage', 100.00, 0, 'Beta tester free access');

-- $10 off fixed amount
INSERT INTO coupon_codes (code, discount_type, discount_value, max_uses, description)
VALUES ('SAVE10', 'fixed', 10.00, 500, 'Launch promotion');
```

### 2. `user_coupons` Table

Tracks which users have redeemed which coupons.

```sql
CREATE TABLE user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_code VARCHAR(50) NOT NULL REFERENCES coupon_codes(code),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discount_applied_to_subscription UUID REFERENCES subscriptions(id),
    
    -- Ensure one user can only redeem a specific code once
    UNIQUE(user_id, coupon_code)
);

-- Indexes for performance
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_code ON user_coupons(coupon_code);
```

### 3. `subscriptions` Table (Additions)

Add coupon-related columns to existing subscriptions table.

```sql
-- Add to existing subscriptions table
ALTER TABLE subscriptions ADD COLUMN coupon_code VARCHAR(50) REFERENCES coupon_codes(code);
ALTER TABLE subscriptions ADD COLUMN discount_type VARCHAR(20);
ALTER TABLE subscriptions ADD COLUMN discount_value DECIMAL(10, 2);
ALTER TABLE subscriptions ADD COLUMN original_price DECIMAL(10, 2); -- Price before discount
ALTER TABLE subscriptions ADD COLUMN discounted_price DECIMAL(10, 2); -- Price after discount

-- Index for quick lookup
CREATE INDEX idx_subscriptions_coupon ON subscriptions(coupon_code);
```

---

## API Endpoints

### 1. Validate Coupon Code

Check if a coupon code is valid without redeeming it.

**Endpoint:** `POST /api/coupon/validate`

**Request:**
```json
{
  "code": "FRIEND50"
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "data": {
    "code": "FRIEND50",
    "discount_type": "percentage",
    "discount_value": 50,
    "discount_label": "50% off",
    "max_uses": 100,
    "used_count": 42,
    "remaining_uses": 58,
    "valid_from": "2026-01-01T00:00:00Z",
    "valid_until": "2026-12-31T23:59:59Z"
  }
}
```

**Error Responses:**

```json
// Invalid code (404)
{
  "valid": false,
  "error": "INVALID_CODE",
  "message": "This coupon code doesn't exist"
}

// Inactive code (400)
{
  "valid": false,
  "error": "CODE_INACTIVE",
  "message": "This coupon code is no longer active"
}

// Expired code (400)
{
  "valid": false,
  "error": "CODE_EXPIRED",
  "message": "This coupon code expired on Dec 31, 2026"
}

// Max uses reached (400)
{
  "valid": false,
  "error": "CODE_MAXED",
  "message": "This coupon code has reached its usage limit"
}

// Already redeemed by user (400)
{
  "valid": false,
  "error": "ALREADY_REDEEMED",
  "message": "You've already used this coupon code"
}
```

---

### 2. Redeem Coupon Code

Apply a coupon code to the current user's subscription.

**Endpoint:** `POST /api/coupon/redeem`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "code": "FRIEND50"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "code": "FRIEND50",
    "discount_type": "percentage",
    "discount_value": 50,
    "discount_label": "50% off",
    "original_price": 9.99,
    "discounted_price": 4.99,
    "savings": 5.00,
    "subscription": {
      "id": "sub_abc123",
      "status": "active",
      "plan": "premium",
      "coupon_applied": true
    },
    "redeemed_at": "2026-02-16T21:33:00Z"
  }
}
```

**Error Responses:** (Same as validate endpoint, plus:)

```json
// No active subscription (400)
{
  "success": false,
  "error": "NO_SUBSCRIPTION",
  "message": "You need an active subscription to apply a coupon"
}

// Already has coupon (409)
{
  "success": false,
  "error": "COUPON_EXISTS",
  "message": "You already have a coupon applied. Remove it first to apply a new one."
}
```

---

### 3. Remove Coupon Code

Remove the currently applied coupon from user's subscription.

**Endpoint:** `DELETE /api/coupon/redeem`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "previous_code": "FRIEND50",
    "previous_discount": "50% off",
    "original_price": 9.99,
    "new_price": 9.99,
    "removed_at": "2026-02-16T21:45:00Z"
  }
}
```

---

### 4. Get Coupon Details (Admin)

Get detailed information about a specific coupon code.

**Endpoint:** `GET /api/coupon/:code`

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Admin-Key: <admin_secret>
```

**Success Response (200):**
```json
{
  "code": "FRIEND50",
  "discount_type": "percentage",
  "discount_value": 50,
  "max_uses": 100,
  "used_count": 42,
  "remaining_uses": 58,
  "redemption_rate": "42%",
  "is_active": true,
  "valid_from": "2026-01-01T00:00:00Z",
  "valid_until": "2026-12-31T23:59:59Z",
  "description": "Friends early access",
  "created_at": "2026-01-01T00:00:00Z",
  "recent_redemptions": [
    {
      "user_id": "user_123",
      "redeemed_at": "2026-02-16T20:00:00Z"
    }
  ]
}
```

---

### 5. Get My Coupon (Current User)

Get the currently applied coupon for the authenticated user.

**Endpoint:** `GET /api/coupon/my`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "has_coupon": true,
  "data": {
    "code": "FRIEND50",
    "discount_type": "percentage",
    "discount_value": 50,
    "discount_label": "50% off",
    "redeemed_at": "2026-02-16T21:33:00Z",
    "savings": 5.00
  }
}
```

**No Coupon Response (200):**
```json
{
  "has_coupon": false,
  "data": null
}
```

---

## Frontend Components

### Component: CouponInput

**Location:** `src/components/CouponInput.tsx`

**Props Interface:**
```typescript
interface CouponInputProps {
  onApply: (code: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  currentCoupon?: CouponData | null;
  disabled?: boolean;
  placeholder?: string;
  showRemoveButton?: boolean;
}

interface CouponData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_label: string;
  redeemed_at: string;
}
```

**Behavior:**
- Input field with uppercase auto-formatting
- "Apply" button disabled until 3+ characters entered
- Loading state during validation
- Success/error toast notifications
- Display applied coupon badge when active
- "Remove" button to swap coupons

**States:**
1. **Empty:** Input field, placeholder text "Enter coupon code (e.g., FRIEND50)"
2. **Validating:** Loading spinner on button, input disabled
3. **Success:** Green checkmark, coupon badge displayed, savings amount shown
4. **Error:** Red error message below input, shake animation on input
5. **Applied:** Shows current coupon with option to remove

**Error Messages:**
```typescript
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: "This coupon code doesn't exist. Please check and try again.",
  CODE_INACTIVE: "This coupon code is no longer active.",
  CODE_EXPIRED: "This coupon code has expired.",
  CODE_MAXED: "This coupon code has reached its usage limit.",
  ALREADY_REDEEMED: "You've already used this coupon code.",
  NO_SUBSCRIPTION: "You need an active subscription to apply a coupon.",
  COUPON_EXISTS: "You already have a coupon applied. Remove it first to apply a new one.",
  NETWORK_ERROR: "Something went wrong. Please try again.",
};
```

---

### Component: CouponBadge

**Location:** `src/components/CouponBadge.tsx`

**Props Interface:**
```typescript
interface CouponBadgeProps {
  code: string;
  discountLabel: string;
  onRemove?: () => void;
  showSavings?: boolean;
  savings?: number;
  size?: 'sm' | 'md' | 'lg';
}
```

**Visual Design:**
- Rounded pill shape with gradient background
- Code displayed in monospaced font
- Discount label as subtitle
- Optional "X" remove button
- Color variants: green (active), gray (expired/used)

---

### Component: SubscriptionCard (Update)

**Location:** `src/components/SubscriptionCard.tsx`

**Additions to existing component:**

```typescript
interface SubscriptionCardProps {
  // ... existing props
  coupon?: CouponData | null;
  showCouponSection?: boolean;
}

// New section to add:
<CouponSection>
  {coupon ? (
    <AppliedCouponView 
      coupon={coupon}
      originalPrice={plan.price}
      discountedPrice={calculateDiscountedPrice(plan.price, coupon)}
    />
  ) : (
    <CouponInput 
      onApply={handleApplyCoupon}
      placeholder="Have a coupon code?"
    />
  )}
</CouponSection>
```

---

### Page: Settings → Subscription

**Location:** `src/pages/settings/SubscriptionSettings.tsx`

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Settings / Subscription                       │
├─────────────────────────────────────────────┤
│                                               │
│  Current Plan: Premium                        │
│  ┌───────────────────────────────────────┐   │
│  │ Pantry Pal Premium                    │   │
│  │ • Unlimited items                     │   │
│  │ • Expiration alerts                   │   │
│  │ • Recipe suggestions                  │   │
│  │                                       │   │
│  │ $9.99/month                          │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  Coupon Code                                  │
│  ┌───────────────────────────────────────┐   │
│  │ [🎟️ FRIEND50: 50% off          ] [X] │   │
│  │ You're saving $5.00/month                   │   │
│  │ New price: $4.99/month                      │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  [Manage Billing]  [Cancel Subscription]      │
│                                               │
└─────────────────────────────────────────────┘
```

**If no coupon applied:**
```
┌───────────────────────────────────────┐
│ Coupon Code                           │
│ ┌──────────────────┐ ┌─────────────┐│
│ │ FRIEND50          │ │    Apply    ││
│ └──────────────────┘ └─────────────┘│
│                                       │
│ Have a coupon code for early access?  │
│                                       │
└───────────────────────────────────────┘
```

---

## Business Logic

### Coupon Validation Algorithm

```typescript
async function validateCoupon(code: string, userId: string): Promise<ValidationResult> {
  // Normalize code
  const normalizedCode = code.trim().toUpperCase();
  
  // Fetch coupon
  const coupon = await db.coupon_codes.findOne({ code: normalizedCode });
  
  if (!coupon) {
    return { valid: false, error: 'INVALID_CODE' };
  }
  
  if (!coupon.is_active) {
    return { valid: false, error: 'CODE_INACTIVE' };
  }
  
  if (coupon.valid_until && new Date() > coupon.valid_until) {
    return { valid: false, error: 'CODE_EXPIRED' };
  }
  
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: 'CODE_MAXED' };
  }
  
  // Check if user already redeemed
  const existingRedemption = await db.user_coupons.findOne({
    user_id: userId,
    coupon_code: normalizedCode
  });
  
  if (existingRedemption) {
    return { valid: false, error: 'ALREADY_REDEEMED' };
  }
  
  return { 
    valid: true, 
    data: coupon,
    discount_label: formatDiscount(coupon.discount_type, coupon.discount_value)
  };
}
```

### Discount Calculation

```typescript
function calculateDiscountedPrice(
  originalPrice: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number {
  let discountedPrice: number;
  
  if (discountType === 'percentage') {
    discountedPrice = originalPrice * (1 - discountValue / 100);
  } else {
    discountedPrice = Math.max(0, originalPrice - discountValue);
  }
  
  // Round to 2 decimal places
  return Math.round(discountedPrice * 100) / 100;
}

function formatDiscount(
  discountType: 'percentage' | 'fixed',
  discountValue: number
): string {
  if (discountType === 'percentage') {
    return `${discountValue}% off`;
  }
  return `$${discountValue.toFixed(2)} off`;
}
```

### Redemption Flow

```typescript
async function redeemCoupon(code: string, userId: string): Promise<RedemptionResult> {
  return await db.transaction(async (trx) => {
    // 1. Validate
    const validation = await validateCoupon(code, userId);
    if (!validation.valid) {
      throw new CouponError(validation.error);
    }
    
    // 2. Get user's subscription
    const subscription = await trx.subscriptions.findOne({ user_id: userId });
    if (!subscription) {
      throw new CouponError('NO_SUBSCRIPTION');
    }
    
    // 3. Check if already has coupon
    if (subscription.coupon_code) {
      throw new CouponError('COUPON_EXISTS');
    }
    
    // 4. Calculate new price
    const discountedPrice = calculateDiscountedPrice(
      subscription.original_price || subscription.price,
      validation.data.discount_type,
      validation.data.discount_value
    );
    
    // 5. Update subscription
    await trx.subscriptions.update(
      { id: subscription.id },
      {
        coupon_code: validation.data.code,
        discount_type: validation.data.discount_type,
        discount_value: validation.data.discount_value,
        original_price: subscription.original_price || subscription.price,
        discounted_price: discountedPrice,
        updated_at: new Date()
      }
    );
    
    // 6. Record redemption
    await trx.user_coupons.insert({
      user_id: userId,
      coupon_code: validation.data.code,
      redeemed_at: new Date(),
      discount_applied_to_subscription: subscription.id
    });
    
    // 7. Increment used_count
    await trx.coupon_codes.update(
      { code: validation.data.code },
      { used_count: validation.data.used_count + 1 }
    );
    
    return {
      success: true,
      subscription: updatedSubscription,
      savings: subscription.price - discountedPrice
    };
  });
}
```

---

## Implementation Notes

### Security Considerations

1. **Rate Limiting:** Apply rate limits on coupon validation/redeem endpoints (e.g., 10 attempts per minute per IP)

2. **Case Insensitivity:** Store codes in uppercase, normalize input to uppercase

3. **Transaction Safety:** Use database transactions to prevent race conditions when redeeming

4. **Idempotency:** Redemption endpoint should be idempotent (same result if called multiple times)

5. **Audit Trail:** The `user_coupons` table serves as an audit trail - never delete records

### Edge Cases

1. **100% Discount:** When `discount_value = 100` and `discount_type = 'percentage'`, the subscription becomes free

2. **Fixed > Price:** When fixed discount exceeds subscription price, ensure price doesn't go negative (use `Math.max(0, ...)`)

3. **Timezones:** Store all datetimes in UTC, display in user's local timezone

4. **Subscription Changes:** If user upgrades/downgrades plans, recalculate discount based on new base price

5. **Coupon Swap:** When removing a coupon, decrement `used_count` on the coupon code to free up the slot

### Database Migration

```sql
-- Migration: 001_add_coupon_system.sql

-- Create coupon_codes table
CREATE TABLE coupon_codes (...);

-- Create user_coupons table
CREATE TABLE user_coupons (...);

-- Add columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN ...;

-- Backfill original_price for existing subscriptions
UPDATE subscriptions SET original_price = price WHERE original_price IS NULL;
```

### Testing Checklist

- [ ] Validate existing valid code
- [ ] Validate non-existent code → 404
- [ ] Validate expired code → error
- [ ] Validate maxed-out code → error
- [ ] Validate inactive code → error
- [ ] Redeem valid code as new user
- [ ] Redeem valid code as existing user
- [ ] Redeem already-redeemed code → error
- [ ] Remove coupon and verify price reset
- [ ] Swap from one coupon to another
- [ ] Test 100% discount (free subscription)
- [ ] Test fixed discount larger than price
- [ ] Test concurrent redemption (race condition)
- [ ] Verify `used_count` increments correctly
- [ ] Verify `user_coupons` record created

---

## Future Enhancements

1. **Referral Codes:** Track who referred whom via coupon codes
2. **Time-Limited Trials:** "First month free" style coupons
3. **Usage Analytics:** Dashboard for coupon performance
4. **Bulk Generation:** API to generate multiple unique codes
5. **Affiliate Tracking:** Track conversions per code/channel

---

## Sample Coupon Codes for Testing

```
BETA100    - 100% off (unlimited uses)
FRIEND50   - 50% off (limited to 100 uses)
LAUNCH25   - 25% off (expires end of month)
SAVE10     - $10 off fixed amount
FREETRIAL  - 100% off first month only
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-16  
**Author:** API Architect  
**Status:** Ready for Implementation
