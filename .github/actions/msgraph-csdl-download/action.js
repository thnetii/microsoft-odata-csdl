const { EOL } = require('os');
const { promises: fs } = require('fs');
const ghaCore = require('@actions/core');
const { HttpClient } = require('@actions/http-client');
const xmlFormatter = require('xml-formatter');

const httpClient = new HttpClient();

(async () => {
  const apiVersion = ghaCore.getInput('api-version') || 'v1.0';
  const filePath = ghaCore.getInput('file-path', { required: true });

  const csdlUrl = `https://graph.microsoft.com/${apiVersion}/$metadata`;

  const accessToken = ghaCore.getInput('access-token', {
    required: true,
    trimWhitespace: true,
  });

  const csdlResp = await httpClient.get(csdlUrl, {
    authorization: `Bearer ${accessToken}`,
    'OData-Version': '4.0',
    'OData-MaxVersion': '4.0',
    accept: 'application/xml',
  });
  let csdlText = await csdlResp.readBody();
  // @ts-ignore
  csdlText = xmlFormatter(csdlText, {
    indentation: '  ',
    stripComments: false,
    lineSeparator: EOL,
    whiteSpaceAtEndOfSelfclosingTag: true,
  });
  await fs.writeFile(filePath, csdlText, 'utf8');
})();
