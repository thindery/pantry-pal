# REMY-615: Meta Tags & OpenGraph Optimization

**Status:** In Progress  
**Priority:** High  
**Created:** 2026-07-17

---

## Goal

Optimize meta titles, descriptions, and OpenGraph for better CTR and social sharing.

---

## Current State

- Title template: `%s | Pantry Hub`
- Default: "Pantry Hub | Smart Home Inventory & Shopping Lists"
- Description: "Track pantry inventory, scan receipts and barcodes, auto-generate shopping lists..."

---

## Issues to Address

### 1. Title Tags
- Currently generic across all pages
- Should be unique per page with target keywords
- Keep under 60 characters

### 2. Meta Descriptions
- Should be 150-160 characters
- Include CTA and value proposition
- Unique per page

### 3. OpenGraph Images
- Currently no OG images set
- Need 1200x630 branded images
- Different images for pricing, features, etc.

### 4. Twitter Cards
- summary_large_image configured but no image
- Need Twitter-optimized images (1200x600)

---

## Page-Specific Optimization

| Page | Current Title | Optimized Title | Description |
|------|-------------|-----------------|-------------|
| / | Pantry Hub \| Smart Home... | Pantry Hub: Smart Inventory & Shopping Lists | Track what you have, know what you need. AI-powered pantry management with receipt scanning, barcode lookup & smart alerts. Try free. |
| /pricing/ | Pricing \| Pantry Hub | Simple Pricing - Start Free \| Pantry Hub | Free plan for individuals. Pro $4.99/mo for unlimited items. Family $7.99/mo for 5 members. No hidden fees. |
| /privacy/ | Privacy \| Pantry Hub | Privacy Policy \| Pantry Hub | Learn how Pantry Hub protects your data. Read our privacy policy for information on data collection, use, and your rights. |
| /terms/ | Terms \| Pantry Hub | Terms of Service \| Pantry Hub | Read our terms of service. By using Pantry Hub, you agree to these terms. Updated July 2026. |

---

## Acceptance Criteria

- [x] All pages have unique, optimized title tags
- [x] All pages have unique meta descriptions 150-160 chars
- [x] OG images created and configured
- [x] Twitter card images created and configured
- [ ] Meta tags tested with Facebook Debugger and Twitter Card Validator
