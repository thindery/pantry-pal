# Testing, Build & Deployment Guide

This guide covers how to run tests, build the project, and deploy using ngrok for external access.

---

## Table of Contents

1. [Testing](#testing)
2. [Building](#building)
3. [Local Development](#local-development)
4. [External Access with ngrok](#external-access-with-ngrok)
5. [Environment Variables](#environment-variables)
6. [API Connection Configuration](#api-connection-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Testing

### Current Status

**⚠️ No tests are currently configured for this project.**

The project does not have a test runner or any test files. The `package.json` does not include a `test` script.

### Adding Tests (Recommended Setup)

To add testing to this project, we recommend using **Vitest** (works seamlessly with Vite) along with **React Testing Library**:

```bash
# Install testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom

# Install additional utilities
npm install --save-dev @testing-library/user-event
```

Then add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

Create a `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

### Running Tests (Once Configured)

```bash
# Run tests
npm test

# Run tests with watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

---

## Building

### Production Build

To create a production build:

```bash
npm run build
```

This generates static files in the `dist/` directory using Vite.

### Preview Build

To preview the production build locally:

```bash
npm run preview
```

This serves the `dist/` folder on a local server (default: http://localhost:4173).

### Build Output

The build creates:
- `dist/index.html` - Entry HTML file
- `dist/assets/` - Bundled JS and CSS files
- Static assets from the `public/` folder (if any)

---

## Local Development

### Prerequisites

- **Node.js** v18+ (recommended: v20+ LTS)
- **npm** (comes with Node.js)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see [Environment Variables](#environment-variables))

3. Run the development server:
   ```bash
   npm run dev
   ```

The app will be available at:
- Local: https://localhost:5173
- Network: https://[your-ip]:5173

### HTTPS Setup

This project uses HTTPS locally. The certificates are located in `.certs/`:
- `.certs/localhost+3.pem` (certificate)
- `.certs/localhost+3-key.pem` (private key)

If certificates are missing, the dev server will fall back to HTTP.

---

## External Access with ngrok

ngrok allows you to expose your local development server to the internet with a public URL.

### Installation

**macOS (with Homebrew):**
```bash
brew install ngrok
```

**Other platforms:**
Visit https://ngrok.com/download

### Setup

1. Sign up for free at https://ngrok.com
2. Get your authtoken from the dashboard
3. Configure ngrok:
   ```bash
   ngrok config add-authtoken <your-token>
   ```

### Running with ngrok

1. Start your dev server in one terminal:
   ```bash
   npm run dev
   ```

2. In another terminal, create an HTTPS tunnel:
   ```bash
   ngrok http https://localhost:5173
   ```

3. ngrok will display a public URL like:
   ```
   Forwarding: https://abc123-def.ngrok.io -> https://localhost:5173
   ```

4. Use this URL to access your app from anywhere.

### Tips for ngrok

- The free tier URLs change each time you restart ngrok
- For consistent URLs, upgrade to ngrok Pro (reserved domains)
- ngrok provides a web interface at http://localhost:4040 to inspect requests
- Use the ngrok mobile app to easily copy the tunnel URL

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Required: Gemini API key for AI features
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Required: Clerk publishable key for authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here

# Required: API URL for backend connection
VITE_API_URL=https://your-api-url.com

# Optional: Original API URL (for reference or fallbacks)
VITE_API_URL_ORIG=https://localhost:3001
```

### Getting API Keys

**Gemini API Key:**
1. Visit https://ai.google.dev/
2. Sign in with your Google account
3. Create an API key in the API keys section

**Clerk Publishable Key:**
1. Visit https://dashboard.clerk.dev/
2. Create or select your application
3. Copy the "Publishable key" from the API Keys section

---

## API Connection Configuration

### Backend API Setup

The frontend connects to a backend API for data persistence. The API URL is configured via `VITE_API_URL`.

### API URL Options

**Local Development (same machine):**
```env
VITE_API_URL=http://localhost:3001
```

**Local Network (different device on same network):**
```env
VITE_API_URL=https://192.168.x.x:3001
```

**Production/Deployed:**
```env
VITE_API_URL=https://api.yourdomain.com
```

### ngrok + API Configuration

When using ngrok for external access:

1. If API is also tunneled via ngrok:
   ```env
   VITE_API_URL=https://your-api-ngrok-url.ngrok.io
   ```

2. Update CORS settings on the backend to allow the ngrok origin

3. Ensure the API uses HTTPS to avoid mixed-content errors

---

## Troubleshooting

### Build Issues

**Error: `Cannot find module '@vitejs/plugin-react'`**
- Solution: Run `npm install` to install missing dependencies

**Error: `outDir is not empty` on rebuild**
- Solution: Delete the `dist/` folder before building: `rm -rf dist`

**TypeScript compilation errors**
- Run `npx tsc --noEmit` to check for type errors
- Fix type errors before building

### Development Server Issues

**Port 5173 is already in use**
- Kill existing process: `npx kill-port 5173`
- Or use a different port: `npm run dev -- --port 3000`

**HTTPS certificate errors in browser**
- Accept the self-signed certificate warning (this is normal for local development)
- Regenerate certificates if needed using mkcert:
  ```bash
  brew install mkcert
  mkcert -install
  mkcert localhost 127.0.0.1 ::1 192.168.x.x
  ```

### ngrok Issues

**ngrok tunnel not working**
- Ensure dev server is running on the correct port: `npm run dev`
- Check firewall settings
- Verify ngrok authtoken is configured: `ngrok config check`

**Mixed content errors when using ngrok**
- Both frontend and API must use HTTPS
- Update `VITE_API_URL` to use `https://`

**CORS errors with ngrok**
- Add ngrok URL to backend CORS allowed origins
- Example (Express.js):
  ```javascript
  app.use(cors({
    origin: ['https://localhost:5173', 'https://*.ngrok.io']
  }));
  ```

### Environment Variable Issues

**Variables not loading**
- Ensure `.env.local` is in the project root (not in `src/`)
- Variables must be prefixed with `VITE_` to be accessible in client code
- Restart the dev server after changing `.env.local`

**API requests failing**
- Check that `VITE_API_URL` is set correctly
- Verify the backend server is running
- Check browser console for CORS or network errors

### Barcode Scanning Issues

**Camera not working on mobile**
- Ensure HTTPS is enabled (required for camera access)
- ngrok tunnel must use HTTPS, not HTTP
- Check browser permissions for camera access

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (https://localhost:5173) |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm test` | Run tests (once configured) |
| `ngrok http https://localhost:5173` | Create public tunnel |

---

## Additional Resources

- [Vite Documentation](https://vitejs.dev/guide/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [ngrok Documentation](https://ngrok.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
