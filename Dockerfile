# CourseForge Frontend Dockerfile (Multi-stage Build)

# Stage 1: Build the Vite production bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies using exact package-lock versions
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and config files
COPY index.html vite.config.js ./
COPY public/ public/
COPY src/ src/

# Allow overriding API base URL at build time (defaults to host-accessible http://localhost:8080)
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build client distribution
RUN npm run build

# Stage 2: Serve static bundle via high-performance Nginx Alpine
FROM nginx:alpine

# Copy custom Nginx configuration with SPA routing and API reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
