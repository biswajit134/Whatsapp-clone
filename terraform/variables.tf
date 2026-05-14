variable "cluster_name" {
  description = "Name of the Kind cluster"
  type        = string
  default     = "whatsapp-clone"
}

variable "kubernetes_version" {
  description = "Kubernetes version for Kind nodes (must match an available kindest/node tag)"
  type        = string
  default     = "1.29.2"
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "istio_version" {
  description = "Istio Helm chart version to install"
  type        = string
  default     = "1.21.1"
}

variable "argocd_chart_version" {
  description = "Argo CD Helm chart version"
  type        = string
  default     = "7.3.11"
}

variable "argocd_namespace" {
  description = "Namespace where Argo CD is installed"
  type        = string
  default     = "argocd"
}

variable "deploy_argocd_apps" {
  description = "Apply ArgoCD AppProject + Application after Argo CD is ready"
  type        = bool
  default     = true
}

variable "kubeconfig_path" {
  description = "Local path to write the generated kubeconfig"
  type        = string
  default     = "./kubeconfig.yaml"
}

# ---------------------------------------------------------------------------
# MetalLB
# ---------------------------------------------------------------------------
variable "metallb_version" {
  description = "MetalLB Helm chart version"
  type        = string
  default     = "0.14.5"
}

variable "metallb_ip_range" {
  description = <<-DESC
    IP range (CIDR or dash range) MetalLB will assign to LoadBalancer Services.
    Must be within the Kind Docker bridge network subnet.

    Find your Kind network:
      docker network inspect kind --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
    Then pick the last slice, e.g. if subnet is 172.18.0.0/16 use:
      172.18.255.200-172.18.255.250
  DESC
  type        = string
  default     = "172.18.255.200-172.18.255.250"
}

