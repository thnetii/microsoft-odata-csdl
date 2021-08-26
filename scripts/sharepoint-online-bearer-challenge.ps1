#Requires -Version 6.0
[CmdletBinding()]
param (
    [ValidateNotNullOrEmpty()]
    [string]$SharePointOnlineWebUrlString = $ENV:SHAREPOINT_ONLINE_WEBURL
)

[uri]$SharePointOnlineWebUri = $SharePointOnlineWebUrlString
[uri]$SharePointOnlineClientSvcUrl = if ($SharePointOnlineWebUri.LocalPath.EndsWith("/")) {
    New-Object uri $SharePointOnlineWebUri, "_vti_bin/client.svc"
}
else {
    $SharePointOnlineWebUri.GetLeftPart([System.UriPartial]::Path) + "/_vti_bin/client.svc"
}

$SharePointResponseHeaders = $null
$SharePointBearerChallengeParameters = @{
    Method                  = "Head"
    Uri                     = $SharePointOnlineClientSvcUrl
    Headers                 = @{ Authorization = "Bearer" }
    ResponseHeadersVariable = "SharePointResponseHeaders"
    SkipHttpErrorCheck      = $true
}
[void](Invoke-RestMethod @SharePointBearerChallengeParameters)
[string]$SharePointWwwAuthenticateHeader = $SharePointResponseHeaders["WWW-Authenticate"]
$SharePointWwwAuthenticateMethodPrefix = "Bearer "
[string]$SharePointBearerParameters = if (
    $SharePointWwwAuthenticateHeader.StartsWith($SharePointWwwAuthenticateMethodPrefix)
) {
    $SharePointWwwAuthenticateHeader.Substring($SharePointWwwAuthenticateMethodPrefix.Length).TrimStart()
}

if ($SharePointBearerParameters -match "realm=\`"([^\`"]*)\`"") {
    [string]$SharePointRealm = $Matches[1]
    Write-Host "::set-output name=realm::$SharePointRealm"
}
if ($SharePointBearerParameters -match "client_id=\`"([^\`"]*)\`"") {
    [string]$SharePointResourceId = $Matches[1]
    Write-Host "::set-output name=resource_id::$SharePointResourceId"
}
[string]$SharePointAuthorizationInstance = $null
if ($SharePointBearerParameters -match "authorization_uri=\`"([^\`"]*)\`"") {
    [uri]$SharePointAuthorizationUri = $Matches[1]
    $SharePointAuthorizationInstance = $SharePointAuthorizationUri.GetLeftPart([System.UriPartial]::Authority)
    Write-Host "::set-output name=auth_instance::$SharePointAuthorizationInstance"
}