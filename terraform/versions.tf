terraform {

  required_providers {
    kind = {
      source  = "tehcyx/kind"
      version = "0.11.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "3.1.1"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "3.1.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "3.3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "2.9.0"
    }
  }
}
