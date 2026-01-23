# Phase 1 – Kubernetes Manifests (Manual)
What This Application Actually Is (Important)

From the repo structure, Orderflow consists of:

🔹 Backend

Java Spring Boot app

Exposes REST APIs (OrderController)

Uses PostgreSQL

Port: 8080

Config: application.yml

DB schema: schema-postgres.sql

🔹 Frontend

React + Vite

Built into NGINX container

Talks to backend via HTTP

Port: 80

🔹 Database

PostgreSQL

Required for backend to start

Currently handled via docker-compose.yml

➡️ So in Kubernetes we need 3 things:

PostgreSQL

Backend service

Frontend service

### Before deploying anything, inspect the repo:

git clone https://github.com/fred4impact/orderflow.git
cd orderflow


### Create Namespace

```
kubectl create namespace orderflow

# Build & Push Docker Images
cd backend

docker build -t <dockerhub-user>/orderflow-backend:1.0 .
docker push <dockerhub-user>/orderflow-backend:1.0

cd frontend
docker build -t <dockerhub-user>/orderflow-frontend:1.0 .
docker push <dockerhub-user>/orderflow-frontend:1.0


``` 
## Deploy PostgreSQL (Simple, Non-Prod)

cd into k8s
## apply 

***** DEPLOY DATABASE *****
kubectl apply -f postgres.yaml
kubectl apply -f postgres-service.yaml

***** DEPLOY BACKEND *****
kubectl apply -f backend.yaml
kubectl apply -f backend-service.yaml

## check logs 
kubectl logs deploy/backend -n orderflow

## Next deploy frontend  by applying 

kubectl apply -f frontend.yaml
kubectl apply -f frontend-service.yaml

## to see the application use browser 
http://<WORKER_PUBLIC_IP>:30080

http//44.210.23.194:30080