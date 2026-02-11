# Mobile Testing Checklist for PantryPal

Quick reference guide for testing barcode scanning and mobile features on real devices using ngrok.

---

## ⚡ TL;DR - Quick Start

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start ngrok
ngrok http https://localhost:5173

# Update Clerk with ngrok URL:
# 1. Copy the https://xxxx.ngrok.io URL
# 2. Go to https://dashboard.clerk.dev
# 3. Add the URL to "Allowed origins" in your app settings

# On your phone:
# 1. Open the ngrok URL in Chrome/Safari
# 2. Accept camera permissions when prompted
# 3. Test barcode scanning!
```

---

## ✅ Pre-Flight Checklist

### 1. Prerequisites Check
- [ ] **ngrok installed**: `ngrok version` should return a version
- [ ] **ngrok authenticated**: `ngrok config check` shows no errors
- [ ] **Frontend dev server works**: `npm run dev` runs on https://localhost:5173
- [ ] **Phone has camera**: Any smartphone with a working camera
- [ ] **Same network OR ngrok**: Either phone + laptop on same WiFi, or using ngrok

### 2. Environment Setup
- [ ] `.env.local` exists with all required vars:
  ```
  VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
  VITE_API_URL=http://localhost:3001  # Will need updating for mobile
  VITE_GEMINI_API_KEY=...
  ```

---

## 📱 Mobile Responsiveness Status

| Feature | Status | Notes |
|---------|--------|-------|
| Viewport Meta Tag | ✅ OK | `width=device-width, initial-scale=1.0` set |
| Bottom Navigation | ✅ Mobile-First | Fixed bottom nav on mobile, top on desktop |
| Touch Targets | ✅ Good | Buttons are 48px+ (Tailwind py-3 ~ 48px) |
| Barcode Scanner | ✅ Responsive | Aspect-square container adapts to screen |
| Tables (Inventory) | ⚠️ Tight on small screens | Consider horizontal scroll or card view |
| Receipt Scanner | ✅ Good | Image preview with max-h-96 constraint |

### Known Mobile Limitations
1. **Inventory table** may need horizontal scroll on phones < 375px wide
2. **Landscape mode** not optimized (scanner may rotate awkwardly)
3. **No PWA manifest** - can't "Add to Home Screen" yet

---

## 🔧 Step-by-Step ngrok Setup

### Step 1: Install ngrok (if not already)

```bash
# macOS with Homebrew
brew install ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Configure ngrok

```bash
# Get token from https://dashboard.ngrok.com/get-started/setup
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### Step 3: Start Everything

**Terminal 1 - Frontend:**
```bash
cd ~/projects/pantry-pal
npm run dev
```
Should show: `https://localhost:5173`

**Terminal 2 - ngrok:**
```bash
ngrok http https://localhost:5173
```

### Step 4: Get Your Public URL

ngrok will output something like:
```
Forwarding  https://abc123-def.ngrok-free.app -> https://localhost:5173
```

**Copy the HTTPS URL** (not the http one)

### Step 5: Update Clerk Allowed Origins ⭐ CRITICAL

1. Go to https://dashboard.clerk.dev
2. Select your PantryPal application
3. Go to **Configure → Application**
4. Under **Allowed origins**, add:
   ```
   https://abc123-def.ngrok-free.app
   ```
   (use your specific ngrok URL)
5. Click **Save**

⚠️ **Without this step, sign-in will fail on mobile!**

### Step 6: Test on Your Phone

1. Open **Chrome (Android)** or **Safari (iOS)** on your phone
2. Paste the ngrok URL
3. You should see the PantryPal login screen
4. Sign in with your test account
5. Navigate to **Inventory → Scan Barcode**

---

## 🔌 Backend API Configuration for Mobile

### Option A: Backend Also on ngrok (RECOMMENDED)

If your backend (`kitchen-api`) needs to be accessible:

```bash
# Terminal 3 - Start backend ngrok
ngrok http http://localhost:3001
```

Update `.env.local`:
```env
VITE_API_URL=https://your-backend-ngrok.ngrok-free.app
```

**Restart** `npm run dev` after changing `.env.local`

### Option B: Phone on Same WiFi (Local Network)

1. Find your laptop's local IP:
   ```bash
   # macOS
   ipconfig getifaddr en0

   # Or look in System Preferences → Network
   ```

2. Update `.env.local`:
   ```env
   VITE_API_URL=https://192.168.x.x:3001
   ```

3. Phone must be on same WiFi network

---

## 🚨 CORS Issues to Watch For

### Problem 1: Clerk Auth Domain Mismatch
**Symptom:** "Unable to sign in" or auth errors on mobile
**Fix:** Don't forget Step 5 above - add ngrok URL to Clerk allowed origins

### Problem 2: API CORS Errors
**Symptom:** Console shows "CORS policy: No 'Access-Control-Allow-Origin' header"
**Fix:** Update backend CORS config to allow ngrok domain

Example (Express.js backend):
```javascript
app.use(cors({
  origin: [
    'https://localhost:5173',
    'https://192.168.1.x:5173',
    /\.ngrok-free\.app$/  // Allow all ngrok URLs
  ],
  credentials: true
}));
```

### Problem 3: Barcode API CORS
**Symptom:** Barcode lookup works on desktop but fails on mobile
**Cause:** Open Food Facts API may block requests from some origins
**Fix:** Check browser console for errors; usually self-resolves (external API)

### Problem 4: Mixed Content Errors
**Symptom:** "Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://...'"
**Fix:** Ensure `VITE_API_URL` uses `https://` not `http://`

---

## 📷 Barcode Scanner Mobile Testing

### Test Flow
1. Go to **Inventory** tab
2. Tap **+ Add Item**
3. Select **📱 Scan Barcode**
4. Grant camera permission when prompted
5. Point camera at a barcode (need good lighting!)
6. Scanner should detect and show product info

### Mobile Camera Permissions

**iOS Safari:**
- First visit: Tap "Allow" when camera permission appears
- If blocked: Settings → Safari → Camera → Allow

**Android Chrome:**
- First visit: Tap "Allow" in permission popup
- If blocked: Chrome menu → Settings → Site Settings → Camera → Allow

### Fallback Methods (if camera fails)
The app provides 3 ways to scan:
1. **Live camera** - preferred
2. **Upload image** - take photo then upload
3. **Manual entry** - type barcode digits

### Common Barcode Scanner Issues

| Issue | Solution |
|-------|----------|
| "Camera not supported" | Use image upload method instead |
| Camera opens but won't scan | Ensure barcode is well-lit and in frame |
| Scanner keeps scanning same code | Working as intended - prevents duplicates |
| No product found | Product may not be in Open Food Facts database |
| Torch/Flashlight doesn't work | Some phones don't support torch via browser |

---

## 🔍 Debugging on Mobile

### Check ngrok Traffic Inspector
1. Open http://localhost:4040 on your laptop
2. Shows all requests going through ngrok
3. Useful for debugging API calls

### iOS Safari Remote Debugging
1. Connect iPhone to Mac via USB
2. Mac Safari → Develop menu → Select your iPhone
3. Can inspect console, network, DOM

### Android Chrome Remote Debugging
1. Connect Android to computer via USB
2. Chrome on desktop → chrome://inspect
3. Select your phone and click "Inspect"

---

## 📝 Testing Checklist (Print & Tick)

### Basic Functionality
- [ ] App loads on mobile browser
- [ ] Can sign in / sign up
- [ ] Navigation works (bottom tabs)
- [ ] Can view inventory list
- [ ] Can add item manually

### Barcode Scanning
- [ ] Camera permission prompt appears
- [ ] Can grant camera access
- [ ] Live camera view displays
- [ ] Can scan a barcode (have a product ready!)
- [ ] Product info displays after scan
- [ ] Can add scanned item to inventory
- [ ] Fallback: Can upload barcode image
- [ ] Fallback: Can type barcode manually

### Receipt Scanning
- [ ] Can upload receipt image
- [ ] Receipt scanning works
- [ ] Extracted items display correctly

### API Connectivity
- [ ] Inventory loads from backend
- [ ] Adding item saves to backend
- [ ] No CORS errors in console

---

## 🆘 Troubleshooting Quick Fixes

### "Site can't be reached" on phone
- Ensure ngrok is still running (free URLs expire after ~2 hours)
- Try refreshing ngrok tunnel (Ctrl+C and restart)
- Check phone has internet connection

### Camera permission denied
- iOS: Settings → Safari → Camera → Allow
- Android: Chrome → Site Settings → Camera → Reset permissions

### Auth not working
- Double-check Clerk allowed origins includes your ngrok URL
- Try incognito/private mode
- Clear browser cookies/cache

### API calls failing
- Check `VITE_API_URL` in `.env.local` is correct
- Ensure backend is running
- Check ngrok inspector (localhost:4040) for request errors

### Barcode not scanning
- Ensure good lighting on barcode
- Hold phone steady
- Try different angles/distances
- Use image upload as fallback

---

## 🎯 Pro Tips

1. **Keep ngrok running** - The free tier URL stays active as long as ngrok process runs

2. **Use QR code** - Generate a QR code of your ngrok URL to quickly open on phone:
   ```bash
   # Install qrenco.de CLI or use a QR generator website
   # Paste https://your-ngrok-url.ngrok-free.app
   ```

3. **Test in airplane mode with WiFi** - Ensures you're really accessing via ngrok, not localhost

4. **Screen mirroring** - Use tools like AirPlay (iOS) or Scrcpy (Android) to see phone screen on laptop

5. **ngrok Pro** - If testing frequently, $5/month gives you a permanent URL (no more Clerk updates!)

---

## 🧪 Recommended Test Barcodes

Keep these barcodes handy for testing:

| Product | Barcode | Expected Category |
|---------|---------|-------------------|
| Coca-Cola can | 049000050103 | beverages |
| Lay's Classic | 028400077810 | snacks |
| Campbell's Soup | 051000012616 | pantry |
| Any product | (varies) | depends |

**Pro tip:** The app falls back to "other" category for unknown products, so test with something from your pantry!

---

## 📚 Reference Commands

```bash
# Start frontend dev server
npm run dev

# Start ngrok tunnel
ngrok http https://localhost:5173

# Check ngrok status
curl http://localhost:4040/api/tunnels

# View ngrok web interface
open http://localhost:4040

# Get local IP (macOS)
ipconfig getifaddr en0
```

---

## ✅ Success Criteria

You know mobile testing is working when:
- [ ] Phone loads the app via ngrok URL
- [ ] Can sign in successfully
- [ ] Camera scanner opens and detects barcodes
- [ ] Scanned products add to inventory
- [ ] No console errors (check via remote debugging)

---

**Last Updated:** 2026-02-10  
**Tested With:** ngrok v3.x, iOS Safari, Android Chrome
