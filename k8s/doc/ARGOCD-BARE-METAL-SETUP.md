# ArgoCD Setup for Bare-Metal Kubernetes (EC2)

This guide walks you through installing and configuring ArgoCD on a bare-metal Kubernetes cluster deployed on EC2 instances (master and worker nodes) for GitOps-based continuous deployment.

## Prerequisites

- Kubernetes cluster running on EC2 (master + worker nodes)
- Orderflow application already deployed
- `kubectl` configured to access your cluster
- Git repository with your Kubernetes manifests (or create one)
- Access to worker node IP addresses

---

## Step 1: Install ArgoCD

### 1.1 Create ArgoCD Namespace

```bash
kubectl create namespace argocd
```

### 1.2 Install ArgoCD

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

This will install all ArgoCD components including:
- `argocd-server` - API and UI server
- `argocd-repo-server` - Repository server
- `argocd-application-controller` - Application controller
- `argocd-redis` - Redis cache
- `argocd-dex-server` - Dex authentication server

### 1.3 Wait for ArgoCD to be Ready

Wait for all pods to be running (this may take 2-3 minutes):

```bash
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
kubectl wait --for=condition=available --timeout=300s deployment/argocd-repo-server -n argocd
kubectl wait --for=condition=available --timeout=300s deployment/argocd-application-controller -n argocd
```

### 1.4 Verify Installation

Check that all pods are running:

```bash
kubectl get pods -n argocd
```

You should see all pods in `Running` state:
```
NAME                                                READY   STATUS    RESTARTS   AGE
argocd-application-controller-0                    1/1     Running   0          2m
argocd-dex-server-xxx                               1/1     Running   0          2m
argocd-redis-xxx                                    1/1     Running   0          2m
argocd-repo-server-xxx                              1/1     Running   0          2m
argocd-server-xxx                                   1/1     Running   0          2m
```

---

## Step 2: Expose ArgoCD Server (Bare-Metal)

For bare-metal deployments, we need to expose ArgoCD via NodePort since there's no cloud LoadBalancer.

### 2.1 Check Current Service Type

```bash
kubectl get svc argocd-server -n argocd
```

By default, ArgoCD server service is `ClusterIP`. We need to change it to `NodePort`.

### 2.2 Change Service to NodePort

```bash
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'
```

### 2.3 Get NodePort Number

```bash
kubectl get svc argocd-server -n argocd
```

Note the NodePort number for port 443 (HTTPS). It will be in the range 30000-32767.

Example output:
```
NAME            TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
argocd-server   NodePort   10.96.xxx.xxx   <none>        80:3xxxx/TCP,443:3xxxx/TCP   5m
```

### 2.4 Get Worker Node IP

```bash
kubectl get nodes -o wide
```

Note the `INTERNAL-IP` or `EXTERNAL-IP` of your worker nodes. If accessing from outside the VPC, use the public IP. If from within the VPC, use the private IP.

---

## Step 3: Get ArgoCD Admin Password

Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
```

**Save this password** - you'll need it to login to ArgoCD UI.

**Note:** The username is always `admin`.

---

## Step 4: Access ArgoCD UI

### Option A: Access via NodePort (Recommended for Bare-Metal)

1. **Get the NodePort:**
   ```bash
   kubectl get svc argocd-server -n argocd -o jsonpath='{.spec.ports[?(@.port==443)].nodePort}'
   ```

2. **Access ArgoCD:**
   ```
   https://<WORKER_NODE_IP>:<NODEPORT>
   ```
   
   For example, if your worker node IP is `44.210.23.194` and NodePort is `30443`:
   ```
   https://44.210.23.194:30443
   ```

3. **Login:**
   - Username: `admin`
   - Password: (from Step 3)

4. **Accept the self-signed certificate warning** (click "Advanced" → "Proceed to site")

### Option B: Port Forward (Alternative for Testing)

If you prefer to access via localhost:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Then access: `https://localhost:8080`

**Note:** You'll need to accept the self-signed certificate.

### Option C: Add to /etc/hosts (Cleaner URL)

1. **Add to `/etc/hosts` on your local machine:**
   ```bash
   sudo vi /etc/hosts
   # or
   sudo nano /etc/hosts
   ```

   Add this line (replace with your actual worker node IP and NodePort):
   ```
   <WORKER_NODE_IP> argocd.local
   ```

   Example:
   ```
   44.210.23.194 argocd.local
   ```

2. **Access ArgoCD:**
   ```
   https://argocd.local:<NODEPORT>
   ```

---

## Step 5: Install ArgoCD CLI (Optional but Recommended)

### 5.1 Install ArgoCD CLI

**macOS:**
```bash
brew install argocd
```

**Linux:**
```bash
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd
```

**Windows:**
Download from: https://github.com/argoproj/argo-cd/releases

### 5.2 Login via CLI

```bash
# Get ArgoCD server URL
ARGOCD_SERVER="<WORKER_NODE_IP>:<NODEPORT>"
# Example: ARGOCD_SERVER="44.210.23.194:30443"

# Login (use --insecure for self-signed cert)
argocd login $ARGOCD_SERVER --username admin --password <password-from-step-3> --insecure
```

### 5.3 Update Admin Password (Recommended)

```bash
argocd account update-password --account admin
```

Follow the prompts to set a new password.

---

## Step 6: Prepare Git Repository

ArgoCD needs a Git repository containing your Kubernetes manifests.

### Option A: Use Existing Repository

If you already have a Git repository with your Kubernetes manifests, note the repository URL.

### Option B: Create New Repository

1. Create a new Git repository (GitHub, GitLab, Bitbucket, etc.)
2. Push your Kubernetes manifests to the repository
3. Organize manifests in a directory structure, for example:

```
orderflow-gitops/
├── k8s/
│   ├── namespace.yaml
│   ├── postgres.yaml
│   ├── postgres-service.yaml
│   ├── backend.yaml
│   ├── backend-service.yaml
│   ├── frontend.yaml
│   ├── frontend-service.yaml
│   └── ingress.yaml
└── README.md
```

### Option C: Use Current Local Files

If you want to use your current local files:

1. **Initialize Git repository:**
   ```bash
   cd /path/to/orderflow/k8s
   git init
   git add .
   git commit -m "Initial commit: Orderflow Kubernetes manifests"
   ```

2. **Create remote repository and push:**
   ```bash
   # Add remote (replace with your repo URL)
   git remote add origin https://github.com/YOUR_USERNAME/orderflow-gitops.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 7: Create ArgoCD Application

### 7.1 Create Application Manifest

Create an ArgoCD Application that will sync your Orderflow application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: orderflow
  namespace: argocd
spec:
  project: default
  
  source:
    repoURL: https://github.com/YOUR_USERNAME/orderflow-gitops.git  # Replace with your repo URL
    targetRevision: main  # or your branch name
    path: k8s  # Path to manifests in the repo
  
  destination:
    server: https://kubernetes.default.svc
    namespace: orderflow
  
  syncPolicy:
    automated:
      prune: true  # Delete resources that are no longer in Git
      selfHeal: true  # Automatically sync when cluster state drifts
    syncOptions:
      - CreateNamespace=true  # Create namespace if it doesn't exist
```

Save this as `argocd-application.yaml`.

### 7.2 Apply the Application

```bash
kubectl apply -f argocd-application.yaml
```

### 7.3 Verify Application Creation

```bash
# Check application status
kubectl get applications -n argocd

# Get detailed status
kubectl describe application orderflow -n argocd
```

You can also check in the ArgoCD UI - the application should appear there.

---

## Step 8: Configure Auto-Sync

The application manifest above already includes auto-sync. To verify or update:

### 8.1 Via UI

1. Go to ArgoCD UI
2. Click on the `orderflow` application
3. Click "App Details" → "Sync Policy"
4. Enable:
   - ✅ **Auto-Create Namespace**
   - ✅ **Auto-Prune** (removes resources not in Git)
   - ✅ **Auto-Sync** (automatically syncs when changes detected)

### 8.2 Via CLI

```bash
# Enable auto-sync
argocd app set orderflow --sync-policy automated

# Enable auto-prune
argocd app set orderflow --sync-policy automated --auto-prune

# Enable self-heal
argocd app set orderflow --sync-policy automated --self-heal
```

---

## Step 9: Verify GitOps is Working

### 9.1 Check Application Status

```bash
# Via CLI
argocd app get orderflow

# Via kubectl
kubectl get application orderflow -n argocd -o yaml
```

### 9.2 Test GitOps Flow

1. **Make a change in Git:**
   ```bash
   # Edit a manifest file
   vi k8s/frontend.yaml
   # Change replicas from 1 to 2, for example
   
   # Commit and push
   git add k8s/frontend.yaml
   git commit -m "Scale frontend to 2 replicas"
   git push
   ```

2. **Watch ArgoCD sync:**
   ```bash
   # Watch application status
   argocd app get orderflow --watch
   
   # Or check in UI
   # Go to ArgoCD UI → orderflow application
   # You should see it automatically sync
   ```

3. **Verify the change:**
   ```bash
   kubectl get deployment frontend -n orderflow
   # Should show 2 replicas
   ```

---

## Step 10: Security Considerations

### 10.1 Update Admin Password

```bash
argocd account update-password --account admin
```

### 10.2 Configure RBAC (Optional)

Create custom roles and policies:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    p, role:admin, applications, *, */*, allow
    p, role:admin, clusters, get, *, allow
    p, role:admin, repositories, get, *, allow
    g, argocd-admins, role:admin
```

### 10.3 Secure Git Repository Access

If using a private repository, configure repository credentials:

```bash
# Via CLI
argocd repo add https://github.com/YOUR_USERNAME/orderflow-gitops.git \
  --username YOUR_USERNAME \
  --password YOUR_TOKEN \
  --type git

# Or via UI: Settings → Repositories → Connect Repo
```

---

## Troubleshooting

### Issue 1: ArgoCD Pods Not Starting

```bash
# Check pod status
kubectl get pods -n argocd

# Check pod logs
kubectl logs <pod-name> -n argocd

# Check events
kubectl describe pod <pod-name> -n argocd
```

### Issue 2: Cannot Access ArgoCD UI

1. **Verify NodePort is correct:**
   ```bash
   kubectl get svc argocd-server -n argocd
   ```

2. **Check security group allows traffic on NodePort**

3. **Test connectivity:**
   ```bash
   curl -k https://<WORKER_NODE_IP>:<NODEPORT>
   ```

4. **Check if pods are running:**
   ```bash
   kubectl get pods -n argocd
   ```

### Issue 3: Application Not Syncing

1. **Check application status:**
   ```bash
   argocd app get orderflow
   ```

2. **Check repository connection:**
   ```bash
   argocd repo list
   ```

3. **Manually sync:**
   ```bash
   argocd app sync orderflow
   ```

4. **Check application logs:**
   ```bash
   kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
   ```

### Issue 4: Certificate Errors

ArgoCD uses self-signed certificates by default. To fix:

1. **Accept certificate in browser** (click "Advanced" → "Proceed")

2. **Or use `--insecure` flag with CLI:**
   ```bash
   argocd login <server> --insecure
   ```

3. **Or configure proper TLS** (for production):
   ```bash
   # Generate certificate
   kubectl create secret tls argocd-server-tls \
     --cert=/path/to/cert.pem \
     --key=/path/to/key.pem \
     -n argocd
   ```

### Issue 5: Repository Access Denied

If using a private repository:

1. **Add repository credentials:**
   ```bash
   argocd repo add <repo-url> \
     --username <username> \
     --password <token> \
     --type git
   ```

2. **Or use SSH:**
   ```bash
   argocd repo add git@github.com:USERNAME/REPO.git \
     --ssh-private-key-path ~/.ssh/id_rsa
   ```

---

## Quick Reference Commands

```bash
# Check ArgoCD pods
kubectl get pods -n argocd

# Get ArgoCD admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo

# Get NodePort
kubectl get svc argocd-server -n argocd -o jsonpath='{.spec.ports[?(@.port==443)].nodePort}'

# List applications
argocd app list

# Get application status
argocd app get orderflow

# Sync application manually
argocd app sync orderflow

# Watch application
argocd app get orderflow --watch

# List repositories
argocd repo list

# Update admin password
argocd account update-password
```

---

## Next Steps

- Set up multiple applications
- Configure application sets for multiple environments
- Set up notifications (Slack, email, etc.)
- Configure SSO authentication
- Set up ArgoCD Image Updater for automatic image updates
- Configure webhooks for faster sync

---

## Summary

After completing this guide, you should have:

✅ ArgoCD installed and running  
✅ ArgoCD UI accessible via NodePort  
✅ Git repository with Kubernetes manifests  
✅ ArgoCD Application configured for Orderflow  
✅ Auto-sync enabled  
✅ GitOps workflow working  

Your Orderflow application is now managed via GitOps - any changes pushed to Git will automatically sync to your Kubernetes cluster!
