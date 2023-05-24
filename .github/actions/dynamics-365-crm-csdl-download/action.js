const { EOL } = require('node:os');
const fs = require('node:fs/promises');
const { URL } = require('node:url');

const ghaCore = require('@actions/core');
const { HttpClientError, HttpCodes } = require('@actions/http-client');
const { BearerCredentialHandler } = require('@actions/http-client/lib/auth');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const xmlFormatter = require('xml-formatter');

const { getInput } = require('@thnetii/gh-actions-core-helpers');
const { GhaHttpClient } = require('@thnetii/gh-actions-http-client');

const odataHeaders = {
  'OData-Version': '4.0',
  'OData-MaxVersion': '4.01',
};

function getActionInputs() {
  const instanceUrl = getInput('d365-instance-url', {
    required: true,
    trimWhitespace: true,
  });
  const apiUrl = getInput('d365-api-url', {
    required: false,
    trimWhitespace: true,
  });
  let apiVersion =
    getInput('api-version', {
      required: false,
      trimWhitespace: true,
    }) || '8.2';
  while (/^v/iu.test(apiVersion)) apiVersion = apiVersion.substring(1);
  const accessToken = getInput('access-token', {
    required: true,
    trimWhitespace: true,
  });
  const filePath = getInput('file-path', {
    required: true,
    trimWhitespace: true,
  });
  return { instanceUrl, apiUrl, apiVersion, accessToken, filePath };
}

/**
 * @param {import('@actions/http-client').HttpClient} httpClient
 * @param {string | URL | undefined} baseUrl
 * @param {string} initialApiVersion
 */
async function retrieveVersion(httpClient, baseUrl, initialApiVersion) {
  const url = new URL(
    `/api/data/v${initialApiVersion}/RetrieveVersion()`,
    baseUrl
  );
  /**
   * @type {import('@actions/http-client/lib/interfaces').TypedResponse<
   *  { Version: string; }
   * >}
   */
  const response = await httpClient.getJson(url.toString(), odataHeaders);
  return response.result?.Version;
}

/**
 * @param {import('@actions/http-client').HttpClient} httpClient
 * @param {string | URL | undefined} baseUrl
 * @param {string} apiVersion
 */
async function downloadCsdl(httpClient, baseUrl, apiVersion) {
  const url = new URL(`/api/data/v${apiVersion}/$metadata`, baseUrl);
  const resp = await httpClient.get(url.toString(), {
    ...odataHeaders,
    Accept: 'application/xml',
  });
  const {
    message: { statusCode, statusMessage },
  } = resp;
  if (statusCode !== HttpCodes.OK)
    throw new HttpClientError(
      `${url}: ${statusCode} ${statusMessage || ''}`,
      statusCode || 500
    );
  return resp;
}

/**
 * @param {import('@actions/http-client').HttpClientResponse} csdlResp
 * @param {string} filePath
 * @param {string | undefined} [apiVersion]
 */
async function transformAndSaveCsdl(csdlResp, filePath, apiVersion) {
  const {
    message: {
      headers: { 'content-type': contentType },
    },
  } = csdlResp;
  let csdlText = await csdlResp.readBody();
  if (apiVersion) {
    const csdlParser = new DOMParser();
    const csdlDom = csdlParser.parseFromString(csdlText, contentType);
    const d365VersionComment = csdlDom.createComment(
      `Microsoft Dynamics 365 CRM v${apiVersion}`
    );
    csdlDom.insertBefore(d365VersionComment, csdlDom.documentElement);
    const csdlSerializer = new XMLSerializer();
    csdlText = csdlSerializer.serializeToString(csdlDom);
  }
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
  const {
    instanceUrl,
    apiUrl,
    accessToken,
    filePath,
    apiVersion: initialApiVersion,
  } = getActionInputs();
  const handler = new BearerCredentialHandler(accessToken);
  const client = new GhaHttpClient(undefined, [handler]);
  try {
    const baseUrl = apiUrl ? new URL(apiUrl) : new URL(instanceUrl);
    const apiVersion = await retrieveVersion(
      client,
      baseUrl,
      initialApiVersion
    );
    if (apiVersion) {
      ghaCore.setOutput('d365-version', apiVersion);
    }
    const csdlResp = await downloadCsdl(
      client,
      baseUrl,
      apiVersion || initialApiVersion
    );
    await transformAndSaveCsdl(csdlResp, filePath, apiVersion);
  } catch (error) {
    if (error instanceof HttpClientError || error instanceof Error) {
      ghaCore.setFailed(error);
    } else throw error;
  } finally {
    client.dispose();
  }
}

run();
