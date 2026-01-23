# Troubleshooting Ingress Connection Issues

## Issue: "We can't connect to the server at orderflow.local"

This error indicates the browser cannot reach the server. Follow these steps:

---

## Step 1: Verify DNS Resolution

Test if `orderflow.local` resolves correctly:

**On macOS/Linux:**
```bash
ping orderflow.local
# Should resolve to 44.210.23.194

# Or test with nslookup
nslookup orderflow.local
# Should show 44.210.23.194
```

**If it doesn't resolve:**
1. Check `/etc/hosts` file:
   ```bash
   cat /etc/hosts | grep orderflow
   ```
   Should show: `44.210.23.194 orderflow.local`

2. If missing, add it:
   ```bash
   sudo sh -c 'echo "44.210.23.194 orderflow.local" >> /etc/hosts'
   ```

3. **Clear DNS cache:**
   - **macOS:** `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
   - **Linux:** `sudo systemd-resolve --flush-caches` or `sudo service network-manager restart`

---

## Step 2: Verify Network Connectivity

Test if you can reach the server on port 31641:

```bash
# Test if port is open
telnet 44.210.23.194 31641
# or
nc -zv 44.210.23.194 31641

# Test with curl (bypasses DNS)
curl -v http://44.210.23.194:31641/
```

**If connection is refused or times out:**
- Check EC2 Security Group allows inbound traffic on port 31641
- Check if you're using the correct IP (public vs private)

---

## Step 3: Verify Which Node Has the Ingress Controller

The ingress controller pod might not be running on the node with IP 44.210.23.194.

**On your kube-master, run:**
```bash
# Get all node IPs
kubectl get nodes -o wide

# Check which node the ingress controller is running on
kubectl get pods -n ingress-nginx -o wide

# Get the IP of the node where ingress controller is running
kubectl get pods -n ingress-nginx -o wide -o jsonpath='{.items[*].status.hostIP}'
```

**Important:** Use the IP of the node where the ingress controller pod is actually running!

---

## Step 4: Verify Ingress Controller Service

Check the ingress controller service:

```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx
```

Verify:
- Service type is `NodePort`
- NodePort matches (should be 31641 for port 80)
- Service is in `Running` state

---

## Step 5: Check Security Group Rules

**On AWS EC2:**
1. Go to EC2 Console → Security Groups
2. Find the security group attached to your worker nodes
3. Ensure inbound rule allows:
   - **Type:** Custom TCP
   - **Port:** 31641
   - **Source:** Your IP address (or 0.0.0.0/0 for testing)

---

## Step 6: Test with Direct IP and Host Header

If DNS is the issue, test with curl using Host header:

```bash
curl -H "Host: orderflow.local" http://44.210.23.194:31641/
```

If this works, the issue is DNS resolution on your local machine.

---

## Step 7: Verify Ingress Controller Pods

Check if ingress controller pods are running:

```bash
kubectl get pods -n ingress-nginx
```

All pods should be in `Running` state. If not:
```bash
kubectl describe pod <pod-name> -n ingress-nginx
kubectl logs <pod-name> -n ingress-nginx
```

---

## Step 8: Check Ingress Resource

Verify the ingress is correctly configured:

```bash
kubectl describe ingress orderflow-ingress -n orderflow
```

Look for:
- Events showing successful creation
- Backend services are listed correctly
- Host rule matches `orderflow.local`

---

## Common Solutions

### Solution 1: Use the Correct Node IP

If ingress controller is on a different node:
1. Find the node IP where ingress controller is running
2. Update `/etc/hosts` with that IP
3. Use that IP in your browser

### Solution 2: Fix Security Group

Add inbound rule for port 31641:
- Port: 31641
- Protocol: TCP
- Source: Your IP or 0.0.0.0/0 (for testing)

### Solution 3: Use Port Forwarding (Temporary Workaround)

While troubleshooting, you can use port forwarding:

```bash
# On your local machine (if you have kubectl configured)
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80

# Then access: http://orderflow.local:8080
```

### Solution 4: Access via IP with Browser Extension

Use a browser extension to modify Host header:
- **Chrome:** "ModHeader" extension
- **Firefox:** "Modify Headers" extension

Set Host header to: `orderflow.local`
Then access: `http://44.210.23.194:31641`

---

## Quick Diagnostic Script

Run these commands on your kube-master to gather information:

```bash
echo "=== Node Information ==="
kubectl get nodes -o wide

echo -e "\n=== Ingress Controller Pods ==="
kubectl get pods -n ingress-nginx -o wide

echo -e "\n=== Ingress Controller Service ==="
kubectl get svc ingress-nginx-controller -n ingress-nginx

echo -e "\n=== Ingress Resource ==="
kubectl describe ingress orderflow-ingress -n orderflow

echo -e "\n=== Frontend Service ==="
kubectl get svc frontend -n orderflow

echo -e "\n=== Backend Service ==="
kubectl get svc backend -n orderflow

echo -e "\n=== All Pods in orderflow namespace ==="
kubectl get pods -n orderflow
```

---

## Expected Working Configuration

1. **DNS Resolution:**
   ```bash
   ping orderflow.local
   # Should ping 44.210.23.194
   ```

2. **Port Accessibility:**
   ```bash
   curl -v http://44.210.23.194:31641/
   # Should connect (may get 404, but connection should work)
   ```

3. **With Host Header:**
   ```bash
   curl -H "Host: orderflow.local" http://44.210.23.194:31641/
   # Should return frontend HTML
   ```

4. **Browser Access:**
   ```
   http://orderflow.local:31641
   # Should load the frontend
   ```

---

## Still Not Working?

If none of the above works, check:

1. **Is the ingress controller actually running?**
   ```bash
   kubectl get pods -n ingress-nginx
   ```

2. **Are the frontend/backend services running?**
   ```bash
   kubectl get pods -n orderflow
   ```

3. **Can you access services directly via port-forward?**
   ```bash
   kubectl port-forward svc/frontend 8080:80 -n orderflow
   # Then try http://localhost:8080
   ```

4. **Check ingress controller logs:**
   ```bash
   kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=50
   ```
