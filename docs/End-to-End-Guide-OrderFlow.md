# Orderflow Kubernetes Project – End-to-End Guide

This document collates **all phases** of the Orderflow project, from raw Kubernetes deployment to **Helm + GitOps with ArgoCD**. It is written as a real-world DevOps learning path.

---

## Phase 1 – Core Kubernetes Deployment (Baseline)

### Goal

Deploy a full-stack application (Frontend, Backend, PostgreSQL) on Kubernetes using standard manifests.

### Components

* Frontend (NGINX)
* Backend (Spring Boot API)
* PostgreSQL Database
* Services for internal/external access

### Key Resources

* Deployments
* ClusterIP & NodePort Services
* Pods & ReplicaSets

### Key Commands

```bash
kubectl apply -f k8s/
kubectl get pods
kubectl get svc
kubectl logs <pod-name>
```

### Outcome

* Application running on Kubernetes
* Frontend exposed via NodePort
* Backend and DB accessible internally

---

## Phase 2 – Production Hardening

### Goal

Move from "it works" to "it is production-ready".

### 1. Ingress (Replace NodePort)

* Use NGINX Ingress Controller
* Single entry point for the application

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

Ingress routes:

* `/` → Frontend
* `/api` → Backend

---

### 2. ConfigMaps & Secrets

**ConfigMap**

* Non-sensitive configuration
* Database URL

**Secret**

* DB username/password

Benefits:

* No hardcoded values
* Environment flexibility

---

### 3. Readiness & Liveness Probes

Added to backend:

* Readiness: when pod can receive traffic
* Liveness: when pod must be restarted

Improves:

* Stability
* Zero-downtime deployments

---

## Phase 3 – GitOps with ArgoCD

### Goal

Let **Git control Kubernetes state**.

### 1. Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Access UI via port-forward:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

---

### 2. GitOps Workflow

```text
Git Commit → ArgoCD Sync → Cluster Updated
```

Benefits:

* Drift detection
* Self-healing
* Auditable deployments

---

## Phase 4 – Helm Conversion

### Goal

Package Kubernetes manifests into a reusable Helm chart.

### Helm Structure

```text
helm/orderflow/
├── Chart.yaml
├── values.yaml
└── templates/
```

### Benefits

* Parameterized deployments
* Environment-specific values
* Perfect fit for ArgoCD

### Example Helm Install

```bash
helm install orderflow helm/orderflow -n orderflow --create-namespace
```

---

## Phase 5 – GitOps Repository (Helm + ArgoCD)

### Goal

Separate **application code** from **deployment config**.

### GitOps Repo Structure

```text
orderflow-gitops/
├── apps/
│   └── orderflow/
│       ├── application.yaml
│       └── values/
│           ├── dev.yaml
│           └── prod.yaml
```

### ArgoCD Application

* References Helm chart
* Auto-sync enabled
* Prune + self-heal

---

## Phase 6 – End-to-End Flow

```text
Developer Pushes Code
        ↓
CI Builds Image
        ↓
Update Helm values (image tag)
        ↓
Git Push
        ↓
ArgoCD Auto-Sync
        ↓
Kubernetes Updated
```

---

## Skills Gained (CV-Ready)

* Kubernetes (kubeadm, manifests, ingress)
* Docker & container debugging
* ConfigMaps & Secrets
* Health probes
* Helm chart authoring
* GitOps principles
* ArgoCD operations

---

## What This Prepares You For

* AWS EKS deployments
* Platform / DevOps Engineer roles
* Real-world microservices operations
* Production-grade CI/CD pipelines

---

## Optional Next Phases

* EKS migration
* AWS ALB Ingress Controller
* IRSA + AWS Secrets Manager
* Blue/Green or Canary with Argo Rollouts
* Observability (Prometheus + Grafana)

---

**Status:** ✅ Kubernetes → Helm → GitOps completed
