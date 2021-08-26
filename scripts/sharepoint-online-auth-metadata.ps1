#Requires -Version 5.1
[CmdletBinding()]
param (
    [ValidateNotNullOrEmpty()]
    [string]$SharePointAuthInstance = $ENV:SHAREPOINT_AUTH_INSTANCE,
    [string]$SharePointRealm = $ENV:SHAREPOINT_REALM
)

[uri]$SharePointAuthInstanceUri = $SharePointAuthInstance
[uri]$AuthMetadataUri = New-Object uri $SharePointAuthInstanceUri, 
    "/metadata/json/1?realm=$([uri]::EscapeDataString($SharePointRealm))"
[ValidateNotNull()][PSObject]$AuthMetadataResponse = Invoke-RestMethod $AuthMetadataUri
$AuthMetadataResponse.endpoints | Where-Object protocol -IEQ "OAuth2" | ForEach-Object {
    Write-Host "::set-output name=token_endpoint::$($_.location)"
}