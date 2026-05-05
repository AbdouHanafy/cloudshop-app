param(
    [string]$TerraformDir = "..\cloudshop-infra"
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Read-TerraformOutput($Name) {
    $value = terraform output -raw $Name 2>$null
    if (-not $value) {
        throw "Terraform output '$Name' was not found. Run terraform apply first."
    }
    return $value.Trim()
}

Push-Location $TerraformDir
try {
    Write-Step "Reading Terraform outputs"
    $frontendHostname = Read-TerraformOutput "frontend_default_hostname"
    $redisHost = Read-TerraformOutput "redis_hostname"
    $dbHost = Read-TerraformOutput "postgres_fqdn"
    $catalogUrl = Read-TerraformOutput "catalog_url"
    $learningListUrl = Read-TerraformOutput "learning_list_url"
    $enrollmentsUrl = Read-TerraformOutput "enrollments_url"
    $authUrl = Read-TerraformOutput "auth_url"
}
finally {
    Pop-Location
}

$frontendOrigin = "https://$frontendHostname"

Write-Step "GitHub repository variables to set"
@(
    "ACR_NAME=acrcloudshopabdou",
    "RESOURCE_GROUP=rg-cloudshop-dev",
    "CATALOG_APP_NAME=ca-catalog",
    "LEARNING_LIST_APP_NAME=ca-cart",
    "ENROLLMENTS_APP_NAME=ca-orders",
    "AUTH_APP_NAME=ca-auth",
    "FRONTEND_ORIGIN=$frontendOrigin",
    "REDIS_HOST=$redisHost",
    "REDIS_PORT=6379",
    "DB_HOST=$dbHost",
    "DB_PORT=5432",
    "DB_NAME=cloudshop",
    "DB_USER=cloudshopadmin"
) | ForEach-Object { Write-Host $_ -ForegroundColor White }

Write-Step "Backend service URLs"
@(
    "Catalog:       $catalogUrl",
    "Learning list: $learningListUrl",
    "Enrollments:   $enrollmentsUrl",
    "Auth:          $authUrl",
    "Frontend:      $frontendOrigin"
) | ForEach-Object { Write-Host $_ -ForegroundColor Green }

Write-Step "Remaining GitHub secrets"
@(
    "AZURE_CREDENTIALS = contents of .azure-credentials.json",
    "AZURE_STATIC_WEB_APPS_API_TOKEN = fetch from Azure portal or Azure CLI after Static Web App exists",
    "JWT_SECRET = the same jwt_secret value used in terraform.tfvars",
    "DB_PASSWORD = the same postgres_admin_password value used in terraform.tfvars"
) | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
