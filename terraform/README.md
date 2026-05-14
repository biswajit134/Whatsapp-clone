# Terraform — Kind Cluster for WhatsApp Clone

Provisions a local **Kind** (Kubernetes in Docker) cluster and installs the full stack:
**Istio → Argo CD → WhatsApp Clone app** (via ArgoCD GitOps sync).

## Prerequisites

| Tool | Minimum version |
|---|---|
| [Terraform](https://developer.hashicorp.com/terraform/install) | 1.5+ |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | running |
| [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/) | 0.22+ |
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | 1.29+ |
| [Helm](https://helm.sh/docs/intro/install/) | 3.14+ |

## Directory structure

```
terraform/
├── versions.tf      # Required providers
├── variables.tf     # All input variables
├── main.tf          # Kind cluster + provider config + kubeconfig
├── istio.tf         # Istio base → istiod → IngressGateway
├── argocd.tf        # Argo CD Helm + AppProject + Application bootstrap
├── outputs.tf       # Useful post-apply outputs
├── example.tfvars   # Copy to terraform.tfvars and adjust
└── .gitignore       # Excludes state files and kubeconfig
```

## ⚠️  One-time prerequisite: Chart.lock

ArgoCD uses `helm dependency build` to resolve the Bitnami MongoDB sub-chart.
You must commit a `Chart.lock` file **before** ArgoCD can sync:

```powershell
cd helm\whatsapp-clone
helm repo add bitnami https://charts.bitnami.com/bitnami
helm dependency update .
git add Chart.lock
git commit -m "chore: add Chart.lock for ArgoCD dependency resolution"
git push
```

## Deploy

```powershell
cd terraform

# 1. Copy and adjust variables
Copy-Item example.tfvars terraform.tfvars

# 2. Initialize providers
terraform init

# 3. Preview the plan
terraform plan -var-file="terraform.tfvars"

# 4. Apply (takes ~10-15 minutes on first run)
terraform apply -var-file="terraform.tfvars"
```

## After apply

```powershell
# Use the generated kubeconfig
$env:KUBECONFIG = "$PWD\kubeconfig.yaml"

# Check all pods
kubectl get pods -A

# ArgoCD Login
# Username: admin
# Password: biswajit134

# Open ArgoCD UI  → http://localhost:8080
# Open App        → http://localhost        (via Istio IngressGateway)

```

## Port mappings

| Host port | Kind NodePort | Service |
|-----------|--------------|---------|
| `80`      | `30080`      | Istio IngressGateway HTTP |
| `443`     | `30443`      | Istio IngressGateway HTTPS |
| `8080`    | `30800`      | Argo CD UI |

## Destroy

```powershell
terraform destroy -var-file="terraform.tfvars"
```

> **Note:** `terraform destroy` deletes the Kind cluster and all data inside it.
> The `kubeconfig.yaml` file is also removed.
