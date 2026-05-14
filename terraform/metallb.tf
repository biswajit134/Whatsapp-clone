##############################################################################
# MetalLB — bare-metal LoadBalancer for Kind
#
# How it works:
#   1. MetalLB Helm chart installs the controller + speaker DaemonSet
#   2. We wait for the validating webhook to become ready
#   3. We apply an IPAddressPool (a subnet slice of the Kind Docker network)
#      and an L2Advertisement so MetalLB responds to ARP requests
#   4. Any Service of type=LoadBalancer gets an IP from that pool
#
# Finding your Kind Docker network CIDR:
#   docker network inspect kind --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
#   → typically 172.18.0.0/16  (Linux / Docker Desktop)
#
# Set metallb_ip_range to the LAST portion of that subnet, e.g.:
#   172.18.255.200-172.18.255.250
#
# ⚠️  On Windows/Mac (Docker Desktop) the MetalLB IP is inside Docker's
#     virtual network and is NOT directly reachable from the host.
#     Use the helper commands in outputs.tf to port-forward the gateway.
##############################################################################

# ── MetalLB Helm release ─────────────────────────────────────────────────────
resource "helm_release" "metallb" {
  name             = "metallb"
  repository       = "https://metallb.github.io/metallb"
  chart            = "metallb"
  namespace        = "metallb-system"
  version          = var.metallb_version
  create_namespace = true
  wait             = true
  timeout          = 300

  depends_on = [kind_cluster.whatsapp]
}

# ── Wait for MetalLB webhook to be ready ────────────────────────────────────
# The webhook must be healthy before we can apply IPAddressPool / L2Advertisement
# (otherwise the validating webhook will reject the resources).
resource "null_resource" "wait_metallb_webhook" {
  triggers = {
    metallb_release = helm_release.metallb.id
  }

  provisioner "local-exec" {
    command = "kubectl wait --for=condition=available --timeout=120s deployment/metallb-controller -n metallb-system"
    environment = {
      KUBECONFIG = abspath(local_sensitive_file.kubeconfig.filename)
    }
  }

  depends_on = [helm_release.metallb]
}

# ── Generate MetalLB config YAML ─────────────────────────────────────────────
resource "local_file" "metallb_config_yaml" {
  filename        = "${path.module}/generated-metallb-config.yaml"
  file_permission = "0644"

  content = join("\n---\n", [
    yamlencode({
      apiVersion = "metallb.io/v1beta1"
      kind       = "IPAddressPool"
      metadata = {
        name      = "whatsapp-pool"
        namespace = "metallb-system"
      }
      spec = {
        addresses = [var.metallb_ip_range]
      }
    }),
    yamlencode({
      apiVersion = "metallb.io/v1beta1"
      kind       = "L2Advertisement"
      metadata = {
        name      = "whatsapp-l2advert"
        namespace = "metallb-system"
      }
      spec = {
        ipAddressPools = ["whatsapp-pool"]
      }
    })
  ])
}

# ── Apply IPAddressPool + L2Advertisement ────────────────────────────────────
resource "null_resource" "metallb_config" {
  triggers = {
    config_hash = local_file.metallb_config_yaml.content_md5
    webhook_ok  = null_resource.wait_metallb_webhook.id
  }

  provisioner "local-exec" {
    command = "kubectl apply -f \"${abspath(local_file.metallb_config_yaml.filename)}\""
    environment = {
      KUBECONFIG = abspath(local_sensitive_file.kubeconfig.filename)
    }
  }

  depends_on = [null_resource.wait_metallb_webhook]
}
