output "cluster_name" {
  description = "Kind cluster name"
  value       = kind_cluster.whatsapp.name
}

output "cluster_endpoint" {
  description = "Kubernetes API server endpoint"
  value       = kind_cluster.whatsapp.endpoint
}

output "kubeconfig_path" {
  description = "Path to the generated kubeconfig"
  value       = abspath(local_sensitive_file.kubeconfig.filename)
}

output "metallb_ip_range" {
  description = "IP range assigned to MetalLB"
  value       = var.metallb_ip_range
}

output "argocd_ui_url" {
  description = "Argo CD UI (LoadBalancer — MetalLB assigns the IP)"
  value       = "Discover with: kubectl -n argocd get svc argocd-server -o jsonpath='{.status.loadBalancer.ingress[0].ip}'"
}

output "kiali_ui_url" {
  description = "Kiali Dashboard URL (path-based on Istio Ingress)"
  value       = "Access at: http://<GATEWAY_IP>/kiali"
}


output "get_argocd_password" {
  description = "ArgoCD admin password (fixed during bootstrap)"
  value       = "biswajit134"
}

output "get_gateway_ip" {
  description = "Command to get the MetalLB IP assigned to the Istio IngressGateway"
  value       = "kubectl -n istio-ingress get svc istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}'"
}

output "next_steps" {
  description = "Quick-start commands after 'terraform apply'"
  value       = <<-EOT

    # 1. Set KUBECONFIG
    export KUBECONFIG=${abspath(local_sensitive_file.kubeconfig.filename)}
    # Windows PowerShell:
    # $env:KUBECONFIG = "${abspath(local_sensitive_file.kubeconfig.filename)}"

    # 2. Check all pods
    kubectl get pods -A

    # 3. Get the MetalLB IP assigned to the Istio IngressGateway
    GATEWAY_IP=$(kubectl -n istio-ingress get svc istio-ingressgateway \
      -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    echo "App URL: http://$GATEWAY_IP"

    # 4. On Windows/Mac — port-forward the gateway to localhost:80
    kubectl -n istio-ingress port-forward svc/istio-ingressgateway 80:80

    # 5. Get ArgoCD admin password
    kubectl -n argocd get secret argocd-initial-admin-secret \
      -o jsonpath='{.data.password}' | base64 -d

    # 6. Open ArgoCD UI → http://localhost:8080
    
    # 7. Open Kiali Dashboard → http://localhost/kiali (if port-forwarding 80:80)
    #    Username: anonymous (no password needed)
  EOT
}
