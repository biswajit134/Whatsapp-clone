##############################################################################
# Monitoring Stack — Prometheus & Kiali
##############################################################################

# ── 1. Prometheus ────────────────────────────────────────────────────────────
# Kiali requires Prometheus to fetch metrics and visualize the mesh.
resource "helm_release" "prometheus" {
  name             = "prometheus"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "prometheus"
  namespace        = "istio-system"
  version          = var.prometheus_version
  create_namespace = true
  wait             = true
  timeout          = 300

  # Stripped down configuration for local Kind development
  values = [
    yamlencode({
      alertmanager = { enabled = false }
      pushgateway  = { enabled = false }
      nodeExporter = { enabled = false }
      kubeStateMetrics = { enabled = false }
      server = {
        persistentVolume = { enabled = false } # Use emptyDir for local dev
        resources = {
          requests = { cpu = "100m", memory = "256Mi" }
          limits   = { cpu = "500m", memory = "512Mi" }
        }
      }
    })
  ]

  depends_on = [helm_release.istiod]
}

# ── 2. Kiali Server ──────────────────────────────────────────────────────────
# The management console for Istio service mesh.
resource "helm_release" "kiali_server" {
  name       = "kiali-server"
  repository = "https://kiali.org/helm-charts"
  chart      = "kiali-server"
  namespace  = "istio-system"
  version    = var.kiali_version
  wait       = true
  timeout    = 300

  values = [
    yamlencode({
      auth = {
        strategy = "anonymous" # Bypass login for local development convenience
      }
      external_services = {
        prometheus = {
          url = "http://prometheus-server.istio-system.svc.cluster.local"
        }
      }
      server = {
        web_root = "/kiali"
      }
    })
  ]

  depends_on = [helm_release.prometheus]
}

# ── 3. Expose Kiali via Istio Gateway (Optional but Recommended) ─────────────
# This allows accessing Kiali via the LoadBalancer IP assigned to Istio Ingress.
resource "kubernetes_manifest" "kiali_virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "kiali"
      namespace = "istio-system"
    }
    spec = {
      hosts    = ["*"]
      gateways = ["istio-ingress/ingressgateway"]
      http = [
        {
          match = [{ uri = { prefix = "/kiali" } }]
          route = [{
            destination = {
              host = "kiali-server"
              port = { number = 20001 }
            }
          }]
        },
        {
          match = [{ uri = { prefix = "/kiali/" } }]
          route = [{
            destination = {
              host = "kiali-server"
              port = { number = 20001 }
            }
          }]
        }
      ]
    }
  }

  depends_on = [helm_release.kiali_server, helm_release.istio_ingressgateway]
}

resource "kubernetes_manifest" "kiali_destination_rule" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "DestinationRule"
    metadata = {
      name      = "kiali"
      namespace = "istio-system"
    }
    spec = {
      host = "kiali-server"
      trafficPolicy = {
        tls = {
          mode = "DISABLE"
        }
      }
    }
  }

  depends_on = [helm_release.kiali_server]
}
