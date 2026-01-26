#!/bin/bash

echo "Checking Backend Error for POST Request"
echo "======================================="
echo ""

BACKEND_POD=$(kubectl get pods -n orderflow -l app=backend -o jsonpath='{.items[0].metadata.name}')

if [ -z "$BACKEND_POD" ]; then
    echo "❌ Backend pod not found!"
    exit 1
fi

echo "Backend Pod: $BACKEND_POD"
echo ""

echo "1. Recent backend logs (last 50 lines, looking for errors):"
echo "------------------------------------------------------------"
kubectl logs -n orderflow $BACKEND_POD --tail=50 | grep -E "(ERROR|Exception|Error|Failed|failed)" -A 5 -B 2
echo ""

echo "2. Full recent logs (last 30 lines):"
echo "------------------------------------"
kubectl logs -n orderflow $BACKEND_POD --tail=30
echo ""

echo "3. Check if database tables exist:"
echo "-----------------------------------"
echo "Connecting to postgres to check tables..."
kubectl exec -n orderflow $(kubectl get pods -n orderflow -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- psql -U orderuser -d orders -c "\dt" 2>&1 || echo "Could not check tables"
echo ""

echo "4. Test database connection from backend:"
echo "------------------------------------------"
kubectl exec -n orderflow $BACKEND_POD -- env | grep -i datasource
echo ""
