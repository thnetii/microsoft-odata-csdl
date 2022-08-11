const { EOL } = require('os');
const { promises: fs } = require('fs');
const spAuth = require('node-sp-auth');
const ghaCore = require('@actions/core');
const { HttpClient } = require('@actions/http-client');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const xmlFormatter = require('xml-formatter');

/** @type {spAuth.IOnlineAddinCredentials} */
const credOpts = {
  clientId: ghaCore.getInput('client-id', { required: true }),
  clientSecret: ghaCore.getInput('client-secret', { required: true }),
};

const httpClient = new HttpClient();

(async () => {
  const apiVersion = ghaCore.getInput('api-version') || 'v2.1';

  const spoWebUrl = ghaCore.getInput('sharepoint-web-url', { required: true });
  const spoApiSubPath = `_api/${apiVersion}/$metadata`;
  const spoApiSep = spoWebUrl.endsWith('/') ? '' : '/';
  const spoApiUrl = `${spoWebUrl}${spoApiSep}${spoApiSubPath}`;

  const filePath = ghaCore.getInput('file-path', { required: true });

  const { headers: requHdrs } = await spAuth.getAuth(spoWebUrl, credOpts);
  // eslint-disable-next-line dot-notation
  requHdrs['accept'] = 'application/xml';
  requHdrs['OData-Version'] = '4.01';
  requHdrs['OData-MaxVersion'] = '4.01';
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
  if (spoVersion) {
    const csdlParser = new DOMParser();
    const csdlDom = csdlParser.parseFromString(
      csdlText,
      respHdrs['content-type']
    );
    const spoVersionComment = csdlDom.createComment(
      ` Microsoft SharePoint Team Services v${spoVersion} `
    );
    csdlDom.insertBefore(spoVersionComment, csdlDom.documentElement);
    const csdlSerializer = new XMLSerializer();
    csdlText = csdlSerializer.serializeToString(csdlDom);
  }
  csdlText = xmlFormatter(csdlText, {
    indentation: '  ',
    stripComments: false,
    lineSeparator: EOL,
    whiteSpaceAtEndOfSelfclosingTag: true,
  });
  await fs.writeFile(filePath, csdlText, 'utf8');
})();
