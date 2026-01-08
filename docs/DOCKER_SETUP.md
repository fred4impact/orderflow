# Docker Setup Guide

This guide explains how to run the Order Service with Docker Compose, including both backend and frontend services.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- At least 4GB of available RAM
- Ports 3000, 5432, and 8080 available

## Quick Start

### Start All Services

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** database on port 5432
- **Order Service** backend on port 8080
- **Frontend** application on port 3000

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **Health Check**: http://localhost:8080/actuator/health

### Stop All Services

```bash
docker-compose down
```

### Stop and Remove Volumes (Clean Slate)

```bash
docker-compose down -v
```

## Services Overview

### 1. PostgreSQL Database

- **Container**: `order-service-postgres`
- **Port**: 5432
- **Database**: `orderdb`
- **Username**: `postgres`
- **Password**: `postgres`
- **Volume**: `postgres_data` (persists data)

### 2. Order Service (Backend)

- **Container**: `order-service-app`
- **Port**: 8080
- **Build**: Multi-stage Maven build
- **Health Check**: `/actuator/health`
- **Depends on**: PostgreSQL (waits for healthy database)

### 3. Frontend

- **Container**: `order-service-frontend`
- **Port**: 3000 (mapped to nginx port 80)
- **Build**: Multi-stage Node.js build with nginx
- **Health Check**: `/health`
- **Depends on**: Order Service backend
- **API Proxy**: Nginx proxies `/api` requests to backend

## Building Services

### Build All Services

```bash
docker-compose build
```

### Build Specific Service

```bash
docker-compose build frontend
docker-compose build order-service
```

### Build Without Cache

```bash
docker-compose build --no-cache
```

## Viewing Logs

### All Services

```bash
docker-compose logs -f
```

### Specific Service

```bash
docker-compose logs -f frontend
docker-compose logs -f order-service
docker-compose logs -f postgres
```

### Last 100 Lines

```bash
docker-compose logs --tail=100 frontend
```

## Health Checks

All services include health checks:

```bash
# Check service status
docker-compose ps

# Check health
docker inspect order-service-app | grep -A 10 Health
docker inspect order-service-frontend | grep -A 10 Health
```

## Development Workflow

### Option 1: Full Docker (Recommended for Production)

All services run in Docker:

```bash
docker-compose up -d
# Access at http://localhost:3000
```

### Option 2: Hybrid Development

Run backend in Docker, frontend locally:

```bash
# Start only database and backend
docker-compose up -d postgres order-service

# Run frontend locally
cd frontend
npm install
npm run dev
# Access at http://localhost:5173 (Vite default)
```

### Option 3: Local Development

Run everything locally (requires local PostgreSQL):

```bash
# Start only database
docker-compose up -d postgres

# Run backend locally
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Run frontend locally
cd frontend
npm run dev
```

## Environment Variables

### Backend (Order Service)

Set in `docker-compose.yml`:

```yaml
environment:
  DB_HOST: postgres
  DB_PORT: 5432
  DB_NAME: orderdb
  DB_USERNAME: postgres
  DB_PASSWORD: postgres
  SPRING_PROFILES_ACTIVE: prod
```

### Frontend

The frontend uses nginx to proxy API requests. No environment variables needed in Docker.

For local development, create `.env` file:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

## Network Configuration

All services are on the `order-network` bridge network:

- Services can communicate using service names:
  - `postgres` (database)
  - `order-service` (backend)
  - `frontend` (nginx)

- Frontend nginx proxies `/api` to `http://order-service:8080`

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000
lsof -i :8080
lsof -i :5432

# Kill the process or change ports in docker-compose.yml
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Connect to database
docker-compose exec postgres psql -U postgres -d orderdb
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Backend Not Starting

```bash
# Check backend logs
docker-compose logs order-service

# Check if database is ready
docker-compose exec postgres pg_isready -U postgres

# Rebuild backend
docker-compose build --no-cache order-service
docker-compose up -d order-service
```

### Clear Everything and Start Fresh

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove images
docker-compose rm -f

# Rebuild everything
docker-compose build --no-cache
docker-compose up -d
```

## Production Considerations

### Environment Variables

Create `.env` file for production:

```env
POSTGRES_PASSWORD=your_secure_password
DB_PASSWORD=your_secure_password
```

Update `docker-compose.yml`:

```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  DB_PASSWORD: ${DB_PASSWORD}
```

### Security

1. **Change default passwords** in production
2. **Use secrets management** (Docker Secrets, Kubernetes Secrets)
3. **Enable HTTPS** with reverse proxy (Traefik, Nginx)
4. **Limit exposed ports** - only expose necessary ports
5. **Use health checks** for monitoring

### Performance

1. **Resource limits** - Add to docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
   ```

2. **Database optimization** - Tune PostgreSQL settings
3. **Frontend caching** - Already configured in nginx.conf
4. **Connection pooling** - Configured in Spring Boot

## File Structure

```
order-service-java/
├── docker-compose.yml          # Main compose file
├── Dockerfile                  # Backend Dockerfile
├── frontend/
│   ├── Dockerfile             # Frontend Dockerfile
│   ├── nginx.conf             # Nginx configuration
│   └── .dockerignore          # Docker ignore file
└── DOCKER_SETUP.md            # This file
```

## Additional Commands

### Execute Commands in Containers

```bash
# Backend shell
docker-compose exec order-service sh

# Frontend shell
docker-compose exec frontend sh

# Database shell
docker-compose exec postgres psql -U postgres -d orderdb
```

### View Resource Usage

```bash
docker stats
```

### Clean Up Unused Resources

```bash
# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Check health: `docker-compose ps`
3. Review this guide
4. Check service-specific documentation











