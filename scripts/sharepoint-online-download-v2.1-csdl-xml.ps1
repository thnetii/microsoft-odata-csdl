#Requires -Version 6.0
[CmdletBinding()]
param (
    [ValidateNotNullOrEmpty()]
    [string]$WebUrl = $ENV:SHAREPOINT_WEBURL,
    [securestring]$AccessToken = (ConvertTo-SecureString -String $ENV:SHAREPOINT_ACCESSTOKEN -AsPlainText -Force),
    [string]$ODataVersion,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]$OutFile
)

[uri]$WebUri = $WebUrl
[uri]$CsdlUri = if ($WebUri.LocalPath.EndsWith("/")) {
    New-Object uri $WebUri, "_api/v2.1/`$metadata"
}
else {
    $WebUri.GetLeftPart([System.UriPartial]::Path) + "/_api/v2.1/`$metadata"
}
$ResponseHeaders = $null
$Request = @{
    Method         = "Get"
    Uri            = $CsdlUri
    Authentication = "OAuth"
    Token          = $AccessToken
    Headers        = @{
        Accept = "application/xml"
    }
    ResponseHeadersVariable = "ResponseHeaders"
}
if ($ODataVersion) {
    $Request.Headers += @{
        "OData-Version"    = $ODataVersion
        "OData-MaxVersion" = $ODataVersion
    }
}

[ValidateNotNull()][xml]$CsdlResponse = Invoke-RestMethod @Request
$ResponseHeaders["MicrosoftSharePointTeamServices"] | ForEach-Object {
    Write-Host "::debug::SharePoint Teams Services version: v${_}"
    Write-Host "::set-output name=sharepoint_version::${_}"
    [System.Xml.XmlDocument]$CsdlDocument = $CsdlResponse
    $SpTeamServivcesComment = $CsdlDocument.CreateComment(
        " Microsoft SharePoint Team Services v${_} "
    )
    $SpTeamServivcesComment = $CsdlDocument.InsertBefore($SpTeamServivcesComment, $CsdlDocument.DocumentElement)
    $SpWhitespace = $CsdlDocument.CreateWhitespace([System.Environment]::NewLine)
    [void]$CsdlDocument.InsertAfter($SpWhitespace, $SpTeamServivcesComment)
}

$OutFileItem = New-Item -ItemType File $OutFile -Force
$XmlWriterOptions = New-Object System.Xml.XmlWriterSettings -Property @{
    CloseOutput             = $true
    Indent                  = $true
    WriteEndDocumentOnClose = $true
    Encoding                = New-Object System.Text.UTF8Encoding $false
}
$XmlWriter = [System.Xml.XmlWriter]::Create(
    $OutFileItem.FullName,
    $XmlWriterOptions
)
$CsdlResponse.WriteTo($XmlWriter)
$XmlWriter.Flush()
$XmlWriter.Close()
Remove-Variable XmlWriter
