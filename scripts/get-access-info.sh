#!/bin/bash

echo "=========================================="
echo "OrderFlow Application Access Information"
echo "=========================================="
echo ""

# Check if ingress controller is installed
echo "1. Checking Ingress Controller..."
if kubectl get svc ingress-nginx-controller -n ingress-nginx &>/dev/null; then
    echo "   ✅ Ingress controller is installed"
    echo ""
    
    # Get NodePort
    echo "2. Getting Ingress Controller NodePort..."
    NODEPORT=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}' 2>/dev/null)
    if [ -n "$NODEPORT" ]; then
        echo "   HTTP NodePort: $NODEPORT"
    else
        echo "   ⚠️  Could not get NodePort"
    fi
    
    HTTPS_NODEPORT=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[?(@.port==443)].nodePort}' 2>/dev/null)
    if [ -n "$HTTPS_NODEPORT" ]; then
        echo "   HTTPS NodePort: $HTTPS_NODEPORT"
    fi
    echo ""
else
    echo "   ❌ Ingress controller not found!"
    echo "   Install it with:"
    echo "   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/bare-metal/deploy.yaml"
    echo ""
    exit 1
fi

# Get node IPs
echo "3. Getting Worker Node IPs..."
kubectl get nodes -o wide | grep -v NAME | awk '{print "   " $6 " (Node: " $1 ")"}'
echo ""

# Get first worker node IP (internal)
WORKER_IP=$(kubectl get nodes -o wide --no-headers | head -1 | awk '{print $6}')
if [ -n "$WORKER_IP" ]; then
    echo "4. Access Information:"
    echo "   =========================================="
    echo ""
    echo "   Option A: Direct Access (with Host header)"
    echo "   ------------------------------------------"
    echo "   curl -H 'Host: orderflow.local' http://$WORKER_IP:$NODEPORT"
    echo ""
    echo "   Option B: Using /etc/hosts (Recommended)"
    echo "   ------------------------------------------"
    echo "   1. Add this line to /etc/hosts:"
    echo "      $WORKER_IP orderflow.local"
    echo ""
    echo "   2. Then access:"
    echo "      http://orderflow.local:$NODEPORT"
    echo ""
    echo "   Option C: Browser Access"
    echo "   ------------------------------------------"
    echo "   After adding to /etc/hosts, open in browser:"
    echo "   http://orderflow.local:$NODEPORT"
    echo ""
fi

# Check ingress status
echo "5. Checking Ingress Status..."
if kubectl get ingress orderflow-ingress -n orderflow &>/dev/null; then
    echo "   ✅ Ingress resource exists"
    kubectl get ingress orderflow-ingress -n orderflow
    echo ""
    echo "   Ingress details:"
    kubectl describe ingress orderflow-ingress -n orderflow | grep -A 10 "Rules:"
else
    echo "   ⚠️  Ingress resource not found in orderflow namespace"
    echo "   Apply it with: kubectl apply -f ingress.yaml"
fi

echo ""
echo "=========================================="
