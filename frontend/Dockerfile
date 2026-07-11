# Next.js 16 standalone frontend (Node 22) — monorepo workspace build
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://pantry-pal-backend:52841
ARG BUILD_ID=unknown
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BUILD_ID=$BUILD_ID
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
ENV HUSKY=0
RUN npm ci --workspace=@pantry-pal/frontend --ignore-scripts

COPY frontend ./frontend

RUN echo "$BUILD_ID" > frontend/public/build-id.txt
RUN npm run build -w @pantry-pal/frontend

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=38472
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/frontend/dist/standalone ./
COPY --from=builder /app/frontend/dist/static ./frontend/dist/static
COPY --from=builder /app/frontend/public ./frontend/public

WORKDIR /app/frontend
USER node
EXPOSE 38472
CMD ["node", "server.js"]