##############################################################################
# Provider configuration
##############################################################################
provider "kind" {}

# NOTE: In the Helm provider, 'kubernetes' is a BLOCK, not an assignment.
provider "kubernetes" {
  host                   = kind_cluster.whatsapp.endpoint
  cluster_ca_certificate = base64decode(kind_cluster.whatsapp.cluster_ca_certificate)
  client_certificate     = base64decode(kind_cluster.whatsapp.client_certificate)
  client_key             = base64decode(kind_cluster.whatsapp.client_key)
}

provider "helm" {
  kubernetes ={
    host                   = kind_cluster.whatsapp.endpoint
    cluster_ca_certificate = base64decode(kind_cluster.whatsapp.cluster_ca_certificate)
    client_certificate     = base64decode(kind_cluster.whatsapp.client_certificate)
    client_key             = base64decode(kind_cluster.whatsapp.client_key)
  }
}

provider "null" {}
provider "local" {}

##############################################################################
# Kind Cluster
#
# Node layout:
#   control-plane — only needs ArgoCD UI port mapping (8080)
#                   MetalLB handles LoadBalancer IPs — no NodePort tricks needed
#   worker × N    — runs the whatsapp microservice pods
#
# Port mapping:
#   30800 → 8080  ArgoCD UI (NodePort, host-accessible on Windows/Mac)
#
# ⚠️  MetalLB IPs live inside Docker's 'kind' bridge network.
#     On Linux they are reachable directly from the host.
#     On Windows/Mac (Docker Desktop) use 'kubectl port-forward' or
#     'docker exec' into a Kind node to reach the LoadBalancer IP.
##############################################################################
resource "kind_cluster" "whatsapp" {
  name           = var.cluster_name
  node_image     = "kindest/node:v${var.kubernetes_version}"
  wait_for_ready = true

  kind_config {
    kind        = "Cluster"
    api_version = "kind.x-k8s.io/v1alpha4"

    networking {
      api_server_address = "127.0.0.1"
      kube_proxy_mode    = "iptables"
    }

    # ── Control-plane ────────────────────────────────────────────────────────
    node {
      role = "control-plane"

      kubeadm_config_patches = [
        <<-PATCH
          kind: InitConfiguration
          nodeRegistration:
            kubeletExtraArgs:
              node-labels: "ingress-ready=true"
        PATCH
      ]

      # ArgoCD UI — NodePort 30800 → host :8080
      extra_port_mappings {
        container_port = 30800
        host_port      = 8080
        listen_address = "127.0.0.1"
        protocol       = "TCP"
      }
    }

    # ── Worker nodes ─────────────────────────────────────────────────────────
    dynamic "node" {
      for_each = range(var.worker_count)
      content {
        role = "worker"
      }
    }
  }
}

##############################################################################
# Write kubeconfig locally (0600 permissions)
##############################################################################
resource "local_sensitive_file" "kubeconfig" {
  content         = kind_cluster.whatsapp.kubeconfig
  filename        = var.kubeconfig_path
  file_permission = "0600"
}

##############################################################################
# whatsapp namespace with Istio injection label
##############################################################################
resource "kubernetes_namespace" "whatsapp" {
  metadata {
    name = "whatsapp"
    labels = {
      istio-injection                = "enabled"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }

  depends_on = [kind_cluster.whatsapp]
}
