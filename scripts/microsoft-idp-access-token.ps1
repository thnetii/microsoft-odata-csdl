#Requires -Version 5.1
[CmdletBinding()]
param (
    [ValidateNotNull()]
    [uri]$TokenEndpoint = $ENV:MSIDP_TOKENENDPOINT,
    [ValidateNotNullOrEmpty()]
    [string]$ClientId = $ENV:MSIDP_CLIENTID,
    [securestring]$ClientSecret = (ConvertTo-SecureString -String $ENV:MSIDP_CLIENTSECRET -AsPlainText -Force),
    [ValidateNotNullOrEmpty()]
    [string]$ResourceId = $ENV:MSIDP_RESOURCEID
)

$TokenRequest = @{
    grant_type    = "client_credentials"
    client_id     = "${ClientId}"
    client_secret = (New-Object pscredential "${ClientId}@${Realm}", $ClientSecret).GetNetworkCredential().Password
    scope         = "${ResourceId}/.default"
}
[ValidateNotNull()][PSObject]$TokenResponse = Invoke-RestMethod `
    -Method Post -ContentType "application/x-www-form-urlencoded" `
    -Body $TokenRequest -Uri $TokenEndpoint
Write-Host "::add-mask::$($TokenResponse.access_token)"
Write-Host "::set-output name=access_token::$($TokenResponse.access_token)"
ConvertTo-SecureString -String $TokenResponse.access_token -AsPlainText -Force
