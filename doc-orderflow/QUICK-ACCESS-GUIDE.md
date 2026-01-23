# Quick Access Guide - OrderFlow Application

After deploying the ingress in your kubeadm cluster, follow these steps to access your application:

## Step 1: Verify Ingress Controller is Running

```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

You should see the `ingress-nginx-controller` service with type `NodePort`.

## Step 2: Get Access Information

Run the helper script:
```bash
./get-access-info.sh
```

Or manually get the information:

### Get NodePort:
```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}'
```

### Get Worker Node IP:
```bash
kubectl get nodes -o wide
```

Note the `INTERNAL-IP` or `EXTERNAL-IP` of your worker nodes.

## Step 3: Access the Application

### Option A: Using /etc/hosts (Recommended)

1. **Add to `/etc/hosts`** (on your local machine):
   ```bash
   sudo nano /etc/hosts
   # or
   sudo vi /etc/hosts
   ```

2. **Add this line** (replace with your actual worker node IP and NodePort):
   ```
   <WORKER_NODE_IP> orderflow.local
   ```
   
   Example:
   ```
   192.168.1.100 orderflow.local
   ```

3. **Access in browser:**
   ```
   http://orderflow.local:<NODEPORT>
   ```
   
   Example (if NodePort is 30080):
   ```
   http://orderflow.local:30080
   ```

### Option B: Direct Access with curl

```bash
curl -H "Host: orderflow.local" http://<WORKER_NODE_IP>:<NODEPORT>
```

### Option C: Direct IP Access (may not work for all features)

```
http://<WORKER_NODE_IP>:<NODEPORT>
```

**Note:** Some features may not work correctly without the proper Host header.

## Step 4: Verify Everything is Working

1. **Check ingress status:**
   ```bash
   kubectl get ingress -n orderflow
   kubectl describe ingress orderflow-ingress -n orderflow
   ```

2. **Check backend pods:**
   ```bash
   kubectl get pods -n orderflow
   ```

3. **Test API endpoint:**
   ```bash
   curl -H "Host: orderflow.local" http://<WORKER_NODE_IP>:<NODEPORT>/api/v1/orders
   ```

## Troubleshooting

### If you get 404 or 500 errors:

1. **Verify ingress is applied:**
   ```bash
   kubectl get ingress -n orderflow
   ```

2. **Check ingress controller logs:**
   ```bash
   kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
   ```

3. **Check backend logs:**
   ```bash
   kubectl logs -n orderflow -l app=backend
   ```

4. **Verify services are running:**
   ```bash
   kubectl get svc -n orderflow
   kubectl get pods -n orderflow
   ```

### If ingress controller is not installed:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/bare-metal/deploy.yaml
```

Wait for it to be ready:
```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

## Quick Commands Summary

```bash
# Get NodePort
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}'

# Get Worker Node IP
kubectl get nodes -o wide

# Check ingress
kubectl get ingress -n orderflow

# View ingress details
kubectl describe ingress orderflow-ingress -n orderflow

# Test API
curl -H "Host: orderflow.local" http://<NODE_IP>:<NODEPORT>/api/v1/orders
```
