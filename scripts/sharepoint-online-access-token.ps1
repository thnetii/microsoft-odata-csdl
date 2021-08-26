#Requires -Version 5.1
[CmdletBinding()]
param (
    [ValidateNotNullOrEmpty()]
    [string]$WebUrl = $ENV:SHAREPOINT_ONLINE_WEBURL,
    [ValidateNotNull()]
    [uri]$TokenEndpoint = $ENV:SHAREPOINT_ONLINE_TOKENENDPOINT,
    [ValidateNotNullOrEmpty()]
    [string]$ClientId = $ENV:SHAREPOINT_ONLINE_CLIENTID,
    [securestring]$ClientSecret = (ConvertTo-SecureString -String $ENV:SHAREPOINT_ONLINE_CLIENTSECRET -AsPlainText -Force),
    [ValidateNotNullOrEmpty()]
    [string]$Realm = $ENV:SHAREPOINT_ONLINE_REALM,
    [string]$SharePointResourceId = $ENV:SHAREPOINT_ONLINE_RESOURCEID
)

if (-not $SharePointResourceId) {
    $SharePointResourceId = "00000003-0000-0ff1-ce00-000000000000"
}

[uri]$WebUri = $WebUrl
$TokenRequest = @{
    grant_type = "client_credentials"
    client_id = "${ClientId}@${Realm}"
    client_secret = (New-Object pscredential "${ClientId}@${Realm}", $ClientSecret).GetNetworkCredential().Password
    resource   = "${SharePointResourceId}/$($WebUri.DnsSafeHost)@${Realm}"
}
[ValidateNotNull()][PSObject]$TokenResponse = Invoke-RestMethod `
    -Method Post -ContentType "application/x-www-form-urlencoded" `
    -Body $TokenRequest -Uri $TokenEndpoint
Write-Host "::add-mask::$($TokenResponse.access_token)"
Write-Host "::set-output name=access_token::$($TokenResponse.access_token)"
ConvertTo-SecureString -String $TokenResponse.access_token -AsPlainText -Force