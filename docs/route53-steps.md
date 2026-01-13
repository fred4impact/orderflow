# Route53 Domain Setup for OrderFlow Kubernetes Ingress

This guide walks you through setting up Route53 for your domain `bilarn.com` (registered in Namecheap) and configuring it to work with your Kubernetes ingress.

## Prerequisites

- AWS account with Route53 access
- Domain `bilarn.com` registered in Namecheap
- Kubernetes cluster with NGINX Ingress Controller installed
- kubectl configured to access your cluster

---

## Step 1: Create Route53 Hosted Zone

1. **Log in to AWS Console**
   - Navigate to Route53 service
   - Click on "Hosted zones" in the left sidebar

2. **Create Hosted Zone**
   - Click "Create hosted zone"
   - Enter your domain name: `bilarn.com`
   - Choose "Public hosted zone" (for internet-facing)
   - Click "Create hosted zone"

3. **Note the Name Servers**
   - After creation, AWS will provide 4 name servers (NS records)
   - Example format:
     ```
     ns-123.awsdns-12.com
     ns-456.awsdns-45.net
     ns-789.awsdns-78.org
     ns-012.awsdns-01.co.uk
     ```
   - **Copy these name servers** - you'll need them for Namecheap

---

## Step 2: Update Namecheap Nameservers

1. **Log in to Namecheap**
   - Go to your domain list
   - Click "Manage" next to `bilarn.com`

2. **Update Nameservers**
   - Navigate to "Advanced DNS" or "Nameservers" section
   - Select "Custom DNS" (instead of Namecheap BasicDNS)
   - Enter the 4 Route53 name servers you copied in Step 1
   - Save changes

3. **Wait for Propagation**
   - DNS propagation can take 24-48 hours, but usually happens within a few hours
   - You can check propagation status using: https://www.whatsmydns.net

---

## Step 3: Get Ingress Controller External IP/LoadBalancer Address

### For Cloud Providers (EKS, AKS, GKE)

1. **Check Ingress Controller Service**
   ```bash
   kubectl get svc -n ingress-nginx
   ```

2. **Get the External IP or LoadBalancer Address**
   - Look for the `ingress-nginx-controller` service
   - Note the `EXTERNAL-IP` or `EXTERNAL-IP` (LoadBalancer) address
   - Example output:
     ```
     NAME                       TYPE           CLUSTER-IP      EXTERNAL-IP
     ingress-nginx-controller   LoadBalancer   10.96.xxx.xxx   44.210.23.194
     ```

### For Bare-Metal/EC2 Kubernetes

If you're using NodePort on bare-metal:

1. **Get Worker Node Public IP**
   ```bash
   kubectl get nodes -o wide
   ```
   - Note the `EXTERNAL-IP` of your worker nodes

2. **Get NodePort**
   ```bash
   kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}'
   ```

---

## Step 4: Create DNS Records in Route53

1. **Go to Route53 Hosted Zone**
   - Navigate to your `bilarn.com` hosted zone
   - Click "Create record"

2. **Create A Record (Root Domain)**
   - **Record name**: Leave empty (for root domain) or enter `@`
   - **Record type**: A
   - **Value**: 
     - For LoadBalancer: Enter the EXTERNAL-IP from Step 3
     - For NodePort: Enter the worker node public IP
   - **TTL**: 300 (or your preference)
   - Click "Create records"

3. **Create A Record for www (Optional)**
   - **Record name**: `www`
   - **Record type**: A
   - **Value**: Same IP as above
   - **TTL**: 300
   - Click "Create records"

4. **For NodePort Setup (Bare-Metal)**
   - If using NodePort, you'll need to access via `http://bilarn.com:<NODEPORT>`
   - Consider using an Application Load Balancer (ALB) or setting up port forwarding

---

## Step 5: Update Kubernetes Ingress Configuration

1. **Edit the Ingress YAML**
   ```bash
   kubectl edit ingress orderflow-ingress -n orderflow
   ```

   Or update the `k8s/ingress.yaml` file:

   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: orderflow-ingress
     namespace: orderflow
     annotations:
       nginx.ingress.kubernetes.io/rewrite-target: /
       # CORS configuration
       nginx.ingress.kubernetes.io/enable-cors: "true"
       nginx.ingress.kubernetes.io/cors-allow-origin: "*"
       nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
       nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"
       nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
       nginx.ingress.kubernetes.io/cors-max-age: "1728000"
   spec:
     ingressClassName: nginx
     rules:
       - host: bilarn.com
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

2. **Apply the Updated Ingress**
   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```

3. **Verify Ingress**
   ```bash
   kubectl get ingress -n orderflow
   kubectl describe ingress orderflow-ingress -n orderflow
   ```

---

## Step 6: Verify DNS Resolution

1. **Check DNS Propagation**
   ```bash
   # Using dig
   dig bilarn.com
   
   # Using nslookup
   nslookup bilarn.com
   
   # Should return the IP address you set in Route53
   ```

2. **Test from Browser**
   - Wait for DNS propagation (can take a few hours)
   - Open browser and navigate to: `http://bilarn.com`
   - Frontend should be accessible at: `http://bilarn.com`
   - Backend API should be accessible at: `http://bilarn.com/api`

---

## Step 7: Set Up HTTPS (Optional but Recommended)

### Option A: Using cert-manager with Let's Encrypt

1. **Install cert-manager**
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

2. **Create ClusterIssuer**
   ```yaml
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata:
     name: letsencrypt-prod
   spec:
     acme:
       server: https://acme-v02.api.letsencrypt.org/directory
       email: your-email@example.com
       privateKeySecretRef:
         name: letsencrypt-prod
       solvers:
       - http01:
           ingress:
             class: nginx
   ```

3. **Update Ingress with TLS**
   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: orderflow-ingress
     namespace: orderflow
     annotations:
       cert-manager.io/cluster-issuer: "letsencrypt-prod"
       nginx.ingress.kubernetes.io/rewrite-target: /
       # ... other annotations
   spec:
     ingressClassName: nginx
     tls:
       - hosts:
           - bilarn.com
         secretName: bilarn-com-tls
     rules:
       - host: bilarn.com
         http:
           paths:
             # ... paths
   ```

4. **Apply and Wait**
   ```bash
   kubectl apply -f k8s/ingress.yaml
   # Wait a few minutes for certificate issuance
   kubectl get certificate -n orderflow
   ```

---

## Troubleshooting

### DNS Not Resolving

1. **Check Route53 Records**
   - Verify A record exists and points to correct IP
   - Check TTL hasn't expired

2. **Verify Namecheap Nameservers**
   - Ensure nameservers are correctly updated in Namecheap
   - Wait for propagation (can take up to 48 hours)

3. **Check DNS Propagation**
   ```bash
   dig bilarn.com @8.8.8.8
   nslookup bilarn.com
   ```

### Ingress Not Working

1. **Check Ingress Status**
   ```bash
   kubectl describe ingress orderflow-ingress -n orderflow
   ```

2. **Verify Ingress Controller**
   ```bash
   kubectl get pods -n ingress-nginx
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
   ```

3. **Check Services**
   ```bash
   kubectl get svc -n orderflow
   kubectl get endpoints -n orderflow
   ```

### Can't Access via Domain

1. **Test with curl**
   ```bash
   curl -H "Host: bilarn.com" http://<INGRESS_IP>
   ```

2. **Check Ingress Logs**
   ```bash
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=50
   ```

3. **Verify Host Header**
   - Ensure the ingress rule matches your domain exactly
   - Check for typos in domain name

---

## Summary

After completing these steps:

- ✅ Route53 hosted zone created for `bilarn.com`
- ✅ Namecheap nameservers updated to Route53
- ✅ DNS A record pointing to your ingress controller
- ✅ Kubernetes ingress updated to use `bilarn.com`
- ✅ Application accessible at `http://bilarn.com`
- ✅ Backend API accessible at `http://bilarn.com/api`

**Next Steps:**
- Set up HTTPS/SSL certificate (recommended)
- Configure monitoring and logging
- Set up backup and disaster recovery

---

## Additional Resources

- [AWS Route53 Documentation](https://docs.aws.amazon.com/route53/)
- [NGINX Ingress Controller Documentation](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
