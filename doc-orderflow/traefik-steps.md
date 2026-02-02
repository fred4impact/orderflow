# Steps to use traefik as ingress 
✅ Minikube (docker driver)
✅ ArgoCD already running on :8080
✅ Traefik installed correctly (new chart schema)
✅ Correct CRDs
✅ Traefik IngressRoute (v1alpha1 traefik.io API)
✅ Works with docker-driver networking limits
✅ Access via port-forward (not LoadBalancer / NodePort)

```bash
# Clean Traefik + Minikube + ArgoCD + Orderflow Flow (NodePort Version)

Architecture:

Browser
↓
localhost:8090
↓
Traefik NodePort
↓
IngressRoute
↓
frontend svc
↓
pods

------------------------------------------------------------
# 0 — Full Reset (optional but recommended)
------------------------------------------------------------

minikube delete

kubectl delete ns traefik-system --ignore-not-found
kubectl delete ns orderflow --ignore-not-found
kubectl delete ns argocd --ignore-not-found

------------------------------------------------------------
# 1 — Start Minikube
------------------------------------------------------------

minikube start --driver=docker

kubectl get nodes

------------------------------------------------------------
# 2 — Install ArgoCD
------------------------------------------------------------

kubectl create namespace argocd

kubectl apply -n argocd \
-f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

kubectl wait --for=condition=available deploy/argocd-server \
-n argocd --timeout=180s

# Open ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# (leave running in one terminal)

------------------------------------------------------------
# 3 — Install Traefik (NodePort Mode — v3 chart safe)
------------------------------------------------------------

helm repo add traefik https://traefik.github.io/charts
helm repo update

helm install traefik traefik/traefik \
--namespace traefik-system \
--create-namespace \
--set service.type=NodePort

kubectl get pods -n traefik-system
kubectl get svc -n traefik-system

------------------------------------------------------------
# 4 — Verify Traefik CRDs
------------------------------------------------------------

kubectl get crds | grep traefik

# If missing:

kubectl apply -f \
https://raw.githubusercontent.com/traefik/traefik/v3.0/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml

------------------------------------------------------------
# 5 — Deploy Orderflow via ArgoCD
------------------------------------------------------------

argocd login localhost:8080 --insecure

argocd app create orderflow \
--repo https://github.com/fred4impact/orderflow.git \
--path . \
--dest-server https://kubernetes.default.svc \
--dest-namespace orderflow

argocd app sync orderflow

kubectl get pods -n orderflow
kubectl get svc -n orderflow
kubectl get endpoints -n orderflow

------------------------------------------------------------
# 6 — Create Traefik IngressRoute
------------------------------------------------------------

cat <<EOF | kubectl apply -f -
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: orderflow-frontend
  namespace: orderflow
spec:
  entryPoints:
    - web
  routes:
    - match: Host(\`orderflow.local\`)
      kind: Rule
      services:
        - name: frontend
          port: 80
EOF

kubectl get ingressroute -n orderflow

------------------------------------------------------------
# 7 — Add Host Mapping
------------------------------------------------------------

echo "127.0.0.1 orderflow.local" | sudo tee -a /etc/hosts

------------------------------------------------------------
# 8 — Expose Traefik NodePort Safely (docker driver fix)
------------------------------------------------------------

minikube service traefik -n traefik-system --url

# This prints something like:
# http://127.0.0.1:8090

# Copy that port — we’ll call it PORT

------------------------------------------------------------
# 9 — Test Through Traefik
------------------------------------------------------------

curl -H "Host: orderflow.local" http://127.0.0.1:PORT

# Should return Orderflow HTML

------------------------------------------------------------
# 10 — Browser Access
------------------------------------------------------------

http://orderflow.local:PORT

------------------------------------------------------------
# SUCCESS
------------------------------------------------------------

Browser
→ localhost:PORT
→ Traefik NodePort
→ IngressRoute
→ frontend svc
→ pods

------------------------------------------------------------
# Debug Commands
------------------------------------------------------------

kubectl logs -n traefik-system deploy/traefik
kubectl get ingressroute --all-namespaces
kubectl get endpoints -n orderflow

```





























```bash
# Traefik + Minikube + ArgoCD + Orderflow — Working Setup Guide

This guide documents the exact working setup for:

- Minikube (docker driver)
- ArgoCD
- Traefik v3 Helm chart
- Orderflow app
- Traefik CRD IngressRoute

- Local access via port-forward (required for docker driver)

This flow avoids all the networking and schema errors we encountered.

---

# ✅ 0 — Start Clean (Optional Reset)

If you want a full reset:


minikube start --driver=docker

minikube status 
minikube profile list 
kubectl get nodes

kubectl create namespace argocd


helm repo add traefik https://traefik.github.io/charts
helm repo update

# Install Traefik
helm install traefik traefik/traefik \
  --namespace traefik-system \
  --create-namespace \
  --set service.type=NodePort

kubectl get svc -n traefik-system
kubectl logs -n traefik-system deploy/traefik -f
kubectl get ingressroute orderflow-frontend -n orderflow -o yaml

minikube service traefik -n traefik-system


# IF YOU NEED TOP REMOVE HELM TRAEFIK
helm uninstall traefik -n traefik-system
kubectl delete namespace traefik-system
kubectl get ns


kubectl get svc -n traefik-system

#ARGOCD INSTALLATION 

kubectl create namespace argocd

kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Port Forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get Password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 --decode

# cd into the k8s directory in the orderflow 
cd orderflow/k8s 
kubectl apply -f argocd-application.yaml

kubectl get all -n orderflow


# in etcs hosts 
127.0.0.1  orderflow.local
# view 
http://orderflow.local

# ACCESSING TRAEFIK DASHBOARD
kubectl port-forward -n traefik-system svc/traefik 9000:9000

http://localhost:9000/dashboard/

# if you want traefik to deashboad from ground up
helm install traefik traefik/traefik \
  --namespace traefik-system \
  --create-namespace \
  --set service.type=LoadBalancer \
  --set ingressRoute.dashboard.enabled=true

# vERIFY 
kubectl get pods -n traefik-system
kubectl get svc  -n traefik-system


kubectl get ingressroute -n orderflow
kubectl get svc -n orderflow
kubectl get endpoints -n orderflow
kubectl get pods -n traefik-system

# Install Traefik CRD
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.0/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml


kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.0/docs/content/reference/dynamic-configuration/kubernetes-crd-rbac.yml

kubectl get crd | grep traefik

kubectl apply -f traefik-ingroute.yaml

kubectl logs -n traefik-system deploy/traefik | grep frontend

kubectl logs -n traefik-system deploy/traefik | grep entrypoint

kubectl port-forward -n traefik-system svc/traefik 8090:80

curl -H "Host: orderflow.local" http://localhost:8090

http://orderflow.local:8090

# VIEW  http://orderflow.local:8090/
kubectl logs -n traefik-system deploy/traefik -f



```

# Add lit,us chaos 





