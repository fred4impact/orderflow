# kubectl Command Cheat Sheet (Bare‑Metal / kubeadm)

This document contains the **essential kubectl commands** you will need to manually manage, debug, and operate applications (e.g. **Orderflow**) on a **master/worker Kubernetes cluster** created with `kubeadm` (no EKS/AKS/GKE).

---

## 1. Cluster & Context

```bash
kubectl cluster-info
kubectl config current-context
kubectl config get-contexts
```

---

## 2. Namespaces

```bash
kubectl get namespaces
kubectl get ns

kubectl create namespace orderflow
kubectl delete namespace orderflow

kubectl get pods -n orderflow
kubectl config set-context --current --namespace=orderflow
```

---

## 3. Nodes

```bash
kubectl get nodes
kubectl describe node kube-node-01
```

---

## 4. Pods

```bash
kubectl get pods
kubectl get pods -n orderflow
kubectl get pods -o wide

kubectl describe pod <pod-name>

kubectl logs <pod-name>
kubectl logs -f <pod-name>
kubectl logs <pod-name> -c <container-name>

kubectl exec -it <pod-name> -- bash
```

---

## 5. Deployments

```bash
kubectl get deployments
kubectl describe deployment backend

kubectl scale deployment backend --replicas=2
kubectl rollout restart deployment backend
kubectl rollout status deployment backend
```

---

## 6. Services

```bash
kubectl get svc
kubectl describe svc frontend
kubectl get svc frontend -o wide
```

---

## 7. ConfigMaps & Secrets

```bash
kubectl get configmaps
kubectl create configmap app-config --from-file=application.yml

kubectl get secrets
kubectl describe secret db-secret
kubectl get secret db-secret -o yaml
```

---

## 8. Apply & Delete Manifests

```bash
kubectl apply -f backend.yaml
kubectl apply -f .

kubectl delete -f backend.yaml

kubectl delete pod <pod-name> --force --grace-period=0
```

---

## 9. Ingress

```bash
kubectl get ingress
kubectl describe ingress nginx-ingress
```

---

## 10. Events & Debugging

```bash
kubectl get events
kubectl get events --sort-by=.metadata.creationTimestamp
```

---

## 11. Troubleshooting (Real‑World)

```bash
kubectl logs deploy/backend
kubectl exec -it deploy/backend -- env
kubectl exec -it deploy/backend -- curl http://postgres:5432
kubectl describe pod <pod-name>
```

---

## 12. Clean‑Up Commands

```bash
kubectl delete all --all -n orderflow
kubectl delete pvc --all -n orderflow
```

---

## 13. Cluster‑Wide (Admin View)

```bash
kubectl get pods -A
kubectl get svc -A
kubectl get all -n orderflow
```

---

## 14. Useful Aliases (Optional)

Add to `~/.bashrc`:

```bash
alias k=kubectl
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployments'
```

```bash
source ~/.bashrc
```

---

## Notes

* These commands remain **essential even when using ArgoCD, Helm, and EKS**
* kubectl is your **primary debugging tool** in GitOps workflows
* Always check **Events → Describe → Logs** in that order

---

✅ Ideal for: Bare‑metal Kubernetes, kubeadm labs, Orderflow project, GitOps preparation
