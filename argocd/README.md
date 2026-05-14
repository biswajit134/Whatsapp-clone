# ArgoCD — WhatsApp Clone Deployment

## Directory structure

```
argocd/
├── project.yaml          # AppProject — scopes permissions & source repos
├── application.yaml      # Application — production single-env deployment
└── applicationset.yaml   # ApplicationSet — multi-env (dev / staging / prod)
```

## Prerequisites

### 1. ArgoCD installed in the cluster
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 2. Generate Helm Chart.lock (required for Bitnami MongoDB dependency)
ArgoCD runs `helm dependency build` automatically, but it needs a `Chart.lock` file committed to Git.

```bash
cd helm/whatsapp-clone
helm repo add bitnami https://charts.bitnami.com/bitnami
helm dependency update .
# Commit Chart.lock (do NOT commit the charts/ directory)
git add Chart.lock
git commit -m "chore: add helm Chart.lock for ArgoCD dependency resolution"
```

### 3. (If GHCR packages are private) Create image pull secret
```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=biswajit134 \
  --docker-password=<YOUR_PAT> \
  --namespace=whatsapp
```
Then reference it in `values.yaml`:
```yaml
imagePullSecrets:
  - name: ghcr-secret
```

### 4. (If repo is private) Register Git credentials with ArgoCD
```bash
argocd repo add https://github.com/biswajit134/Whatsapp-clone \
  --username biswajit134 \
  --password <GITHUB_PAT>
```

---

## Deploy — single environment (production)

```bash
# Apply the project first (creates RBAC scopes)
kubectl apply -f argocd/project.yaml -n argocd

# Apply the Application
kubectl apply -f argocd/application.yaml -n argocd

# Watch sync status
argocd app get whatsapp-clone
argocd app sync whatsapp-clone    # manual sync (if autoSync is off)
```

## Deploy — multi-environment (ApplicationSet)

```bash
kubectl apply -f argocd/project.yaml     -n argocd
kubectl apply -f argocd/applicationset.yaml -n argocd

# This creates three Applications automatically:
#   whatsapp-clone-dev      → namespace: whatsapp-dev
#   whatsapp-clone-staging  → namespace: whatsapp-staging
#   whatsapp-clone-prod     → namespace: whatsapp
```

---

## Sync policies per environment

| Environment | Auto-Sync | Prune | Self-Heal | mTLS |
|-------------|-----------|-------|-----------|------|
| dev         | ✅ Yes    | ✅ Yes | ✅ Yes   | PERMISSIVE |
| staging     | ✅ Yes    | ✅ Yes | ❌ No    | STRICT |
| prod        | ❌ No (manual) | ❌ No | ❌ No | STRICT |

---

## Useful commands

```bash
# List all applications
argocd app list

# Force a sync
argocd app sync whatsapp-clone --prune

# Rollback to previous revision
argocd app rollback whatsapp-clone

# View diff before sync
argocd app diff whatsapp-clone

# Delete app (and all managed resources via finalizer)
argocd app delete whatsapp-clone
```
