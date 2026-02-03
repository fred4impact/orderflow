# Accessing Backend API in Minikube

## Option 1: Port-Forward (Recommended)

```bash
kubectl port-forward svc/backend -n order 8080:8080
```

Base URL: `http://localhost:8080`

## Option 2: Minikube Service Tunnel

```bash
minikube service backend -n order
```

This will open a tunnel and provide a URL like:
```
http://127.0.0.1:65092
```

**Note:** The port number changes each time you run the command.

## Available API Endpoints

### 1. Create Order (POST)
```bash
POST http://localhost:8080/api/v1/orders
Content-Type: application/json

{
  "accountId": "acc-123",
  "items": [
    {
      "productId": "prod-123",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "shippingAddress": "123 Main St, City, State 12345",
  "paymentMethod": "pmt-456"
}
```

### 2. Get Order by ID (GET)
```bash
GET http://localhost:8080/api/v1/orders/1
```

### 3. Get Orders by Account ID (GET)
```bash
GET http://localhost:8080/api/v1/orders/account/acc-123
```

### 4. Cancel Order (POST)
```bash
POST http://localhost:8080/api/v1/orders/1/cancel
```

### 5. Update Order Status (PUT)
```bash
PUT http://localhost:8080/api/v1/orders/1/status?status=PAID
```

## Quick Test Examples

### Using curl with port-forward:

```bash
# 1. Create an order
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-001",
    "items": [
      {
        "productId": "prod-1",
        "quantity": 2,
        "price": 29.99
      }
    ],
    "shippingAddress": "123 Main St, New York, NY 10001",
    "paymentMethod": "pmt-001"
  }'

# 2. Get orders for an account
curl http://localhost:8080/api/v1/orders/account/acc-001

# 3. Get a specific order (replace 1 with actual order ID)
curl http://localhost:8080/api/v1/orders/1
```

### Using curl with minikube service:

```bash
# Get the URL first
minikube service backend -n order --url

# Then use that URL (e.g., http://127.0.0.1:65092)
curl -X POST http://127.0.0.1:65092/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-001",
    "items": [{"productId": "prod-1", "quantity": 2, "price": 29.99}],
    "shippingAddress": "123 Main St",
    "paymentMethod": "pmt-001"
  }'
```

## Option 3: Convert to NodePort (Stable URL)

If you want a stable URL, convert the backend service to NodePort:

```bash
kubectl patch svc backend -n order -p '{"spec":{"type":"NodePort"}}'
```

Get the NodePort:
```bash
kubectl get svc backend -n order
```

Access via:
```
http://$(minikube ip):<NODEPORT>/api/v1/orders
```

## Access Swagger UI (API Documentation)

The backend includes Swagger/OpenAPI documentation:

```bash
# With port-forward
kubectl port-forward svc/backend -n order 8080:8080
# Then open: http://localhost:8080/swagger-ui.html

# Or with minikube service
minikube service backend -n order
# Then open: http://127.0.0.1:65092/swagger-ui.html
```

## Troubleshooting

### Issue: "Request method 'GET' is not supported" for `/api/v1/orders`
**Problem:** There's no `GET /api/v1/orders` endpoint to list all orders.

**Solution:** Use one of these endpoints instead:
- `GET /api/v1/orders/account/{accountId}` - Get orders for a specific account
- `GET /api/v1/orders/{id}` - Get a specific order by ID
- `POST /api/v1/orders` - Create a new order

### Issue: 500 Internal Server Error

1. **Check backend logs:**
   ```bash
   kubectl logs -n order -l app=backend --tail=100
   ```

2. **Check if database is accessible:**
   ```bash
   kubectl get pods -n order | grep postgres
   kubectl exec -n order <postgres-pod-name> -- psql -U orderuser -d orders -c "\dt"
   ```

3. **Verify environment variables:**
   ```bash
   kubectl describe pod -n order -l app=backend | grep -A 20 "Environment:"
   ```

4. **Restart backend pod:**
   ```bash
   kubectl rollout restart deployment/backend -n order
   kubectl rollout status deployment/backend -n order
   ```

5. **Check database connection:**
   - Ensure `SPRING_PROFILES_ACTIVE=prod` is set
   - Verify `DB_HOST=postgres-service` matches your postgres service name
   - Check database name matches: `orders` (not `orderdb`)

### Issue: 500 Error - Database Connection Failed
**Solution:** Ensure:
- Postgres pod is running: `kubectl get pods -n order | grep postgres`
- Backend has correct DB_HOST environment variable
- Database name matches: `orders`

### Issue: 500 Error - Tables Don't Exist
**Solution:** The prod profile uses `ddl-auto: validate`. Either:
- Set `SPRING_JPA_HIBERNATE_DDL_AUTO=update` in deployment
- Or manually create tables using the schema file

### Issue: Port Changes Every Time
**Solution:** Use port-forward (Option 1) or convert to NodePort (Option 3)
