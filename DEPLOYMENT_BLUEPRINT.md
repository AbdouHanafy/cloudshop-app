# CloudShop Learn Deployment Blueprint

This document defines what is still missing before `git push` can reliably produce a working Azure production deployment.

## Current Reality

The repository already contains:

- application code in `cloudshop-app`
- partial infrastructure in `cloudshop-infra`
- placeholder GitOps repo in `cloudshop-gitops`
- CI/CD workflow skeletons in `.github/workflows`

At the moment, a push to GitHub may update backend container images if Azure credentials and Container Apps already exist, but it will not produce a complete working production application.

## Why Production Is Not Ready Yet

### 1. No Real GitOps Flow

`cloudshop-gitops` only contains a README.

Missing:

- Kubernetes or Container Apps deployment manifests
- image tag update flow
- Argo CD or Flux configuration
- environment overlays such as `dev`, `staging`, `prod`

### 2. Infrastructure Is Partial

`cloudshop-infra` provisions:

- resource group
- log analytics workspace
- Azure Container Registry
- Key Vault
- Container Apps environment
- four Container Apps

Missing:

- Azure Database for PostgreSQL
- Azure Cache for Redis
- frontend hosting
- managed identities / RBAC for pulling from ACR and reading secrets
- secret injection into running services
- custom domain / TLS strategy
- monitoring alerts

### 3. Container Apps Still Start From Placeholder Images

The Terraform currently sets each backend Container App image to:

- `mcr.microsoft.com/azuredocs/containerapps-helloworld:latest`

This is acceptable for initial bootstrap, but not for real production.

### 4. Frontend Is Not Deployed

The workflows build and deploy backend services only:

- `catalog`
- `cart`
- `orders`
- `auth`

Missing frontend deployment target:

- Azure Static Web Apps
- or Azure Storage Static Website + CDN
- or frontend served behind another Container App

### 5. Backend Dependencies Are Missing In Azure

The app requires:

- Postgres for enrollments
- Redis for learning list
- `JWT_SECRET` for auth

Those dependencies are present in local `docker-compose.yml`, but not yet fully provisioned and wired in Azure.

### 6. Frontend Uses Localhost URLs

The frontend currently calls:

- `http://localhost:8000`
- `http://localhost:8001`
- `http://localhost:8002`
- `http://localhost:8003`

This works locally but not in production. The frontend must read environment-based public API URLs at build time.

## Recommended Azure Architecture

### Frontend

Use:

- Azure Static Web Apps

Why:

- easiest GitHub integration
- built for Vite/React
- managed HTTPS
- simple environment variable model

### Backend

Use:

- Azure Container Apps for `catalog`, `learning-list`, `enrollments`, `auth`

Why:

- already matches your current infrastructure direction
- good fit for small microservices
- integrates with ACR, secrets, and managed ingress

### Data Layer

Use:

- Azure Database for PostgreSQL Flexible Server
- Azure Cache for Redis

Why:

- directly matches current application design
- avoids self-managed database containers in production

### Secrets

Use:

- Azure Key Vault

Store:

- `JWT_SECRET`
- database password
- Redis connection string if needed
- any later API keys

## Required Production Environment Variables

### Catalog

- no strict secret required today
- optional:
  `CORS_ORIGINS`

### Learning List

- `REDIS_HOST`
- `REDIS_PORT`
- optional later:
  `REDIS_PASSWORD`
- optional:
  `CORS_ORIGINS`

### Enrollments

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- optional:
  `CORS_ORIGINS`

### Auth

- `JWT_SECRET`
- optional:
  `CORS_ORIGINS`

### Frontend

- `VITE_CATALOG_API_URL`
- `VITE_LEARNING_LIST_API_URL`
- `VITE_ENROLLMENTS_API_URL`
- `VITE_AUTH_API_URL`

## What Must Change In The App Repo

### 1. Frontend Must Stop Hardcoding Localhost

Replace fixed URLs in `frontend/src/api.js` with `import.meta.env` values and sensible local fallbacks.

Target shape:

- `import.meta.env.VITE_CATALOG_API_URL ?? 'http://localhost:8000'`
- same for the other services

### 2. Service CORS Should Become Configurable

Today the backend CORS is fixed to:

- `http://localhost:5173`

In Azure, that must become environment-driven.

### 3. Add A Frontend Deployment Strategy

Recommended:

- build frontend in GitHub Actions
- deploy static output to Azure Static Web Apps

### 4. Add Health-Based Startup Expectations

Your services already expose `/health`, which is good.
Next step is to make Azure Container Apps use sensible readiness behavior and env configuration.

## What Must Change In cloudshop-infra

### Add Missing Resources

- PostgreSQL Flexible Server
- Azure Cache for Redis
- frontend hosting resource
- Key Vault secrets

### Update Container Apps

- point to your ACR images instead of the hello-world image
- configure secrets and env vars
- configure registry access from Container Apps to ACR
- set ingress consistently

### Add Outputs

- frontend URL
- backend service public URLs
- database host
- Redis host

## What Must Change In GitHub Actions

### Backend Workflow

Keep:

- build Docker images
- push to ACR
- update Container Apps

Add:

- dependency checks
- frontend deployment job
- explicit env injection strategy
- branch protection strategy for `main`

### Frontend Workflow

Add a dedicated job that:

1. installs frontend dependencies
2. builds with production `VITE_*` variables
3. deploys to Azure Static Web Apps

## Suggested Delivery Order

1. Make frontend API URLs environment-driven
2. Make backend CORS configurable
3. Add frontend Azure deployment target
4. Extend Terraform with PostgreSQL, Redis, and real Container App configuration
5. Wire GitHub Actions secrets and deployment variables
6. Test production URLs end to end
7. If you still want GitOps, then build `cloudshop-gitops` on top of a working deployment baseline

## Final Answer To The Original Question

You are close to having an Azure deployment path, but not yet at the point where:

- push to GitHub
- Azure updates automatically
- full app appears and works in production

Right now, the biggest missing pieces are:

- frontend hosting
- Azure Postgres
- Azure Redis
- environment-driven frontend URLs
- production secrets and service configuration
- real GitOps content
