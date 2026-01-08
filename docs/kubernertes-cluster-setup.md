# Kubernetes Cluster Setup on AWS EC2 (Ubuntu 22.04)

This guide walks you through setting up a **Kubernetes cluster using kubeadm** on **AWS EC2** with **Ubuntu 22.04 (Jammy)**.

> ✅ This is a **learning / hands-on setup** (no EKS, AKS, or GKE).

---

## Architecture

* **1 Master (Control Plane) EC2 instance**
* **1 Worker (Node) EC2 instance**
* Same **VPC & subnet**
* Uses **containerd** as the container runtime
* Uses **Calico** as the CNI

---

## 1. Prerequisites

### EC2 Requirements

| Item          | Requirement           |
| ------------- | --------------------- |
| OS            | **Ubuntu 22.04 LTS**  |
| Instance type | `t3.medium` (minimum) |
| CPU           | 2 vCPU                |
| Memory        | 4 GB recommended      |
| Network       | Same VPC & subnet     |

### AWS Security Group (IMPORTANT)

* Allow **all traffic within the same Security Group**
* Allow **SSH (22)** from your IP

> ⚠️ AWS Security Groups act as your firewall. **UFW is not required**.

---

## 2. Base OS Setup (MASTER & NODE)

Run **all steps in this section on BOTH instances**.

### 2.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

---

### 2.2 Disable Swap (Required)

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

Verify:

```bash
free -h
```

---

### 2.3 Set Hostnames

**Master**:

```bash
sudo hostnamectl set-hostname kube-master
```

**Worker**:

```bash
sudo hostnamectl set-hostname kube-node-01
```

Re-login or run:

```bash
exec bash
```

---

### 2.4 Load Kernel Modules & Sysctl

```bash
sudo modprobe overlay
sudo modprobe br_netfilter
```

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF
```

```bash
sudo sysctl --system
```

Verify:

```bash
sysctl net.ipv4.ip_forward
```

---

## 3. Install containerd (MASTER & NODE)

Kubernetes no longer supports Docker directly. **containerd is recommended**.

```bash
sudo apt install -y containerd
```

### Configure containerd

```bash
sudo mkdir -p /etc/containerd
sudo containerd config default | sudo tee /etc/containerd/config.toml
```

Enable systemd cgroups:

```bash
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
```

Restart containerd:

```bash
sudo systemctl restart containerd
sudo systemctl enable containerd
```

---

## 4. Install Kubernetes Components (MASTER & NODE)

### 4.1 Add Kubernetes Repository (Modern)

```bash
sudo apt install -y curl gpg apt-transport-https
sudo mkdir -p /etc/apt/keyrings
```

```bash
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key \
| sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes.gpg
```

```bash
echo "deb [signed-by=/etc/apt/keyrings/kubernetes.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" \
| sudo tee /etc/apt/sources.list.d/kubernetes.list
```

```bash
sudo apt update
```

---

### 4.2 Install kubeadm, kubelet, kubectl

```bash
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

Verify:

```bash
kubeadm version
kubectl version --client
kubelet --version
```

---

## 5. Initialize Kubernetes Master (MASTER ONLY)

### 5.1 Get Master **Private IP**

```bash
hostname -I
```

> ⚠️ Use **PRIVATE IP**, not public IP

---

### 5.2 Initialize Cluster

```bash
sudo kubeadm init \
  --apiserver-advertise-address=<MASTER_PRIVATE_IP> \
  --pod-network-cidr=192.168.0.0/16
```

Save the **kubeadm join** command shown at the end.

---

### 5.3 Configure kubectl (MASTER)

```bash
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

Test:

```bash
kubectl get nodes
```

---

## 6. Install Calico CNI (MASTER)

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

Wait until pods are running:

```bash
kubectl get pods -n kube-system
```

---

## 7. Join Worker Node (NODE ONLY)

Run the command copied earlier, example:

```bash
sudo kubeadm join <MASTER_PRIVATE_IP>:6443 \
  --token <TOKEN> \
  --discovery-token-ca-cert-hash sha256:<HASH>
```

---

## 8. Validate Cluster (MASTER)

```bash
kubectl get nodes
```

Expected:

```text
NAME           STATUS   ROLES           AGE
kube-master    Ready    control-plane   5m
kube-node-01   Ready    <none>          2m
```

---

## Phase 1 Complete ✅

You now have:

* A working Kubernetes cluster
* Master + Worker on EC2
* containerd runtime
* Calico networking

---

## Next Phases (When You’re Ready)

* Phase 2: Deploy sample apps (Nginx, NodePort, LoadBalancer)
* Phase 3: Ingress (NGINX Ingress Controller)
* Phase 4: Persistent Volumes
* Phase 5: Monitoring (Prometheus + Grafana)
* Phase 6: CI/CD (GitLab / Jenkins)

---

> 💡 This setup mirrors **real Kubernetes internals**, making EKS much easier later.
