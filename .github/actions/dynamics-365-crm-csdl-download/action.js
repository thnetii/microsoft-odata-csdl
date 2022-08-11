const { URL } = require('url');
const { EOL } = require('os');
const { promises: fs } = require('fs');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const ghaCore = require('@actions/core');
const { HttpClient } = require('@actions/http-client');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const xmlFormatter = require('xml-formatter');
const assert = require('assert');

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
  const d365InstanceUrlInput = ghaCore.getInput('d365-instance-url', {
    required: true,
  });
  const d365InstanceUrl = new URL(d365InstanceUrlInput);
  const d365ResourceScope = new URL('/.default', d365InstanceUrl);
  const d365ApiUrlInput = ghaCore.getInput('d365-api-url');
  const apiVersion = ghaCore.getInput('api-version') || 'v8.2';
  const csdlUrl = new URL(
    `/api/data/${apiVersion}/$metadata`,
    d365ApiUrlInput ? new URL(d365ApiUrlInput) : d365InstanceUrl
  );
  const d365VersionUrl = new URL('RetrieveVersion()', csdlUrl);

  const filePath = ghaCore.getInput('file-path', { required: true });

  const msalAuthResult = await msalClient.acquireTokenByClientCredential({
    scopes: [d365ResourceScope.toString()],
  });
  assert(msalAuthResult);

  /** @type {import('@actions/http-client/interfaces').IHeaders} */
  const odataRequHdrs = {
    authorization: `Bearer ${msalAuthResult.accessToken}`,
    'OData-Version': '4.0',
    'OData-MaxVersion': '4.0',
  };
  /** @type {import('@actions/http-client/interfaces').ITypedResponse<{Version: string}>} */
  const d365VersionResp = await httpClient.getJson(
    d365VersionUrl.toString(),
    odataRequHdrs
  );
  const d365Version = d365VersionResp.result?.Version;
  const csdlResp = await httpClient.get(csdlUrl.toString(), {
    ...odataRequHdrs,
    accept: 'application/xml',
  });
  const {
    message: {
      headers: { 'content-type': csdlMimeType },
    },
  } = csdlResp;
  let csdlText = await csdlResp.readBody();
  if (d365Version) {
    ghaCore.setOutput('d365-version', d365Version);
    const csdlParser = new DOMParser();
    const csdlDom = csdlParser.parseFromString(csdlText, csdlMimeType);
    const d365VersionComment = csdlDom.createComment(
      `Microsoft Dynamics 365 CRM v${d365Version}`
    );
    csdlDom.insertBefore(d365VersionComment, csdlDom.documentElement);
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
