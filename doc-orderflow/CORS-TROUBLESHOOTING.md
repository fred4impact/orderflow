# CORS Troubleshooting Guide

## Issue: "A resource is blocked by OpaqueResponseBlocking"

This error occurs when the browser blocks a cross-origin request due to CORS (Cross-Origin Resource Sharing) policy violations.

---

## Solution 1: Update Ingress with CORS Annotations

The ingress has been updated with CORS annotations. Apply the updated ingress:

```bash
kubectl apply -f ingress.yaml
```

Verify the ingress was updated:

```bash
kubectl describe ingress orderflow-ingress -n orderflow
```

You should see the CORS annotations in the output.

---

## Solution 2: Verify Backend CORS Configuration

The backend should have `CORS_ALLOW_ALL_ORIGINS=true` set. Verify:

```bash
# Check backend deployment environment variables
kubectl get deployment backend -n orderflow -o yaml | grep -A 5 CORS

# Check backend pod environment
kubectl exec -it <backend-pod-name> -n orderflow -- env | grep CORS
```

Expected output should show:
```
CORS_ALLOW_ALL_ORIGINS=true
```

If it's not set, update the backend deployment:

```yaml
env:
- name: CORS_ALLOW_ALL_ORIGINS
  value: "true"
```

Then apply:
```bash
kubectl apply -f backend.yaml
kubectl rollout restart deployment backend -n orderflow
```

---

## Solution 3: Check Backend Logs

Check if the backend is receiving requests and if CORS is working:

```bash
# Get backend pod name
kubectl get pods -n orderflow -l app=backend

# Check logs
kubectl logs <backend-pod-name> -n orderflow --tail=50
```

Look for:
- CORS-related errors
- Request logs showing the API calls
- Any 403 or CORS rejection messages

---

## Solution 4: Test CORS with curl

Test if CORS headers are being returned:

```bash
# Test OPTIONS preflight request
curl -X OPTIONS \
  -H "Origin: http://orderflow.local:31641" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v http://44.210.23.194:31641/api/v1/orders

# Test actual POST request
curl -X POST \
  -H "Origin: http://orderflow.local:31641" \
  -H "Content-Type: application/json" \
  -H "Host: orderflow.local" \
  -d '{"accountId":"123","items":[{"productId":"1","quantity":2,"price":10.99}]}' \
  -v http://44.210.23.194:31641/api/v1/orders
```

Check the response headers for:
- `Access-Control-Allow-Origin: *` or `Access-Control-Allow-Origin: http://orderflow.local:31641`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: *`

---

## Solution 5: Verify API Endpoint Path

The frontend uses `/api/v1` as the base URL. Verify the backend API path:

```bash
# Test backend health endpoint
curl -H "Host: orderflow.local" http://44.210.23.194:31641/api/actuator/health

# Test API endpoint
curl -H "Host: orderflow.local" http://44.210.23.194:31641/api/v1/orders/account/123
```

If the backend uses a different path (e.g., `/api/v1` vs `/api`), you may need to update the ingress rewrite rules.

---

## Solution 6: Check Browser Console

Open browser developer tools (F12) and check:

1. **Network Tab:**
   - Look for failed requests (red)
   - Check request headers
   - Check response headers
   - Look for CORS-related errors

2. **Console Tab:**
   - Look for CORS error messages
   - Check for any JavaScript errors

3. **Application Tab → Storage:**
   - Clear cookies and cache
   - Try again

---

## Solution 7: Update Ingress Path Rewrite (if needed)

If the backend expects `/api/v1` but ingress routes `/api`, update the ingress:

```yaml
annotations:
  nginx.ingress.kubernetes.io/rewrite-target: /$2
  nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  rules:
    - host: orderflow.local
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: backend
                port:
                  number: 8080
```

This will rewrite `/api/v1/orders` to `/v1/orders` on the backend.

**OR** if backend expects full path, remove rewrite:

```yaml
annotations:
  # Remove rewrite-target or set to empty
  # nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: orderflow.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8080
```

---

## Solution 8: Verify Backend API Endpoints

Check what endpoints the backend actually exposes:

```bash
# Port forward to backend
kubectl port-forward svc/backend 8080:8080 -n orderflow

# Test locally
curl http://localhost:8080/api/v1/orders
curl http://localhost:8080/actuator/health
```

This helps verify:
- Backend is running
- API endpoints are correct
- CORS is configured on backend

---

## Common CORS Issues

### Issue 1: Preflight (OPTIONS) Request Failing

**Symptom:** Browser sends OPTIONS request but gets blocked

**Solution:** Ensure backend handles OPTIONS requests and returns proper CORS headers

### Issue 2: Credentials Not Allowed

**Symptom:** `Access-Control-Allow-Credentials` header issues

**Solution:** 
- Set `cors.allow-all-origins=true` in backend
- Or set specific origin instead of `*` when using credentials

### Issue 3: Headers Not Allowed

**Symptom:** Custom headers are blocked

**Solution:** Add headers to `Access-Control-Allow-Headers` in backend CORS config

---

## Quick Diagnostic Commands

```bash
# 1. Check ingress annotations
kubectl get ingress orderflow-ingress -n orderflow -o yaml | grep -i cors

# 2. Check backend environment
kubectl get deployment backend -n orderflow -o jsonpath='{.spec.template.spec.containers[0].env[*]}' | grep CORS

# 3. Test CORS preflight
curl -X OPTIONS \
  -H "Origin: http://orderflow.local:31641" \
  -H "Access-Control-Request-Method: POST" \
  -v http://44.210.23.194:31641/api/v1/orders 2>&1 | grep -i "access-control"

# 4. Check backend logs
kubectl logs -n orderflow -l app=backend --tail=20
```

---

## Expected Working Configuration

After applying fixes, you should see:

1. **Ingress annotations include CORS settings**
2. **Backend has `CORS_ALLOW_ALL_ORIGINS=true`**
3. **OPTIONS requests return 200 with CORS headers**
4. **POST/GET requests include CORS headers in response**
5. **Browser console shows no CORS errors**

---

## Apply the Fix

1. **Update and apply ingress:**
   ```bash
   kubectl apply -f ingress.yaml
   ```

2. **Verify backend CORS:**
   ```bash
   kubectl get deployment backend -n orderflow -o yaml | grep CORS
   ```

3. **Restart backend if needed:**
   ```bash
   kubectl rollout restart deployment backend -n orderflow
   ```

4. **Test in browser:**
   - Clear browser cache
   - Try submitting the form again
   - Check browser console for errors

---

## Still Not Working?

If CORS issues persist:

1. Check browser console for specific error messages
2. Verify backend is actually receiving requests (check logs)
3. Test with curl to see if CORS headers are present
4. Consider temporarily disabling CORS in backend for testing (not recommended for production)
5. Check if there are any network policies blocking traffic
