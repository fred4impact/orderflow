# LitmusChaos + Dashboard + Prometheus + Grafana
# Clean Install Flow (Minikube docker driver)

Assumes:
- Minikube running
- kubectl working
- Helm installed

------------------------------------------------------------
# 1 — Install Prometheus + Grafana (kube-prometheus-stack)
------------------------------------------------------------

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

kubectl create ns monitoring

helm install kube-prometheus prometheus-community/kube-prometheus-stack \
--namespace monitoring

kubectl get pods -n monitoring

# Wait until all pods are Running

------------------------------------------------------------
# 2 — Open Grafana
------------------------------------------------------------

minikube service kube-prometheus-grafana -n monitoring

# Login:
# user: admin
# pass:

kubectl get secret kube-prometheus-grafana -n monitoring \
-o jsonpath="{.data.admin-password}" | base64 -d ; echo

------------------------------------------------------------
# 3 — Open Prometheus
------------------------------------------------------------

minikube service kube-prometheus-kube-prome-prometheus -n monitoring

------------------------------------------------------------
# 4 — Install LitmusChaos Platform (Dashboard + API + Mongo)
------------------------------------------------------------

kubectl create ns litmus

helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm repo update

helm install litmus litmuschaos/litmus \
--namespace litmus

kubectl get pods -n litmus

# Wait until all litmus pods are Running

------------------------------------------------------------
# 5 — Open Litmus Dashboard
------------------------------------------------------------

minikube service litmusportal-frontend-service -n litmus

# This opens the ChaosCenter UI

------------------------------------------------------------
# 6 — Default Litmus Login
------------------------------------------------------------

user: admin
password: litmus

------------------------------------------------------------
# 7 — Connect Cluster to Litmus (Agent)
------------------------------------------------------------

Inside Litmus UI:

Settings → MyHub → Connect Cluster

OR CLI method:

kubectl apply -f \
https://litmuschaos.github.io/litmus/litmus-agent.yaml

------------------------------------------------------------
# 8 — Install Chaos Experiments Library
------------------------------------------------------------

kubectl apply -f https://litmuschaos.github.io/litmus/chaos-resources.yaml -n litmus

kubectl get chaosexperiments -n litmus

------------------------------------------------------------
# 9 — Label Orderflow Frontend (Chaos Target)
------------------------------------------------------------

kubectl label deploy frontend app=orderflow-frontend \
-n orderflow --overwrite

------------------------------------------------------------
# 10 — Create Chaos RBAC
------------------------------------------------------------

kubectl create sa chaos-admin -n orderflow

kubectl create clusterrolebinding chaos-admin-binding \
--clusterrole=cluster-admin \
--serviceaccount=orderflow:chaos-admin

------------------------------------------------------------
# 11 — Run First Chaos Test From Dashboard
------------------------------------------------------------

Litmus UI → Create Workflow → Chaos Experiment

Select:

Pod Delete

Target:

namespace: orderflow
label: app=orderflow-frontend

Run experiment.

------------------------------------------------------------
# 12 — Watch Chaos + Metrics
------------------------------------------------------------

Watch pods:

kubectl get pods -n orderflow -w

Check app still reachable via Traefik:

curl -H "Host: orderflow.local" http://localhost:8090

------------------------------------------------------------
# 13 — Import Grafana Chaos Dashboards
------------------------------------------------------------

Grafana → Dashboards → Import

Use dashboard IDs:

Litmus Chaos:
13692
14722

Kubernetes Cluster:
315
6417

------------------------------------------------------------
# DONE
------------------------------------------------------------

You now have:

Browser
↓
Traefik
↓
Orderflow

AND

Litmus Chaos UI
Grafana Metrics
Prometheus Metrics
Chaos Experiments
