#!/bin/bash

echo "Testing Backend Directly (bypassing ingress)"
echo "=========================================="
echo ""

BACKEND_POD=$(kubectl get pods -n orderflow -l app=backend -o jsonpath='{.items[0].metadata.name}')

if [ -z "$BACKEND_POD" ]; then
    echo "❌ Backend pod not found!"
    exit 1
fi

echo "Backend Pod: $BACKEND_POD"
echo ""

echo "1. Testing /actuator/health (should work):"
echo "------------------------------------------"
kubectl exec -n orderflow $BACKEND_POD -- curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8080/actuator/health
echo ""

echo "2. Testing /api/v1/orders (should return empty array or error):"
echo "---------------------------------------------------------------"
kubectl exec -n orderflow $BACKEND_POD -- curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8080/api/v1/orders
echo ""

echo "3. Testing /api (should return 404 or error):"
echo "----------------------------------------------"
kubectl exec -n orderflow $BACKEND_POD -- curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8080/api
echo ""

echo "4. Getting recent backend logs (last 30 lines):"
echo "------------------------------------------------"
kubectl logs -n orderflow $BACKEND_POD --tail=30 | tail -20
echo ""

echo "5. Checking if backend can connect to database:"
echo "------------------------------------------------"
kubectl exec -n orderflow $BACKEND_POD -- env | grep -i datasource
echo ""

echo "6. Testing database connection from backend pod:"
echo "-------------------------------------------------"
kubectl exec -n orderflow $BACKEND_POD -- sh -c 'nc -zv postgres.orderflow.svc.cluster.local 5432 2>&1 || echo "Cannot connect to database"'
echo ""
