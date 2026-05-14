cluster_name         = "whatsapp-clone"
kubernetes_version   = "1.29.2"
worker_count         = 2
istio_version        = "1.21.1"
argocd_chart_version = "7.3.11"
deploy_argocd_apps   = true
kubeconfig_path      = "./kubeconfig.yaml"
metallb_version      = "0.14.5"

# ── IMPORTANT: set this to match your Kind Docker network ─────────────────
# Run first: docker network inspect kind --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
# Then use the last slice of that CIDR:
metallb_ip_range = "172.18.255.200-172.18.255.250"
