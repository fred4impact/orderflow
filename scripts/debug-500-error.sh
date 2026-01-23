#!/bin/bash

echo "=========================================="
echo "Debugging 500 Error - OrderFlow"
echo "=========================================="
echo ""

NAMESPACE="orderflow"

echo "1. Checking Pod Status..."
echo "------------------------"
kubectl get pods -n $NAMESPACE -o wide
echo ""

echo "2. Checking Service Endpoints..."
echo "--------------------------------"
kubectl get endpoints -n $NAMESPACE
echo ""

echo "3. Checking Recent Events..."
echo "----------------------------"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -15
echo ""

echo "4. Backend Pod Logs (last 50 lines)..."
echo "---------------------------------------"
BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$BACKEND_POD" ]; then
    echo "Backend Pod: $BACKEND_POD"
    kubectl logs -n $NAMESPACE $BACKEND_POD --tail=50
else
    echo "⚠️  No backend pod found!"
fi
echo ""

echo "5. Frontend Pod Logs (last 30 lines)..."
echo "---------------------------------------"
FRONTEND_POD=$(kubectl get pods -n $NAMESPACE -l app=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$FRONTEND_POD" ]; then
    echo "Frontend Pod: $FRONTEND_POD"
    kubectl logs -n $NAMESPACE $FRONTEND_POD --tail=30
else
    echo "⚠️  No frontend pod found!"
fi
echo ""

echo "6. Testing Backend Service Directly..."
echo "---------------------------------------"
BACKEND_SVC_IP=$(kubectl get svc backend -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
if [ -n "$BACKEND_SVC_IP" ]; then
    echo "Backend Service IP: $BACKEND_SVC_IP"
    echo "Testing from within cluster..."
    kubectl run -it --rm debug-curl --image=curlimages/curl:latest --restart=Never -n $NAMESPACE -- curl -s http://backend:8080/api/v1/orders 2>/dev/null || echo "⚠️  Could not test backend service"
else
    echo "⚠️  Backend service not found!"
fi
echo ""

echo "7. Checking Database Connection..."
echo "----------------------------------"
if [ -n "$BACKEND_POD" ]; then
    echo "Checking if backend can reach database..."
    kubectl exec -n $NAMESPACE $BACKEND_POD -- env | grep -i datasource || echo "⚠️  Could not check database env vars"
fi
echo ""

echo "8. Checking Ingress Controller Logs..."
echo "--------------------------------------"
INGRESS_POD=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$INGRESS_POD" ]; then
    echo "Ingress Pod: $INGRESS_POD"
    echo "Last 20 lines of ingress logs (filtered for orderflow):"
    kubectl logs -n ingress-nginx $INGRESS_POD --tail=50 | grep -i orderflow || echo "No orderflow-related logs found"
else
    echo "⚠️  Ingress controller pod not found!"
fi
echo ""

echo "9. Testing Backend from Backend Pod..."
echo "--------------------------------------"
if [ -n "$BACKEND_POD" ]; then
    echo "Testing localhost:8080/api/v1/orders from backend pod:"
    kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:8080/api/v1/orders 2>/dev/null | head -20 || echo "⚠️  Backend not responding on localhost:8080"
fi
echo ""

echo "=========================================="
echo "Debugging Complete"
echo "=========================================="
