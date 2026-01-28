```bash
👉 Option 1: Use Minikube IP + NodePort (most common)

Your service exposes:

Service port: 80

NodePort: 30080

Open this in your browser: http://192.168.49.2:30080

# view the frontned of using minikube 
minikube service frontend -n orderflow


# tEST TEH FRONTEND
kubectl exec -n orderflow -it frontend-76878446b7-rqxmt -- curl localhost


kubectl logs -n orderflow pod/backend-5f46dbb9f4-rccjw


kubectl rollout status deployment/backend -n orderflow


kubectl exec -n orderflow -it frontend-76878446b7-rqxmt -- sh

curl http://backend:8080/health
```