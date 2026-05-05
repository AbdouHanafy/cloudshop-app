# GitHub Repository Variables Example

Use these values in GitHub repository `Settings > Secrets and variables > Actions > Variables`.

## Recommended Values

- `ACR_NAME`
  `acrcloudshopabdou`
- `RESOURCE_GROUP`
  `rg-cloudshop-dev`
- `CATALOG_APP_NAME`
  `ca-catalog`
- `LEARNING_LIST_APP_NAME`
  `ca-cart`
- `ENROLLMENTS_APP_NAME`
  `ca-orders`
- `AUTH_APP_NAME`
  `ca-auth`
- `FRONTEND_ORIGIN`
  `https://swa-cloudshop-dev.azurestaticapps.net`
- `REDIS_HOST`
  `redis-cloudshop-dev.redis.cache.windows.net`
- `REDIS_PORT`
  `6379`
- `DB_HOST`
  `psql-cloudshop-dev.postgres.database.azure.com`
- `DB_PORT`
  `5432`
- `DB_NAME`
  `cloudshop`
- `DB_USER`
  `cloudshopadmin`

## Matching Secrets To Set

Set these in GitHub `Actions > Secrets`:

- `AZURE_CREDENTIALS`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `JWT_SECRET`
- `DB_PASSWORD`

## Important

- `FRONTEND_ORIGIN` may need to be updated after Azure Static Web Apps creates the real default hostname.
- `REDIS_HOST` and `DB_HOST` should match the actual Terraform outputs after `terraform apply`.
- Do not store real passwords or tokens in this file.
