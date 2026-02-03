# Litmus Chaos Testing for order on Minikube

This comprehensive guide walks you through setting up Litmus Chaos Engineering to test the order application on Minikube, including monitoring infrastructure with Prometheus Node Exporter, Grafana Alloy, and Grafana Beyla for auto-instrumentation.

---

## 📋 Table of Contents

1. [Minikube Setup](#1-minikube-setup)
2. [Deploying order App](#2-deploying-order-app)
   - [Deploy via ArgoCD (Alternative)](#29-deploy-order-via-argocd-alternative-to-direct-deployment)
3. [Prometheus Node Exporter](#3-prometheus-node-exporter)
4. [Grafana Alloy](#4-grafana-alloy)
5. [Grafana Beyla (Auto-instrumentation)](#5-grafana-beyla-auto-instrumentation)
6. [LitmusChaos Installation](#6-litmuschaos-installation)
7. [Running Chaos Experiments](#7-running-chaos-experiments-against-order)
8. [Observing Blast Radius in Grafana](#8-observing-blast-radius-in-grafana)

---

## 1. Minikube Setup

### 1.1 Install Minikube

**On macOS:**
```bash
# Install using Homebrew
brew install minikube

# Or download directly
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
sudo install minikube-darwin-amd64 /usr/local/bin/minikube
```

**On Linux:**
```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

**On Windows:**
```powershell
# Using Chocolatey
choco install minikube

# Or download from: https://minikube.sigs.k8s.io/docs/start/
```

### 1.2 Start Minikube Cluster

```bash
# Start Minikube with sufficient resources for order + monitoring + chaos
minikube start \
  --cpus=4 \
  --memory=8192 \
  --disk-size=20g \
  --driver=docker

# Verify cluster is running
kubectl cluster-info

# Check nodes
kubectl get nodes

# Enable required addons
minikube addons enable metrics-server
minikube addons enable ingress
```

### 1.3 Verify Minikube Setup

```bash
# Check Minikube status
minikube status

# Verify kubectl is configured
kubectl get nodes

# Check available resources
kubectl top nodes

# Expected output should show your minikube node
```

### 1.4 Configure Docker to Use Minikube's Docker

```bash
# Point Docker to Minikube's Docker daemon
eval $(minikube docker-env)

# Verify Docker is using Minikube
docker ps

# Build images directly in Minikube (optional, for local development)
# This allows you to use local images without pushing to a registry
```

---

## 2. Deploying order App

### 2.1 Create Namespace

```bash
# Create order namespace
kubectl create namespace order

# Verify namespace
kubectl get namespace order
```

### 2.2 Build and Push Docker Images

**Option A: Using Docker Hub (Recommended for Minikube)**

```bash
# Set your Docker Hub username
export DOCKER_USERNAME="your-dockerhub-username"

# Build backend image
cd backend
docker build -t ${DOCKER_USERNAME}/order-backend:1.0 .
docker push ${DOCKER_USERNAME}/order-backend:1.0

# Build frontend image
cd ../frontend
docker build -t ${DOCKER_USERNAME}/order-frontend:1.0 .
docker push ${DOCKER_USERNAME}/order-frontend:1.0

cd ..
```

**Option B: Using Minikube's Local Docker (No Registry Needed)**

```bash
# Point Docker to Minikube
eval $(minikube docker-env)

# Build images directly in Minikube
cd backend
docker build -t order-backend:1.0 .
cd ../frontend
docker build -t order-frontend:1.0 .
cd ..

# Update k8s manifests to use imagePullPolicy: Never
# (See section 2.3)
```

### 2.3 Update Kubernetes Manifests (if using local images)

If using Minikube's local Docker, update your manifests to use `imagePullPolicy: Never`:

```bash
# Update backend.yaml
kubectl patch deployment backend -n order --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/imagePullPolicy", "value": "Never"}]' || true

# Update frontend.yaml
kubectl patch deployment frontend -n order --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/imagePullPolicy", "value": "Never"}]' || true
```

Or manually edit the YAML files to add:
```yaml
imagePullPolicy: Never
```

### 2.4 Deploy PostgreSQL

```bash
# Navigate to k8s directory
cd k8s

# Deploy PostgreSQL
kubectl apply -f postgres.yaml
kubectl apply -f postgres-service.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n order --timeout=120s

# Verify PostgreSQL is running
kubectl get pods -n order | grep postgres
```

### 2.5 Deploy Backend

```bash
# Deploy backend
kubectl apply -f backend.yaml
kubectl apply -f backend-service.yaml

# Wait for backend to be ready
kubectl wait --for=condition=ready pod -l app=backend -n order --timeout=120s

# Check backend logs
kubectl logs -l app=backend -n order --tail=50

# Verify backend is running
kubectl get pods -n order | grep backend
```

### 2.6 Deploy Frontend

```bash
# Deploy frontend
kubectl apply -f frontend.yaml
kubectl apply -f frontend-service.yaml

# Wait for frontend to be ready
kubectl wait --for=condition=ready pod -l app=frontend -n order --timeout=120s

# Verify frontend is running
kubectl get pods -n order | grep frontend
```

### 2.7 Verify order Deployment

```bash
# Check all pods are running
kubectl get pods -n order

# Expected output:
# NAME                        READY   STATUS    RESTARTS   AGE
# backend-xxx                 1/1     Running   0          2m
# frontend-xxx                1/1     Running   0          2m
# postgres-xxx                1/1     Running   0          3m

# Check services
kubectl get svc -n order

# Test backend (port-forward)
kubectl port-forward svc/backend -n order 8080:8080 &
# In another terminal: curl http://localhost:8080/api/orders

# Test frontend (port-forward)
kubectl port-forward svc/frontend -n order 3000:80 &
# Open browser: http://localhost:3000
```

### 2.8 Access order via Minikube Service

```bash
# Expose frontend via NodePort (if using NodePort service)
minikube service frontend -n order

# Or use port-forward
kubectl port-forward svc/frontend -n order 3000:80
# Access at http://localhost:3000
```

### 2.9 Deploy order via ArgoCD (Alternative to Direct Deployment)

If you deploy order with **ArgoCD** instead of applying manifests directly with `kubectl`, use this flow. Litmus chaos experiments and the rest of this guide still apply—ArgoCD only changes how the app is deployed and synced.

#### Prerequisites

- ArgoCD installed on the cluster (or in the same Minikube cluster).
- order manifests in a Git repo (or a Helm chart) that ArgoCD can sync from.

**Install ArgoCD on Minikube (if not already installed):**

```bash
# Create ArgoCD namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s

# Get initial admin password (first time)
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
echo

# Access ArgoCD UI (port-forward)
kubectl port-forward svc/argocd-server -n argocd 8443:443
# Open https://localhost:8443 (username: admin)
```

#### Option A: ArgoCD Application pointing at a Git repo (raw manifests)

Ensure your order Kubernetes manifests (PostgreSQL, backend, frontend, services, etc.) are in a Git repository. Then create an ArgoCD Application:

```yaml
# order-argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/YOUR_ORG/order.git   # Your repo with k8s manifests
    targetRevision: main
    path: k8s                                          # Path to manifests (e.g. k8s/)
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
    namespace: order
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
```

Apply and sync:

```bash
# Create order namespace if not managed by ArgoCD
kubectl create namespace order --dry-run=client -o yaml | kubectl apply -f -

# Apply the ArgoCD Application
kubectl apply -f order-argocd-app.yaml

# Watch sync status
kubectl get application order -n argocd -w

# Or use ArgoCD CLI
argocd app sync order
argocd app wait order --health
```

#### Option B: ArgoCD Application with Helm chart

If order is packaged as a Helm chart in Git:

```yaml
# order-argocd-app-helm.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/YOUR_ORG/order.git
    targetRevision: main
    path: charts/order   # Path to Helm chart
    helm:
      valueFiles:
        - values.yaml
      # Override image if needed (e.g. for Minikube local images)
      # parameters:
      #   - name: image.pullPolicy
      #     value: Never
  destination:
    server: https://kubernetes.default.svc
    namespace: order
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```bash
kubectl apply -f order-argocd-app-helm.yaml
argocd app sync order
```

#### Verify deployment and compatibility with Litmus

- Ensure the app ends up in the **`order`** namespace with the same **labels** (e.g. `app=backend`, `app=frontend`, `app=postgres`) as in the direct-deploy steps, so Litmus experiments and Grafana queries in this guide still match.
- If you use different image sources (e.g. Minikube local images), set `image.pullPolicy` in Helm values or in kustomize/overlays so ArgoCD-deployed manifests match your environment.

```bash
# Verify pods (same as direct deploy)
kubectl get pods -n order
kubectl get svc -n order

# Litmus chaos experiments (Section 7) target namespace and labels;
# they work the same whether the app was deployed by kubectl or ArgoCD.
```

#### Differences from direct deployment

| Aspect | Direct (`kubectl apply`) | ArgoCD |
|--------|---------------------------|--------|
| **Apply** | You run `kubectl apply -f ...` | ArgoCD syncs from Git (or Helm) |
| **Updates** | Manual re-apply | Git push + sync (or auto-sync) |
| **Rollback** | Manual revert + apply | ArgoCD history / revert to previous revision |
| **Namespace** | Same: `order` | Same: `order` (configure in `destination.namespace`) |
| **Chaos (Litmus)** | Unchanged | Unchanged—target same namespace and labels |

After order is running via ArgoCD, continue from **Section 3 (Prometheus Node Exporter)** and follow the rest of the guide for Litmus chaos testing and blast radius observation.

---

## 3. Prometheus Node Exporter

### 3.1 Install Prometheus Stack (includes Node Exporter)

The kube-prometheus-stack includes Node Exporter by default. We'll install it for comprehensive monitoring.

```bash
# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
kubectl create namespace monitoring

# Install kube-prometheus-stack (includes Node Exporter)
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=30d \
  --set grafana.adminPassword=admin123 \
  --set grafana.service.type=NodePort \
  --set prometheus.service.type=NodePort \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n monitoring --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n monitoring --timeout=300s
```

### 3.2 Verify Node Exporter

```bash
# Check Node Exporter pods (one per node)
kubectl get pods -n monitoring | grep node-exporter

# Expected output:
# prometheus-prometheus-node-exporter-xxx   1/1     Running   0          2m

# Check Node Exporter service
kubectl get svc -n monitoring | grep node-exporter

# Verify metrics endpoint
kubectl port-forward svc/prometheus-prometheus-node-exporter -n monitoring 9100:9100 &
# In another terminal: curl http://localhost:9100/metrics
```

### 3.3 Access Prometheus and Grafana

```bash
# Access Grafana
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80 &
# Open browser: http://localhost:3000
# Username: admin
# Password: admin123

# Access Prometheus
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090 &
# Open browser: http://localhost:9090
```

### 3.4 Verify Node Metrics in Prometheus

1. Open Prometheus UI: http://localhost:9090
2. Go to **Status → Targets**
3. Look for `node-exporter` target (should be UP)
4. Try query: `node_cpu_seconds_total`
5. Try query: `node_memory_MemTotal_bytes`

---

## 4. Grafana Alloy

Grafana Alloy is a vendor-neutral telemetry collector that can collect metrics, logs, and traces. We'll use it to collect metrics from order and forward them to Prometheus.

### 4.1 Install Grafana Alloy

```bash
# Create namespace for Alloy
kubectl create namespace alloy

# Create Alloy configuration
cat <<EOF > alloy-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alloy-config
  namespace: alloy
data:
  config.alloy: |
    // Prometheus remote_write endpoint
    prometheus.remote_write "prometheus" {
      endpoint {
        url = "http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090/api/v1/write"
      }
    }

    // Scrape order backend metrics
    prometheus.scrape "order_backend" {
      targets = [
        {
          __address__ = "backend.order.svc.cluster.local:8080",
          job = "order-backend",
        },
      ]
      forward_to = [prometheus.remote_write.prometheus.receiver]
      scrape_interval = "30s"
    }

    // Scrape Node Exporter metrics
    prometheus.scrape "node_exporter" {
      targets = [
        {
          __address__ = "prometheus-prometheus-node-exporter.monitoring.svc.cluster.local:9100",
          job = "node-exporter",
        },
      ]
      forward_to = [prometheus.remote_write.prometheus.receiver]
      scrape_interval = "30s"
    }

    // Loki for logs (optional)
    loki.write "loki" {
      endpoint {
        url = "http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push"
      }
    }
EOF

# Apply Alloy configuration
kubectl apply -f alloy-config.yaml

# Create Alloy deployment
cat <<EOF > alloy-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alloy
  namespace: alloy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alloy
  template:
    metadata:
      labels:
        app: alloy
    spec:
      containers:
      - name: alloy
        image: grafana/alloy:latest
        args:
          - run
          - /etc/alloy/config.alloy
        ports:
        - containerPort: 12345
          name: http
        volumeMounts:
        - name: config
          mountPath: /etc/alloy
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: config
        configMap:
          name: alloy-config
---
apiVersion: v1
kind: Service
metadata:
  name: alloy
  namespace: alloy
spec:
  selector:
    app: alloy
  ports:
  - port: 12345
    targetPort: 12345
    name: http
  type: ClusterIP
EOF

# Apply Alloy deployment
kubectl apply -f alloy-deployment.yaml

# Wait for Alloy to be ready
kubectl wait --for=condition=ready pod -l app=alloy -n alloy --timeout=120s

# Verify Alloy is running
kubectl get pods -n alloy
kubectl logs -l app=alloy -n alloy
```

### 4.2 Verify Alloy Metrics Collection

```bash
# Check Alloy logs
kubectl logs -l app=alloy -n alloy --tail=50

# Port-forward Alloy UI
kubectl port-forward svc/alloy -n alloy 12345:12345 &
# Open browser: http://localhost:12345

# Verify metrics are being collected
# In Prometheus UI, check for metrics from order-backend job
```

---

## 5. Grafana Beyla (Auto-instrumentation)

Grafana Beyla provides automatic instrumentation for applications without code changes. It uses eBPF to trace HTTP/gRPC requests.

### 5.1 Install Grafana Beyla

```bash
# Create namespace for Beyla
kubectl create namespace beyla

# Create Beyla DaemonSet (runs on each node)
cat <<EOF > beyla-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: beyla
  namespace: beyla
spec:
  selector:
    matchLabels:
      app: beyla
  template:
    metadata:
      labels:
        app: beyla
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: beyla
        image: grafana/beyla:latest
        securityContext:
          privileged: true
          capabilities:
            add:
              - SYS_ADMIN
              - SYS_RESOURCE
        env:
        - name: BEYLA_OPEN_PORT
          value: "8080"  # Backend port
        - name: BEYLA_PROMETHEUS_PORT
          value: "8999"
        - name: BEYLA_SERVICE_NAME
          value: "order-backend"
        - name: BEYLA_EXECUTABLE_NAME
          value: "java"  # Spring Boot runs on Java
        - name: BEYLA_PROMETHEUS_EXPORTER
          value: "true"
        - name: BEYLA_PRINT_TRACES
          value: "false"
        ports:
        - containerPort: 8999
          name: metrics
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: beyla
  namespace: beyla
spec:
  selector:
    app: beyla
  ports:
  - port: 8999
    targetPort: 8999
    name: metrics
  type: ClusterIP
EOF

# Apply Beyla DaemonSet
kubectl apply -f beyla-daemonset.yaml

# Wait for Beyla pods to be ready
kubectl wait --for=condition=ready pod -l app=beyla -n beyla --timeout=120s

# Verify Beyla is running
kubectl get pods -n beyla
kubectl logs -l app=beyla -n beyla --tail=50
```

### 5.2 Configure Prometheus to Scrape Beyla

```bash
# Create ServiceMonitor for Beyla
cat <<EOF > beyla-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: beyla
  namespace: beyla
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: beyla
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
EOF

# Apply ServiceMonitor
kubectl apply -f beyla-servicemonitor.yaml

# Verify ServiceMonitor
kubectl get servicemonitor -n beyla
```

### 5.3 Verify Beyla Auto-instrumentation

```bash
# Check Beyla metrics endpoint
kubectl port-forward svc/beyla -n beyla 8999:8999 &
# In another terminal: curl http://localhost:8999/metrics

# In Prometheus UI, check for Beyla metrics:
# - http_request_duration_seconds
# - http_request_total
# - http_request_size_bytes
```

---

## 6. LitmusChaos Installation

### 6.1 Install Litmus Operator

```bash
# Create namespace for Litmus
kubectl create namespace litmus

# Install Litmus Operator using Helm
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm repo update

# Install Litmus
helm install litmus litmuschaos/litmus \
  --namespace litmus \
  --set portalScope=cluster

# Wait for Litmus pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=litmus -n litmus --timeout=300s

# Verify Litmus installation
kubectl get pods -n litmus
```

### 6.2 Verify Litmus Installation

```bash
# Check all Litmus components
kubectl get all -n litmus

# Expected output should show:
# - litmus-operator
# - litmus-portal-frontend
# - litmus-portal-server
# - mongo

# Check Custom Resource Definitions (CRDs)
kubectl get crd | grep litmus

# Expected CRDs:
# - chaosengines.litmuschaos.io
# - chaosexperiments.litmuschaos.io
# - chaosresults.litmuschaos.io
```

### 6.3 Access Litmus Portal

```bash
# Port-forward Litmus Portal
kubectl port-forward svc/litmus-portal-frontend -n litmus 9091:9091 &
# Open browser: http://localhost:9091

# Default credentials:
# Username: admin
# Password: litmus

# Or access via Minikube service
minikube service litmus-portal-frontend -n litmus
```

### 6.4 Install Chaos Experiments

Litmus comes with pre-built chaos experiments. Install the ones we'll use for order:

```bash
# Install pod-delete experiment
kubectl apply -f https://hub.litmuschaos.io/api/chaos/master?file=charts/generic/pod-delete/experiment.yaml

# Install pod-cpu-hog experiment
kubectl apply -f https://hub.litmuschaos.io/api/chaos/master?file=charts/generic/pod-cpu-hog/experiment.yaml

# Install pod-memory-hog experiment
kubectl apply -f https://hub.litmuschaos.io/api/chaos/master?file=charts/generic/pod-memory-hog/experiment.yaml

# Install network-delay experiment
kubectl apply -f https://hub.litmuschaos.io/api/chaos/master?file=charts/generic/network-delay/experiment.yaml

# Install pod-network-partition experiment
kubectl apply -f https://hub.litmuschaos.io/api/chaos/master?file=charts/generic/pod-network-partition/experiment.yaml

# Verify experiments are installed
kubectl get chaosexperiments
```

### 6.5 Create Chaos Service Account

```bash
# Create service account for chaos experiments
cat <<EOF > chaos-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: litmus-admin
  namespace: order
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: litmus-admin
rules:
- apiGroups: [""]
  resources: ["pods","events","configmaps","secrets","services"]
  verbs: ["create","list","get","patch","update","delete","deletecollection"]
- apiGroups: [""]
  resources: ["pods/exec","pods/log","pods/eviction","replicationcontrollers"]
  verbs: ["get","list","create"]
- apiGroups: ["apps"]
  resources: ["deployments","daemonsets","replicasets","statefulsets"]
  verbs: ["list","get","patch","update","create","delete"]
- apiGroups: ["apps"]
  resources: ["deployments/finalizers","daemonsets/finalizers","statefulsets/finalizers"]
  verbs: ["update"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get","list","patch","update"]
- apiGroups: ["litmuschaos.io"]
  resources: ["chaosengines","chaosexperiments","chaosresults"]
  verbs: ["create","list","get","patch","update","delete"]
EOF

# Apply service account
kubectl apply -f chaos-serviceaccount.yaml
```

---

## 7. Running Chaos Experiments Against order

### 7.1 Pod Delete Experiment

This experiment deletes a pod to test resilience and recovery.

```bash
# Create pod-delete chaos experiment
cat <<EOF > pod-delete-chaos.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: order-pod-delete
  namespace: order
spec:
  appinfo:
    appns: order
    applabel: app=backend
    appkind: deployment
  annotationCheck: 'false'
  chaosServiceAccount: litmus-admin
  monitoring: true
  jobCleanUpPolicy: 'retain'
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: '60'
        - name: CHAOS_INTERVAL
          value: '10'
        - name: FORCE
          value: 'false'
        - name: PODS_AFFECTED_PERC
          value: '50'
EOF

# Apply chaos experiment
kubectl apply -f pod-delete-chaos.yaml

# Watch the chaos experiment
kubectl get chaosengine -n order
kubectl describe chaosengine order-pod-delete -n order

# Watch pods being deleted and recreated
watch kubectl get pods -n order

# Check chaos results
kubectl get chaosresults -n order
```

### 7.2 Pod CPU Hog Experiment

This experiment consumes CPU resources to test resource limits.

```bash
# Create pod-cpu-hog chaos experiment
cat <<EOF > pod-cpu-hog-chaos.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: order-pod-cpu-hog
  namespace: order
spec:
  appinfo:
    appns: order
    applabel: app=backend
    appkind: deployment
  annotationCheck: 'false'
  chaosServiceAccount: litmus-admin
  monitoring: true
  jobCleanUpPolicy: 'retain'
  experiments:
  - name: pod-cpu-hog
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: '120'
        - name: CPU_CORES
          value: '1'
        - name: PODS_AFFECTED_PERC
          value: '50'
EOF

# Apply chaos experiment
kubectl apply -f pod-cpu-hog-chaos.yaml

# Monitor CPU usage
kubectl top pods -n order

# Check chaos results
kubectl get chaosresults -n order
```

### 7.3 Pod Memory Hog Experiment

This experiment consumes memory resources to test memory limits.

```bash
# Create pod-memory-hog chaos experiment
cat <<EOF > pod-memory-hog-chaos.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: order-pod-memory-hog
  namespace: order
spec:
  appinfo:
    appns: order
    applabel: app=backend
    appkind: deployment
  annotationCheck: 'false'
  chaosServiceAccount: litmus-admin
  monitoring: true
  jobCleanUpPolicy: 'retain'
  experiments:
  - name: pod-memory-hog
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: '120'
        - name: MEMORY_CONSUMPTION
          value: '500'  # MB
        - name: PODS_AFFECTED_PERC
          value: '50'
EOF

# Apply chaos experiment
kubectl apply -f pod-memory-hog-chaos.yaml

# Monitor memory usage
kubectl top pods -n order

# Check chaos results
kubectl get chaosresults -n order
```

### 7.4 Network Delay Experiment

This experiment introduces network latency to test network resilience.

```bash
# Create network-delay chaos experiment
cat <<EOF > network-delay-chaos.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: order-network-delay
  namespace: order
spec:
  appinfo:
    appns: order
    applabel: app=backend
    appkind: deployment
  annotationCheck: 'false'
  chaosServiceAccount: litmus-admin
  monitoring: true
  jobCleanUpPolicy: 'retain'
  experiments:
  - name: network-delay
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: '120'
        - name: NETWORK_DELAY
          value: '2000'  # milliseconds
        - name: NETWORK_INTERFACE
          value: 'eth0'
        - name: TARGET_CONTAINER
          value: 'backend'
EOF

# Apply chaos experiment
kubectl apply -f network-delay-chaos.yaml

# Test API response times during chaos
kubectl port-forward svc/backend -n order 8080:8080 &
# In another terminal, measure response time:
time curl http://localhost:8080/api/orders

# Check chaos results
kubectl get chaosresults -n order
```

### 7.5 Pod Network Partition Experiment

This experiment isolates pods from the network to test partition tolerance.

```bash
# Create pod-network-partition chaos experiment
cat <<EOF > pod-network-partition-chaos.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: order-network-partition
  namespace: order
spec:
  appinfo:
    appns: order
    applabel: app=backend
    appkind: deployment
  annotationCheck: 'false'
  chaosServiceAccount: litmus-admin
  monitoring: true
  jobCleanUpPolicy: 'retain'
  experiments:
  - name: pod-network-partition
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: '120'
        - name: TARGET_PODS
          value: 'backend'
        - name: DESTINATION_HOSTS
          value: 'postgres-service.order.svc.cluster.local'
EOF

# Apply chaos experiment
kubectl apply -f pod-network-partition-chaos.yaml

# Test if backend can still connect to database
kubectl logs -l app=backend -n order --tail=50

# Check chaos results
kubectl get chaosresults -n order
```

### 7.6 Monitor Chaos Experiments

```bash
# List all chaos engines
kubectl get chaosengines -n order

# Describe a specific chaos engine
kubectl describe chaosengine order-pod-delete -n order

# List chaos results
kubectl get chaosresults -n order

# Get detailed chaos result
kubectl get chaosresult order-pod-delete-pod-delete -n order -o yaml

# Watch chaos experiment pods
kubectl get pods -n order | grep chaos
```

### 7.7 Clean Up Chaos Experiments

```bash
# Delete a specific chaos engine
kubectl delete chaosengine order-pod-delete -n order

# Delete all chaos engines in namespace
kubectl delete chaosengines --all -n order

# Delete chaos results (optional, for cleanup)
kubectl delete chaosresults --all -n order
```

---

## 8. Observing Blast Radius in Grafana

### 8.1 Create Grafana Dashboard for Chaos Monitoring

We'll create a comprehensive dashboard to observe the impact of chaos experiments.

```bash
# Create dashboard configuration
cat <<EOF > chaos-dashboard.json
{
  "dashboard": {
    "title": "order Chaos Engineering Dashboard",
    "tags": ["chaos", "order"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Pod Status During Chaos",
        "type": "stat",
        "targets": [
          {
            "expr": "kube_pod_status_phase{namespace=\"order\"}",
            "legendFormat": "{{phase}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Pod Restart Count",
        "type": "graph",
        "targets": [
          {
            "expr": "kube_pod_container_status_restarts_total{namespace=\"order\"}",
            "legendFormat": "{{pod}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "CPU Usage During Chaos",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(container_cpu_usage_seconds_total{namespace=\"order\"}[5m]) * 100",
            "legendFormat": "{{pod}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Memory Usage During Chaos",
        "type": "graph",
        "targets": [
          {
            "expr": "container_memory_usage_bytes{namespace=\"order\"}",
            "legendFormat": "{{pod}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "id": 5,
        "title": "HTTP Request Rate (Beyla)",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_request_total{service_name=\"order-backend\"}[5m])",
            "legendFormat": "{{method}} {{status_code}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "id": 6,
        "title": "HTTP Response Time (Beyla)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service_name=\"order-backend\"}[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service_name=\"order-backend\"}[5m]))",
            "legendFormat": "99th percentile"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      },
      {
        "id": 7,
        "title": "Error Rate During Chaos",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_request_total{service_name=\"order-backend\",status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          },
          {
            "expr": "rate(http_request_total{service_name=\"order-backend\",status_code=~\"4..\"}[5m])",
            "legendFormat": "4xx Errors"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 24}
      },
      {
        "id": 8,
        "title": "Network Latency (if available)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service_name=\"order-backend\"}[5m]))",
            "legendFormat": "Response Time"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 24}
      }
    ],
    "refresh": "10s",
    "time": {
      "from": "now-15m",
      "to": "now"
    }
  }
}
EOF
```

### 8.2 Import Dashboard to Grafana

1. Access Grafana: http://localhost:3000 (via port-forward)
2. Login with admin/admin123
3. Go to **Dashboards** → **Import**
4. Upload `chaos-dashboard.json` or paste the JSON content
5. Select **Prometheus** as data source
6. Click **Import**

### 8.3 Create Prometheus Alerts for Chaos Events

```bash
# Create PrometheusRule for chaos alerts
cat <<EOF > chaos-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: order-chaos-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: order.chaos
    interval: 30s
    rules:
    - alert: HighErrorRateDuringChaos
      expr: rate(http_request_total{service_name="order-backend",status_code=~"5.."}[5m]) > 0.1
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High error rate detected during chaos experiment"
        description: "Error rate is {{ \$value }} req/s for order-backend"
    
    - alert: PodRestartDuringChaos
      expr: increase(kube_pod_container_status_restarts_total{namespace="order"}[5m]) > 0
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "Pod restart detected during chaos"
        description: "Pod {{ \$labels.pod }} has restarted"
    
    - alert: HighResponseTimeDuringChaos
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service_name="order-backend"}[5m])) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High response time during chaos"
        description: "95th percentile response time is {{ \$value }}s"
    
    - alert: PodDownDuringChaos
      expr: up{namespace="order"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Pod is down during chaos experiment"
        description: "Pod {{ \$labels.pod }} is down"
EOF

# Apply PrometheusRule
kubectl apply -f chaos-alerts.yaml

# Verify rule is loaded
kubectl get prometheusrule -n monitoring
```

### 8.4 Observe Blast Radius During Chaos

**Step-by-step observation process:**

1. **Before Chaos:**
   ```bash
   # Note baseline metrics
   kubectl top pods -n order
   kubectl get pods -n order
   
   # Test API
   curl http://localhost:8080/api/orders
   ```

2. **Start Chaos Experiment:**
   ```bash
   kubectl apply -f pod-delete-chaos.yaml
   ```

3. **Monitor in Grafana:**
   - Open the Chaos Engineering Dashboard
   - Watch for:
     - Pod status changes
     - Restart counts increasing
     - CPU/Memory spikes
     - HTTP error rates
     - Response time degradation
     - Request rate changes

4. **Monitor in Prometheus:**
   ```bash
   # Query pod status
   kube_pod_status_phase{namespace="order"}
   
   # Query restart count
   kube_pod_container_status_restarts_total{namespace="order"}
   
   # Query error rate
   rate(http_request_total{service_name="order-backend",status_code=~"5.."}[5m])
   ```

5. **Check Chaos Results:**
   ```bash
   kubectl get chaosresults -n order
   kubectl describe chaosresult <result-name> -n order
   ```

6. **After Chaos:**
   ```bash
   # Verify recovery
   kubectl get pods -n order
   kubectl top pods -n order
   
   # Test API recovery
   curl http://localhost:8080/api/orders
   ```

### 8.5 Create Custom Queries for Blast Radius Analysis

**In Grafana, create panels with these queries:**

1. **Blast Radius - Affected Pods:**
   ```promql
   count(kube_pod_status_phase{namespace="order",phase!="Running"})
   ```

2. **Blast Radius - Service Availability:**
   ```promql
   sum(rate(http_request_total{service_name="order-backend"}[5m])) 
   / 
   sum(rate(http_request_total{service_name="order-backend"}[5m])) 
   * 100
   ```

3. **Blast Radius - Error Rate Impact:**
   ```promql
   rate(http_request_total{service_name="order-backend",status_code=~"5.."}[5m])
   /
   rate(http_request_total{service_name="order-backend"}[5m])
   * 100
   ```

4. **Blast Radius - Recovery Time:**
   ```promql
   time() - kube_pod_status_phase{namespace="order",phase="Running"}
   ```

### 8.6 Export Chaos Experiment Results

```bash
# Get chaos result details
kubectl get chaosresult -n order -o yaml > chaos-results.yaml

# Get chaos engine details
kubectl get chaosengine -n order -o yaml > chaos-engines.yaml

# Export Grafana dashboard
# In Grafana UI: Dashboard → Share → Export → Save to file
```

---

## 9. Troubleshooting

### 9.1 Minikube Issues

```bash
# If Minikube won't start
minikube delete
minikube start --cpus=4 --memory=8192

# Check Minikube logs
minikube logs

# Reset Minikube
minikube stop
minikube delete
minikube start
```

### 9.2 Litmus Issues

```bash
# Check Litmus operator logs
kubectl logs -l app.kubernetes.io/component=litmus -n litmus

# Verify CRDs are installed
kubectl get crd | grep litmus

# Reinstall Litmus if needed
helm uninstall litmus -n litmus
helm install litmus litmuschaos/litmus --namespace litmus
```

### 9.3 Monitoring Issues

```bash
# Check Prometheus targets
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090
# Visit http://localhost:9090/targets

# Check ServiceMonitor
kubectl get servicemonitor --all-namespaces

# Verify metrics are being scraped
kubectl logs -l app=alloy -n alloy
```

### 9.4 Chaos Experiment Issues

```bash
# Check chaos experiment pods
kubectl get pods -n order | grep chaos

# Check chaos experiment logs
kubectl logs <chaos-pod-name> -n order

# Describe chaos engine
kubectl describe chaosengine <chaos-engine-name> -n order

# Check service account permissions
kubectl auth can-i delete pods --as=system:serviceaccount:order:litmus-admin -n order
```

---

## 10. Clean Up

### 10.1 Remove Chaos Experiments

```bash
# Delete all chaos engines
kubectl delete chaosengines --all -n order

# Delete chaos results
kubectl delete chaosresults --all -n order

# Delete chaos service account
kubectl delete -f chaos-serviceaccount.yaml
```

### 10.2 Remove Monitoring Stack

```bash
# Uninstall Grafana Alloy
kubectl delete namespace alloy

# Uninstall Grafana Beyla
kubectl delete namespace beyla

# Uninstall Prometheus Stack
helm uninstall prometheus -n monitoring
kubectl delete namespace monitoring
```

### 10.3 Remove Litmus

```bash
# Uninstall Litmus
helm uninstall litmus -n litmus
kubectl delete namespace litmus
```

### 10.4 Remove order

```bash
# Delete order application
kubectl delete namespace order
```

### 10.5 Stop Minikube

```bash
# Stop Minikube
minikube stop

# Delete Minikube cluster (optional)
minikube delete
```

---

## 11. Best Practices

1. **Start Small**: Begin with low-impact experiments (pod-delete) before moving to resource-intensive ones
2. **Monitor Continuously**: Always have monitoring in place before running chaos experiments
3. **Document Results**: Keep records of chaos experiments and their outcomes
4. **Test Recovery**: Verify that systems recover properly after chaos experiments
5. **Schedule Chaos**: Run chaos experiments during low-traffic periods initially
6. **Set Boundaries**: Use resource limits and timeouts to prevent experiments from running indefinitely
7. **Version Control**: Store chaos experiment YAML files in version control
8. **Automate**: Consider automating chaos experiments as part of CI/CD pipelines

---

## 12. Additional Resources

- **Litmus Documentation**: https://docs.litmuschaos.io/
- **Grafana Alloy**: https://grafana.com/docs/alloy/latest/
- **Grafana Beyla**: https://grafana.com/docs/beyla/latest/
- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
- **Minikube**: https://minikube.sigs.k8s.io/docs/

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Minikube cluster is running
- [ ] order app is deployed and accessible
- [ ] Prometheus and Grafana are running
- [ ] Node Exporter is collecting metrics
- [ ] Grafana Alloy is collecting metrics
- [ ] Grafana Beyla is auto-instrumenting order
- [ ] Litmus is installed and accessible
- [ ] Chaos experiments can be created
- [ ] Chaos experiments execute successfully
- [ ] Grafana dashboard shows metrics during chaos
- [ ] Blast radius is observable in Grafana
- [ ] Alerts trigger during chaos experiments

---

**Status**: ✅ Complete Litmus Chaos setup for order on Minikube

*Last Updated: January 2026*
