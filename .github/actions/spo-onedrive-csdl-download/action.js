const { EOL } = require('os');
const fs = require('fs/promises');
const spAuth = require('node-sp-auth');
const ghaCore = require('@actions/core');
const { HttpClient } = require('@actions/http-client');
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
  requHdrs.accept = 'application/xml';
  requHdrs['OData-Version'] = '4.01';
  requHdrs['OData-MaxVersion'] = '4.01';
  const spoApiResp = await httpClient.get(spoApiUrl, requHdrs);
  const {
    message: { headers: respHdrs },
  } = spoApiResp;
  let spoVersionHeader = respHdrs.microsoftsharepointteamservices;
  if (!spoVersionHeader) spoVersionHeader = [];
  else if (typeof spoVersionHeader === 'string')
    spoVersionHeader = [spoVersionHeader];
  for (const spoVersion of spoVersionHeader) {
    ghaCore.debug(`SharePoint Teams Services version: v${spoVersion}`);
    ghaCore.setOutput('sharepoint-version', spoVersion);
  }
  let csdlText = await spoApiResp.readBody();
  csdlText = xmlFormatter(csdlText, {
    indentation: '  ',
    stripComments: false,
    lineSeparator: EOL,
    whiteSpaceAtEndOfSelfclosingTag: true,
  });
  await fs.writeFile(filePath, csdlText, 'utf8');
})();
