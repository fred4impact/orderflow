# Deploying order: A Complete Kubernetes Journey on AWS EC2

## 📋 Executive Summary

This blog documents the end-to-end deployment of **order**, a production-ready order management platform, on a self-managed Kubernetes cluster running on AWS EC2 instances. This project demonstrates real-world DevOps practices, from containerization to GitOps, providing hands-on experience with Kubernetes internals that directly translates to managed services like EKS.

---

## 🎯 About order Application

**order** is a comprehensive, full-stack order management platform designed for modern e-commerce and business operations. It provides a complete solution from order creation to fulfillment, with enterprise-grade DevOps practices built-in.

### Application Architecture

The application follows a microservices architecture with three core components:

1. **Frontend (React + TypeScript)**
   - Modern UI built with React 18.2.0 and TypeScript 5.2.2
   - Served via NGINX in production
   - Responsive design with Tailwind CSS
   - Real-time order management interface

2. **Backend (Spring Boot)**
   - RESTful API built with Spring Boot 3.2.0
   - Java 17 runtime
   - Exposes REST endpoints for order management
   - OpenAPI/Swagger documentation
   - Health checks via Spring Actuator

3. **Database (PostgreSQL)**
   - Persistent data storage
   - Handles order lifecycle and account management
   - Production-ready configuration

### Key Features

- **Order Management**: Create, view, update, and cancel orders
- **Order Lifecycle Tracking**: Complete status flow (PLACED → PAID → PROCESSING → SHIPPED → COMPLETED)
- **Multi-Account Support**: Account-based order management
- **Order Items**: Support for multiple items per order
- **Order History**: Track orders by account ID
- **Status Management**: Update order status with validation

### Tech Stack

- **Backend**: Java 17, Spring Boot 3.2.0, Spring Data JPA, PostgreSQL
- **Frontend**: React 18.2.0, TypeScript 5.2.2, Vite, Tailwind CSS
- **DevOps**: Docker, Kubernetes, Helm, NGINX Ingress Controller
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins pipelines

---

## ☁️ AWS Infrastructure Overview

### Infrastructure Architecture

The deployment uses a **bare-metal Kubernetes cluster** on AWS EC2, providing hands-on experience with Kubernetes internals:

```
┌─────────────────────────────────────────────────────────┐
│                    AWS VPC                              │
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐      │
│  │  Master Node     │      │  Worker Node     │      │
│  │  (Control Plane) │      │  (Worker)       │      │
│  │                  │      │                  │      │
│  │  • kubeadm       │      │  • kubelet       │      │
│  │  • etcd          │      │  • kube-proxy    │      │
│  │  • API Server    │      │  • Application   │      │
│  │  • Scheduler     │      │    Pods          │      │
│  │  • Controller    │      │                  │      │
│  └──────────────────┘      └──────────────────┘      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │         Security Group (All Traffic)            │ │
│  │  • SSH (22) from your IP                        │ │
│  │  • All traffic within same Security Group      │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### EC2 Instance Specifications

| Component | Instance Type | vCPU | Memory | OS | Purpose |
|-----------|--------------|------|--------|----|---------| 
| Master Node | t3.medium (minimum) | 2 | 4 GB | Ubuntu 22.04 LTS | Control Plane |
| Worker Node | t3.medium (minimum) | 2 | 4 GB | Ubuntu 22.04 LTS | Application Workloads |

### Network Configuration

- **VPC**: Single VPC for both master and worker nodes
- **Subnet**: Same subnet for cluster communication (or multiple subnets in same VPC)
- **Security Group**: 
  - Allows all traffic within the same Security Group
  - SSH (port 22) access from your IP
  - NodePort range (30000-32767) for external access
  - Note: UFW is not required as AWS Security Groups act as the firewall

### Region and Availability Zone Requirements

**Important**: All nodes (master and workers) must be in the **same AWS region** for a single Kubernetes cluster.

**Why Same Region?**
- **Low Latency**: Kubernetes requires low-latency communication between nodes
- **etcd Performance**: The master node's etcd database needs consistent, low-latency connections
- **Pod Networking**: CNI plugins (like Calico) expect nodes to be in the same network region
- **Service Discovery**: Kubernetes DNS and service discovery work best with low-latency connections

**Multi-AZ Deployment (Recommended for Production)**

While all nodes must be in the same region, they **can and should** be distributed across different **Availability Zones (AZs)** within that region for high availability:

```
Region: us-east-1
├── Master Node → us-east-1a
├── Worker Node 1 → us-east-1b
├── Worker Node 2 → us-east-1c
└── Worker Node 3 → us-east-1a (or any AZ)
```

**Benefits of Multi-AZ:**
- **High Availability**: If one AZ fails, other nodes continue running
- **Fault Tolerance**: Protects against single AZ outages
- **Load Distribution**: Better resource utilization across AZs

**Considerations:**
- **Network Latency**: Inter-AZ latency is typically < 1ms (acceptable for Kubernetes)
- **Data Transfer Costs**: Inter-AZ data transfer incurs AWS charges (minimal for control plane traffic)
- **VPC Configuration**: Ensure all subnets are in the same VPC and can communicate

**Cross-Region Deployment:**
For multi-region deployments, you would typically:
- Deploy **separate Kubernetes clusters** in each region
- Use federation or service mesh for cross-region communication
- Implement global load balancing (e.g., AWS Global Accelerator)

### Kubernetes Components

- **Container Runtime**: containerd (Kubernetes no longer supports Docker directly)
- **CNI (Container Network Interface)**: Calico (pod network CIDR: 192.168.0.0/16)
- **Kubernetes Version**: v1.29
- **Installation Method**: kubeadm (learning-focused, not managed service)

### Why Self-Managed Kubernetes?

This approach provides:
- **Deep Understanding**: Learn Kubernetes internals (etcd, API server, scheduler, controller manager)
- **Cost-Effective Learning**: Lower cost than managed services for learning
- **Real-World Skills**: Experience that directly translates to EKS, AKS, GKE
- **Troubleshooting Skills**: Hands-on experience with cluster issues and debugging

---

## 🚀 Deployment Steps

### Phase 1: Kubernetes Cluster Setup

#### Step 1: EC2 Instance Provisioning
1. Launch EC2 instances (Ubuntu 22.04 LTS)
   - **Minimum**: One master node + one worker node
   - **Production**: One master + multiple workers (recommended: 3+ workers)
   - **Instance Type**: t3.medium minimum for each node
   - **Region**: All nodes must be in the **same AWS region**
   - **Availability Zones**: Can be in different AZs within the same region (recommended for HA)
   
2. Configure Security Group:
   - Allow SSH (22) from your IP
   - Allow all traffic within the same Security Group
   - Ensure security group allows communication between all nodes
   
3. Network Configuration:
   - All nodes must be in the same VPC
   - Can use same subnet or multiple subnets (in same VPC)
   - Ensure subnets have proper route tables for inter-AZ communication
   
4. Note the private IP addresses of all instances

#### Step 2: Base OS Configuration (Both Nodes)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Disable swap (required for Kubernetes)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Set hostnames
# Master: sudo hostnamectl set-hostname kube-master
# Worker: sudo hostnamectl set-hostname kube-node-01

# Load kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter

# Configure sysctl
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF
sudo sysctl --system
```

#### Step 3: Install containerd (Both Nodes)
```bash
sudo apt install -y containerd
sudo mkdir -p /etc/containerd
sudo containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd
sudo systemctl enable containerd
```

#### Step 4: Install Kubernetes Components (Both Nodes)
```bash
# Add Kubernetes repository
sudo apt install -y curl gpg apt-transport-https
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt update

# Install kubeadm, kubelet, kubectl
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

#### Step 5: Initialize Master Node
```bash
# Get master private IP
hostname -I

# Initialize cluster
sudo kubeadm init \
  --apiserver-advertise-address=<MASTER_PRIVATE_IP> \
  --pod-network-cidr=192.168.0.0/16

# Configure kubectl
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install Calico CNI
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

#### Step 6: Join Worker Nodes
```bash
# Use the kubeadm join command from master initialization output
# Run this on EACH worker node
sudo kubeadm join <MASTER_PRIVATE_IP>:6443 \
  --token <TOKEN> \
  --discovery-token-ca-cert-hash sha256:<HASH>
```

**For Multiple Worker Nodes:**
- Repeat the join command on each worker node
- All workers can use the same join command (token is valid for 24 hours by default)
- Ensure all worker nodes are in the same region as the master
- Workers can be in different Availability Zones for high availability

#### Step 7: Verify Cluster
```bash
# On master node
kubectl get nodes
# Expected: Both nodes should show Ready status
```

### Phase 2: Application Deployment

#### Step 1: Build and Push Docker Images
```bash
# Build backend image
cd backend
docker build -t <dockerhub-user>/order-backend:1.0 .
docker push <dockerhub-user>/order-backend:1.0

# Build frontend image
cd frontend
docker build -t <dockerhub-user>/order-frontend:1.0 .
docker push <dockerhub-user>/order-frontend:1.0
```

#### Step 2: Create Namespace
```bash
kubectl create namespace order
```

#### Step 3: Deploy Database
```bash
cd k8s
kubectl apply -f postgres.yaml
kubectl apply -f postgres-service.yaml
```

#### Step 4: Deploy Backend
```bash
kubectl apply -f backend.yaml
kubectl apply -f backend-service.yaml

# Verify deployment
kubectl logs deploy/backend -n order
```

#### Step 5: Deploy Frontend
```bash
kubectl apply -f frontend.yaml
kubectl apply -f frontend-service.yaml
```

#### Step 6: Access Application (Initial - NodePort)
```bash
# Access via NodePort
http://<WORKER_PUBLIC_IP>:30080
```

### Phase 3: Production Hardening with Ingress

#### Step 1: Install NGINX Ingress Controller
```bash
# For bare-metal Kubernetes
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/bare-metal/deploy.yaml

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

#### Step 2: Convert Services to ClusterIP
- Update frontend and backend services from NodePort to ClusterIP
- Remove nodePort fields

#### Step 3: Create Ingress Resource
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-ingress
  namespace: order
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: order.local
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

#### Step 4: Configure Access
```bash
# Get NodePort
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}'

# Get worker node IP
kubectl get nodes -o wide

# Add to /etc/hosts (on local machine)
sudo vi /etc/hosts
# Add: <WORKER_PUBLIC_IP> order.local

# Access application
http://order.local:<NODEPORT>
```

### Phase 4: Monitoring with Prometheus and Grafana

Setting up comprehensive monitoring is crucial for production deployments. This phase covers installing Prometheus and Grafana using Helm charts.

#### Prerequisites

- Helm 3.x installed
- kubectl configured to access your cluster
- Sufficient cluster resources (recommended: 4+ CPU cores, 8+ GB RAM)

#### Step 1: Add Prometheus Community Helm Repository

```bash
# Add the Prometheus Community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Update Helm repositories
helm repo update

# Verify repository is added
helm repo list
```

#### Step 2: Install kube-prometheus-stack

The `kube-prometheus-stack` Helm chart includes:
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alerting system
- **Node Exporter**: Node-level metrics
- **kube-state-metrics**: Kubernetes cluster metrics

```bash
# Create a namespace for monitoring
kubectl create namespace monitoring

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=standard \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.storageClassName=standard \
  --set grafana.persistence.size=10Gi \
  --set grafana.adminPassword=admin123 \
  --set grafana.service.type=NodePort

# Check installation status
helm status prometheus -n monitoring

# Watch pods being created
kubectl get pods -n monitoring -w
```

**Note**: For bare-metal clusters, use `NodePort` instead of `LoadBalancer` for the Grafana service.

#### Step 3: Verify Installation

```bash
# Check all resources in monitoring namespace
kubectl get all -n monitoring

# Check Prometheus pods
kubectl get pods -n monitoring | grep prometheus

# Check Grafana pods
kubectl get pods -n monitoring | grep grafana

# Check services
kubectl get svc -n monitoring
```

#### Step 4: Access Grafana

**Option 1: Port Forward (Recommended for Testing)**

```bash
# Port forward Grafana service
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80

# Access Grafana at http://localhost:3000
# Default credentials:
# Username: admin
# Password: admin123 (or the password you set during installation)
```

**Option 2: NodePort (For Bare-Metal)**

```bash
# Get the NodePort
kubectl get svc prometheus-grafana -n monitoring

# Get worker node IP
kubectl get nodes -o wide

# Access Grafana at http://<WORKER_NODE_IP>:<NODEPORT>
```

**Option 3: Ingress (For Production)**

```bash
# Create grafana-ingress.yaml
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: monitoring
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: grafana.order.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-grafana
            port:
              number: 80
EOF

# Access via: http://grafana.order.local:<INGRESS_NODEPORT>
```

#### Step 5: Access Prometheus

```bash
# Port forward Prometheus service
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090

# Access Prometheus at http://localhost:9090
```

#### Step 6: Configure ServiceMonitor for order Backend

To scrape metrics from your Spring Boot backend, create a ServiceMonitor:

```bash
# Create servicemonitor.yaml
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: order-backend
  namespace: order
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: http
    path: /actuator/prometheus
    interval: 30s
    scrapeTimeout: 10s
EOF
```

**Important**: Ensure your Spring Boot application exposes Prometheus metrics. Add this to your `application.yml`:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

#### Step 7: Import Commonly Used Grafana Dashboards

After accessing Grafana, import these pre-built dashboards:

**1. Kubernetes Cluster Monitoring (Dashboard ID: 7249)**
- Comprehensive cluster overview
- Node metrics, pod metrics, resource usage
- **Import**: Dashboards → Import → Enter `7249` → Select Prometheus → Import

**2. Spring Boot 2.1 Statistics (Dashboard ID: 11378)**
- Spring Boot application metrics
- HTTP request rates, response times, error rates
- **Import**: Dashboards → Import → Enter `11378` → Select Prometheus → Import

**3. JVM (Micrometer) (Dashboard ID: 4701)**
- JVM memory, GC, thread metrics
- Essential for Java application monitoring
- **Import**: Dashboards → Import → Enter `4701` → Select Prometheus → Import

**4. Node Exporter Full (Dashboard ID: 1860)**
- Detailed node-level metrics
- CPU, memory, disk, network statistics
- **Import**: Dashboards → Import → Enter `1860` → Select Prometheus → Import

**5. Kubernetes Pod Monitoring (Dashboard ID: 6417)**
- Pod-level resource usage
- CPU, memory per pod
- **Import**: Dashboards → Import → Enter `6417` → Select Prometheus → Import

**Quick Import Script:**

```bash
# Dashboard IDs to import
DASHBOARDS=(7249 11378 4701 1860 6417)

# Note: These need to be imported manually through Grafana UI
# Or use Grafana API (advanced)
```

#### Step 8: Create Custom order Dashboard

Create a custom dashboard for order-specific metrics:

```json
{
  "dashboard": {
    "title": "order Application Metrics",
    "tags": ["order", "spring-boot"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_server_requests_seconds_count{application=\"order-backend\"}[5m])",
            "legendFormat": "{{uri}} {{method}}",
            "refId": "A"
          }
        ],
        "yaxes": [
          {
            "format": "reqps",
            "label": "Requests/sec"
          }
        ]
      },
      {
        "id": 2,
        "title": "HTTP Response Time (95th percentile)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{application=\"order-backend\"}[5m]))",
            "legendFormat": "95th percentile",
            "refId": "A"
          }
        ],
        "yaxes": [
          {
            "format": "s",
            "label": "Response Time"
          }
        ]
      },
      {
        "id": 3,
        "title": "JVM Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "jvm_memory_used_bytes{application=\"order-backend\"}",
            "legendFormat": "{{area}}",
            "refId": "A"
          }
        ],
        "yaxes": [
          {
            "format": "bytes",
            "label": "Memory"
          }
        ]
      },
      {
        "id": 4,
        "title": "Active Orders",
        "type": "stat",
        "targets": [
          {
            "expr": "order_orders_active_total",
            "refId": "A"
          }
        ]
      },
      {
        "id": 5,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_server_requests_seconds_count{application=\"order-backend\",status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors",
            "refId": "A"
          }
        ]
      }
    ],
    "refresh": "10s",
    "schemaVersion": 27,
    "version": 1
  }
}
```

**To import this dashboard:**
1. Login to Grafana
2. Go to **Dashboards** → **Import**
3. Paste the JSON above or upload the JSON file
4. Select **Prometheus** as the data source
5. Click **Import**

#### Step 9: Useful Prometheus Queries

Common Prometheus queries for monitoring order:

```promql
# HTTP Request Rate
rate(http_server_requests_seconds_count{application="order-backend"}[5m])

# Error Rate (5xx)
rate(http_server_requests_seconds_count{application="order-backend",status=~"5.."}[5m])

# Response Time (95th percentile)
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{application="order-backend"}[5m]))

# JVM Memory Used
jvm_memory_used_bytes{application="order-backend"}

# CPU Usage
rate(process_cpu_seconds_total{application="order-backend"}[5m])

# Pod CPU Usage
rate(container_cpu_usage_seconds_total{namespace="order"}[5m])

# Pod Memory Usage
container_memory_usage_bytes{namespace="order"}

# Kubernetes Node CPU
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Kubernetes Node Memory
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

#### Step 10: Install Using Custom Values File (Advanced)

For production deployments, use a custom values file:

```bash
# Create prometheus-values.yaml
cat <<EOF > prometheus-values.yaml
# Prometheus configuration
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          resources:
            requests:
              storage: 50Gi
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false
    ruleSelectorNilUsesHelmValues: false

# Grafana configuration
grafana:
  adminPassword: admin123
  persistence:
    enabled: true
    storageClassName: standard
    size: 10Gi
  service:
    type: NodePort
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default
  dashboards:
    default:
      kubernetes:
        gnetId: 7249
        revision: 1
        datasource: Prometheus
      spring-boot:
        gnetId: 11378
        revision: 1
        datasource: Prometheus

# Alertmanager configuration
alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          resources:
            requests:
              storage: 10Gi
EOF

# Install with custom values
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml
```

#### Troubleshooting Monitoring

**Issue: ServiceMonitor not scraping metrics**

```bash
# Check ServiceMonitor is created
kubectl get servicemonitor -n order

# Check Prometheus targets
# Access Prometheus UI → Status → Targets
# Or via port-forward: kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090
```

**Issue: Metrics endpoint not accessible**

```bash
# Test metrics endpoint directly
kubectl port-forward svc/backend -n order 8080:8080
curl http://localhost:8080/actuator/prometheus
```

**Issue: Grafana not showing data**

1. Verify Prometheus data source is configured correctly
2. Check time range in Grafana (top right)
3. Verify queries are correct
4. Check Prometheus targets are up

### Phase 5: Advanced Features (Optional)

#### ConfigMaps and Secrets
- Extract configuration from hardcoded values
- Store database credentials in Secrets
- Use ConfigMaps for non-sensitive configuration

#### Health Probes
- Add readiness probes to backend
- Add liveness probes for automatic recovery
- Improve zero-downtime deployments

#### Helm Charts
- Package Kubernetes manifests into Helm chart
- Enable environment-specific deployments
- Simplify application management

#### GitOps with ArgoCD
- Install ArgoCD in cluster
- Set up GitOps repository
- Enable automatic synchronization
- Implement self-healing deployments

---

## 📈 Learning Curves and Challenges

### 1. Kubernetes Fundamentals

**Challenge**: Understanding Kubernetes architecture and components
- **Learning**: Mastered control plane components (API server, etcd, scheduler, controller manager)
- **Skills Gained**: Deep understanding of pod lifecycle, service discovery, networking
- **Time Investment**: 2-3 weeks of hands-on practice

**Key Takeaways**:
- Kubernetes is complex but logical once you understand the architecture
- Hands-on practice is essential - reading alone isn't enough
- Understanding internals makes managed services (EKS) much easier

### 2. Network Configuration

**Challenge**: Configuring networking for bare-metal Kubernetes
- **Learning**: Understanding CNI plugins, pod networking, service types
- **Skills Gained**: Calico configuration, ClusterIP vs NodePort vs LoadBalancer
- **Common Issues**: 
  - Pods unable to communicate
  - Services not accessible externally
  - Ingress routing problems

**Solutions Learned**:
- Proper Security Group configuration in AWS
- Understanding private vs public IPs
- Host header configuration for Ingress

### 3. Container Runtime Migration

**Challenge**: Transition from Docker to containerd
- **Learning**: Kubernetes deprecated Docker support
- **Skills Gained**: containerd configuration, systemd cgroups
- **Adjustment**: Different debugging commands and container management

### 4. Ingress on Bare-Metal

**Challenge**: Setting up Ingress without cloud LoadBalancer
- **Learning**: NodePort-based Ingress for bare-metal
- **Skills Gained**: 
  - NGINX Ingress Controller configuration
  - Host header management
  - /etc/hosts configuration
  - Browser extension workarounds for DNS over HTTPS

**Common Issues**:
- 404 errors when accessing via IP instead of domain
- Firefox DNS over HTTPS bypassing /etc/hosts
- NodePort selection and security group configuration

### 5. Application Deployment

**Challenge**: Deploying multi-tier application (Frontend, Backend, Database)
- **Learning**: Dependency management, startup order, health checks
- **Skills Gained**:
  - Deployment strategies
  - Service discovery
  - Database initialization
  - Environment variable management

**Lessons Learned**:
- Backend must wait for database to be ready
- Health probes are critical for stability
- Proper resource limits prevent OOM kills

### 6. Debugging and Troubleshooting

**Challenge**: Debugging issues in distributed system
- **Learning**: kubectl debugging commands, log analysis, pod inspection
- **Skills Gained**:
  - `kubectl describe` for detailed resource information
  - `kubectl logs` for application debugging
  - `kubectl exec` for container inspection
  - `kubectl get events` for cluster events

**Debugging Workflow**:
1. Check pod status: `kubectl get pods -n order`
2. Describe pod: `kubectl describe pod <pod-name> -n order`
3. Check logs: `kubectl logs <pod-name> -n order`
4. Check events: `kubectl get events -n order --sort-by='.lastTimestamp'`
5. Test connectivity: `kubectl port-forward` for direct testing

### 7. Production Readiness

**Challenge**: Moving from "it works" to "production-ready"
- **Learning**: Security best practices, resource management, monitoring
- **Skills Gained**:
  - ConfigMaps and Secrets management
  - Resource requests and limits
  - Health probes (readiness and liveness)
  - Security contexts (non-root containers)
  - Multi-AZ deployment for high availability

**Production Checklist**:
- ✅ Health probes configured
- ✅ Resource limits set
- ✅ Secrets properly managed
- ✅ Non-root containers
- ✅ Proper logging
- ✅ Monitoring endpoints exposed
- ✅ Multi-AZ deployment (workers in different AZs)
- ✅ Multiple worker nodes for redundancy

### 8. Multi-Node and Multi-AZ Considerations

**Challenge**: Understanding region/AZ requirements and multi-node deployment
- **Learning**: 
  - All nodes must be in the same AWS region
  - Workers can be in different Availability Zones (recommended)
  - Cross-region requires separate clusters
- **Skills Gained**:
  - VPC and subnet planning
  - High availability architecture
  - Network latency considerations
  - Cost optimization (inter-AZ data transfer)

**Key Insights**:
- **Same Region Required**: Kubernetes clusters cannot span regions due to latency requirements
- **Multi-AZ Recommended**: Distribute workers across AZs for fault tolerance
- **Network Planning**: Ensure VPC and subnets allow inter-AZ communication
- **Cost Awareness**: Inter-AZ data transfer has costs, but control plane traffic is minimal

### 8. Monitoring with Prometheus and Grafana

**Challenge**: Setting up comprehensive monitoring and observability
- **Learning**: 
  - Prometheus metrics collection and querying
  - Grafana dashboard creation and customization
  - ServiceMonitor configuration
  - PromQL query language
- **Skills Gained**:
  - Helm chart installation for monitoring stack
  - Dashboard import and customization
  - Metrics endpoint configuration (Spring Boot Actuator)
  - Alerting setup (Alertmanager)
  - Resource monitoring (CPU, memory, disk, network)

**Common Dashboards Used**:
- **Kubernetes Cluster Monitoring** (ID: 7249): Cluster-wide metrics
- **Spring Boot Statistics** (ID: 11378): Application metrics
- **JVM Micrometer** (ID: 4701): JVM performance metrics
- **Node Exporter Full** (ID: 1860): Node-level metrics
- **Kubernetes Pod Monitoring** (ID: 6417): Pod resource usage

**Key Insights**:
- ServiceMonitor is essential for scraping application metrics
- Spring Boot Actuator must expose `/actuator/prometheus` endpoint
- PromQL queries require understanding of rate functions and aggregations
- Grafana dashboards can be imported via ID or JSON
- Monitoring helps identify performance bottlenecks early

### 9. GitOps and Helm

**Challenge**: Adopting GitOps practices and Helm packaging
- **Learning**: Helm chart structure, values management, ArgoCD integration
- **Skills Gained**:
  - Helm templating
  - Environment-specific configurations
  - GitOps workflow
  - ArgoCD application management

**Benefits Realized**:
- Version control for infrastructure
- Automated deployments
- Self-healing capabilities
- Audit trail for changes

---

## 🎓 Skills Acquired

### Technical Skills

1. **Kubernetes Administration**
   - Cluster setup with kubeadm
   - Node management
   - Resource management (Deployments, Services, Ingress)
   - Namespace management
   - ConfigMaps and Secrets

2. **Container Technologies**
   - Docker image building
   - Multi-stage builds
   - containerd runtime
   - Container debugging

3. **Networking**
   - Kubernetes networking concepts
   - CNI plugins (Calico)
   - Service types (ClusterIP, NodePort, LoadBalancer)
   - Ingress controllers

4. **DevOps Practices**
   - Infrastructure as Code
   - CI/CD pipeline understanding
   - GitOps principles
   - Helm chart development

5. **Monitoring and Observability**
   - Prometheus metrics collection and storage
   - Grafana dashboard creation and customization
   - ServiceMonitor configuration
   - PromQL query language
   - Spring Boot Actuator integration
   - Alerting with Alertmanager

6. **Cloud Infrastructure (AWS)**
   - EC2 instance management
   - Security Group configuration
   - VPC networking basics
   - Public/Private IP management

7. **Troubleshooting**
   - Kubernetes debugging
   - Network troubleshooting
   - Application debugging
   - Log analysis

### Soft Skills

- **Problem-Solving**: Systematic approach to debugging distributed systems
- **Documentation**: Comprehensive documentation of processes and solutions
- **Persistence**: Working through complex issues and learning from failures
- **Adaptability**: Adjusting to new tools and technologies (containerd, Ingress)

---

## 💡 Key Takeaways

1. **Hands-On Experience is Invaluable**: Reading about Kubernetes is different from actually deploying and troubleshooting it.

2. **Understanding Internals Matters**: Deep knowledge of Kubernetes internals makes managed services (EKS) much easier to work with.

3. **Start Simple, Then Scale**: Begin with basic deployments, then add complexity (Ingress, Helm, GitOps).

4. **Documentation is Critical**: Good documentation saves time when troubleshooting and helps others learn.

5. **Security Groups are Key**: Proper AWS Security Group configuration is essential for cluster communication.

6. **Bare-Metal Teaches More**: Self-managed Kubernetes provides deeper understanding than jumping straight to managed services.

7. **GitOps is Powerful**: Once you experience GitOps with ArgoCD, you'll never want to go back to manual deployments.

8. **Community Resources**: Kubernetes community documentation and GitHub issues are invaluable resources.

---

## 🚀 Next Steps

### Immediate Improvements
- Set up TLS/HTTPS with cert-manager
- Configure Alertmanager for alerting
- Add persistent volumes for database
- Configure backup strategies
- Deploy additional worker nodes across multiple AZs for high availability
- Set up log aggregation (e.g., Loki + Promtail)

### Advanced Topics
- Migrate to AWS EKS
- Implement AWS ALB Ingress Controller
- Set up IRSA (IAM Roles for Service Accounts)
- Implement blue/green deployments with Argo Rollouts
- Add service mesh (Istio or Linkerd)

### Production Considerations
- **Multi-AZ Deployment**: Distribute worker nodes across multiple Availability Zones
  - All nodes in same region (required)
  - Workers in different AZs (recommended)
  - Master node can be in any AZ
- Auto-scaling (HPA and VPA)
- Resource quotas and limits
- Network policies for security
- Disaster recovery planning
- Multiple master nodes for control plane HA (requires external etcd or stacked etcd)

---

## 📚 Resources and References

- **Kubernetes Official Docs**: https://kubernetes.io/docs/
- **Calico Documentation**: https://docs.tigera.io/calico/
- **NGINX Ingress Controller**: https://kubernetes.github.io/ingress-nginx/
- **Helm Documentation**: https://helm.sh/docs/
- **ArgoCD Documentation**: https://argo-cd.readthedocs.io/

---

## 🎯 Conclusion

This project demonstrates a complete journey from zero to production-ready Kubernetes deployment. By choosing a self-managed approach on AWS EC2, we gained deep understanding of Kubernetes internals that directly translates to managed services. The hands-on experience with troubleshooting, networking, and production hardening provides real-world skills that are highly valuable in DevOps and Platform Engineering roles.

The combination of modern application stack (Spring Boot + React), containerization (Docker), orchestration (Kubernetes), and DevOps practices (Helm + GitOps) creates a comprehensive portfolio project that showcases both technical depth and practical experience.

**Status**: ✅ Complete - From cluster setup to GitOps deployment

---

*This blog post documents a real-world DevOps learning journey. All steps, challenges, and solutions are based on actual experience deploying order on AWS EC2 with self-managed Kubernetes.*
