# Next.js 16 standalone frontend (Node 22)
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=https://localhost:3001
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GEMINI_API_KEY
ARG BUILD_ID=unknown
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_GEMINI_API_KEY=$NEXT_PUBLIC_GEMINI_API_KEY
ENV NEXT_PUBLIC_BUILD_ID=$BUILD_ID
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .

RUN echo "$BUILD_ID" > public/build-id.txt
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/dist/standalone ./
COPY --from=builder /app/dist/static ./dist/static
COPY --from=builder /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]