# Multi-stage build for Frontend
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies using npm ci for faster, reliable, reproducible builds
RUN npm ci --only=production=false && \
    npm cache clean --force

# Copy source code and config files
COPY . .

# Build the application
RUN npm run build

# Verify build output exists
RUN test -d dist || (echo "Build output 'dist' directory not found!" && exit 1)

# Production stage with nginx
FROM nginx:alpine

# Install wget for health checks
RUN apk add --no-cache wget

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directories and set permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# Switch to non-root user (nginx user already exists in alpine)
USER nginx

# Expose port
EXPOSE 80

# Health check for Kubernetes/Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx (use exec form for proper signal handling)
CMD ["nginx", "-g", "daemon off;"]

