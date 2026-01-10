# Ingress Setup for Bare-Metal Kubernetes (EC2)

This guide walks you through setting up NGINX Ingress Controller on a bare-metal Kubernetes cluster deployed on EC2 instances (master and worker nodes).

## Prerequisites

- Kubernetes cluster running on EC2 (master + worker nodes)
- Orderflow application already deployed
- `kubectl` configured to access your cluster
- Access to worker node IP addresses

---

## Step 1: Verify Current Services

First, check your current service configuration:

```bash
kubectl get svc -n orderflow
```

You should see your frontend and backend services. Note that for Ingress to work properly, services should be `ClusterIP` type (not NodePort).

---

## Step 2: Convert Services to ClusterIP (if needed)

If your services are currently NodePort, update them to ClusterIP:

### Update Frontend Service

```bash
kubectl get svc frontend -n orderflow -o yaml > frontend-service-clusterip.yaml
```

Edit the file and change:
- `type: NodePort` → `type: ClusterIP`
- Remove the `nodePort` field

Or apply this directly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: orderflow
spec:
  type: ClusterIP  # Changed from NodePort
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
```

### Update Backend Service

Ensure backend service is ClusterIP:

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

Apply the changes:

```bash
kubectl apply -f frontend-service.yaml
kubectl apply -f backend-service.yaml
```

---

## Step 3: Install NGINX Ingress Controller (Bare-Metal)

For bare-metal Kubernetes, use the **bare-metal** manifest (not the cloud one):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/bare-metal/deploy.yaml
```

**Important:** This manifest creates a NodePort service for the ingress controller, which is what we need for bare-metal deployments.

---

## Step 4: Verify Ingress Controller Installation

Check that the ingress controller pods are running:

```bash
kubectl get pods -n ingress-nginx
```

You should see pods in `Running` state. Wait a minute if they're still starting.

Check the ingress controller service:

```bash
kubectl get svc -n ingress-nginx
```

You should see `ingress-nginx-controller` service of type `NodePort`. Note the NodePort number (usually 80 for HTTP and 443 for HTTPS).

Example output:
```
NAME                                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
ingress-nginx-controller             NodePort    10.96.xxx.xxx   <none>        80:3xxxx/TCP,443:3xxxx/TCP   2m
```

---

## Step 5: Get Worker Node IP Address

You need the IP address of one of your worker nodes to access the ingress:

```bash
kubectl get nodes -o wide
```

Note the `INTERNAL-IP` or `EXTERNAL-IP` of your worker nodes. If you're accessing from outside the VPC, use the public IP. If from within the VPC, use the private IP.

---

## Step 6: Create Ingress Resource

Create the ingress resource for your orderflow application:

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

Save this as `ingress.yaml` and apply:

```bash
kubectl apply -f ingress.yaml
```

Verify the ingress:

```bash
kubectl get ingress -n orderflow
kubectl describe ingress orderflow-ingress -n orderflow
```

---

## Step 7: Configure Access

Since you're on bare-metal, you have two options for accessing the application:

### Option A: Access via NodePort (Direct)

Get the NodePort from the ingress controller service:

```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx
```
44.210.23.194  orderflow.local
http://44.210.23.194:31641

Access the application using:
```
http://<WORKER_NODE_IP>:<NODEPORT>
```

For example, if your worker node IP is `54.123.45.67` and NodePort is `30080`:
```
http://54.123.45.67:30080
```

**Note:** You'll need to access with the `Host` header or use `/etc/hosts` (see Option B).

### Option B: Access via /etc/hosts (Recommended)

This is the cleaner approach. You'll map the domain name to your worker node IP.

1. **Get the NodePort:**
   ```bash
   kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}'
   ```

2. **Get your worker node IP:**
   ```bash
   kubectl get nodes -o wide
   ```

3. **Add to `/etc/hosts` on your local machine:**
   ```bash
   sudo vi /etc/hosts
   # or
   sudo nano /etc/hosts
   ```

   Add this line (replace with your actual worker node IP):
   ```
   <WORKER_NODE_IP> orderflow.local
   ```

   Example:
   ```
   54.123.45.67 orderflow.local
   ```

4. **Access the application:**
   ```
   http://orderflow.local:<NODEPORT>
   ```

   For example, if NodePort is `30080`:
   ```
   http://orderflow.local:30080
   ```

### Option C: Use Port 80 (Requires Root/Privileged Access)

If you want to access without specifying a port, you can:

1. **Modify the ingress controller service to use port 80:**
   ```bash
   kubectl edit svc ingress-nginx-controller -n ingress-nginx
   ```

   Change the NodePort to 80 (requires root access on nodes):
   ```yaml
   spec:
     ports:
     - name: http
       port: 80
       protocol: TCP
       targetPort: 80
       nodePort: 80  # Requires root/privileged access
   ```

2. **Then access via:**
   ```
   http://orderflow.local
   ```

   **Note:** Using port 80 requires running kube-proxy with root privileges, which may not be recommended for security reasons.

### Option D: Use Browser Extension (Firefox DNS over HTTPS Workaround)

If you're using Firefox with DNS over HTTPS (DoH) enabled, Firefox may bypass `/etc/hosts` entries. In this case, use a browser extension to modify the Host header:

1. **Install a header modification extension:**
   - **Firefox:** "FlexHeaders - Modify HTTP Headers" or "Modify Headers"
   - **Chrome/Edge:** "ModHeader"

2. **Configure the extension:**
   - Add a new header rule:
     - **Header Name:** `Host`
     - **Header Value:** `orderflow.local`
     - Enable the rule

3. **Access the application:**
   ```
   http://<WORKER_NODE_IP>:<NODEPORT>
   ```
   
   For example:
   ```
   http://44.210.23.194:31641
   ```

   The extension will automatically add the `Host: orderflow.local` header, allowing the ingress to route correctly.

**Alternative:** Disable DNS over HTTPS in Firefox:
- Go to `about:preferences#privacy`
- Find "DNS over HTTPS"
- Set it to "Off"
- Then `http://orderflow.local:<NODEPORT>` should work directly

---

## Step 8: Test the Application

1. **Test frontend:**
   ```bash
   curl -H "Host: orderflow.local" http://<WORKER_NODE_IP>:<NODEPORT>/
   ```

2. **Test backend API:**
   ```bash
   curl -H "Host: orderflow.local" http://<WORKER_NODE_IP>:<NODEPORT>/api/health
   ```

3. **Open in browser:**
   - If using `/etc/hosts`: `http://orderflow.local:<NODEPORT>`
   - If using direct IP: `http://<WORKER_NODE_IP>:<NODEPORT>` (add `Host: orderflow.local` header)

---

## Troubleshooting

### Check Ingress Controller Logs

```bash
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

### Check Ingress Status

```bash
kubectl describe ingress orderflow-ingress -n orderflow
```

### Verify Services are Accessible

```bash
# Test frontend service directly
kubectl port-forward svc/frontend 8080:80 -n orderflow
# Then access http://localhost:8080

# Test backend service directly
kubectl port-forward svc/backend 8081:8080 -n orderflow
# Then access http://localhost:8081
```

### Common Issues

1. **Ingress controller not ready:**
   ```bash
   kubectl get pods -n ingress-nginx
   kubectl describe pod <pod-name> -n ingress-nginx
   ```

2. **Services not found:**
   - Ensure services are in the same namespace (`orderflow`)
   - Verify service names match exactly

3. **502 Bad Gateway:**
   - Check if backend pods are running: `kubectl get pods -n orderflow`
   - Check backend logs: `kubectl logs <backend-pod-name> -n orderflow`

4. **404 Not Found when accessing via IP:**
   - **Problem:** Accessing `http://<IP>:<NODEPORT>` sends the IP as the Host header, but ingress expects `orderflow.local`
   - **Solution:** Always use the domain name: `http://orderflow.local:<NODEPORT>`
   - **Verify /etc/hosts:** Ensure `44.210.23.194 orderflow.local` is in your `/etc/hosts`
   - **Test with curl:** `curl -H "Host: orderflow.local" http://44.210.23.194:31641/`
   - **Browser:** Make sure you're typing `orderflow.local` in the address bar, not the IP

5. **Connection refused:**
   - Verify NodePort is correct
   - Check security groups/firewall rules allow traffic on the NodePort
   - Ensure you're using the correct worker node IP
   - **IP Selection:** 
     - From outside VPC/internet: Use **PUBLIC IP** (e.g., 44.210.23.194)
     - From within VPC: Use **PRIVATE IP**

6. **Browser can't connect (but curl works):**
   - **Firefox DNS over HTTPS issue:** Firefox with DoH enabled bypasses `/etc/hosts`
   - **Solution 1:** Disable DNS over HTTPS in Firefox (`about:preferences#privacy`)
   - **Solution 2:** Use browser extension (FlexHeaders, Modify Headers, or ModHeader)
     - Add header: `Host: orderflow.local`
     - Access via IP: `http://<WORKER_NODE_IP>:<NODEPORT>`
   - **Solution 3:** Try a different browser (Chrome, Safari, Edge)
   - **Solution 4:** Clear browser cache and try again

---

## Security Considerations

1. **Firewall Rules:** Ensure your EC2 security groups allow inbound traffic on the NodePort (typically ports 30000-32767 or your specific NodePort).

2. **Network Policies:** Consider implementing NetworkPolicies to restrict traffic if needed.

3. **TLS/HTTPS:** For production, set up TLS certificates. You can use cert-manager with Let's Encrypt for automatic certificate management.

---

## Next Steps

- Set up TLS/HTTPS with cert-manager
- Configure custom domains
- Add rate limiting
- Set up monitoring and logging
- Configure health checks and autoscaling

---

## Quick Reference Commands

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx

# Get NodePort
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}'

# Check ingress
kubectl get ingress -n orderflow
kubectl describe ingress orderflow-ingress -n orderflow

# Check services
kubectl get svc -n orderflow

# Check pods
kubectl get pods -n orderflow

# View logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=50
```
