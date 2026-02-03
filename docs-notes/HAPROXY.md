# HAProxy Setup for order Application

This comprehensive guide covers setting up HAProxy as a load balancer and reverse proxy for the order application, including both standalone and Kubernetes deployments.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [HAProxy Installation](#2-haproxy-installation)
3. [Standalone HAProxy Configuration](#3-standalone-haproxy-configuration)
4. [Kubernetes HAProxy Deployment](#4-kubernetes-haproxy-deployment)
5. [Load Balancing Configuration](#5-load-balancing-configuration)
6. [Health Checks](#6-health-checks)
7. [SSL/TLS Termination](#7-ssltls-termination)
8. [CORS Configuration](#8-cors-configuration)
9. [Monitoring and Statistics](#9-monitoring-and-statistics)
10. [High Availability Setup](#10-high-availability-setup)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

### 1.1 What is HAProxy?

HAProxy (High Availability Proxy) is a free, open-source load balancer and proxy server that provides:
- **Load Balancing**: Distribute traffic across multiple backend servers
- **High Availability**: Automatic failover and health checking
- **SSL/TLS Termination**: Handle HTTPS connections
- **Request Routing**: Route requests based on path, host, headers
- **Performance**: High-performance, low-latency proxy

### 1.2 order Architecture with HAProxy

```
Internet
   │
   ▼
HAProxy (Port 80/443)
   │
   ├───► Frontend Service (Port 80)
   │    └───► Frontend Pods (React App)
   │
   └───► Backend Service (Port 8080)
        └───► Backend Pods (Spring Boot API)
```

### 1.3 Benefits for order

- **Load Distribution**: Balance traffic across multiple frontend/backend pods
- **Health Monitoring**: Automatic removal of unhealthy backends
- **SSL Offloading**: Handle HTTPS at the proxy level
- **CORS Handling**: Configure CORS headers at proxy level
- **Session Persistence**: Sticky sessions for stateful applications
- **Rate Limiting**: Protect against DDoS and abuse

---

## 2. HAProxy Installation

### 2.1 Install HAProxy on Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt-get update

# Install HAProxy
sudo apt-get install -y haproxy

# Verify installation
haproxy -v

# Check HAProxy version
haproxy -vv
```

### 2.2 Install HAProxy on Linux (CentOS/RHEL)

```bash
# Install EPEL repository (if not already installed)
sudo yum install -y epel-release

# Install HAProxy
sudo yum install -y haproxy

# Verify installation
haproxy -v
```

### 2.3 Install HAProxy on macOS

```bash
# Using Homebrew
brew install haproxy

# Verify installation
haproxy -v
```

### 2.4 Install HAProxy on Windows

Download from: https://haproxy.org/#download

Or use Chocolatey:
```powershell
choco install haproxy
```

### 2.5 Verify Installation

```bash
# Check HAProxy version
haproxy -v

# Check if HAProxy is running
systemctl status haproxy  # Linux
brew services list        # macOS

# Test configuration
haproxy -f /etc/haproxy/haproxy.cfg -c
```

---

## 3. Standalone HAProxy Configuration

### 3.1 Basic HAProxy Configuration

Create or edit `/etc/haproxy/haproxy.cfg`:

```bash
# Create backup of default config
sudo cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.backup

# Edit configuration
sudo nano /etc/haproxy/haproxy.cfg
```

### 3.2 Complete HAProxy Configuration for order

```haproxy
global
    # Logging
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # SSL/TLS settings
    tune.ssl.default-dh-param 2048

defaults
    log global
    mode http
    option httplog
    option dontlognull
    option forwardfor
    option http-server-close
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    timeout http-request 10s
    timeout http-keep-alive 10s
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

# Statistics and Monitoring
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
    stats auth admin:admin123  # Change this password!

# Frontend - Main Entry Point
frontend order_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/order.pem  # SSL certificate (optional)
    
    # Redirect HTTP to HTTPS (if using SSL)
    # redirect scheme https code 301 if !{ ssl_fc }
    
    # ACLs for routing
    acl is_api path_beg /api
    acl is_frontend path_beg /
    
    # CORS headers for API requests
    http-response set-header Access-Control-Allow-Origin "*" if is_api
    http-response set-header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" if is_api
    http-response set-header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" if is_api
    http-response set-header Access-Control-Allow-Credentials "true" if is_api
    http-response set-header Access-Control-Max-Age "1728000" if is_api
    
    # Handle OPTIONS preflight requests
    http-request return status 200 hdr Access-Control-Allow-Origin "*" hdr Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" hdr Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" if METH_OPTIONS
    
    # Route to backends
    use_backend order_backend if is_api
    default_backend order_frontend_backend

# Backend - Frontend Service (React App)
backend order_frontend_backend
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    
    # Health check configuration
    option forwardfor
    http-request set-header X-Forwarded-Proto https if { ssl_fc }
    http-request set-header X-Forwarded-Proto http if !{ ssl_fc }
    
    # Server definitions
    # Option 1: Direct to Kubernetes NodePort
    server frontend1 <KUBERNETES_NODE_IP>:30080 check
    
    # Option 2: Direct to service IP (if accessible)
    # server frontend1 <FRONTEND_SERVICE_IP>:80 check
    
    # Option 3: Multiple frontend pods (if you have multiple nodes)
    # server frontend1 <NODE1_IP>:30080 check
    # server frontend2 <NODE2_IP>:30080 check
    # server frontend3 <NODE3_IP>:30080 check

# Backend - Backend Service (Spring Boot API)
backend order_backend
    balance roundrobin
    option httpchk GET /actuator/health
    http-check expect status 200
    
    # Health check configuration
    option forwardfor
    http-request set-header X-Forwarded-Proto https if { ssl_fc }
    http-request set-header X-Forwarded-Proto http if !{ ssl_fc }
    http-request set-header Host order.local
    
    # Server definitions
    # Option 1: Direct to Kubernetes service (if HAProxy is in cluster)
    server backend1 backend.order.svc.cluster.local:8080 check
    
    # Option 2: Direct to NodePort (if HAProxy is outside cluster)
    # server backend1 <KUBERNETES_NODE_IP>:<BACKEND_NODEPORT> check
    
    # Option 3: Multiple backend pods
    # server backend1 <NODE1_IP>:<NODEPORT> check
    # server backend2 <NODE2_IP>:<NODEPORT> check
    # server backend3 <NODE3_IP>:<NODEPORT> check
```

### 3.3 Get Kubernetes Service Information

Before configuring HAProxy, get the necessary IPs and ports:

```bash
# Get Kubernetes node IPs
kubectl get nodes -o wide

# Get frontend service NodePort
kubectl get svc frontend -n order -o jsonpath='{.spec.ports[0].nodePort}'

# Get backend service information
kubectl get svc backend -n order

# Get cluster IPs (if HAProxy is inside cluster)
kubectl get svc -n order
```

### 3.4 Update Configuration with Actual Values

Replace placeholders in the configuration:

```bash
# Edit configuration
sudo nano /etc/haproxy/haproxy.cfg

# Replace:
# <KUBERNETES_NODE_IP> with actual node IP
# <FRONTEND_SERVICE_IP> with frontend service IP
# <BACKEND_NODEPORT> with backend NodePort (if using)
```

### 3.5 Test Configuration

```bash
# Test HAProxy configuration syntax
sudo haproxy -f /etc/haproxy/haproxy.cfg -c

# Expected output: "Configuration file is valid"
```

### 3.6 Start and Enable HAProxy

```bash
# Start HAProxy
sudo systemctl start haproxy

# Enable HAProxy to start on boot
sudo systemctl enable haproxy

# Check status
sudo systemctl status haproxy

# View logs
sudo journalctl -u haproxy -f
```

### 3.7 Verify HAProxy is Working

```bash
# Check if HAProxy is listening
sudo netstat -tlnp | grep haproxy
# or
sudo ss -tlnp | grep haproxy

# Test frontend
curl http://localhost/

# Test backend API
curl http://localhost/api/orders

# Check statistics
curl http://localhost:8404/stats
# Or open in browser: http://<HAProxy_IP>:8404/stats
```

---

## 4. Kubernetes HAProxy Deployment

### 4.1 Create HAProxy ConfigMap

```bash
# Create HAProxy configuration for Kubernetes
cat <<EOF > haproxy-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-config
  namespace: order
data:
  haproxy.cfg: |
    global
        log stdout format raw local0
        maxconn 4096
        daemon

    defaults
        log global
        mode http
        option httplog
        option dontlognull
        option forwardfor
        option http-server-close
        timeout connect 5000ms
        timeout client 50000ms
        timeout server 50000ms
        timeout http-request 10s
        timeout http-keep-alive 10s

    # Statistics
    frontend stats
        bind *:8404
        stats enable
        stats uri /stats
        stats refresh 30s
        stats admin if TRUE

    # Frontend - Main Entry Point
    frontend order_frontend
        bind *:80
        
        # ACLs for routing
        acl is_api path_beg /api
        acl is_frontend path_beg /
        
        # CORS headers
        http-response set-header Access-Control-Allow-Origin "*" if is_api
        http-response set-header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" if is_api
        http-response set-header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" if is_api
        http-response set-header Access-Control-Allow-Credentials "true" if is_api
        
        # Handle OPTIONS
        http-request return status 200 hdr Access-Control-Allow-Origin "*" hdr Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" hdr Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" if METH_OPTIONS
        
        # Route to backends
        use_backend order_backend if is_api
        default_backend order_frontend_backend

    # Backend - Frontend Service
    backend order_frontend_backend
        balance roundrobin
        option httpchk GET /health
        http-check expect status 200
        option forwardfor
        
        server frontend1 frontend.order.svc.cluster.local:80 check

    # Backend - Backend Service
    backend order_backend
        balance roundrobin
        option httpchk GET /actuator/health
        http-check expect status 200
        option forwardfor
        http-request set-header Host order.local
        
        server backend1 backend.order.svc.cluster.local:8080 check
EOF

# Apply ConfigMap
kubectl apply -f haproxy-configmap.yaml
```

### 4.2 Create HAProxy Deployment

```bash
# Create HAProxy deployment
cat <<EOF > haproxy-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: haproxy
  namespace: order
  labels:
    app: haproxy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: haproxy
  template:
    metadata:
      labels:
        app: haproxy
    spec:
      containers:
      - name: haproxy
        image: haproxy:2.8-alpine
        ports:
        - containerPort: 80
          name: http
        - containerPort: 8404
          name: stats
        volumeMounts:
        - name: haproxy-config
          mountPath: /usr/local/etc/haproxy
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /stats
            port: 8404
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /stats
            port: 8404
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: haproxy-config
        configMap:
          name: haproxy-config
EOF

# Apply deployment
kubectl apply -f haproxy-deployment.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=haproxy -n order --timeout=120s
```

### 4.3 Create HAProxy Service

```bash
# Create HAProxy service
cat <<EOF > haproxy-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: haproxy
  namespace: order
  labels:
    app: haproxy
spec:
  type: NodePort
  selector:
    app: haproxy
  ports:
  - name: http
    port: 80
    targetPort: 80
    nodePort: 30090
  - name: stats
    port: 8404
    targetPort: 8404
    nodePort: 30404
EOF

# Apply service
kubectl apply -f haproxy-service.yaml

# Verify service
kubectl get svc haproxy -n order
```

### 4.4 Verify HAProxy Deployment

```bash
# Check HAProxy pods
kubectl get pods -l app=haproxy -n order

# Check HAProxy logs
kubectl logs -l app=haproxy -n order --tail=50

# Test HAProxy
kubectl port-forward svc/haproxy -n order 8080:80 &
curl http://localhost:8080/
curl http://localhost:8080/api/orders

# Access statistics
kubectl port-forward svc/haproxy -n order 8404:8404 &
# Open browser: http://localhost:8404/stats
```

---

## 5. Load Balancing Configuration

### 5.1 Load Balancing Algorithms

HAProxy supports multiple load balancing algorithms. Update your backend configuration:

```haproxy
# Round Robin (default) - Distributes requests evenly
backend order_backend
    balance roundrobin
    server backend1 backend.order.svc.cluster.local:8080 check
    server backend2 backend.order.svc.cluster.local:8080 check

# Least Connections - Routes to server with fewest connections
backend order_backend
    balance leastconn
    server backend1 backend.order.svc.cluster.local:8080 check
    server backend2 backend.order.svc.cluster.local:8080 check

# Source IP Hash - Sticky sessions based on client IP
backend order_backend
    balance source
    server backend1 backend.order.svc.cluster.local:8080 check
    server backend2 backend.order.svc.cluster.local:8080 check

# URI Hash - Sticky sessions based on URI
backend order_backend
    balance uri
    server backend1 backend.order.svc.cluster.local:8080 check
    server backend2 backend.order.svc.cluster.local:8080 check

# Weighted Round Robin - Assign weights to servers
backend order_backend
    balance roundrobin
    server backend1 backend.order.svc.cluster.local:8080 check weight 3
    server backend2 backend.order.svc.cluster.local:8080 check weight 1
```

### 5.2 Configure Multiple Backend Servers

For high availability, configure multiple backend pods:

```haproxy
backend order_backend
    balance roundrobin
    option httpchk GET /actuator/health
    http-check expect status 200
    option forwardfor
    
    # Multiple backend servers
    server backend1 backend.order.svc.cluster.local:8080 check
    server backend2 backend.order.svc.cluster.local:8080 check
    server backend3 backend.order.svc.cluster.local:8080 check
```

### 5.3 Server Weight and Backup Configuration

```haproxy
backend order_backend
    balance roundrobin
    option httpchk GET /actuator/health
    
    # Primary servers
    server backend1 backend.order.svc.cluster.local:8080 check weight 100
    server backend2 backend.order.svc.cluster.local:8080 check weight 100
    
    # Backup server (used only if primaries are down)
    server backend3 backend.order.svc.cluster.local:8080 check backup
```

### 5.4 Connection Limits

```haproxy
backend order_backend
    balance roundrobin
    option httpchk GET /actuator/health
    
    # Limit connections per server
    server backend1 backend.order.svc.cluster.local:8080 check maxconn 100
    server backend2 backend.order.svc.cluster.local:8080 check maxconn 100
```

---

## 6. Health Checks

### 6.1 HTTP Health Checks

```haproxy
backend order_backend
    # Basic HTTP check
    option httpchk GET /actuator/health
    
    # HTTP check with expected status
    option httpchk GET /actuator/health
    http-check expect status 200
    
    # HTTP check with expected string
    option httpchk GET /actuator/health
    http-check expect string "UP"
    
    server backend1 backend.order.svc.cluster.local:8080 check
```

### 6.2 Advanced Health Check Configuration

```haproxy
backend order_backend
    # Health check interval and timeout
    option httpchk GET /actuator/health
    http-check expect status 200
    
    # Check interval (default: 2s)
    # Check timeout (default: connect timeout)
    
    server backend1 backend.order.svc.cluster.local:8080 \
        check \
        inter 3s \
        fall 3 \
        rise 2 \
        timeout connect 5s \
        timeout server 10s
```

**Health Check Parameters:**
- `inter`: Interval between checks (e.g., `3s`)
- `fall`: Number of consecutive failures before marking as down (e.g., `3`)
- `rise`: Number of consecutive successes before marking as up (e.g., `2`)
- `timeout connect`: Timeout for connection
- `timeout server`: Timeout for server response

### 6.3 TCP Health Checks

```haproxy
backend order_backend
    # TCP check (just checks if port is open)
    option tcplog
    
    server backend1 backend.order.svc.cluster.local:8080 check
```

### 6.4 Verify Health Checks

```bash
# Check HAProxy statistics
curl http://localhost:8404/stats | grep backend

# Or use HAProxy stats page
# Open browser: http://<HAProxy_IP>:8404/stats

# Check backend status
echo "show stat" | socat stdio /run/haproxy/admin.sock | grep order_backend
```

---

## 7. SSL/TLS Termination

### 7.1 Generate SSL Certificate

```bash
# Create directory for certificates
sudo mkdir -p /etc/ssl/certs

# Generate self-signed certificate (for testing)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/order.key \
    -out /etc/ssl/certs/order.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=order.local"

# Combine certificate and key for HAProxy
sudo cat /etc/ssl/certs/order.crt /etc/ssl/private/order.key | \
    sudo tee /etc/ssl/certs/order.pem

# Set permissions
sudo chmod 600 /etc/ssl/certs/order.pem
sudo chown haproxy:haproxy /etc/ssl/certs/order.pem
```

### 7.2 Configure SSL in HAProxy

```haproxy
frontend order_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/order.pem
    
    # Redirect HTTP to HTTPS
    redirect scheme https code 301 if !{ ssl_fc }
    
    # ACLs
    acl is_api path_beg /api
    
    # Route to backends
    use_backend order_backend if is_api
    default_backend order_frontend_backend
```

### 7.3 SSL Configuration Options

```haproxy
frontend order_frontend
    bind *:443 ssl \
        crt /etc/ssl/certs/order.pem \
        alpn h2,http/1.1 \
        ssl-min-ver TLSv1.2 \
        ssl-max-ver TLSv1.3 \
        ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384
    
    # HSTS header
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

### 7.4 SSL with Let's Encrypt (Production)

```bash
# Install Certbot
sudo apt-get install -y certbot

# Obtain certificate
sudo certbot certonly --standalone -d order.local

# Combine certificate for HAProxy
sudo cat /etc/letsencrypt/live/order.local/fullchain.pem \
    /etc/letsencrypt/live/order.local/privkey.pem | \
    sudo tee /etc/ssl/certs/order.pem

# Update HAProxy config
# Use the Let's Encrypt certificate path
```

---

## 8. CORS Configuration

### 8.1 Basic CORS Configuration

```haproxy
frontend order_frontend
    bind *:80
    
    acl is_api path_beg /api
    
    # Set CORS headers for API responses
    http-response set-header Access-Control-Allow-Origin "*" if is_api
    http-response set-header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" if is_api
    http-response set-header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" if is_api
    http-response set-header Access-Control-Allow-Credentials "true" if is_api
    http-response set-header Access-Control-Max-Age "1728000" if is_api
    
    # Handle OPTIONS preflight requests
    http-request return status 200 \
        hdr Access-Control-Allow-Origin "*" \
        hdr Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" \
        hdr Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" \
        if METH_OPTIONS
    
    use_backend order_backend if is_api
    default_backend order_frontend_backend
```

### 8.2 Advanced CORS with Origin Validation

```haproxy
frontend order_frontend
    bind *:80
    
    acl is_api path_beg /api
    acl allowed_origin hdr(Origin) -m reg -i ^https?://(localhost|order\.local|.*\.order\.local)(:[0-9]+)?$
    
    # Set CORS headers only for allowed origins
    http-response set-header Access-Control-Allow-Origin "%[hdr(Origin)]" if is_api allowed_origin
    http-response set-header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" if is_api allowed_origin
    http-response set-header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" if is_api allowed_origin
    http-response set-header Access-Control-Allow-Credentials "true" if is_api allowed_origin
    
    # Handle OPTIONS
    http-request return status 200 \
        hdr Access-Control-Allow-Origin "%[hdr(Origin)]" \
        hdr Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" \
        hdr Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" \
        if METH_OPTIONS allowed_origin
    
    use_backend order_backend if is_api
    default_backend order_frontend_backend
```

### 8.3 Test CORS Configuration

```bash
# Test OPTIONS preflight
curl -X OPTIONS http://localhost/api/orders \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    -v

# Test actual request
curl http://localhost/api/orders \
    -H "Origin: http://localhost:3000" \
    -v
```

---

## 9. Monitoring and Statistics

### 9.1 Enable Statistics Page

```haproxy
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
    stats auth admin:admin123  # Change password!
```

### 9.2 Access Statistics

```bash
# Via curl
curl http://admin:admin123@localhost:8404/stats

# Via browser
# http://<HAProxy_IP>:8404/stats
# Username: admin
# Password: admin123
```

### 9.3 Statistics in JSON Format

```haproxy
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats uri /stats?stats;json  # JSON endpoint
    stats refresh 30s
    stats admin if TRUE
    stats auth admin:admin123
```

### 9.4 Prometheus Metrics (HAProxy Exporter)

For Kubernetes, use HAProxy Exporter:

```bash
# Install HAProxy Exporter
cat <<EOF > haproxy-exporter-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: haproxy-exporter
  namespace: order
spec:
  replicas: 1
  selector:
    matchLabels:
      app: haproxy-exporter
  template:
    metadata:
      labels:
        app: haproxy-exporter
    spec:
      containers:
      - name: haproxy-exporter
        image: quay.io/prometheus/haproxy-exporter:latest
        args:
          - --haproxy.scrape-uri=http://haproxy.order.svc.cluster.local:8404/stats;csv
        ports:
        - containerPort: 9101
          name: metrics
EOF

kubectl apply -f haproxy-exporter-deployment.yaml
```

### 9.5 Key Metrics to Monitor

- **Session Rate**: Requests per second
- **Current Sessions**: Active connections
- **Server Status**: UP/DOWN status
- **Response Time**: Average response time
- **Error Rate**: 4xx/5xx errors
- **Bytes In/Out**: Traffic volume

---

## 10. High Availability Setup

### 10.1 HAProxy Keepalived Setup (Active-Passive)

Install Keepalived for VIP (Virtual IP) management:

```bash
# Install Keepalived
sudo apt-get install -y keepalived

# Create Keepalived configuration
sudo nano /etc/keepalived/keepalived.conf
```

**Keepalived Configuration:**

```conf
vrrp_script chk_haproxy {
    script "/usr/bin/killall -0 haproxy"
    interval 2
    weight -2
    fall 3
    rise 2
}

vrrp_instance VI_1 {
    state MASTER  # BACKUP on secondary server
    interface eth0  # Your network interface
    virtual_router_id 51
    priority 101  # 100 on backup server
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass your_secure_password
    }
    virtual_ipaddress {
        192.168.1.100/24  # Virtual IP
    }
    track_script {
        chk_haproxy
    }
}
```

### 10.2 Start Keepalived

```bash
# Start Keepalived
sudo systemctl start keepalived
sudo systemctl enable keepalived

# Check status
sudo systemctl status keepalived

# Verify VIP
ip addr show
```

### 10.3 HAProxy with Kubernetes (High Availability)

For Kubernetes, use multiple HAProxy replicas with a LoadBalancer service:

```bash
# Update HAProxy deployment for HA
cat <<EOF > haproxy-deployment-ha.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: haproxy
  namespace: order
spec:
  replicas: 3  # Multiple replicas
  selector:
    matchLabels:
      app: haproxy
  template:
    metadata:
      labels:
        app: haproxy
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - haproxy
              topologyKey: kubernetes.io/hostname
      containers:
      - name: haproxy
        image: haproxy:2.8-alpine
        ports:
        - containerPort: 80
        - containerPort: 8404
        volumeMounts:
        - name: haproxy-config
          mountPath: /usr/local/etc/haproxy
      volumes:
      - name: haproxy-config
        configMap:
          name: haproxy-config
EOF

# Create LoadBalancer service (for cloud providers)
cat <<EOF > haproxy-service-lb.yaml
apiVersion: v1
kind: Service
metadata:
  name: haproxy
  namespace: order
spec:
  type: LoadBalancer
  selector:
    app: haproxy
  ports:
  - port: 80
    targetPort: 80
  - port: 443
    targetPort: 443
EOF
```

---

## 11. Troubleshooting

### 11.1 Common Issues

**Issue: HAProxy won't start**

```bash
# Check configuration syntax
sudo haproxy -f /etc/haproxy/haproxy.cfg -c

# Check logs
sudo journalctl -u haproxy -n 50

# Check if port is already in use
sudo netstat -tlnp | grep :80
```

**Issue: Backend servers showing as DOWN**

```bash
# Check health check endpoint
curl http://backend.order.svc.cluster.local:8080/actuator/health

# Check HAProxy statistics
curl http://localhost:8404/stats

# Check backend connectivity from HAProxy pod
kubectl exec -it <haproxy-pod> -n order -- wget -O- http://backend.order.svc.cluster.local:8080/actuator/health
```

**Issue: CORS not working**

```bash
# Test CORS headers
curl -v http://localhost/api/orders -H "Origin: http://localhost:3000"

# Check HAProxy logs
sudo tail -f /var/log/haproxy.log

# Verify CORS configuration in haproxy.cfg
```

**Issue: SSL certificate errors**

```bash
# Verify certificate
sudo openssl x509 -in /etc/ssl/certs/order.pem -text -noout

# Check certificate permissions
ls -la /etc/ssl/certs/order.pem

# Test SSL connection
openssl s_client -connect localhost:443 -servername order.local
```

### 11.2 Debug Commands

```bash
# Check HAProxy process
ps aux | grep haproxy

# Check listening ports
sudo ss -tlnp | grep haproxy

# Test configuration
sudo haproxy -f /etc/haproxy/haproxy.cfg -c -V

# View real-time statistics
watch -n 1 'echo "show stat" | socat stdio /run/haproxy/admin.sock'

# Check backend status
echo "show stat" | socat stdio /run/haproxy/admin.sock | grep order_backend
```

### 11.3 Log Analysis

```bash
# Enable detailed logging
# In haproxy.cfg:
#   log /dev/log local0 debug

# View logs
sudo tail -f /var/log/haproxy.log

# Filter logs
sudo grep "order_backend" /var/log/haproxy.log

# Count errors
sudo grep "order_backend" /var/log/haproxy.log | grep -c "503"
```

### 11.4 Performance Tuning

```haproxy
global
    # Increase max connections
    maxconn 10000
    
    # Tune SSL
    tune.ssl.default-dh-param 2048
    tune.bufsize 16384
    tune.maxrewrite 1024

defaults
    # Timeout tuning
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    timeout http-request 10s
    timeout http-keep-alive 10s
    
    # Connection options
    option http-keep-alive
    option http-server-close
```

---

## 12. Best Practices

1. **Security**:
   - Change default statistics password
   - Use SSL/TLS for production
   - Restrict statistics access
   - Use firewall rules

2. **Performance**:
   - Tune maxconn based on expected load
   - Use appropriate load balancing algorithm
   - Enable HTTP keep-alive
   - Monitor connection pools

3. **Reliability**:
   - Configure proper health checks
   - Set appropriate timeouts
   - Use multiple backend servers
   - Implement circuit breakers

4. **Monitoring**:
   - Enable statistics page
   - Set up Prometheus metrics
   - Monitor error rates
   - Track response times

5. **High Availability**:
   - Deploy multiple HAProxy instances
   - Use Keepalived for VIP
   - Distribute across availability zones
   - Test failover scenarios

---

## 13. Example: Complete Production Configuration

```haproxy
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon
    maxconn 10000
    tune.ssl.default-dh-param 2048

defaults
    log global
    mode http
    option httplog
    option dontlognull
    option forwardfor
    option http-server-close
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    timeout http-request 10s
    timeout http-keep-alive 10s

frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
    stats auth admin:SecurePassword123!

frontend order_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/order.pem alpn h2,http/1.1
    
    redirect scheme https code 301 if !{ ssl_fc }
    
    acl is_api path_beg /api
    
    http-response set-header Access-Control-Allow-Origin "*" if is_api
    http-response set-header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" if is_api
    http-response set-header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" if is_api
    http-response set-header Access-Control-Allow-Credentials "true" if is_api
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains" if { ssl_fc }
    
    http-request return status 200 \
        hdr Access-Control-Allow-Origin "*" \
        hdr Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" \
        hdr Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" \
        if METH_OPTIONS
    
    use_backend order_backend if is_api
    default_backend order_frontend_backend

backend order_frontend_backend
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    option forwardfor
    
    server frontend1 frontend.order.svc.cluster.local:80 check inter 3s fall 3 rise 2

backend order_backend
    balance roundrobin
    option httpchk GET /actuator/health
    http-check expect status 200
    option forwardfor
    http-request set-header Host order.local
    
    server backend1 backend.order.svc.cluster.local:8080 check inter 3s fall 3 rise 2 maxconn 100
    server backend2 backend.order.svc.cluster.local:8080 check inter 3s fall 3 rise 2 maxconn 100
    server backend3 backend.order.svc.cluster.local:8080 check inter 3s fall 3 rise 2 maxconn 100
```

---

## ✅ Verification Checklist

After completing HAProxy setup:

- [ ] HAProxy is installed and running
- [ ] Configuration syntax is valid
- [ ] Frontend is accessible through HAProxy
- [ ] Backend API is accessible through HAProxy
- [ ] Health checks are working
- [ ] Statistics page is accessible
- [ ] CORS headers are set correctly
- [ ] SSL/TLS is configured (if using)
- [ ] Load balancing is distributing traffic
- [ ] Monitoring is set up
- [ ] High availability is configured (if needed)

---

## 📚 Additional Resources

- **HAProxy Documentation**: https://www.haproxy.org/#docs
- **HAProxy Configuration Manual**: https://cbonte.github.io/haproxy-dconv/
- **HAProxy GitHub**: https://github.com/haproxy/haproxy
- **Keepalived Documentation**: https://www.keepalived.org/documentation.html

---

**Status**: ✅ Complete HAProxy setup guide for order

*Last Updated: January 2026*
