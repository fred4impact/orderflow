# Phase 2 – Kubernetes Hardening & Ingress

## Objectives
- Replace NodePort with Ingress
- Externalize configuration using ConfigMaps & Secrets
- Add readiness & liveness probes
- Prepare workloads for GitOps

---

## 1. Replace NodePort with ClusterIP

Ingress works with ClusterIP services.

### Frontend Service
    ```yaml
    apiVersion: v1
    kind: Service
    metadata:
    name: frontend
    namespace: orderflow
    spec:
    type: ClusterIP
    selector:
        app: frontend
    ports:
        - port: 80
        targetPort: 80

    ```
## Backend Service
        ```yaml
        apiVersion: v1
        kind: Service
        metadata:
        name: backend
        namespace: orderflow
        spec:
        type: ClusterIP
        selector:
            app: backend
        ports:
            - port: 8080
            targetPort: 8080

        ```
## APPLY 
```bash
kubectl apply -f frontend-service.yaml
kubectl apply -f backend-service.yaml

```

## Install NGINX Ingress Controller

**Important:** Choose the correct manifest based on your deployment:

### For Cloud Providers (EKS, AKS, GKE, etc.)
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

### For Bare-Metal Kubernetes (EC2, On-Premises)
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/bare-metal/deploy.yaml
```

**Note:** For bare-metal deployments, see the detailed guide: `INGRESS-BARE-METAL-SETUP.md`
## chceck 
```bash 
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

## Create Ingress Resource
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orderflow-ingress
  namespace: orderflow
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: orderflow.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8080

```
## Apply 
``` bash 
kubectl apply -f ingress.yaml
```
## Add to /etc/hosts:

### For Cloud Providers (EKS, AKS, GKE)

First, get the Ingress IP address:
```bash
kubectl get svc -n ingress-nginx
# Look for the EXTERNAL-IP of the ingress-nginx-controller service
```

Then add the entry to `/etc/hosts`:
```bash
sudo vi /etc/hosts
```

Add this line (replace <INGRESS_IP> with the actual IP):
```
<INGRESS_IP> orderflow.local
# Example:
# 44.210.23.194 orderflow.local
```

### For Bare-Metal Kubernetes (EC2, On-Premises)

For bare-metal deployments, you need to use the worker node IP and NodePort. See `INGRESS-BARE-METAL-SETUP.md` for detailed instructions.

Quick steps:
1. Get worker node IP: `kubectl get nodes -o wide`
2. Get NodePort: `kubectl get svc ingress-nginx-controller -n ingress-nginx`
3. Add to `/etc/hosts`: `<WORKER_NODE_IP> orderflow.local`
4. Access: `http://orderflow.local:<NODEPORT>`

## View the Frontend App

### Cloud Providers
After adding the entry to `/etc/hosts`, open your web browser and navigate to:

```
http://orderflow.local
```

### Bare-Metal
Access using:
```
http://orderflow.local:<NODEPORT>
```

The frontend will be served at the root path `/`, and the backend API will be accessible at `/api`.

**Note:** 
- For cloud providers, the Ingress IP might take a few minutes to be assigned. If you see `<pending>`, wait a bit and check again.
- For bare-metal, ensure your security groups/firewall allow traffic on the NodePort.

# ConfigMaps & Secrets
```yaml Backend ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: orderflow
data:
  SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/orders

```

## Backend Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
  namespace: orderflow
type: Opaque
stringData:
  SPRING_DATASOURCE_USERNAME: orderuser
  SPRING_DATASOURCE_PASSWORD: orderpass
```

## apply 
```bash 
kubectl apply -f backend-config.yaml
kubectl apply -f backend-secret.yaml
```

## Update Backend Deployment with these
```yaml
envFrom:
  - configMapRef:
      name: backend-config
  - secretRef:
      name: backend-secret

```

## Add Health Probes Backend Probes
```yaml 
livenessProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 5
```
## Add Frontend Probes
```yaml
livenessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 5
  periodSeconds: 5
```

Phase 2 Completion Checklist
-- No NodePort services
-- Ingress routing works
-- ConfigMaps & Secrets used
-- Pods show Ready = true


## PHASE 3

---

## 📕 PHASE 3 — ArgoCD & GitOps Deployment

**File:** `docs/PHASE-3-argocd-gitops.md`

```md
# Phase 3 – ArgoCD & GitOps

## Objectives
- Install ArgoCD
- Create GitOps repo
- Auto-sync Orderflow application

---

## 1. Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```