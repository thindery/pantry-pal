# REMY-614: Core Web Vitals & Performance Optimization

**Status:** In Progress  
**Priority:** High  
**Created:** 2026-07-17

---

## Goal

Pass Core Web Vitals assessment (LCP < 2.5s, INP < 200ms, CLS < 0.1)

---

## Current State Analysis

- Next.js 16 should have good baseline
- Need to measure actual performance

---

## Optimization Tasks

### 1. LCP (Largest Contentful Paint)
- [ ] Optimize hero image (if any)
- [ ] Font loading optimization
- [ ] Preload critical resources

### 2. INP (Interaction to Next Paint)
- [ ] Review JavaScript bundle size
- [ ] Code splitting for heavy components
- [ ] Optimize event handlers

### 3. CLS (Cumulative Layout Shift)
- [ ] Set explicit image dimensions
- [ ] Reserve space for dynamic content
- [ ] Font display swap strategy

### 4. TTFB (Time to First Byte)
- [ ] Backend response times
- [ ] CDN caching strategy

### 5. General
- [ ] Image optimization (WebP where possible)
- [ ] Lazy loading for below-fold content
- [ ] Service worker for caching

---

## Tools

- PageSpeed Insights
- Lighthouse
- Web Vitals extension

---

## Acceptance Criteria

- [ ] LCP < 2.5s on mobile
- [ ] INP < 200ms
- [ ] CLS < 0.1
- [ ] PageSpeed score > 90 mobile
- [ ] Performance monitoring in place
