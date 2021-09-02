#Requires -Version 5.1
[CmdletBinding()]
param (
    [ValidateNotNullOrEmpty()]
    [string]$AuthInstance = $ENV:SHAREPOINT_AUTH_INSTANCE,
    [string]$Realm = $ENV:SHAREPOINT_REALM
)

[uri]$AuthInstanceUri = $AuthInstance
[uri]$AuthMetadataUri = New-Object uri $AuthInstanceUri,
    "/metadata/json/1?realm=$([uri]::EscapeDataString($Realm))"
[ValidateNotNull()][PSObject]$AuthMetadataResponse = Invoke-RestMethod $AuthMetadataUri
$AuthMetadataResponse.endpoints | Where-Object protocol -IEQ "OAuth2" | ForEach-Object {
    Write-Host "::add-mask::$($_.location)"
    Write-Host "::set-output name=token_endpoint::$($_.location)"
}
