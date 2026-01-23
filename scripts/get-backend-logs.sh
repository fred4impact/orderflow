#!/bin/bash

echo "Backend Error Analysis"
echo "======================"
echo ""

BACKEND_POD=$(kubectl get pods -n orderflow -l app=backend -o jsonpath='{.items[0].metadata.name}')

if [ -z "$BACKEND_POD" ]; then
    echo "❌ Backend pod not found!"
    exit 1
fi

echo "Backend Pod: $BACKEND_POD"
echo ""

echo "1. Full error message (last 200 lines, filtered for errors):"
echo "-------------------------------------------------------------"
kubectl logs -n orderflow $BACKEND_POD --tail=200 | grep -A 10 -B 5 -i "error\|exception\|failed" | head -80
echo ""

echo "2. Application startup logs:"
echo "----------------------------"
kubectl logs -n orderflow $BACKEND_POD | grep -i "started\|error\|exception" | head -30
echo ""

echo "3. Recent request logs (last 50 lines):"
echo "---------------------------------------"
kubectl logs -n orderflow $BACKEND_POD --tail=50
echo ""

echo "4. Check if database is accessible:"
echo "------------------------------------"
kubectl exec -n orderflow $BACKEND_POD -- sh -c 'echo "Testing database connection..." && nc -zv postgres.orderflow.svc.cluster.local 5432 2>&1 || echo "nc not available, checking env vars instead"' || echo "Cannot exec into pod"
echo ""

echo "5. Environment variables (database related):"
echo "--------------------------------------------"
kubectl exec -n orderflow $BACKEND_POD -- env 2>/dev/null | grep -i "DATASOURCE\|DB\|POSTGRES" || echo "Cannot get env vars"
echo ""
