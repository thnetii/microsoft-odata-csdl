const { EOL } = require('node:os');
const fs = require('node:fs/promises');

const ghaCore = require('@actions/core');
const { HttpClientError } = require('@actions/http-client');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const xpath = require('xpath');
const xmlFormatter = require('xml-formatter');

const { getInput } = require('@thnetii/gh-actions-core-helpers');
const {
  getSpoVersionFromHeader,
  SharePointClient,
} = require('@thnetii/microsoft-odata-csdl-github-actions-spo-client');

function getActionInputs() {
  const spoWebUrl = getInput('sharepoint-web-url', {
    required: true,
    trimWhitespace: true,
  });
  const filePath = getInput('file-path', {
    required: true,
    trimWhitespace: true,
  });
  const accessToken = getInput('access-token', {
    required: true,
    trimWhitespace: true,
  });
  if (ghaCore.isDebug()) {
    const [header, body] = accessToken.split('.', 3);
    ghaCore.debug(
      `access-token-header: ${Buffer.from(header || '', 'base64url').toString(
        'utf-8'
      )}`
    );
    ghaCore.debug(
      `access-token-body: ${Buffer.from(body || '', 'base64url').toString(
        'utf-8'
      )}`
    );
  }
  return {
    spoWebUrl,
    filePath,
    accessToken,
  };
}

/**
 * @param {import('@actions/http-client').HttpClientResponse} csdlResp
 * @param {string} filePath
 * @param {string | undefined} [spoVersion]
 */
async function transformAndSaveCsdl(csdlResp, filePath, spoVersion) {
  const {
    message: {
      headers: { 'content-type': contentType },
    },
  } = csdlResp;
  let csdlText = await csdlResp.readBody();

  const parser = new DOMParser();
  const csdlDom = parser.parseFromString(csdlText, contentType);
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
    ghaCore.setOutput('sharepoint-version', spoVersion);
    const spoVersionComment = csdlDom.createComment(
      ` Microsoft SharePoint Team Services v${spoVersion} `
    );
    csdlDom.insertBefore(spoVersionComment, csdlDom.documentElement);
  }
  const serializer = new XMLSerializer();
  csdlText = serializer.serializeToString(csdlDom);
  // @ts-ignore
  csdlText = xmlFormatter(csdlText, {
    indentation: '  ',
    stripComments: false,
    lineSeparator: EOL,
    whiteSpaceAtEndOfSelfclosingTag: true,
  });
  await fs.writeFile(filePath, csdlText, 'utf8');
}

async function run() {
  const { spoWebUrl, accessToken, filePath } = getActionInputs();

  const client = new SharePointClient(spoWebUrl, accessToken);
  try {
    client.useODataVersion('4.0');
    await client.meUser();
    const csdlResp = await client.downloadCsdl();
    const spoVersion = getSpoVersionFromHeader(csdlResp.message.headers);
    await transformAndSaveCsdl(csdlResp, filePath, spoVersion);
  } catch (error) {
    if (error instanceof HttpClientError || error instanceof Error) {
      ghaCore.setFailed(error);
    } else throw error;
  } finally {
    client.dispose();
  }
}

run();
