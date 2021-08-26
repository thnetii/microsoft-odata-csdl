#Requires -Version 6.0
[CmdletBinding()]
param (
    [ValidateNotNullOrEmpty()]
    [string]$WebUrl = $ENV:SHAREPOINT_ONLINE_WEBURL,
    [securestring]$AccessToken = (ConvertTo-SecureString -String $ENV:SHAREPOINT_ONLINE_ACCESSTOKEN -AsPlainText -Force),
    [string]$ODataVersion,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]$OutFile,
    [string]$EdmNamespace = "http://docs.oasis-open.org/odata/ns/edm",
    [string]$EdmxNamespace = "http://docs.oasis-open.org/odata/ns/edmx"
)

[uri]$WebUri = $WebUrl
[uri]$CsdlUri = if ($WebUri.LocalPath.EndsWith("/")) {
    New-Object uri $WebUri, "_api/`$metadata"
}
else {
    $WebUri.GetLeftPart([System.UriPartial]::Path) + "/_api/`$metadata"
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
    Write-Host "::set-output name=sharepoint_version::${_}"
}

$SpDataNamespaceSelection = Select-Xml -Xml $CsdlResponse -Namespace @{
    edm  = $EdmNamespace;
    edmx = $EdmxNamespace;
} -XPath "/edmx:Edmx/edmx:DataServices/edm:Schema[@Namespace=`"SP.Data`"]"
[System.Xml.XmlNode]$SpDataNamespaceNode = $SpDataNamespaceSelection.Node
if ($SpDataNamespaceNode) {
    $SpDataNamespaceNode.ParentNode.RemoveChild($SpDataNamespaceNode) | Out-Null
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
