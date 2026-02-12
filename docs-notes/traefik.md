# Traefik Setup for order Application

This guide covers implementing Traefik as the ingress controller for the order application on Kubernetes—**using Minikube** and **without Minikube** (bare-metal / cloud). Differences between the two environments are called out clearly.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Using Minikube](#3-using-minikube)
4. [Not Using Minikube (Bare-Metal / Cloud)](#4-not-using-minikube-bare-metal--cloud)
5. [order Ingress and CORS](#5-order-ingress-and-cors)
6. [Access and Verification](#6-access-and-verification)
7. [Differences Summary: Minikube vs Non-Minikube](#7-differences-summary-minikube-vs-non-minikube)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Overview

### 1.1 What is Traefik?

Traefik is a modern reverse proxy and ingress controller for Kubernetes that provides:

- **Dynamic configuration**: Picks up Ingress and related resources automatically
- **Kubernetes-native**: Works with standard Ingress, IngressRoute CRDs, and Gateway API
- **Dashboard**: Built-in UI for routes and services
- **TLS**: Easy certificate management (including Let’s Encrypt)

### 1.2 order Architecture with Traefik

```
                    Traefik (Ingress)
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   Host: order.local
         │
         ├── path /      → frontend Service (port 80)   → Frontend Pods
         └── path /api   → backend Service (port 8080)  → Backend Pods (Spring Boot)
```

### 1.3 When to Use This Guide

- **Minikube**: Local dev on your laptop; Traefik is installed in the cluster and accessed via `minikube tunnel` or NodePort.
- **Non-Minikube**: Any other cluster (bare-metal, EKS, GKE, AKS, k3d, etc.); main differences are how Traefik is exposed (LoadBalancer vs NodePort/hostNetwork) and how you get an IP/hostname.

---

## 2. Prerequisites

- **Kubernetes cluster** (Minikube or other)
- **kubectl** configured for your cluster
- **Helm 3** (recommended for installing Traefik)
- **order** already deployed in namespace `order` (frontend, backend, postgres, and their Services)

Verify order is running:

```bash
kubectl get pods,svc -n order
```

Ensure the `order` namespace exists:

```bash
kubectl create namespace order   # if not already created
```

---

## 3. Using Minikube

These steps assume you are using **Minikube** as your local Kubernetes cluster.

### 3.1 Start Minikube (if not already running)

```bash
minikube start
```

Optional: more resources for order + Traefik:

```bash
minikube start --cpus=4 --memory=8192
```

### 3.2 Do Not Enable the Default Ingress Addon

Minikube’s default ingress addon is **NGINX**. For Traefik, do **not** enable it:

```bash
# Do NOT run: minikube addons enable ingress
minikube addons list   # ensure "ingress" is disabled
```

### 3.3 Add Traefik Helm Repository

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update
```

### 3.4 Install Traefik via Helm (Minikube)

Create a values file so Traefik is usable on Minikube (ports and dashboard):

```bash
cat <<'EOF' > traefik-minikube-values.yaml
# Expose Traefik on fixed NodePorts (set default + exposedPort so chart merge keeps them)
service:
  type: NodePort

ports:
  web:
    expose:
      default: true
      exposedPort: 80
      nodePort: 30080
  websecure:
    expose:
      default: true
      exposedPort: 443
      nodePort: 30443

# Dashboard (optional but useful)
ingressRoute:
  dashboard:
    enabled: true
    matchRule: Host(`traefik.minikube.local`)
    entryPoints:
      - web

# Use standard Kubernetes Ingress (no need for Gateway API for basic setup)
providers:
  kubernetesIngress:
    publishedService:
      enabled: true
EOF
```

Install Traefik in a dedicated namespace:

```bash
kubectl create namespace traefik --dry-run=client -o yaml | kubectl apply -f -
helm install traefik traefik/traefik -n traefik -f traefik-minikube-values.yaml --wait
```

### 3.5 Verify Traefik on Minikube

```bash
kubectl get pods,svc -n traefik
```

You should see the Traefik pod running and a NodePort service (e.g. port 30080 for HTTP).

### 3.6 Get the Minikube IP and Configure Hosts

**Option A: Using Minikube IP (no tunnel)**

```bash
minikube ip
```

Example: `192.168.49.2`. Add to `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts` on Windows):

echo "$(minikube ip) order.local" | sudo tee -a /etc/hosts\n

 cat /etc/hosts | grep order\n
echo "$(minikube ip) traefik.minikube.local" | sudo tee -a /etc/hosts\n
    

192.168.49.2 order.local
```
192.168.49.2    order.local
192.168.49.2    traefik.minikube.local
```

Replace `192.168.49.2` with the output of `minikube ip`.

**Option B: Using minikube tunnel (simulates LoadBalancer)**

In a separate terminal:

```bash
minikube tunnel
```

Then get the “external” IP of the Traefik service (may take a minute):

```bash
kubectl get svc -n traefik
```

If the Traefik service gets an `EXTERNAL-IP` (e.g. `10.x.x.x`), add that IP to your hosts file for `order.local` and `traefik.minikube.local`.  
**Note:** With NodePort and no tunnel, you still access via `http://order.local:30080` (see step 3.8).

### 3.7 Apply order Ingress (Minikube)

Use the order Ingress manifest that references Traefik (see [Section 5](#5-order-ingress-and-cors)):

```bash
kubectl apply -f k8s/order-ingress.yaml
```

Ensure the Ingress uses `ingressClassName: traefik` and that the Traefik Helm chart has created the `traefik` IngressClass:

```bash
kubectl get ingressclass
```

### 3.8 Access order on Minikube

- **If using NodePort (no tunnel):**  
  Use the NodePort shown by `kubectl get svc -n traefik` (e.g. `80:31312/TCP` → use port **31312**).  
  With fixed ports in values (30080/30443):  
  - Frontend/API: `http://order.local:30080`  
  - Dashboard: `http://traefik.minikube.local:30080/dashboard/`  
  If you use whatever port Kubernetes assigns (e.g. 31312), use that in the URL instead: `http://order.local:31312`.

- **If using `minikube tunnel` and Traefik has an EXTERNAL-IP:**  
  - Frontend/API: `http://order.local` (port 80)  
  - Dashboard: `http://traefik.minikube.local/dashboard/`

---

## 4. Not Using Minikube (Bare-Metal / Cloud)

Use this section for any cluster that is **not** Minikube: bare-metal, EKS, GKE, AKS, k3d, etc.

### 4.1 Add Traefik Helm Repository

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update
```

### 4.2 Choose How Traefik Is Exposed

| Environment        | Typical choice       | Why |
|--------------------|----------------------|-----|
| Cloud (EKS, GKE…)  | `LoadBalancer`       | Cloud controller provisions an external LB and IP/hostname. |
| Bare-metal / VM    | `NodePort` or hostNetwork | No cloud LB; you use node IP + nodePort or host ports. |

### 4.3 Install Traefik (Cloud – LoadBalancer)

Create a values file:

```bash
cat <<'EOF' > traefik-cloud-values.yaml
service:
  type: LoadBalancer

ingressRoute:
  dashboard:
    enabled: true
    matchRule: Host(`traefik.yourdomain.com`)   # set your hostname
    entryPoints:
      - web

providers:
  kubernetesIngress:
    publishedService:
      enabled: true
EOF
```

Install:

```bash
kubectl create namespace traefik --dry-run=client -o yaml | kubectl apply -f -
helm install traefik traefik/traefik -n traefik -f traefik-cloud-values.yaml --wait
```

Get the external address (may take 1–2 minutes):

```bash
kubectl get svc -n traefik -w
```

Use the `EXTERNAL-IP` or `EXTERNAL-HOSTNAME` for DNS (e.g. `order.yourdomain.com` → that IP/hostname).

### 4.4 Install Traefik (Bare-Metal – NodePort)

```bash
cat <<'EOF' > traefik-baremetal-values.yaml
# Fixed NodePorts (set default + exposedPort so chart merge keeps them)
service:
  type: NodePort

ports:
  web:
    expose:
      default: true
      exposedPort: 80
      nodePort: 30080
  websecure:
    expose:
      default: true
      exposedPort: 443
      nodePort: 30443

ingressRoute:
  dashboard:
    enabled: true
    matchRule: Host(`traefik.local`)
    entryPoints:
      - web

providers:
  kubernetesIngress:
    publishedService:
      enabled: true
EOF
```

Install:

```bash
kubectl create namespace traefik --dry-run=client -o yaml | kubectl apply -f -
helm install traefik traefik/traefik -n traefik -f traefik-baremetal-values.yaml --wait
```

Get a worker node IP:

```bash
kubectl get nodes -o wide
```

Add to your hosts file, using **port 30080** when opening in browser:

```
<NODE_IP>    order.local
<NODE_IP>    traefik.local
```

Access: `http://order.local:30080`.

### 4.5 Ensure IngressClass Exists

Traefik Helm chart usually creates an IngressClass named `traefik`. Verify:

```bash
kubectl get ingressclass
```

### 4.6 Apply order Ingress (Non-Minikube)

Same as Minikube: use the Traefik-based order Ingress.

```bash
kubectl apply -f k8s/order-ingress.yaml
```

Update `/etc/hosts` (or DNS) so the host used in the Ingress (e.g. `order.local`) points to:

- **Cloud:** LoadBalancer EXTERNAL-IP or hostname.
- **Bare-metal:** Node IP; use port 30080 in the URL unless you put another proxy in front.

---

## 5. order Ingress and CORS

Use a single Ingress that routes `/` to the frontend and `/api` to the backend, with `ingressClassName: traefik`.

### 5.1 Ingress Manifest (Traefik)

File: `k8s/order-ingress.yaml`. This uses the **custom-response-headers** annotation for CORS (no extra CRD required).

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-ingress
  namespace: order
  annotations:
    # CORS for backend API (Traefik; multiple headers separated by ||)
    traefik.ingress.kubernetes.io/custom-response-headers: "Access-Control-Allow-Origin:*||Access-Control-Allow-Methods:GET,POST,PUT,DELETE,OPTIONS||Access-Control-Allow-Headers:DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization||Access-Control-Max-Age:1728000"
spec:
  ingressClassName: traefik
  rules:
    - host: order.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
```

The `custom-response-headers` annotation applies to responses from this Ingress. For path-specific CORS (e.g. only `/api`), use the optional Middleware in section 5.2.

### 5.2 CORS Middleware (Optional, for /api only)

To attach CORS only to the backend, use a Traefik Middleware and reference it from the Ingress (or use an IngressRoute). Example Middleware:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: order-cors
  namespace: order
spec:
  headers:
    accessControlAllowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
    accessControlAllowHeaders:
      - "*"
    accessControlAllowOriginList:
      - "*"
    accessControlMaxAge: 1728000
    addVaryHeader: true
```

Apply after Traefik is installed (Traefik CRDs are installed with the Helm chart):

```bash
kubectl apply -f k8s/traefik-cors-middleware.yaml
```

Then use the Ingress annotation `traefik.ingress.kubernetes.io/router.middlewares: order-order-cors@kubernetescrd` (namespace-middlewarename) to apply this middleware. If you use the `custom-response-headers` annotation in section 5.1, you do not need this Middleware.

---

## 6. Access and Verification

### 6.1 Check Ingress and Traefik

```bash
kubectl get ingress -n order
kubectl describe ingress order-ingress -n order
kubectl get pods,svc -n traefik
```

### 6.2 Test Frontend

```bash
curl -H "Host: order.local" http://<TRAEFIK_IP>:<PORT>/
```

On Minikube with NodePort: `curl -H "Host: order.local" http://$(minikube ip):30080/`

### 6.3 Test Backend API

```bash
curl -H "Host: order.local" http://<TRAEFIK_IP>:<PORT>/api/v1/orders

curl -H "Host: order.local" http://192.168.49.2:30080/api/v1/orders
```

### 6.4 Browser

- Ensure `order.local` (and port if NodePort) is in your hosts file.
- Open `http://order.local` (or `http://order.local:30080` on NodePort).
- Create/list orders; the UI calls `/api/v1`, which Traefik routes to the backend.

---

## 7. Differences Summary: Minikube vs Non-Minikube

| Aspect | Minikube | Non-Minikube (Bare-Metal) | Non-Minikube (Cloud) |
|--------|----------|---------------------------|----------------------|
| **Ingress addon** | Do **not** enable default ingress (NGINX) | N/A | N/A |
| **Traefik service type** | `NodePort` (e.g. 30080) | `NodePort` or hostNetwork | `LoadBalancer` |
| **Getting an IP** | `minikube ip` or `minikube tunnel` | Worker node IP | EXTERNAL-IP from cloud LB |
| **Port in URL** | Often `:30080` unless using tunnel | Often `:30080` (or your nodePort) | Usually port 80/443 |
| **Hosts file** | `minikube ip` → order.local | Node IP → order.local | LB IP/hostname → order.local |
| **DNS** | Optional | Optional | Often use real DNS to LB |
| **Ingress YAML** | Same | Same | Same |

The **same** `k8s/order-ingress.yaml` (with `ingressClassName: traefik`) is used in all environments; only the way Traefik is installed (values: NodePort vs LoadBalancer) and how you resolve `order.local` and which port you use differ.

---

## 8. Troubleshooting

### Ingress has no address / 404

- Confirm Traefik is running: `kubectl get pods -n traefik`
- Confirm IngressClass: `kubectl get ingressclass` and that the Ingress uses `ingressClassName: traefik`
- Check Ingress: `kubectl describe ingress order-ingress -n order`

### 502 Bad Gateway

- Backend/frontend pods and Services must exist in `order`: `kubectl get pods,svc -n order`
- Backend must listen on the port specified in the Service (8080).
- Check Traefik logs: `kubectl logs -n traefik -l app.kubernetes.io/name=traefik -f`

### CORS errors in browser

- Ensure CORS is set either via Ingress `custom-response-headers` or via a Traefik Middleware and annotation.
- Backend’s `CorsConfig` in order can still allow origins; having CORS at Traefik and at the app is fine.

### Wrong host (e.g. 404 from Traefik)

- Always send the same `Host` as in the Ingress rule (e.g. `order.local`), via hosts file or `curl -H "Host: order.local"`.

### Minikube: cannot reach order.local

- Confirm hosts file: `order.local` → `minikube ip` (or EXTERNAL-IP if using tunnel).
- If using NodePort, use `http://order.local:30080`.

### Non-Minikube: cannot reach from outside

- **Cloud:** Wait for LoadBalancer EXTERNAL-IP; check security groups/firewall for 80/443.
- **Bare-metal:** Use node IP and nodePort (e.g. 30080); ensure firewall allows that port.

---

## Quick Reference Commands

```bash
# Add Helm repo and install (Minikube – NodePort)
helm repo add traefik https://traefik.github.io/charts && helm repo update
helm install traefik traefik/traefik -n traefik -f traefik-minikube-values.yaml --wait --create-namespace

# Apply order Ingress
kubectl apply -f k8s/order-ingress.yaml

# Minikube: get IP and open app
minikube ip
# Add to /etc/hosts: <IP> order.local
# Browser: http://order.local:30080

# Check Traefik and Ingress
kubectl get svc,pods -n traefik
kubectl get ingress -n order



#TRY uninstall if issues 
helm uninstall traefik -n traefik || true
kubectl delete ns traefik --wait || true
kubectl create ns traefik

helm install traefik traefik/traefik \
  -n traefik \
  -f traefik-values.yaml


  kubectl -n traefik port-forward pod/traefik-f48df55c7-hzchs 9000:8080


```


