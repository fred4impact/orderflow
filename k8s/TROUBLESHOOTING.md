# Kubernetes Troubleshooting Guide for OrderFlow

## Quick Reference
- **Namespace**: `orderflow`
- **Frontend Service**: NodePort on port `30080`
- **Backend Service**: ClusterIP on port `8080`
- **PostgreSQL Service**: ClusterIP on port `5432`

---

## 1. Check Overall Cluster Status

```bash
# Check all pods in orderflow namespace
kubectl get pods -n orderflow

# Check all resources in orderflow namespace
kubectl get all -n orderflow

# Check pod status with wide output (shows node info)
kubectl get pods -n orderflow -o wide

# Check events in namespace (sorted by time)
kubectl get events -n orderflow --sort-by='.lastTimestamp'
```

---

## 2. Check Pod Status

```bash
# Check all pods with status
kubectl get pods -n orderflow

# Check specific pod status
kubectl get pod <pod-name> -n orderflow

# Describe pod (detailed information including events)
kubectl describe pod <pod-name> -n orderflow

# Check pods by label
kubectl get pods -n orderflow -l app=frontend
kubectl get pods -n orderflow -l app=backend
kubectl get pods -n orderflow -l app=postgres
```

---

## 3. View Pod Logs

```bash
# View logs for a specific pod
kubectl logs <pod-name> -n orderflow

# View logs for deployment (gets latest pod)
kubectl logs -n orderflow deployment/frontend
kubectl logs -n orderflow deployment/backend
kubectl logs -n orderflow deployment/postgres

# Follow logs in real-time
kubectl logs -f <pod-name> -n orderflow
kubectl logs -f -n orderflow deployment/backend

# View last N lines of logs
kubectl logs --tail=100 <pod-name> -n orderflow

# View logs from previous container (if pod restarted)
kubectl logs <pod-name> -n orderflow --previous

# View logs with timestamps
kubectl logs <pod-name> -n orderflow --timestamps

# View logs from all pods with a label
kubectl logs -n orderflow -l app=backend
```

---

## 4. Check Services

```bash
# List all services
kubectl get svc -n orderflow

# Describe service (shows endpoints, selectors, etc.)
kubectl describe svc frontend -n orderflow
kubectl describe svc backend -n orderflow
kubectl describe svc postgres -n orderflow

# Check service endpoints
kubectl get endpoints -n orderflow
kubectl get endpoints backend -n orderflow
```

---

## 5. Check Deployments

```bash
# List all deployments
kubectl get deployments -n orderflow

# Describe deployment
kubectl describe deployment frontend -n orderflow
kubectl describe deployment backend -n orderflow

# Check deployment rollout status
kubectl rollout status deployment/backend -n orderflow
kubectl rollout status deployment/frontend -n orderflow

# View deployment history
kubectl rollout history deployment/backend -n orderflow

# Rollback deployment (if needed)
kubectl rollout undo deployment/backend -n orderflow
```

---

## 6. Debug Container Issues

```bash
# Execute command in running container
kubectl exec -it <pod-name> -n orderflow -- /bin/sh
kubectl exec -it <pod-name> -n orderflow -c backend -- /bin/sh

# Run specific command in container
kubectl exec <pod-name> -n orderflow -- env
kubectl exec <pod-name> -n orderflow -- ps aux

# Check container resource usage
kubectl top pod <pod-name> -n orderflow
kubectl top pods -n orderflow
```

---

## 7. Test Connectivity

```bash
# Port forward to test services locally
kubectl port-forward svc/backend -n orderflow 8080:8080
kubectl port-forward svc/frontend -n orderflow 3000:80
kubectl port-forward svc/postgres -n orderflow 5432:5432

# Test backend API (after port-forward)
curl http://localhost:8080/api/v1/orders
curl http://localhost:8080/actuator/health

# Test from within cluster (using a debug pod)
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n orderflow -- sh
# Then inside the pod:
# curl http://backend.orderflow.svc.cluster.local:8080/api/v1/orders
# curl http://frontend.orderflow.svc.cluster.local:80/health
```

---

## 8. Check Configuration

```bash
# View environment variables in pod
kubectl exec <pod-name> -n orderflow -- env | grep -i cors
kubectl exec <pod-name> -n orderflow -- env | grep -i spring

# Check ConfigMaps (if any)
kubectl get configmaps -n orderflow
kubectl describe configmap <configmap-name> -n orderflow

# Check Secrets (if any)
kubectl get secrets -n orderflow
kubectl describe secret <secret-name> -n orderflow
```

---

## 9. Restart Resources

```bash
# Restart deployment (rolling restart)
kubectl rollout restart deployment/backend -n orderflow
kubectl rollout restart deployment/frontend -n orderflow

# Delete pod to force recreation
kubectl delete pod <pod-name> -n orderflow

# Scale deployment
kubectl scale deployment/backend -n orderflow --replicas=2
kubectl scale deployment/backend -n orderflow --replicas=1
```

---

## 10. Check Network Policies (if any)

```bash
# List network policies
kubectl get networkpolicies -n orderflow

# Describe network policy
kubectl describe networkpolicy <policy-name> -n orderflow
```

---

## 11. Check Persistent Volumes (for PostgreSQL)

```bash
# List persistent volumes
kubectl get pv

# List persistent volume claims
kubectl get pvc -n orderflow

# Describe PVC
kubectl describe pvc <pvc-name> -n orderflow
```

---

## 12. Common Issues & Solutions

### Issue: Pod in CrashLoopBackOff
```bash
# Check logs
kubectl logs <pod-name> -n orderflow --previous

# Check events
kubectl describe pod <pod-name> -n orderflow

# Check if image exists
kubectl describe pod <pod-name> -n orderflow | grep Image
```

### Issue: Pod not starting
```bash
# Check pod events
kubectl describe pod <pod-name> -n orderflow

# Check if image pull is successful
kubectl get events -n orderflow --field-selector involvedObject.name=<pod-name>
```

### Issue: Service not accessible
```bash
# Check service endpoints
kubectl get endpoints <service-name> -n orderflow

# Check if pods have correct labels
kubectl get pods -n orderflow --show-labels
kubectl describe svc <service-name> -n orderflow
```

### Issue: CORS errors (403)
```bash
# Check backend logs
kubectl logs -n orderflow deployment/backend | grep -i cors

# Verify CORS environment variable
kubectl exec -n orderflow deployment/backend -- env | grep CORS

# Check backend configuration
kubectl describe deployment backend -n orderflow
```

---

## 13. Complete Health Check Script

```bash
#!/bin/bash
NAMESPACE="orderflow"

echo "=== Checking Pods ==="
kubectl get pods -n $NAMESPACE

echo -e "\n=== Checking Services ==="
kubectl get svc -n $NAMESPACE

echo -e "\n=== Checking Deployments ==="
kubectl get deployments -n $NAMESPACE

echo -e "\n=== Recent Events ==="
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10

echo -e "\n=== Backend Logs (last 20 lines) ==="
kubectl logs -n $NAMESPACE deployment/backend --tail=20

echo -e "\n=== Frontend Logs (last 20 lines) ==="
kubectl logs -n $NAMESPACE deployment/frontend --tail=20

echo -e "\n=== Service Endpoints ==="
kubectl get endpoints -n $NAMESPACE
```

---

## 14. Quick Commands Reference

```bash
# Get frontend NodePort URL
kubectl get svc frontend -n orderflow -o jsonpath='{.spec.ports[0].nodePort}'
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo "Frontend URL: http://$NODE_IP:30080"

# Get backend pod name
kubectl get pods -n orderflow -l app=backend -o jsonpath='{.items[0].metadata.name}'

# Check if namespace exists
kubectl get namespace orderflow

# Create namespace if missing
kubectl create namespace orderflow
```

---

## 15. Cleanup Commands (Use with Caution!)

```bash
# Delete all resources in namespace
kubectl delete all --all -n orderflow

# Delete specific deployment
kubectl delete deployment backend -n orderflow

# Delete namespace (deletes everything)
kubectl delete namespace orderflow
```

---

## Deployment Workflow After Code Changes

### 1. Rebuild Backend Docker Image
```bash
cd /Users/mac/Documents/DEVOPS-PORTFOLIOS/orderflow/backend
docker build -t runtesting/ordeflow-backend:1.2 .
docker push runtesting/ordeflow-backend:1.2
```

### 2. Update Kubernetes Deployment
```bash
# Option A: Update image in YAML and apply
kubectl apply -f k8s/backend.yaml -n orderflow

# Option B: Set image directly
kubectl set image deployment/backend backend=runtesting/ordeflow-backend:1.2 -n orderflow

# Option C: Restart to pick up new environment variables (if only env changed)
kubectl rollout restart deployment/backend -n orderflow
```

### 3. Verify Deployment
```bash
# Watch rollout status
kubectl rollout status deployment/backend -n orderflow

# Check new pod is running
kubectl get pods -n orderflow -l app=backend

# Check logs
kubectl logs -f -n orderflow deployment/backend
```

---

## Notes
- Replace `<pod-name>` with actual pod name from `kubectl get pods -n orderflow`
- All commands assume namespace is `orderflow`
- Use `-n orderflow` flag for all namespace-specific commands
- For production, consider adding resource limits and health checks
