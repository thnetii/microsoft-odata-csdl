const { EOL } = require('os');
const { promises: fs } = require('fs');
const spAuth = require('node-sp-auth');
const ghaCore = require('@actions/core');
const { HttpClient } = require('@actions/http-client');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const xpath = require('xpath');
const xmlFormatter = require('xml-formatter');

/** @type {spAuth.IOnlineAddinCredentials} */
const credOpts = {
  clientId: ghaCore.getInput('client-id', { required: true }),
  clientSecret: ghaCore.getInput('client-secret', { required: true }),
};

const httpClient = new HttpClient();

(async () => {
  const spoWebUrl = ghaCore.getInput('sharepoint-web-url', { required: true });
  const spoApiSubPath = '_api/$metadata';
  const spoApiSep = spoWebUrl.endsWith('/') ? '' : '/';
  const spoApiUrl = `${spoWebUrl}${spoApiSep}${spoApiSubPath}`;

  const filePath = ghaCore.getInput('file-path', { required: true });

  const { headers: requHdrs } = await spAuth.getAuth(spoWebUrl, credOpts);
  // eslint-disable-next-line dot-notation
  requHdrs['accept'] = 'application/xml';
  requHdrs['OData-Version'] = '4.0';
  requHdrs['OData-MaxVersion'] = '4.0';
  const spoApiResp = await httpClient.get(spoApiUrl, requHdrs);
  const {
    message: { headers: respHdrs },
  } = spoApiResp;
  // eslint-disable-next-line dot-notation
  let spoVersionHeader = respHdrs['microsoftsharepointteamservices'];
  if (!spoVersionHeader) spoVersionHeader = [];
  else if (typeof spoVersionHeader === 'string')
    spoVersionHeader = [spoVersionHeader];
  let spoVersion;
  for (spoVersion of spoVersionHeader) {
    ghaCore.debug(`SharePoint Teams Services version: v${spoVersion}`);
    ghaCore.setOutput('sharepoint-version', spoVersion);
  }
  let csdlText = await spoApiResp.readBody();

  const parser = new DOMParser();
  const csdlDom = parser.parseFromString(csdlText, respHdrs['content-type']);
  const selector = xpath.useNamespaces({
    edm: 'http://docs.oasis-open.org/odata/ns/edm',
    edmx: 'http://docs.oasis-open.org/odata/ns/edmx',
  });
  const xpathExpr =
    '/edmx:Edmx/edmx:DataServices/edm:Schema[@Namespace="SP.Data"]';
  const spDataSelection = selector(xpathExpr, csdlDom);
  for (const csdlNsSelect of spDataSelection) {
    const csdlNsNode = /** @type {Node} */ (csdlNsSelect);
    const { parentNode } = csdlNsNode;
    parentNode?.removeChild(csdlNsNode);
  }
  if (spoVersion) {
    const spoVersionComment = csdlDom.createComment(
      ` Microsoft SharePoint Team Services v${spoVersion} `
    );
    csdlDom.insertBefore(spoVersionComment, csdlDom.documentElement);
  }
  const serializer = new XMLSerializer();
  csdlText = serializer.serializeToString(csdlDom);
  csdlText = xmlFormatter(csdlText, {
    indentation: '  ',
    stripComments: false,
    lineSeparator: EOL,
    whiteSpaceAtEndOfSelfclosingTag: true,
  });
  await fs.writeFile(filePath, csdlText, 'utf8');
})();
