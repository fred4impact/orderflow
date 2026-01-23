#!/bin/bash

echo "Getting Actual Backend Error Message"
echo "===================================="
echo ""

BACKEND_POD=$(kubectl get pods -n orderflow -l app=backend -o jsonpath='{.items[0].metadata.name}')

if [ -z "$BACKEND_POD" ]; then
    echo "❌ Backend pod not found!"
    exit 1
fi

echo "Backend Pod: $BACKEND_POD"
echo ""

echo "1. Searching for actual exception/error messages (last 200 lines):"
echo "------------------------------------------------------------------"
kubectl logs -n orderflow $BACKEND_POD --tail=200 | grep -E "(Exception|Error|ERROR|WARN|Failed|failed)" | tail -30
echo ""

echo "2. Getting full stack trace with exception name:"
echo "-------------------------------------------------"
kubectl logs -n orderflow $BACKEND_POD --tail=200 | grep -B 20 "Exception" | head -40
echo ""

echo "3. Testing backend via port-forward (run this in another terminal):"
echo "--------------------------------------------------------------------"
echo "kubectl port-forward -n orderflow svc/backend 8080:8080"
echo ""
echo "Then test with:"
echo "  curl http://localhost:8080/api/v1/orders/account/ac-001"
echo "  curl http://localhost:8080/actuator/health"
echo ""

echo "4. Testing via debug pod:"
echo "--------------------------"
echo "Testing /api/v1/orders/account/ac-001 (this should work):"
kubectl run -it --rm test-api-$(date +%s) \
  --image=curlimages/curl:latest \
  --restart=Never \
  -n orderflow \
  -- curl -s -w "\nHTTP Status: %{http_code}\n" http://backend.orderflow.svc.cluster.local:8080/api/v1/orders/account/ac-001 2>&1 || echo "Failed"
echo ""

echo "5. Testing /api/ (this will fail - no handler):"
echo "------------------------------------------------"
kubectl run -it --rm test-api-$(date +%s) \
  --image=curlimages/curl:latest \
  --restart=Never \
  -n orderflow \
  -- curl -s -w "\nHTTP Status: %{http_code}\n" http://backend.orderflow.svc.cluster.local:8080/api/ 2>&1 || echo "Failed"
echo ""
