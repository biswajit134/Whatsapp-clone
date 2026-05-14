##############################################################################
# Istio Service Mesh — installed via official Helm charts
#
# Installation order (enforced via depends_on):
#   1. istio-base  → CRDs + cluster-wide config
#   2. istiod      → control-plane
#   3. gateway     → IngressGateway (LoadBalancer — MetalLB assigns the IP)
##############################################################################

# ── 1. Istio base (CRDs) ────────────────────────────────────────────────────
resource "helm_release" "istio_base" {
  name             = "istio-base"
  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "base"
  namespace        = "istio-system"
  version          = var.istio_version
  create_namespace = true
  wait             = true
  timeout          = 300

  set = [{
    name  = "defaultRevision"
    value = "default"
  }]

  depends_on = [kind_cluster.whatsapp]
}

# ── 2. Istiod (control-plane) ────────────────────────────────────────────────
resource "helm_release" "istiod" {
  name       = "istiod"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "istiod"
  namespace  = "istio-system"
  version    = var.istio_version
  wait       = true
  timeout    = 300

  # Keep resources low for local Kind development
  set = [{ name = "pilot.resources.requests.cpu", value = "100m" },
    { name = "pilot.resources.requests.memory", value = "256Mi" },
    { name = "pilot.resources.limits.cpu", value = "500m" },
    { name = "pilot.resources.limits.memory", value = "512Mi" },

    # Single replica is enough for local dev
    { name = "pilot.autoscaleMin", value = "1" },
  { name = "pilot.autoscaleMax", value = "1" }]


  depends_on = [helm_release.istio_base]
}

# ── 3. Istio IngressGateway (LoadBalancer via MetalLB) ───────────────────────
# MetalLB will allocate an IP from the pool defined in metallb.tf.
resource "helm_release" "istio_ingressgateway" {
  name             = "istio-ingressgateway"
  repository       = "https://istio-release.storage.googleapis.com/charts"
  chart            = "gateway"
  namespace        = "istio-ingress"
  version          = var.istio_version
  create_namespace = true
  wait             = true
  timeout          = 300

  values = [
    yamlencode({
      service = {
        type = "LoadBalancer" # MetalLB assigns a real IP from the pool
        ports = [
          { name = "http2", port = 80, targetPort = 8080 },
          { name = "https", port = 443, targetPort = 8443 },
        ]
      }
      resources = {
        requests = { cpu = "100m", memory = "128Mi" }
        limits   = { cpu = "300m", memory = "256Mi" }
      }
    })
  ]

  # Must wait for MetalLB to be ready before creating a LoadBalancer service
  depends_on = [
    helm_release.istiod,
    null_resource.metallb_config,
  ]
}
