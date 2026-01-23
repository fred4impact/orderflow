#!/bin/bash

echo "Getting full backend error logs..."
echo "=================================="
echo ""

BACKEND_POD=$(kubectl get pods -n orderflow -l app=backend -o jsonpath='{.items[0].metadata.name}')

if [ -n "$BACKEND_POD" ]; then
    echo "Backend Pod: $BACKEND_POD"
    echo ""
    echo "Last 100 lines of logs (looking for actual error message):"
    echo "----------------------------------------------------------"
    kubectl logs -n orderflow $BACKEND_POD --tail=100 | grep -A 5 -B 5 -i "error\|exception\|failed" | head -50
    echo ""
    echo "Testing backend directly with different paths:"
    echo "-----------------------------------------------"
    echo "1. Testing /api/v1/orders:"
    kubectl exec -n orderflow $BACKEND_POD -- curl -s http://localhost:8080/api/v1/orders 2>&1 | head -10
    echo ""
    echo "2. Testing /actuator/health:"
    kubectl exec -n orderflow $BACKEND_POD -- curl -s http://localhost:8080/actuator/health 2>&1
    echo ""
    echo "3. Testing /api:"
    kubectl exec -n orderflow $BACKEND_POD -- curl -s http://localhost:8080/api 2>&1 | head -10
else
    echo "No backend pod found!"
fi
