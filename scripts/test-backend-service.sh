#!/bin/bash

echo "Testing Backend Service (using debug pod)"
echo "========================================="
echo ""

NAMESPACE="orderflow"
BACKEND_SVC="backend.orderflow.svc.cluster.local:8080"

echo "1. Testing /actuator/health endpoint:"
echo "-------------------------------------"
kubectl run -it --rm test-backend-$(date +%s) \
  --image=curlimages/curl:latest \
  --restart=Never \
  -n $NAMESPACE \
  -- curl -s -w "\nHTTP Status: %{http_code}\n" http://$BACKEND_SVC/actuator/health 2>&1 || echo "Failed to test health endpoint"
echo ""

echo "2. Testing /api/v1/orders endpoint:"
echo "-----------------------------------"
kubectl run -it --rm test-backend-$(date +%s) \
  --image=curlimages/curl:latest \
  --restart=Never \
  -n $NAMESPACE \
  -- curl -s -w "\nHTTP Status: %{http_code}\n" http://$BACKEND_SVC/api/v1/orders 2>&1 || echo "Failed to test orders endpoint"
echo ""

echo "3. Testing /api endpoint (should fail):"
echo "----------------------------------------"
kubectl run -it --rm test-backend-$(date +%s) \
  --image=curlimages/curl:latest \
  --restart=Never \
  -n $NAMESPACE \
  -- curl -s -w "\nHTTP Status: %{http_code}\n" http://$BACKEND_SVC/api 2>&1 || echo "Failed to test /api endpoint"
echo ""

echo "4. Getting backend logs (last 50 lines with errors):"
echo "----------------------------------------------------"
BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$BACKEND_POD" ]; then
    echo "Backend Pod: $BACKEND_POD"
    echo "Recent error logs:"
    kubectl logs -n $NAMESPACE $BACKEND_POD --tail=100 | grep -i "error\|exception\|failed" | tail -20
    echo ""
    echo "Last 30 lines of all logs:"
    kubectl logs -n $NAMESPACE $BACKEND_POD --tail=30
else
    echo "⚠️  Backend pod not found!"
fi
echo ""

echo "5. Checking backend pod status:"
echo "--------------------------------"
kubectl get pod -n $NAMESPACE -l app=backend -o wide
echo ""

echo "6. Checking backend service endpoints:"
echo "----------------------------------------"
kubectl get endpoints backend -n $NAMESPACE
echo ""
