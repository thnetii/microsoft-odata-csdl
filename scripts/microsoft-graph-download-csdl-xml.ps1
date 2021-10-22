#Requires -Version 6.0
[CmdletBinding()]
param (
    [securestring]$AccessToken = (ConvertTo-SecureString -String $ENV:MSGRAPH_ACCESSTOKEN -AsPlainText -Force),
    [string]$ODataVersion,
    [ValidateSet("v1.0", "beta")][string]$ApiVersion = "v1.0",
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]$OutFile
)

[uri]$CsdlUri = "https://graph.microsoft.com/$([uri]::EscapeUriString($ApiVersion))/`$metadata"
$Request = @{
    Method         = "Get"
    Uri            = $CsdlUri
    Authentication = "OAuth"
    Token          = $AccessToken
    Headers        = @{
        Accept = "application/xml"
    }
}
if ($ODataVersion) {
    $Request.Headers += @{
        "OData-Version"    = $ODataVersion
        "OData-MaxVersion" = $ODataVersion
    }
}

[ValidateNotNull()][xml]$CsdlResponse = Invoke-RestMethod @Request
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
