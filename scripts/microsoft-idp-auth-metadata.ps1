#Requires -Version 5.1
[CmdletBinding()]
param (
    [ValidateNotNullOrEmpty()]
    [string]$AuthInstance = $ENV:MSIDP_AUTH_INSTANCE,
    [string]$TenantId = $ENV:MSIDP_TENANTID
)

if (-not $TenantId) {
    $TenantId = "common"
}

[uri]$AuthInstanceUri = $AuthInstance
[uri]$AuthTenantUriTemplate = New-Object uri $AuthInstanceUri, "/$([uri]::EscapeUriString($TenantId))/oauth2/v2.0/authorize"
[uri]$AuthDiscoveryUri = New-Object uri $AuthInstanceUri,
"/common/discovery/instance?api-version=1.1&authorization_endpoint=$([uri]::EscapeDataString($AuthTenantUriTemplate))"
[ValidateNotNull()][PSObject]$AuthDiscoveryResponse = Invoke-RestMethod $AuthDiscoveryUri
[ValidateNotNull()][PSObject]$AuthMetadataResponse = Invoke-RestMethod $AuthDiscoveryResponse.tenant_discovery_endpoint

Write-Host "::add-mask::$($AuthMetadataResponse.token_endpoint)"
Write-Host "::set-output name=token_endpoint::$($AuthMetadataResponse.token_endpoint)"
