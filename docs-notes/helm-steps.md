# Helm Chart Creation Guide for Order Service Java

This guide provides step-by-step instructions to create a Helm chart for the Order Service Java application and deploy it on ArgoCD.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Step 1: Create Helm Chart Structure](#step-1-create-helm-chart-structure)
4. [Step 2: Create Chart.yaml](#step-2-create-chartyaml)
5. [Step 3: Create values.yaml](#step-3-create-valuesyaml)
6. [Step 4: Create Template Files](#step-4-create-template-files)
7. [Step 5: Create Helper Templates](#step-5-create-helper-templates)
8. [Step 6: Create ArgoCD Application Manifest](#step-6-create-argocd-application-manifest)
9. [Step 7: Deploy with Helm](#step-7-deploy-with-helm)
10. [Step 8: Deploy with ArgoCD](#step-8-deploy-with-argocd)
11. [Step 9: Install Prometheus and Grafana](#step-9-install-prometheus-and-grafana)
12. [Step 10: Verify Deployment](#step-10-verify-deployment)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or local)
- Helm 3.x installed
- ArgoCD installed in your cluster
- Docker images built and pushed to a container registry
- kubectl configured to access your cluster
- Git repository to store Helm charts (for ArgoCD)

---

## Project Structure

Create the following directory structure for your Helm chart:

```
order-service-java/
├── helm/
│   └── order-service/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── .helmignore
│       └── templates/
│           ├── _helpers.tpl
│           ├── namespace.yaml
│           ├── configmap.yaml
│           ├── secret.yaml
│           ├── postgresql/
│           │   ├── deployment.yaml
│           │   ├── service.yaml
│           │   └── pvc.yaml
│           ├── backend/
│           │   ├── deployment.yaml
│           │   ├── service.yaml
│           │   └── ingress.yaml
│           └── frontend/
│               ├── deployment.yaml
│               ├── service.yaml
│               └── ingress.yaml
└── argocd/
    └── order-service-app.yaml
```

---

## Step 1: Create Helm Chart Structure

```bash
# Navigate to your project root
cd /Users/mac/Documents/DEVOPS-PORTFOLIOS/order-service-java

# Create Helm chart directory structure
mkdir -p helm/order-service/templates/{postgresql,backend,frontend}
mkdir -p argocd

# Initialize Helm chart (optional - creates basic structure)
helm create order-service --skip-tests

# Remove default templates if you want custom ones
rm -rf helm/order-service/templates/*.yaml
```

---

## Step 2: Create Chart.yaml

Create `helm/order-service/Chart.yaml`:

```yaml
apiVersion: v2
name: order-service
description: A Helm chart for Order Service Java Application (Spring Boot + React + PostgreSQL)
type: application
version: 0.1.0
appVersion: "1.0.0"
keywords:
  - order-service
  - spring-boot
  - java
  - react
  - postgresql
  - microservice
home: https://github.com/YOUR_USERNAME/order-service-java
sources:
  - https://github.com/YOUR_USERNAME/order-service-java
maintainers:
  - name: Order Service Team
    email: team@example.com
```

---

## Step 3: Create values.yaml

Create `helm/order-service/values.yaml`:

```yaml
# Global settings
global:
  namespace: order-service
  imageRegistry: ""  # Leave empty to use image.repository directly

# Namespace configuration
namespace:
  create: true
  name: order-service

# PostgreSQL Database Configuration
postgresql:
  enabled: true
  image:
    repository: postgres
    tag: "15-alpine"
    pullPolicy: IfNotPresent
  
  auth:
    postgresPassword: "postgres"  # Change in production!
    database: "orderdb"
    username: "postgres"
  
  persistence:
    enabled: true
    size: 10Gi
    storageClass: ""  # Use default storage class if empty
    accessMode: ReadWriteOnce
  
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi
  
  service:
    type: ClusterIP
    port: 5432

# Backend Service Configuration (Spring Boot)
backend:
  enabled: true
  replicaCount: 2
  
  image:
    repository: YOUR_DOCKER_USERNAME/order-service  # Update with your image
    tag: "latest"
    pullPolicy: IfNotPresent
  
  imagePullSecrets: []
  
  serviceAccount:
    create: true
    name: ""
    annotations: {}
  
  service:
    type: ClusterIP
    port: 8080
    targetPort: 8080
  
  ingress:
    enabled: true
    className: "nginx"
    annotations:
      nginx.ingress.kubernetes.io/rewrite-target: /
      cert-manager.io/cluster-issuer: "letsencrypt-prod"  # Optional
    hosts:
      - host: api.order-service.local
        paths:
          - path: /
            pathType: Prefix
    tls: []
      # - secretName: order-service-backend-tls
      #   hosts:
      #     - api.order-service.local
  
  env:
    SPRING_PROFILES_ACTIVE: "prod"
    DB_HOST: "postgresql-service"
    DB_PORT: "5432"
    DB_NAME: "orderdb"
    DB_USERNAME: "postgres"
    # DB_PASSWORD will be set from secret
  
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi
  
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 80
    targetMemoryUtilizationPercentage: 80
  
  livenessProbe:
    httpGet:
      path: /actuator/health
      port: http
    initialDelaySeconds: 40
    periodSeconds: 30
    timeoutSeconds: 10
    failureThreshold: 3
  
  readinessProbe:
    httpGet:
      path: /actuator/health
      port: http
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 3
  
  nodeSelector: {}
  tolerations: []
  affinity: {}

# Frontend Service Configuration (React + Nginx)
frontend:
  enabled: true
  replicaCount: 2
  
  image:
    repository: YOUR_DOCKER_USERNAME/order-service-frontend  # Update with your image
    tag: "latest"
    pullPolicy: IfNotPresent
  
  imagePullSecrets: []
  
  service:
    type: ClusterIP
    port: 80
    targetPort: 80
  
  ingress:
    enabled: true
    className: "nginx"
    annotations:
      nginx.ingress.kubernetes.io/rewrite-target: /
      cert-manager.io/cluster-issuer: "letsencrypt-prod"  # Optional
    hosts:
      - host: order-service.local
        paths:
          - path: /
            pathType: Prefix
    tls: []
      # - secretName: order-service-frontend-tls
      #   hosts:
      #     - order-service.local
  
  env:
    REACT_APP_API_URL: "http://api.order-service.local"
  
  resources:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi
  
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 80
  
  livenessProbe:
    httpGet:
      path: /health
      port: http
    initialDelaySeconds: 10
    periodSeconds: 30
    timeoutSeconds: 5
    failureThreshold: 3
  
  readinessProbe:
    httpGet:
      path: /health
      port: http
    initialDelaySeconds: 5
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 3
  
  nodeSelector: {}
  tolerations: []
  affinity: {}
```

---

## Step 4: Create Template Files

### 4.1 Create Helper Template (_helpers.tpl)

Create `helm/order-service/templates/_helpers.tpl`:

```yaml
{{/*
Expand the name of the chart.
*/}}
{{- define "order-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "order-service.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "order-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "order-service.labels" -}}
helm.sh/chart: {{ include "order-service.chart" . }}
{{ include "order-service.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "order-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "order-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "order-service.serviceAccountName" -}}
{{- if .Values.backend.serviceAccount.create }}
{{- default (include "order-service.fullname" .) .Values.backend.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.backend.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Namespace
*/}}
{{- define "order-service.namespace" -}}
{{- default .Values.namespace.name .Values.global.namespace }}
{{- end }}
```

### 4.2 Create Namespace Template

Create `helm/order-service/templates/namespace.yaml`:

```yaml
{{- if .Values.namespace.create }}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
{{- end }}
```

### 4.3 Create Secret Template

Create `helm/order-service/templates/secret.yaml`:

```yaml
{{- if .Values.postgresql.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "order-service.fullname" . }}-db-secret
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
type: Opaque
data:
  DB_PASSWORD: {{ .Values.postgresql.auth.postgresPassword | b64enc | quote }}
  DB_USERNAME: {{ .Values.postgresql.auth.username | b64enc | quote }}
  DB_NAME: {{ .Values.postgresql.auth.database | b64enc | quote }}
{{- end }}
```

### 4.4 Create PostgreSQL Deployment

Create `helm/order-service/templates/postgresql/deployment.yaml`:

```yaml
{{- if .Values.postgresql.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "order-service.fullname" . }}-postgresql
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: postgresql
spec:
  replicas: 1
  selector:
    matchLabels:
      {{- include "order-service.selectorLabels" . | nindent 6 }}
      component: postgresql
  template:
    metadata:
      labels:
        {{- include "order-service.selectorLabels" . | nindent 8 }}
        component: postgresql
    spec:
      containers:
      - name: postgresql
        image: "{{ .Values.postgresql.image.repository }}:{{ .Values.postgresql.image.tag }}"
        imagePullPolicy: {{ .Values.postgresql.image.pullPolicy }}
        ports:
        - name: postgresql
          containerPort: 5432
          protocol: TCP
        env:
        - name: POSTGRES_DB
          value: {{ .Values.postgresql.auth.database | quote }}
        - name: POSTGRES_USER
          value: {{ .Values.postgresql.auth.username | quote }}
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: {{ include "order-service.fullname" . }}-db-secret
              key: DB_PASSWORD
        volumeMounts:
        - name: postgresql-data
          mountPath: /var/lib/postgresql/data
        resources:
          {{- toYaml .Values.postgresql.resources | nindent 10 }}
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - {{ .Values.postgresql.auth.username }}
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - {{ .Values.postgresql.auth.username }}
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
      volumes:
      - name: postgresql-data
        {{- if .Values.postgresql.persistence.enabled }}
        persistentVolumeClaim:
          claimName: {{ include "order-service.fullname" . }}-postgresql-pvc
        {{- else }}
        emptyDir: {}
        {{- end }}
{{- end }}
```

### 4.5 Create PostgreSQL Service

Create `helm/order-service/templates/postgresql/service.yaml`:

```yaml
{{- if .Values.postgresql.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "order-service.fullname" . }}-postgresql-service
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: postgresql
spec:
  type: {{ .Values.postgresql.service.type }}
  ports:
    - port: {{ .Values.postgresql.service.port }}
      targetPort: postgresql
      protocol: TCP
      name: postgresql
  selector:
    {{- include "order-service.selectorLabels" . | nindent 4 }}
    component: postgresql
{{- end }}
```

### 4.6 Create PostgreSQL PVC

Create `helm/order-service/templates/postgresql/pvc.yaml`:

```yaml
{{- if and .Values.postgresql.enabled .Values.postgresql.persistence.enabled }}
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ include "order-service.fullname" . }}-postgresql-pvc
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: postgresql
spec:
  accessModes:
    - {{ .Values.postgresql.persistence.accessMode }}
  {{- if .Values.postgresql.persistence.storageClass }}
  storageClassName: {{ .Values.postgresql.persistence.storageClass }}
  {{- end }}
  resources:
    requests:
      storage: {{ .Values.postgresql.persistence.size }}
{{- end }}
```

### 4.7 Create Backend Deployment

Create `helm/order-service/templates/backend/deployment.yaml`:

```yaml
{{- if .Values.backend.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "order-service.fullname" . }}-backend
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: backend
spec:
  replicas: {{ .Values.backend.replicaCount }}
  selector:
    matchLabels:
      {{- include "order-service.selectorLabels" . | nindent 6 }}
      component: backend
  template:
    metadata:
      annotations:
        {{- with .Values.backend.podAnnotations }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
      labels:
        {{- include "order-service.selectorLabels" . | nindent 8 }}
        component: backend
    spec:
      {{- with .Values.backend.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "order-service.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.backend.podSecurityContext | nindent 8 }}
      containers:
      - name: backend
        securityContext:
          {{- toYaml .Values.backend.securityContext | nindent 12 }}
        image: "{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag }}"
        imagePullPolicy: {{ .Values.backend.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.backend.service.targetPort }}
          protocol: TCP
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: {{ .Values.backend.env.SPRING_PROFILES_ACTIVE | quote }}
        - name: DB_HOST
          value: {{ .Values.backend.env.DB_HOST | quote }}
        - name: DB_PORT
          value: {{ .Values.backend.env.DB_PORT | quote }}
        - name: DB_NAME
          value: {{ .Values.backend.env.DB_NAME | quote }}
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: {{ include "order-service.fullname" . }}-db-secret
              key: DB_USERNAME
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: {{ include "order-service.fullname" . }}-db-secret
              key: DB_PASSWORD
        {{- with .Values.backend.env }}
        {{- range $key, $value := . }}
        {{- if and (ne $key "SPRING_PROFILES_ACTIVE") (ne $key "DB_HOST") (ne $key "DB_PORT") (ne $key "DB_NAME") }}
        - name: {{ $key }}
          value: {{ $value | quote }}
        {{- end }}
        {{- end }}
        {{- end }}
        livenessProbe:
          {{- toYaml .Values.backend.livenessProbe | nindent 10 }}
        readinessProbe:
          {{- toYaml .Values.backend.readinessProbe | nindent 10 }}
        resources:
          {{- toYaml .Values.backend.resources | nindent 10 }}
      {{- with .Values.backend.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.backend.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.backend.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
{{- end }}
```

### 4.8 Create Backend Service

Create `helm/order-service/templates/backend/service.yaml`:

```yaml
{{- if .Values.backend.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "order-service.fullname" . }}-backend-service
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: backend
spec:
  type: {{ .Values.backend.service.type }}
  ports:
    - port: {{ .Values.backend.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "order-service.selectorLabels" . | nindent 4 }}
    component: backend
{{- end }}
```

### 4.9 Create Backend Ingress

Create `helm/order-service/templates/backend/ingress.yaml`:

```yaml
{{- if and .Values.backend.enabled .Values.backend.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "order-service.fullname" . }}-backend-ingress
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: backend
  {{- with .Values.backend.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.backend.ingress.className }}
  ingressClassName: {{ .Values.backend.ingress.className }}
  {{- end }}
  {{- if .Values.backend.ingress.tls }}
  tls:
    {{- range .Values.backend.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.backend.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "order-service.fullname" $ }}-backend-service
                port:
                  number: {{ $.Values.backend.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

### 4.10 Create Backend ServiceAccount

Create `helm/order-service/templates/backend/serviceaccount.yaml`:

```yaml
{{- if and .Values.backend.enabled .Values.backend.serviceAccount.create }}
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "order-service.serviceAccountName" . }}
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
  {{- with .Values.backend.serviceAccount.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
{{- end }}
```

### 4.11 Create Backend HPA (Horizontal Pod Autoscaler)

Create `helm/order-service/templates/backend/hpa.yaml`:

```yaml
{{- if and .Values.backend.enabled .Values.backend.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "order-service.fullname" . }}-backend-hpa
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "order-service.fullname" . }}-backend
  minReplicas: {{ .Values.backend.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.backend.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.backend.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.backend.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.backend.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.backend.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
{{- end }}
```

### 4.12 Create Frontend Deployment

Create `helm/order-service/templates/frontend/deployment.yaml`:

```yaml
{{- if .Values.frontend.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "order-service.fullname" . }}-frontend
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: frontend
spec:
  replicas: {{ .Values.frontend.replicaCount }}
  selector:
    matchLabels:
      {{- include "order-service.selectorLabels" . | nindent 6 }}
      component: frontend
  template:
    metadata:
      labels:
        {{- include "order-service.selectorLabels" . | nindent 8 }}
        component: frontend
    spec:
      {{- with .Values.frontend.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      containers:
      - name: frontend
        image: "{{ .Values.frontend.image.repository }}:{{ .Values.frontend.image.tag }}"
        imagePullPolicy: {{ .Values.frontend.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.frontend.service.targetPort }}
          protocol: TCP
        {{- with .Values.frontend.env }}
        env:
          {{- range $key, $value := . }}
          - name: {{ $key }}
            value: {{ $value | quote }}
          {{- end }}
        {{- end }}
        livenessProbe:
          {{- toYaml .Values.frontend.livenessProbe | nindent 10 }}
        readinessProbe:
          {{- toYaml .Values.frontend.readinessProbe | nindent 10 }}
        resources:
          {{- toYaml .Values.frontend.resources | nindent 10 }}
      {{- with .Values.frontend.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.frontend.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.frontend.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
{{- end }}
```

### 4.13 Create Frontend Service

Create `helm/order-service/templates/frontend/service.yaml`:

```yaml
{{- if .Values.frontend.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "order-service.fullname" . }}-frontend-service
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: frontend
spec:
  type: {{ .Values.frontend.service.type }}
  ports:
    - port: {{ .Values.frontend.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "order-service.selectorLabels" . | nindent 4 }}
    component: frontend
{{- end }}
```

### 4.14 Create Frontend Ingress

Create `helm/order-service/templates/frontend/ingress.yaml`:

```yaml
{{- if and .Values.frontend.enabled .Values.frontend.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "order-service.fullname" . }}-frontend-ingress
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: frontend
  {{- with .Values.frontend.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.frontend.ingress.className }}
  ingressClassName: {{ .Values.frontend.ingress.className }}
  {{- end }}
  {{- if .Values.frontend.ingress.tls }}
  tls:
    {{- range .Values.frontend.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.frontend.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "order-service.fullname" $ }}-frontend-service
                port:
                  number: {{ $.Values.frontend.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

### 4.15 Create Frontend HPA

Create `helm/order-service/templates/frontend/hpa.yaml`:

```yaml
{{- if and .Values.frontend.enabled .Values.frontend.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "order-service.fullname" . }}-frontend-hpa
  namespace: {{ include "order-service.namespace" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
    component: frontend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "order-service.fullname" . }}-frontend
  minReplicas: {{ .Values.frontend.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.frontend.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.frontend.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.frontend.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
{{- end }}
```

### 4.16 Create .helmignore

Create `helm/order-service/.helmignore`:

```
# Patterns to ignore when building packages.
# This supports shell glob matching, relative path matching, and
# negation (prefixed with !). Only one pattern per line.
.DS_Store
# Common VCS dirs
.git/
.gitignore
.bzr/
.bzrignore
.hg/
.hgignore
.svn/
# Common backup files
*.swp
*.bak
*.tmp
*.orig
*~
# Various IDEs
.project
.idea/
*.tmproj
.vscode/
```

---

## Step 5: Create Helper Templates

The helper templates are already created in Step 4.1. These provide reusable template functions for labels, names, and selectors.

---

## Step 6: Create ArgoCD Application Manifest

Create `argocd/order-service-app.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service
  namespace: argocd
  labels:
    app.kubernetes.io/name: order-service
    app.kubernetes.io/part-of: order-service-java
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  
  source:
    repoURL: https://github.com/YOUR_USERNAME/order-service-java.git  # Update with your repo
    targetRevision: main  # or your branch name
    path: helm/order-service
    helm:
      valueFiles:
        - values.yaml
      # Optional: Override values from ArgoCD
      values: |
        backend:
          image:
            repository: YOUR_DOCKER_USERNAME/order-service
            tag: "latest"
        frontend:
          image:
            repository: YOUR_DOCKER_USERNAME/order-service-frontend
            tag: "latest"
  
  destination:
    server: https://kubernetes.default.svc
    namespace: order-service
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  
  revisionHistoryLimit: 10
```

---

## Step 7: Deploy with Helm

### 7.1 Validate Helm Chart

```bash
# Navigate to chart directory
cd helm/order-service

# Validate chart syntax
helm lint .

# Dry run to see what will be deployed
helm install order-service . \
  --namespace order-service \
  --create-namespace \
  --dry-run \
  --debug
```

### 7.2 Install with Helm

```bash
# Install the chart
helm install order-service . \
  --namespace order-service \
  --create-namespace \
  --set backend.image.repository=YOUR_DOCKER_USERNAME/order-service \
  --set backend.image.tag=latest \
  --set frontend.image.repository=YOUR_DOCKER_USERNAME/order-service-frontend \
  --set frontend.image.tag=latest

# Check deployment status
helm status order-service -n order-service

# List all resources
kubectl get all -n order-service
```

### 7.3 Upgrade with Helm

```bash
# Upgrade the chart
helm upgrade order-service . \
  --namespace order-service \
  --set backend.image.tag=v1.1.0 \
  --set frontend.image.tag=v1.1.0

# Check upgrade status
helm status order-service -n order-service
```

### 7.4 Uninstall with Helm

```bash
# Uninstall the chart
helm uninstall order-service -n order-service

# Delete namespace (optional)
kubectl delete namespace order-service
```

---

## Step 8: Deploy with ArgoCD

### 8.1 Prerequisites

1. **ArgoCD Installed**: Ensure ArgoCD is installed in your cluster
   ```bash
   kubectl get pods -n argocd
   ```

2. **Git Repository**: Push your Helm chart to a Git repository
   ```bash
   git add helm/ argocd/
   git commit -m "Add Helm chart and ArgoCD configuration"
   git push origin main
   ```

3. **Update Image References**: Update `values.yaml` and ArgoCD manifest with your Docker image repositories

### 8.2 Apply ArgoCD Application

```bash
# Apply the ArgoCD application manifest
kubectl apply -f argocd/order-service-app.yaml

# Check application status
kubectl get application -n argocd

# Get detailed status
kubectl describe application order-service -n argocd
```

### 8.3 Access ArgoCD UI

```bash
# Port forward to ArgoCD server
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo

# Access UI at https://localhost:8080
# Username: admin
# Password: (from above command)
```

### 8.4 Sync Application via CLI

```bash
# Install ArgoCD CLI (if not installed)
# macOS
brew install argocd

# Login to ArgoCD
argocd login localhost:8080

# Sync application
argocd app sync order-service

# Get application status
argocd app get order-service

# View application logs
argocd app logs order-service
```

### 8.5 Sync Application via UI

1. Open ArgoCD UI (https://localhost:8080)
2. Login with admin credentials
3. Click on `order-service` application
4. Click `Sync` button
5. Review changes and click `Synchronize`

---

## Step 9: Install Prometheus and Grafana

This section covers installing Prometheus and Grafana using Helm charts for monitoring your Order Service application.

### 9.1 Prerequisites

- Helm 3.x installed
- kubectl configured to access your cluster
- Sufficient cluster resources (recommended: 4+ CPU cores, 8+ GB RAM)

### 9.2 Add Prometheus Community Helm Repository

```bash
# Add the Prometheus Community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Update Helm repositories
helm repo update

# Verify repository is added
helm repo list
```

### 9.3 Install kube-prometheus-stack (Prometheus + Grafana)

The `kube-prometheus-stack` chart includes:
- Prometheus (metrics collection and storage)
- Grafana (visualization and dashboards)
- Alertmanager (alerting)
- Node Exporter (node metrics)
- kube-state-metrics (Kubernetes metrics)

```bash
# Create a namespace for monitoring
kubectl create namespace monitoring

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=standard \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.storageClassName=standard \
  --set grafana.persistence.size=10Gi \
  --set grafana.adminPassword=admin123 \
  --set grafana.service.type=LoadBalancer

# Check installation status
helm status prometheus -n monitoring

# Watch pods being created
kubectl get pods -n monitoring -w
```

### 9.4 Verify Installation

```bash
# Check all resources in monitoring namespace
kubectl get all -n monitoring

# Check Prometheus pods
kubectl get pods -n monitoring | grep prometheus

# Check Grafana pods
kubectl get pods -n monitoring | grep grafana

# Check services
kubectl get svc -n monitoring
```

### 9.5 Access Grafana

#### Option 1: Port Forward (for testing)

```bash
# Port forward Grafana service
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80

# Access Grafana at http://localhost:3000
# Default credentials:
# Username: admin
# Password: admin123 (or the password you set during installation)
```

#### Option 2: LoadBalancer (if configured)

```bash
# Get LoadBalancer external IP
kubectl get svc prometheus-grafana -n monitoring

# If external IP shows <pending>, wait a few minutes for the cloud provider to assign an IP
# Keep checking:
watch kubectl get svc prometheus-grafana -n monitoring

# Once external IP is assigned, access Grafana at http://<EXTERNAL-IP>
```

**Note**: If your cluster doesn't support LoadBalancer (e.g., local/minikube), the external IP will remain `<pending>`. Use NodePort or port-forward instead.

#### Option 2a: Use NodePort (when LoadBalancer is pending)

If the LoadBalancer external IP is `<pending>`, you can use the NodePort:

```bash
# Check the service to see the NodePort
kubectl get svc prometheus-grafana -n monitoring
# Look for the port mapping like: 80:31414/TCP
# The number after the colon (31414) is the NodePort

# Get a node IP (for local clusters, use localhost or minikube IP)
kubectl get nodes -o wide

# For local/minikube:
minikube ip  # Get the minikube IP

# Access Grafana at http://<NODE-IP>:<NODEPORT>
# Example: http://192.168.49.2:31414
# Or for localhost: http://localhost:31414
```

#### Option 3: Ingress (recommended for production)

Create an Ingress resource for Grafana:

```bash
# Create grafana-ingress.yaml
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: monitoring
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  rules:
  - host: grafana.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-grafana
            port:
              number: 80
  tls:
  - hosts:
    - grafana.yourdomain.com
    secretName: grafana-tls
EOF
```

### 9.6 Access Prometheus

Prometheus runs on port **9090** by default. Here are different ways to access it:

#### Option 1: Port Forward (for testing)

```bash
# Port forward Prometheus service
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090

# Access Prometheus at http://localhost:9090
# The Prometheus UI will be available in your browser
```

#### Option 2: Check Service Port

```bash
# Check the Prometheus service details
kubectl get svc prometheus-kube-prometheus-prometheus -n monitoring

# The service typically exposes port 9090
# NAME                                      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
# prometheus-kube-prometheus-prometheus    ClusterIP   10.96.xxx.xxx   <none>        9090/TCP   5m
```

#### Option 3: Expose via LoadBalancer

If you want external access, you can change the service type:

```bash
# Patch the service to use LoadBalancer
kubectl patch svc prometheus-kube-prometheus-prometheus -n monitoring -p '{"spec":{"type":"LoadBalancer"}}'

# Get the external IP
kubectl get svc prometheus-kube-prometheus-prometheus -n monitoring

# Access Prometheus at http://<EXTERNAL-IP>:9090
```

#### Option 4: Expose via Ingress (recommended for production)

Create an Ingress resource for Prometheus:

```bash
# Create prometheus-ingress.yaml
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prometheus-ingress
  namespace: monitoring
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  rules:
  - host: prometheus.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-kube-prometheus-prometheus
            port:
              number: 9090
  tls:
  - hosts:
    - prometheus.yourdomain.com
    secretName: prometheus-tls
EOF

# Access Prometheus at https://prometheus.yourdomain.com
```

**Note**: For security, it's recommended to use Ingress with authentication or keep Prometheus accessible only within the cluster.

### 9.7 Configure ServiceMonitor for Order Service

To scrape metrics from your Order Service backend, create a ServiceMonitor:

```bash
# Create servicemonitor.yaml
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: order-service-backend
  namespace: order-service
  labels:
    app: order-service-backend
spec:
  selector:
    matchLabels:
      component: backend
  endpoints:
  - port: http
    path: /actuator/prometheus
    interval: 30s
    scrapeTimeout: 10s
EOF
```

**Note**: Ensure your Spring Boot application exposes Prometheus metrics at `/actuator/prometheus`. Add this to your `application.yml`:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

### 9.8 Install Using Custom Values File

For more control, create a custom values file:

```bash
# Create prometheus-values.yaml
cat <<EOF > prometheus-values.yaml
# Prometheus configuration
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          resources:
            requests:
              storage: 50Gi
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false
    ruleSelectorNilUsesHelmValues: false

# Grafana configuration
grafana:
  adminPassword: admin123
  persistence:
    enabled: true
    storageClassName: standard
    size: 10Gi
  service:
    type: LoadBalancer
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default
  dashboards:
    default:
      kubernetes:
        gnetId: 7249
        revision: 1
        datasource: Prometheus

# Alertmanager configuration
alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          resources:
            requests:
              storage: 10Gi
EOF

# Install with custom values
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml
```

### 9.9 Upgrade Prometheus Stack

```bash
# Update Helm repository
helm repo update

# Upgrade to latest version
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml

# Check upgrade status
helm status prometheus -n monitoring
```

### 9.10 Uninstall Prometheus and Grafana

```bash
# Uninstall the Helm release
helm uninstall prometheus -n monitoring

# Delete namespace (optional - removes all resources)
kubectl delete namespace monitoring
```

### 9.11 Import Grafana Dashboards

After accessing Grafana, you can import pre-built dashboards:

1. **Kubernetes Cluster Monitoring**: Dashboard ID `7249`
2. **Spring Boot 2.1 Statistics**: Dashboard ID `11378`
3. **JVM (Micrometer)**: Dashboard ID `4701`

**Steps to import**:
1. Login to Grafana
2. Go to **Dashboards** → **Import**
3. Enter the Dashboard ID
4. Select **Prometheus** as the data source
5. Click **Import**

### 9.12 Create Custom Grafana Dashboard for Order Service

Create a custom dashboard JSON file:

```bash
# Create order-service-dashboard.json
cat <<EOF > order-service-dashboard.json
{
  "dashboard": {
    "title": "Order Service Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_server_requests_seconds_count{application=\"order-service\"}[5m])",
            "legendFormat": "{{uri}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_server_requests_seconds_count{application=\"order-service\",status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{application=\"order-service\"}[5m]))",
            "legendFormat": "p95"
          }
        ]
      }
    ]
  }
}
EOF
```

Import this dashboard in Grafana UI or via API.

### 9.13 Configure Prometheus Alerts

Create alert rules for your Order Service:

```bash
# Create prometheus-rules.yaml
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: order-service-alerts
  namespace: order-service
  labels:
    app: order-service
spec:
  groups:
  - name: order-service
    rules:
    - alert: HighErrorRate
      expr: rate(http_server_requests_seconds_count{application="order-service",status=~"5.."}[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ \$value }} errors/sec"
    
    - alert: HighResponseTime
      expr: histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{application="order-service"}[5m])) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High response time detected"
        description: "p95 response time is {{ \$value }}s"
    
    - alert: ServiceDown
      expr: up{job="order-service-backend"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Order Service is down"
        description: "Order Service backend is not responding"
EOF
```

### 9.14 Verify Metrics Collection

```bash
# Check if Prometheus is scraping your service
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090

# In Prometheus UI, go to Status → Targets
# You should see order-service-backend target as "UP"

# Query metrics in Prometheus
# Try: up{job="order-service-backend"}
# Or: http_server_requests_seconds_count{application="order-service"}
```

### 9.15 Troubleshooting Prometheus and Grafana

#### Prometheus Not Scraping Metrics

```bash
# Check ServiceMonitor
kubectl get servicemonitor -n order-service

# Check Prometheus targets
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090
# Navigate to http://localhost:9090/targets

# Check Prometheus logs
kubectl logs -f deployment/prometheus-kube-prometheus-prometheus-operator -n monitoring
```

#### Grafana Cannot Access Prometheus

```bash
# Check Grafana data source configuration
kubectl get configmap -n monitoring | grep grafana

# Verify Prometheus service name
kubectl get svc -n monitoring | grep prometheus

# Check Grafana logs
kubectl logs -f deployment/prometheus-grafana -n monitoring
```

#### High Resource Usage

```bash
# Check resource usage
kubectl top pods -n monitoring

# Adjust resource limits in values.yaml
# prometheus:
#   prometheusSpec:
#     resources:
#       requests:
#         cpu: 500m
#         memory: 2Gi
#       limits:
#         cpu: 2000m
#         memory: 4Gi
```

---

## Step 10: Verify Deployment

### 9.1 Check Pods

```bash
# Check all pods
kubectl get pods -n order-service

# Check pod logs
kubectl logs -f deployment/order-service-backend -n order-service
kubectl logs -f deployment/order-service-frontend -n order-service
kubectl logs -f deployment/order-service-postgresql -n order-service
```

### 9.2 Check Services

```bash
# Check services
kubectl get svc -n order-service

# Test backend service
kubectl port-forward svc/order-service-backend-service -n order-service 8080:8080
curl http://localhost:8080/actuator/health

# Test frontend service
kubectl port-forward svc/order-service-frontend-service -n order-service 3000:80
curl http://localhost:3000/health
```

### 9.3 Check Ingress

```bash
# Check ingress
kubectl get ingress -n order-service

# Test ingress (if configured)
curl http://api.order-service.local/actuator/health
curl http://order-service.local/
```

---

## Troubleshooting

### Common Issues

#### 1. Image Pull Errors

```bash
# Check image pull secrets
kubectl get secrets -n order-service

# Create image pull secret if needed
kubectl create secret docker-registry regcred \
  --docker-server=<registry-url> \
  --docker-username=<username> \
  --docker-password=<password> \
  --docker-email=<email> \
  -n order-service

# Update values.yaml
imagePullSecrets:
  - name: regcred
```

#### 2. Database Connection Issues

```bash
# Check PostgreSQL pod
kubectl get pods -n order-service | grep postgresql

# Check PostgreSQL logs
kubectl logs -f deployment/order-service-postgresql -n order-service

# Verify database secret
kubectl get secret order-service-db-secret -n order-service -o yaml

# Test database connection
kubectl exec -it deployment/order-service-postgresql -n order-service -- psql -U postgres -d orderdb
```

#### 3. Backend Health Check Failures

```bash
# Check backend logs
kubectl logs -f deployment/order-service-backend -n order-service

# Check environment variables
kubectl exec deployment/order-service-backend -n order-service -- env | grep DB

# Verify service endpoints
kubectl get endpoints -n order-service
```

#### 4. ArgoCD Sync Issues

```bash
# Check ArgoCD application events
kubectl describe application order-service -n argocd

# Check ArgoCD logs
kubectl logs -f deployment/argocd-application-controller -n argocd

# Force refresh
argocd app get order-service --refresh
```

#### 5. Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress status
kubectl describe ingress -n order-service

# Verify ingress class
kubectl get ingressclass
```

---

## Next Steps

1. **Configure Secrets Management**: Use external secret management (AWS Secrets Manager, HashiCorp Vault)
2. **Set up Monitoring**: ✅ Prometheus and Grafana installation covered in Step 9
3. **Configure TLS**: Set up cert-manager for automatic SSL certificates
4. **Set up CI/CD**: Integrate with Jenkins/GitHub Actions to build and push images
5. **Add Resource Quotas**: Configure resource quotas and limits for the namespace
6. **Set up Backup**: Configure database backups using Velero or similar tools
7. **Customize Grafana Dashboards**: Create custom dashboards for your specific application metrics
8. **Configure Alerting**: Set up Alertmanager rules and notification channels (Slack, PagerDuty, etc.)

---

## Additional Resources

- [Helm Documentation](https://helm.sh/docs/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Spring Boot on Kubernetes](https://spring.io/guides/gs/spring-boot-kubernetes/)

---

## Summary

This guide provides a complete Helm chart structure for deploying the Order Service Java application on Kubernetes with ArgoCD. The chart includes:

- ✅ PostgreSQL database with persistent storage
- ✅ Spring Boot backend service with health checks
- ✅ React frontend with nginx
- ✅ Ingress configuration for external access
- ✅ Horizontal Pod Autoscaling
- ✅ Service accounts and RBAC
- ✅ ArgoCD application manifest for GitOps deployment

Follow the steps above to create and deploy your Helm chart successfully!

