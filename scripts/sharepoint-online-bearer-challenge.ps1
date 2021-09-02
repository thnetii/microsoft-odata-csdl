#Requires -Version 6.0
[CmdletBinding()]
param (
    [ValidateNotNullOrEmpty()]
    [string]$WebUrl = $ENV:SHAREPOINT_WEBURL
)

[uri]$WebUri = $WebUrl
[uri]$ClientSvcUrl = if ($WebUri.LocalPath.EndsWith("/")) {
    New-Object uri $WebUri, "_vti_bin/client.svc"
}
else {
    $WebUri.GetLeftPart([System.UriPartial]::Path) + "/_vti_bin/client.svc"
}

$ResponseHeaders = $null
$BearerChallengeParameters = @{
    Method                  = "Head"
    Uri                     = $ClientSvcUrl
    Headers                 = @{ Authorization = "Bearer" }
    ResponseHeadersVariable = "ResponseHeaders"
    SkipHttpErrorCheck      = $true
}
[void](Invoke-RestMethod @BearerChallengeParameters)
[string]$WwwAuthenticateHeader = $ResponseHeaders["WWW-Authenticate"]
$WwwAuthenticateMethodPrefix = "Bearer "
[string]$BearerParameters = if (
    $WwwAuthenticateHeader.StartsWith($WwwAuthenticateMethodPrefix)
) {
    $WwwAuthenticateHeader.Substring($WwwAuthenticateMethodPrefix.Length).TrimStart()
}

if ($BearerParameters -match "realm=\`"([^\`"]*)\`"") {
    [string]$Realm = $Matches[1]
    Write-Host "::add-mask::$Realm"
    Write-Host "::set-output name=realm::$Realm"
}
if ($BearerParameters -match "client_id=\`"([^\`"]*)\`"") {
    [string]$ResourceId = $Matches[1]
    Write-Host "::add-mask::$ResourceId"
    Write-Host "::set-output name=resource_id::$ResourceId"
}
[string]$AuthorizationInstance = $null
if ($BearerParameters -match "authorization_uri=\`"([^\`"]*)\`"") {
    [uri]$AuthorizationUri = $Matches[1]
    $AuthorizationInstance = $AuthorizationUri.GetLeftPart([System.UriPartial]::Authority)
    Write-Host "::add-mask::$AuthorizationInstance"
    Write-Host "::set-output name=auth_instance::$AuthorizationInstance"
}
