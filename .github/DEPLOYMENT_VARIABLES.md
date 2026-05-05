# Deployment Variables

The GitHub Actions deployment workflow expects these GitHub repository settings before pushing to `main`.

## Required GitHub Secrets

- `AZURE_CREDENTIALS`
  Azure service principal JSON for `azure/login`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`
  Deployment token for Azure Static Web Apps
- `JWT_SECRET`
  Auth signing key for the auth service
- `DB_PASSWORD`
  Password for PostgreSQL

## Required GitHub Repository Variables

- `ACR_NAME`
  Azure Container Registry name
- `RESOURCE_GROUP`
  Azure resource group for Container Apps
- `CATALOG_APP_NAME`
  Container App name for catalog
- `LEARNING_LIST_APP_NAME`
  Container App name for learning-list
- `ENROLLMENTS_APP_NAME`
  Container App name for enrollments
- `AUTH_APP_NAME`
  Container App name for auth
- `FRONTEND_ORIGIN`
  Public frontend origin allowed by backend CORS, for example `https://your-app.azurestaticapps.net`
- `REDIS_HOST`
  Azure Redis hostname
- `REDIS_PORT`
  Redis port, normally `6379`
- `DB_HOST`
  Azure PostgreSQL hostname
- `DB_PORT`
  PostgreSQL port, normally `5432`
- `DB_NAME`
  Application database name
- `DB_USER`
  PostgreSQL username

## Notes

- The workflow queries Container App FQDNs after backend deployment and uses those live URLs to build the frontend.
- The frontend no longer needs hardcoded production endpoints in source code.
- If you add a staging environment later, create a second workflow or use GitHub environments with different variables.

## Current Project Defaults

Based on the current Terraform and repository naming, the expected non-secret values are:

- `ACR_NAME=acrcloudshopabdou`
- `RESOURCE_GROUP=rg-cloudshop-dev`
- `CATALOG_APP_NAME=ca-catalog`
- `LEARNING_LIST_APP_NAME=ca-cart`
- `ENROLLMENTS_APP_NAME=ca-orders`
- `AUTH_APP_NAME=ca-auth`
- `REDIS_PORT=6379`
- `DB_PORT=5432`
- `DB_NAME=cloudshop`
- `DB_USER=cloudshopadmin`

See [.github/REPOSITORY_VARIABLES.example.md](./REPOSITORY_VARIABLES.example.md) for the full suggested settings matrix.
