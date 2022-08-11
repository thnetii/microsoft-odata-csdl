const { EOL } = require('os');
const { promises: fs } = require('fs');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const ghaCore = require('@actions/core');
const { HttpClient } = require('@actions/http-client');
const xmlFormatter = require('xml-formatter');

const getMsalAuthority = () => {
  let authority = ghaCore.getInput('msidp-authority');
  if (!authority) {
    const instance =
      ghaCore.getInput('msidp-instance') || 'https://login.microsoftonline.com';
    const tenant = ghaCore.getInput('tenant-id') || 'common';
    authority = `${instance}/${tenant}`;
  }
  return authority;
};

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: ghaCore.getInput('client-id', { required: true }),
    clientSecret: ghaCore.getInput('client-secret', { required: true }),
    authority: getMsalAuthority(),
  },
});

const httpClient = new HttpClient();

(async () => {
  const apiVersion = ghaCore.getInput('api-version') || 'v1.0';
  const filePath = ghaCore.getInput('file-path', { required: true });

  const csdlUrl = `https://graph.microsoft.com/${apiVersion}/$metadata`;

  const msalAuthResult = await msalClient.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });

  const csdlResp = await httpClient.get(csdlUrl, {
    authorization: `Bearer ${msalAuthResult.accessToken}`,
    'OData-Version': '4.0',
    'OData-MaxVersion': '4.0',
    accept: 'application/xml',
  });
  let csdlText = await csdlResp.readBody();
  csdlText = xmlFormatter(csdlText, {
    indentation: '  ',
    stripComments: false,
    lineSeparator: EOL,
    whiteSpaceAtEndOfSelfclosingTag: true,
  });
  await fs.writeFile(filePath, csdlText, 'utf8');
})();
