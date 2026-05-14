##############################################################################
# Argo CD — installed via official Helm chart, then bootstrapped with the
# WhatsApp Clone AppProject + Application defined in ../argocd/
##############################################################################

# ── Argo CD Helm release ─────────────────────────────────────────────────────
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = var.argocd_namespace
  version          = var.argocd_chart_version
  create_namespace = true
  wait             = true
  timeout          = 600     # ArgoCD takes a while to pull all images

  values = [
    yamlencode({
      server = {
        # Expose the ArgoCD UI on NodePort 30800 → host :8080
        service = {
          type     = "NodePort"
          nodePort = 30800
        }
        # Disable TLS inside the cluster (terminate at the ingress/gateway level)
        extraArgs = ["--insecure"]
      }
      # Reduce resource usage for local dev
      controller = {
        resources = {
          requests = { cpu = "100m", memory = "256Mi" }
          limits   = { cpu = "500m", memory = "512Mi" }
        }
      }
      repoServer = {
        resources = {
          requests = { cpu = "100m", memory = "128Mi" }
          limits   = { cpu = "300m", memory = "256Mi" }
        }
      }
      redis = {
        resources = {
          requests = { cpu = "50m",  memory = "64Mi" }
          limits   = { cpu = "200m", memory = "128Mi" }
        }
      }
    })
  ]

  depends_on = [kind_cluster.whatsapp]
}

# ── Wait for ArgoCD server to be ready ───────────────────────────────────────
resource "null_resource" "wait_argocd" {
  triggers = {
    argocd_release = helm_release.argocd.id
  }

  provisioner "local-exec" {
    command = "kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n ${var.argocd_namespace}"
    environment = {
      KUBECONFIG = abspath(local_sensitive_file.kubeconfig.filename)
    }
  }

  depends_on = [helm_release.argocd]
}

# ── Set ArgoCD admin password to 'biswajit134' ───────────────────────────────
resource "null_resource" "set_argocd_password" {
  triggers = {
    argocd_ready = null_resource.wait_argocd.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      kubectl -n ${var.argocd_namespace} patch secret argocd-secret -p '{"stringData": {"admin.password": "${bcrypt("biswajit134")}", "admin.passwordMtime": "'$(date +%FT%T%Z)'"}}'
    EOT
    environment = {
      KUBECONFIG = abspath(local_sensitive_file.kubeconfig.filename)
    }
  }

  depends_on = [null_resource.wait_argocd]
}

# ── Bootstrap: AppProject ─────────────────────────────────────────────────────
resource "null_resource" "argocd_project" {
  count = var.deploy_argocd_apps ? 1 : 0

  triggers = {
    manifest_hash = filemd5("${path.module}/../argocd/project.yaml")
    argocd_ready  = null_resource.wait_argocd.id
  }

  provisioner "local-exec" {
    command = "kubectl apply -f \"${path.module}/../argocd/project.yaml\" -n ${var.argocd_namespace}"
    environment = {
      KUBECONFIG = abspath(local_sensitive_file.kubeconfig.filename)
    }
  }

  depends_on = [null_resource.set_argocd_password]
}

# ── Bootstrap: Application ────────────────────────────────────────────────────
resource "null_resource" "argocd_application" {
  count = var.deploy_argocd_apps ? 1 : 0

  triggers = {
    manifest_hash = filemd5("${path.module}/../argocd/application.yaml")
    project_ready = null_resource.argocd_project[0].id
  }

  provisioner "local-exec" {
    command = "kubectl apply -f \"${path.module}/../argocd/application.yaml\" -n ${var.argocd_namespace}"
    environment = {
      KUBECONFIG = abspath(local_sensitive_file.kubeconfig.filename)
    }
  }

  depends_on = [null_resource.argocd_project]
}
