# Deploy Now

This is the shortest safe path to get CloudShop Learn onto Azure.

## 1. Generate Azure Credentials

From `cloudshop-app` run:

```powershell
.\scripts\setup-azure-deploy.ps1
```

What this does:

- checks Azure login
- selects your subscription
- creates or refreshes the GitHub Actions service principal
- saves the JSON in `.azure-credentials.json`
- creates `cloudshop-infra/terraform.tfvars` from the example if needed

## 2. Fill Terraform Secrets

Edit:

- [terraform.tfvars](../cloudshop-infra/terraform.tfvars)

Replace:

- `jwt_secret`
- `postgres_admin_password`
- `frontend_origin` if you already know the final Static Web App hostname

## 3. Apply Terraform

```powershell
Set-Location ..\cloudshop-infra
terraform init
terraform plan -out tfplan
terraform apply tfplan
```

## 4. Print The Real GitHub Values

Back in `cloudshop-app` run:

```powershell
.\scripts\post-terraform-check.ps1
```

This prints:

- the exact GitHub Actions variables to create
- the backend URLs
- the remaining secrets you still need to add

## 5. Add GitHub Secrets

In GitHub repository settings, add:

- `AZURE_CREDENTIALS`
  use the contents of `.azure-credentials.json`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `JWT_SECRET`
- `DB_PASSWORD`

## 6. Add GitHub Variables

Use the output from `post-terraform-check.ps1`.

## 7. Push To Main

Commit and push your latest changes to `main`.

The workflow in:

- [.github/workflows/deploy.yml](./.github/workflows/deploy.yml)

will then:

- validate the app
- build and push backend images
- update Azure Container Apps
- build the frontend with live backend URLs
- deploy the frontend to Azure Static Web Apps

## Final Note

The only step this does not fully automate is fetching `AZURE_STATIC_WEB_APPS_API_TOKEN`, because that depends on the actual Static Web App instance created in your Azure account.
