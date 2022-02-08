#Requires -Version 6.0
[CmdletBinding()]
param (
    [securestring]$AccessToken = (ConvertTo-SecureString -String $ENV:MSGRAPH_ACCESSTOKEN -AsPlainText -Force),
    [uri]$InstanceApiUrl = $ENV:DYNAMICS365CRM_INSTANCEAPIURL,
    [string]$WebApiVersion,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]$OutFile
)

[uri]$CsdlUri = New-Object uri $InstanceApiUrl, "/api/data/$([uri]::EscapeUriString($WebApiVersion))/`$metadata"
$Request = @{
    Method         = "Get"
    Uri            = $CsdlUri
    Authentication = "OAuth"
    Token          = $AccessToken
    Headers        = @{
        Accept          = "application/xml"
        "OData-Version" = "4.0"
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
