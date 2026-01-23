# Docker Build and Deployment Guide

This guide covers building Docker images and preparing for Kubernetes deployment.

## 📋 Table of Contents

1. [Dockerfile Overview](#dockerfile-overview)
2. [Building Images](#building-images)
3. [Pushing to Registry](#pushing-to-registry)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Best Practices](#best-practices)

---

## 🐳 Dockerfile Overview

### Backend Dockerfile (`Dockerfile`)

**Location:** Root directory  
**Context:** Project root (`.`)

**Features:**
- ✅ Multi-stage build (Maven → JRE)
- ✅ Layer caching optimization
- ✅ Non-root user for security
- ✅ Health checks configured
- ✅ JVM container optimizations
- ✅ Production-ready configuration

**Build Context:**
```bash
docker build -t order-service-backend:latest -f Dockerfile .
```

### Frontend Dockerfile (`frontend/Dockerfile`)

**Location:** `frontend/` directory  
**Context:** `frontend/` directory

**Features:**
- ✅ Multi-stage build (Node → Nginx)
- ✅ Layer caching optimization
- ✅ Non-root user (nginx)
- ✅ Health checks configured
- ✅ Production nginx configuration

**Build Context:**
```bash
docker build -t order-service-frontend:latest -f frontend/Dockerfile frontend/
```

---

## 🔨 Building Images

### Option 1: Using Docker Compose

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build order-service
docker-compose build frontend

# Build without cache
docker-compose build --no-cache
```

### Option 2: Using Docker Directly

```bash
# Build backend
docker build -t order-service-backend:latest \
  -f Dockerfile \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  .

# Build frontend
docker build -t order-service-frontend:latest \
  -f frontend/Dockerfile \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  frontend/
```

### Option 3: Using Build Script

```bash
# Make script executable
chmod +x build-and-push.sh

# Build images
./build-and-push.sh your-registry.io/order-service v1.0.0

# Build and push
./build-and-push.sh your-registry.io/order-service v1.0.0 --push
```

---

## 📤 Pushing to Registry

### Tag Images

```bash
# Tag backend
docker tag order-service-backend:latest \
  your-registry.io/order-service-backend:v1.0.0

# Tag frontend
docker tag order-service-frontend:latest \
  your-registry.io/order-service-frontend:v1.0.0
```

### Push to Registry

```bash
# Login to registry (if required)
docker login your-registry.io

# Push backend
docker push your-registry.io/order-service-backend:v1.0.0

# Push frontend
docker push your-registry.io/order-service-frontend:v1.0.0
```

### Common Registries

#### Docker Hub
```bash
docker tag order-service-backend:latest username/order-service-backend:v1.0.0
docker push username/order-service-backend:v1.0.0
```

#### AWS ECR
```bash
# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Create repository (if needed)
aws ecr create-repository --repository-name order-service-backend --region us-east-1

# Tag and push
docker tag order-service-backend:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/order-service-backend:v1.0.0
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/order-service-backend:v1.0.0
```

#### Google Container Registry (GCR)
```bash
# Configure Docker to use gcloud
gcloud auth configure-docker

# Tag and push
docker tag order-service-backend:latest \
  gcr.io/PROJECT_ID/order-service-backend:v1.0.0
docker push gcr.io/PROJECT_ID/order-service-backend:v1.0.0
```

#### Azure Container Registry (ACR)
```bash
# Login
az acr login --name yourregistry

# Tag and push
docker tag order-service-backend:latest \
  yourregistry.azurecr.io/order-service-backend:v1.0.0
docker push yourregistry.azurecr.io/order-service-backend:v1.0.0
```

---

## ☸️ Kubernetes Deployment

### Image Requirements for Kubernetes

Both Dockerfiles are optimized for Kubernetes:

1. **Health Checks**: Configured for liveness/readiness probes
2. **Non-root Users**: Security best practice
3. **Resource Limits**: JVM configured for containers
4. **Graceful Shutdown**: Proper signal handling

### Kubernetes Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service-backend
  template:
    metadata:
      labels:
        app: order-service-backend
    spec:
      containers:
      - name: backend
        image: your-registry.io/order-service-backend:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: postgres-service
        - name: DB_PORT
          value: "5432"
        - name: DB_NAME
          value: orderdb
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Using Helm Charts

See `docs/helm-steps.md` for complete Helm chart deployment guide.

```bash
# Install with Helm
helm install order-service ./helm/order-service \
  --namespace order-service \
  --create-namespace \
  --set backend.image.repository=your-registry.io/order-service-backend \
  --set backend.image.tag=v1.0.0 \
  --set frontend.image.repository=your-registry.io/order-service-frontend \
  --set frontend.image.tag=v1.0.0
```

---

## ✅ Best Practices

### 1. Image Tagging Strategy

```bash
# Use semantic versioning
v1.0.0
v1.0.1
v1.1.0

# Use commit SHA for traceability
git-abc1234

# Use branch names for development
dev-latest
staging-latest
main-latest
```

### 2. Security

- ✅ Both images run as non-root users
- ✅ Minimal base images (alpine)
- ✅ No secrets in images
- ✅ Regular security scans

### 3. Optimization

- ✅ Multi-stage builds reduce image size
- ✅ Layer caching for faster builds
- ✅ .dockerignore files exclude unnecessary files
- ✅ JVM tuned for containers

### 4. Health Checks

Both images include health checks:
- **Backend**: `/actuator/health`
- **Frontend**: `/health`

### 5. Resource Management

**Backend JVM Settings:**
- `-XX:+UseContainerSupport`: Respects container limits
- `-XX:MaxRAMPercentage=75.0`: Uses 75% of container memory

**Recommended Kubernetes Resources:**
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

---

## 🔍 Verification

### Test Images Locally

```bash
# Run backend
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=orderdb \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=postgres \
  order-service-backend:latest

# Run frontend
docker run -p 3000:80 \
  order-service-frontend:latest
```

### Check Image Size

```bash
docker images | grep order-service
```

### Inspect Image

```bash
docker inspect order-service-backend:latest
docker history order-service-backend:latest
```

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Build and push Docker images
  run: |
    docker build -t ${{ secrets.REGISTRY }}/order-service-backend:${{ github.sha }} -f Dockerfile .
    docker build -t ${{ secrets.REGISTRY }}/order-service-frontend:${{ github.sha }} -f frontend/Dockerfile frontend/
    docker push ${{ secrets.REGISTRY }}/order-service-backend:${{ github.sha }}
    docker push ${{ secrets.REGISTRY }}/order-service-frontend:${{ github.sha }}
```

### Jenkins Pipeline Example

```groovy
stage('Build Images') {
    sh 'docker build -t order-service-backend:${BUILD_NUMBER} -f Dockerfile .'
    sh 'docker build -t order-service-frontend:${BUILD_NUMBER} -f frontend/Dockerfile frontend/'
}

stage('Push Images') {
    sh 'docker push ${REGISTRY}/order-service-backend:${BUILD_NUMBER}'
    sh 'docker push ${REGISTRY}/order-service-frontend:${BUILD_NUMBER}'
}
```

---

## 📝 Summary

✅ **Backend Dockerfile**: Optimized for Spring Boot, production-ready  
✅ **Frontend Dockerfile**: Optimized for React + Nginx, production-ready  
✅ **Build Script**: Automated build and push process  
✅ **Kubernetes Ready**: Health checks, non-root users, resource limits  
✅ **Security**: Best practices implemented  
✅ **Documentation**: Complete deployment guide

For Kubernetes deployment, refer to `docs/helm-steps.md` for Helm chart setup.

