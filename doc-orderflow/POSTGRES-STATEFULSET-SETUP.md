# PostgreSQL StatefulSet Setup Guide

## Files Created

- `postgres-statefulset.yaml` - StatefulSet configuration (NEW)
- `postgres.yaml` - Original Deployment (UNTOUCHED)

## Current Setup

The StatefulSet is configured with:
- **Name**: `postgres-statefulset` (different from Deployment to avoid conflicts)
- **Service**: `postgres-statefulset` (separate service)
- **Labels**: `app: postgres-statefulset` (different from Deployment)
- **Persistent Storage**: 10Gi PVC per pod (via `volumeClaimTemplates`)

## Deployment Options

### Option 1: Run Both (Testing/Comparison)

You can run both the Deployment and StatefulSet simultaneously:

```bash
# Deploy StatefulSet
kubectl apply -f postgres-statefulset.yaml

# Check both are running
kubectl get pods -n order -l app=postgres
kubectl get pods -n order -l app=postgres-statefulset

# Services
kubectl get svc -n order | grep postgres
```

**Note**: Your backend currently connects to `postgres:5432` (the Deployment service). To use the StatefulSet, you'd need to update the backend connection string.

### Option 2: Replace Deployment with StatefulSet

If you want to replace the Deployment with the StatefulSet:

1. **Update StatefulSet to use same service name** (modify `postgres-statefulset.yaml`):
   - Change `serviceName: postgres-statefulset` → `serviceName: postgres`
   - Change labels `app: postgres-statefulset` → `app: postgres`
   - Change metadata name to `postgres` (or keep it as `postgres-statefulset`)

2. **Delete the Deployment**:
   ```bash
   kubectl delete deployment postgres -n order
   # Note: This will delete the pod, but data in PVC (if any) will remain
   ```

3. **Deploy StatefulSet**:
   ```bash
   kubectl apply -f postgres-statefulset.yaml
   ```

4. **Verify**:
   ```bash
   kubectl get statefulset -n order
   kubectl get pods -n order -l app=postgres
   kubectl get pvc -n order
   ```

### Option 3: Use Different Service Name (Current Setup)

Keep both running with different service names:
- **Deployment**: `postgres:5432` (current backend connection)
- **StatefulSet**: `postgres-statefulset:5432` (new, requires backend update)

To use StatefulSet, update backend connection:
```yaml
# In backend.yaml
env:
- name: SPRING_DATASOURCE_URL
  value: jdbc:postgresql://postgres-statefulset:5432/orders
```

## Key Differences

| Feature | Deployment | StatefulSet |
|---------|-----------|-------------|
| **Pod Name** | `postgres-<random>` | `postgres-statefulset-0` |
| **Storage** | Shared PVC (if configured) | Dedicated PVC per pod |
| **Service** | `postgres` | `postgres-statefulset` |
| **Data Persistence** | Depends on PVC config | Guaranteed per pod |
| **Scaling** | Parallel | Sequential |

## Storage

The StatefulSet creates a PersistentVolumeClaim automatically:
- **Name**: `postgres-data-postgres-statefulset-0`
- **Size**: 10Gi
- **Access Mode**: ReadWriteOnce

To check PVC:
```bash
kubectl get pvc -n order
```

**Important**: PVCs are NOT automatically deleted when StatefulSet is deleted. To clean up:
```bash
kubectl delete pvc postgres-data-postgres-statefulset-0 -n order
```

## Migration Path

If you want to migrate from Deployment to StatefulSet:

1. **Backup existing data** (if any):
   ```bash
   kubectl exec -n order <postgres-pod-name> -- pg_dump -U orderuser orders > backup.sql
   ```

2. **Deploy StatefulSet**:
   ```bash
   kubectl apply -f postgres-statefulset.yaml
   ```

3. **Wait for pod to be ready**:
   ```bash
   kubectl wait --for=condition=ready pod -l app=postgres-statefulset -n order --timeout=300s
   ```

4. **Restore data** (if needed):
   ```bash
   kubectl exec -i -n order postgres-statefulset-0 -- psql -U orderuser -d orders < backup.sql
   ```

5. **Update backend** to point to `postgres-statefulset:5432`

6. **Delete old Deployment** (after verification)

## Verification

```bash
# Check StatefulSet
kubectl get statefulset postgres-statefulset -n order

# Check Pods
kubectl get pods -n order -l app=postgres-statefulset

# Check PVCs
kubectl get pvc -n order

# Check Service
kubectl get svc postgres-statefulset -n order

# Test connection
kubectl exec -it postgres-statefulset-0 -n order -- psql -U orderuser -d orders -c "\dt"
```

## Scaling

To scale the StatefulSet:
```bash
kubectl scale statefulset postgres-statefulset --replicas=3 -n order
```

**Note**: Each replica gets its own PVC (10Gi × replicas = total storage needed)
