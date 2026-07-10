# Multi-stage Vite frontend (interim — replaced by Next standalone in PP-020+)
FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_API_URL=http://pantry-pal-backend:3001
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG BUILD_ID=unknown
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_BUILD_ID=$BUILD_ID

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
RUN echo "$BUILD_ID" > public/build-id.txt 2>/dev/null || mkdir -p public && echo "$BUILD_ID" > public/build-id.txt
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
RUN echo 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]