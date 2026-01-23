# Installing Prometheus and Grafana for OrderFlow Monitoring

This guide provides step-by-step instructions for installing Prometheus and Grafana using Helm charts to monitor the OrderFlow application running in Kubernetes.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Kubernetes cluster running (master + worker nodes)
- ✅ `kubectl` configured and able to access your cluster
- ✅ Helm 3.x installed
- ✅ OrderFlow application deployed in Kubernetes
- ✅ Sufficient cluster resources (recommended: 4+ CPU cores, 8+ GB RAM)

**Verify Prerequisites:**

```bash
# Check kubectl access
kubectl cluster-info

# Check Helm version
helm version

# Verify OrderFlow is deployed
kubectl get pods -n orderflow
```

---

## 🚀 Step 1: Add Prometheus Community Helm Repository

The Prometheus Community provides official Helm charts for Prometheus and Grafana.

```bash
# Add the Prometheus Community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Update Helm repositories
helm repo update

# Verify repository is added
helm repo list
```

**Expected Output:**
```
NAME                    URL
prometheus-community    https://prometheus-community.github.io/helm-charts
```

---

## 📦 Step 2: Install kube-prometheus-stack

The `kube-prometheus-stack` Helm chart includes:
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alerting system
- **Node Exporter**: Node-level metrics
- **kube-state-metrics**: Kubernetes cluster metrics

### 2.1 Create Monitoring Namespace

```bash
# Create a dedicated namespace for monitoring
kubectl create namespace monitoring
```

### 2.2 Install with Helm (Bare-Metal Configuration)

For bare-metal Kubernetes clusters (like EC2), use NodePort for service access:

```bash
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
  --set grafana.service.type=NodePort \
  --set prometheus.service.type=NodePort
```

**Configuration Explanation:**
- `retention=30d`: Keep metrics for 30 days
- `storage=50Gi`: Allocate 50GB for Prometheus data
- `grafana.persistence.size=10Gi`: Allocate 10GB for Grafana dashboards
- `adminPassword=admin123`: Set Grafana admin password (change in production!)
- `service.type=NodePort`: Use NodePort for bare-metal access

### 2.3 Alternative: Install with Custom Values File

For more control, create a custom values file:

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

### 2.4 Check Installation Status

```bash
# Check Helm release status
helm status prometheus -n monitoring

# Watch pods being created
kubectl get pods -n monitoring -w
```

**Wait for all pods to be in `Running` state** (this may take 2-5 minutes).

---

## ✅ Step 3: Verify Installation

Verify that all components are running correctly:

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

**Expected Output:**
```
NAME                                      READY   STATUS    RESTARTS   AGE
prometheus-grafana-xxx                   1/1     Running   0          2m
prometheus-kube-prometheus-operator-xxx  1/1     Running   0          2m
prometheus-kube-state-metrics-xxx         1/1     Running   0          2m
prometheus-prometheus-node-exporter-xxx   1/1     Running   0          2m
prometheus-kube-prometheus-prometheus-0  2/2     Running   0          2m
```

---

## 🌐 Step 4: Access Grafana

### Option 1: Port Forward (Recommended for Testing)

```bash
# Port forward Grafana service
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80

# Access Grafana at http://localhost:3000
# Default credentials:
# Username: admin
# Password: admin123 (or the password you set during installation)
```

**Note**: Keep the terminal session open while using port-forward.

### Option 2: NodePort (For Bare-Metal)

```bash
# Get the NodePort
kubectl get svc prometheus-grafana -n monitoring

# Example output:
# NAME                TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
# prometheus-grafana   NodePort   10.96.xxx.xxx  <none>        80:31414/TCP    5m
# The NodePort is 31414 in this example

# Get worker node IP
kubectl get nodes -o wide

# Access Grafana at http://<WORKER_NODE_IP>:31414
```

### Option 3: Ingress (For Production)

If you have NGINX Ingress Controller installed:

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
  - host: grafana.orderflow.local
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

# Add to /etc/hosts (on your local machine)
# <WORKER_NODE_IP> grafana.orderflow.local

# Access via: http://grafana.orderflow.local:<INGRESS_NODEPORT>
```

---

## 📊 Step 5: Access Prometheus

```bash
# Port forward Prometheus service
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090

# Access Prometheus at http://localhost:9090
```

**Prometheus UI Features:**
- **Graph**: Query and visualize metrics
- **Alerts**: View configured alerts
- **Status → Targets**: Check if metrics are being scraped
- **Status → Service Discovery**: View discovered services

---

## 🔧 Step 6: Configure ServiceMonitor for OrderFlow Backend

To scrape metrics from your OrderFlow Spring Boot backend, create a ServiceMonitor:

### 6.1 Verify Backend Service Labels

First, check your backend service labels:

```bash
# Check backend service
kubectl get svc backend -n orderflow -o yaml

# Ensure the service has labels that match the ServiceMonitor selector
```

### 6.2 Create ServiceMonitor

```bash
# Create servicemonitor.yaml
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: orderflow-backend
  namespace: orderflow
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

**Important**: The `release: prometheus` label ensures Prometheus discovers this ServiceMonitor.

### 6.3 Verify ServiceMonitor

```bash
# Check ServiceMonitor is created
kubectl get servicemonitor -n orderflow

# Describe ServiceMonitor
kubectl describe servicemonitor orderflow-backend -n orderflow
```

### 6.4 Verify Metrics Endpoint

Ensure your Spring Boot application exposes Prometheus metrics:

```bash
# Test metrics endpoint directly
kubectl port-forward svc/backend -n orderflow 8080:8080

# In another terminal, test the endpoint
curl http://localhost:8080/actuator/prometheus
```

**Expected Output:** You should see Prometheus metrics in text format.

### 6.5 Configure Spring Boot Application

If metrics are not exposed, add this to your `application.yml`:

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

**Rebuild and redeploy** your backend application after making this change.

### 6.6 Verify Prometheus is Scraping

1. Access Prometheus UI: `http://localhost:9090` (via port-forward)
2. Go to **Status → Targets**
3. Look for `orderflow-backend` target
4. Status should be **UP** (green)

**If target shows DOWN:**
- Check backend pod logs: `kubectl logs -n orderflow -l app=backend`
- Verify metrics endpoint: `curl http://localhost:8080/actuator/prometheus`
- Check ServiceMonitor labels match service labels

---

## 📈 Step 7: Import Grafana Dashboards

After accessing Grafana, import pre-built dashboards for monitoring:

### 7.1 Import via Dashboard ID

1. Login to Grafana (http://localhost:3000)
2. Go to **Dashboards** → **Import**
3. Enter Dashboard ID (see list below)
4. Select **Prometheus** as the data source
5. Click **Import**

### 7.2 Commonly Used Dashboards

#### 1. Kubernetes Cluster Monitoring (ID: 7249)
- **Purpose**: Comprehensive cluster overview
- **Metrics**: Node metrics, pod metrics, resource usage
- **Import**: Dashboard ID `7249`

#### 2. Spring Boot 2.1 Statistics (ID: 11378)
- **Purpose**: Spring Boot application metrics
- **Metrics**: HTTP request rates, response times, error rates
- **Import**: Dashboard ID `11378`

#### 3. JVM (Micrometer) (ID: 4701)
- **Purpose**: JVM performance metrics
- **Metrics**: Memory, GC, threads
- **Import**: Dashboard ID `4701`

#### 4. Node Exporter Full (ID: 1860)
- **Purpose**: Detailed node-level metrics
- **Metrics**: CPU, memory, disk, network statistics
- **Import**: Dashboard ID `1860`

#### 5. Kubernetes Pod Monitoring (ID: 6417)
- **Purpose**: Pod-level resource usage
- **Metrics**: CPU, memory per pod
- **Import**: Dashboard ID `6417`

### 7.3 Create Custom OrderFlow Dashboard

Create a custom dashboard for OrderFlow-specific metrics:

1. In Grafana, go to **Dashboards** → **New Dashboard**
2. Click **Add Visualization**
3. Select **Prometheus** as data source
4. Add panels with the following queries:

**Panel 1: HTTP Request Rate**
```promql
rate(http_server_requests_seconds_count{application="orderflow-backend"}[5m])
```
- **Title**: HTTP Request Rate
- **Legend**: `{{uri}} {{method}}`
- **Unit**: reqps

**Panel 2: Response Time (95th percentile)**
```promql
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{application="orderflow-backend"}[5m]))
```
- **Title**: Response Time (95th percentile)
- **Unit**: seconds

**Panel 3: Error Rate**
```promql
rate(http_server_requests_seconds_count{application="orderflow-backend",status=~"5.."}[5m])
```
- **Title**: 5xx Error Rate
- **Unit**: reqps

**Panel 4: JVM Memory Usage**
```promql
jvm_memory_used_bytes{application="orderflow-backend"}
```
- **Title**: JVM Memory Usage
- **Legend**: `{{area}}`
- **Unit**: bytes

**Panel 5: Pod CPU Usage**
```promql
rate(container_cpu_usage_seconds_total{namespace="orderflow",container="backend"}[5m])
```
- **Title**: Pod CPU Usage
- **Unit**: percent

**Panel 6: Pod Memory Usage**
```promql
container_memory_usage_bytes{namespace="orderflow",container="backend"}
```
- **Title**: Pod Memory Usage
- **Unit**: bytes

---

## 🔍 Step 8: Useful Prometheus Queries

Here are commonly used PromQL queries for monitoring OrderFlow:

### Application Metrics

```promql
# HTTP Request Rate
rate(http_server_requests_seconds_count{application="orderflow-backend"}[5m])

# Error Rate (5xx)
rate(http_server_requests_seconds_count{application="orderflow-backend",status=~"5.."}[5m])

# Response Time (95th percentile)
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{application="orderflow-backend"}[5m]))

# Response Time (99th percentile)
histogram_quantile(0.99, rate(http_server_requests_seconds_bucket{application="orderflow-backend"}[5m]))

# JVM Memory Used
jvm_memory_used_bytes{application="orderflow-backend"}

# JVM Memory Max
jvm_memory_max_bytes{application="orderflow-backend"}

# CPU Usage
rate(process_cpu_seconds_total{application="orderflow-backend"}[5m])
```

### Kubernetes Metrics

```promql
# Pod CPU Usage
rate(container_cpu_usage_seconds_total{namespace="orderflow"}[5m])

# Pod Memory Usage
container_memory_usage_bytes{namespace="orderflow"}

# Pod Restart Count
kube_pod_container_status_restarts_total{namespace="orderflow"}

# Node CPU Usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Node Memory Usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk Usage
100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"})
```

### OrderFlow-Specific Metrics

If you've added custom metrics to your application:

```promql
# Active Orders (if you have this metric)
orderflow_orders_active_total

# Orders Created Rate
rate(orderflow_orders_created_total[5m])

# Orders Completed Rate
rate(orderflow_orders_completed_total[5m])
```

---

## 🛠️ Step 9: Troubleshooting

### Issue 1: ServiceMonitor Not Scraping Metrics

**Symptoms:**
- Prometheus targets show DOWN
- No metrics appear in Grafana

**Solutions:**

```bash
# Check ServiceMonitor exists
kubectl get servicemonitor -n orderflow

# Check ServiceMonitor labels match Prometheus selector
kubectl get servicemonitor orderflow-backend -n orderflow -o yaml

# Verify backend service labels
kubectl get svc backend -n orderflow -o yaml | grep -A 5 labels

# Check Prometheus targets
# Access Prometheus UI → Status → Targets
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090
# Then visit http://localhost:9090/targets
```

**Common Fixes:**
- Ensure ServiceMonitor has `release: prometheus` label
- Verify service labels match ServiceMonitor selector
- Check that metrics endpoint is accessible

### Issue 2: Metrics Endpoint Not Accessible

**Symptoms:**
- `curl http://localhost:8080/actuator/prometheus` returns 404

**Solutions:**

```bash
# Check if Actuator is enabled
kubectl exec -it <backend-pod> -n orderflow -- cat /app/application.yml | grep actuator

# Verify Spring Boot Actuator dependency is in pom.xml
# Add to application.yml:
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  metrics:
    export:
      prometheus:
        enabled: true

# Rebuild and redeploy backend
```

### Issue 3: Grafana Not Showing Data

**Symptoms:**
- Dashboards show "No data"

**Solutions:**

```bash
# Verify Prometheus data source is configured
# In Grafana: Configuration → Data Sources → Prometheus
# URL should be: http://prometheus-kube-prometheus-prometheus:9090

# Check time range in Grafana (top right)
# Ensure it's set to "Last 5 minutes" or appropriate range

# Verify queries are correct
# Test queries directly in Prometheus UI first

# Check if metrics exist in Prometheus
# In Prometheus UI, try query: up{job="orderflow-backend"}
```

### Issue 4: Pods Not Starting

**Symptoms:**
- Prometheus or Grafana pods in `Pending` or `CrashLoopBackOff`

**Solutions:**

```bash
# Check pod status
kubectl get pods -n monitoring

# Check pod logs
kubectl logs <pod-name> -n monitoring

# Check pod events
kubectl describe pod <pod-name> -n monitoring

# Check storage class
kubectl get storageclass

# If storage class doesn't exist, create one or use 'default'
```

### Issue 5: High Resource Usage

**Symptoms:**
- Cluster running out of resources
- Pods being evicted

**Solutions:**

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n monitoring

# Adjust resource limits in values.yaml
# Add to prometheus-values.yaml:
prometheus:
  prometheusSpec:
    resources:
      requests:
        memory: 2Gi
        cpu: 500m
      limits:
        memory: 4Gi
        cpu: 1000m

# Upgrade with new values
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml
```

---

## 🔄 Step 10: Upgrade and Maintenance

### Upgrade Prometheus Stack

```bash
# Update Helm repository
helm repo update

# Check current version
helm list -n monitoring

# Upgrade to latest version
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml

# Check upgrade status
helm status prometheus -n monitoring
```

### Backup Grafana Dashboards

```bash
# Export dashboards via Grafana API (advanced)
# Or manually export from Grafana UI: Dashboard → Share → Export
```

### Clean Up (Uninstall)

```bash
# Uninstall the Helm release
helm uninstall prometheus -n monitoring

# Delete namespace (removes all resources)
kubectl delete namespace monitoring

# Note: This will delete all monitoring data!
```

---

## 📚 Additional Resources

- **Prometheus Documentation**: https://prometheus.io/docs/
- **Grafana Documentation**: https://grafana.com/docs/
- **kube-prometheus-stack Chart**: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- **Spring Boot Actuator**: https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html
- **PromQL Guide**: https://prometheus.io/docs/prometheus/latest/querying/basics/

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Prometheus pods are running
- [ ] Grafana pods are running
- [ ] Can access Grafana UI
- [ ] Can access Prometheus UI
- [ ] ServiceMonitor created for OrderFlow backend
- [ ] Prometheus is scraping OrderFlow metrics (check Targets)
- [ ] At least one dashboard imported in Grafana
- [ ] Metrics are visible in Grafana dashboards
- [ ] Custom dashboard created (optional)

---

## 🎯 Next Steps

- Configure Alertmanager for alerting
- Set up custom alerts for OrderFlow
- Add log aggregation (Loki + Promtail)
- Configure persistent storage for long-term retention
- Set up TLS/HTTPS for Grafana and Prometheus
- Create additional custom dashboards

---

**Status**: ✅ Complete monitoring stack for OrderFlow

*Last Updated: [Current Date]*
