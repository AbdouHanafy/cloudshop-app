param(
    [string]$SubscriptionId = "e8924096-0e08-4e43-a4a9-4135d83e348f",
    [string]$ServicePrincipalName = "cloudshop-github-actions",
    [string]$TerraformDir = "..\cloudshop-infra"
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command($Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Get-MissingTfvarsKeys($Path, $RequiredKeys) {
    if (-not (Test-Path $Path)) {
        return $RequiredKeys
    }

    $content = Get-Content $Path -Raw
    $missing = @()

    foreach ($key in $RequiredKeys) {
        if ($content -notmatch "(?m)^\s*$([regex]::Escape($key))\s*=") {
            $missing += $key
        }
    }

    return $missing
}

Require-Command az
Require-Command terraform

Write-Step "Checking Azure login"
$account = az account show --only-show-errors 2>$null
if (-not $account) {
    Write-Host "You are not logged into Azure. Opening interactive login..." -ForegroundColor Yellow
    az login | Out-Null
}

Write-Step "Selecting subscription"
az account set --subscription $SubscriptionId

Write-Step "Creating or refreshing GitHub Actions service principal"
$spJson = az ad sp create-for-rbac `
    --name $ServicePrincipalName `
    --role Contributor `
    --scopes "/subscriptions/$SubscriptionId" `
    --sdk-auth

$spPath = Join-Path $PSScriptRoot "..\.azure-credentials.json"
$spJson | Set-Content -Path $spPath
Write-Host "Saved AZURE_CREDENTIALS JSON to $spPath" -ForegroundColor Green

Write-Step "Checking Terraform variable file"
$resolvedTerraformDir = Resolve-Path $TerraformDir
$tfvarsExample = Join-Path $resolvedTerraformDir "terraform.tfvars.example"
$tfvars = Join-Path $resolvedTerraformDir "terraform.tfvars"
if (-not (Test-Path $tfvars) -and (Test-Path $tfvarsExample)) {
    Copy-Item $tfvarsExample $tfvars
    Write-Host "Created terraform.tfvars from example. Fill the real secrets before apply." -ForegroundColor Yellow
}

$requiredTfvarsKeys = @(
    "subscription_id",
    "location",
    "environment",
    "owner",
    "acr_name",
    "key_vault_name",
    "frontend_origin",
    "jwt_secret",
    "postgres_admin_username",
    "postgres_admin_password",
    "postgres_db_name"
)

$missingTfvarsKeys = Get-MissingTfvarsKeys -Path $tfvars -RequiredKeys $requiredTfvarsKeys
if ($missingTfvarsKeys.Count -gt 0) {
    Write-Host "terraform.tfvars is missing required values: $($missingTfvarsKeys -join ', ')." -ForegroundColor Yellow
    Write-Host "If needed, copy missing entries from $tfvarsExample into $tfvars before running terraform plan." -ForegroundColor Yellow
}

Write-Step "Printing next commands"
Write-Host "1. Edit $tfvars and replace jwt_secret, postgres_admin_password, and frontend_origin if needed." -ForegroundColor White
Write-Host "2. Run:  Set-Location `"$TerraformDir`"; terraform init; terraform plan -out tfplan; terraform apply tfplan" -ForegroundColor White
Write-Host "3. Run scripts\post-terraform-check.ps1 after Terraform succeeds." -ForegroundColor White
Write-Host "4. Add the saved JSON from .azure-credentials.json as the GitHub secret AZURE_CREDENTIALS." -ForegroundColor White
