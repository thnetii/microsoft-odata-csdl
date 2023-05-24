const { EOL } = require('node:os');
const fs = require('node:fs/promises');

const ghaCore = require('@actions/core');
const { HttpClientError, HttpCodes } = require('@actions/http-client');
const { BearerCredentialHandler } = require('@actions/http-client/lib/auth');
const xmlFormatter = require('xml-formatter');

const { getInput } = require('@thnetii/gh-actions-core-helpers');
const { GhaHttpClient } = require('@thnetii/gh-actions-http-client');

function getActionInputs() {
  const apiVersion =
    getInput('api-version', {
      required: false,
      trimWhitespace: true,
    }) || 'v1.0';
  const accessToken =
    getInput('access-token', {
      required: false,
      trimWhitespace: true,
    }) || 'v1.0';
  const filePath = getInput('file-path', {
    required: true,
    trimWhitespace: true,
  });
  return { apiVersion, accessToken, filePath };
}

/**
 * @param {import('@actions/http-client').HttpClientResponse} csdlResp
 * @param {string} filePath
 */
async function transformAndSaveCsdl(csdlResp, filePath) {
  let csdlText = await csdlResp.readBody();
  // @ts-ignore
  csdlText = xmlFormatter(csdlText, {
    indentation: '  ',
    stripComments: false,
    lineSeparator: EOL,
    whiteSpaceAtEndOfSelfclosingTag: true,
  });
  await fs.writeFile(filePath, csdlText, 'utf8');
}

/**
 * @param {import('@actions/http-client').HttpClient} httpClient
 * @param {string} apiVersion
 */
async function downloadCsdl(httpClient, apiVersion) {
  const url = `https://graph.microsoft.com/${apiVersion}/$metadata`;
  const resp = await httpClient.get(url, {
    'OData-Version': '4.0',
    'OData-MaxVersion': '4.01',
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

async function run() {
  const { apiVersion, accessToken, filePath } = getActionInputs();
  const handler = new BearerCredentialHandler(accessToken);
  const client = new GhaHttpClient(undefined, [handler]);
  try {
    const csdlResp = await downloadCsdl(client, apiVersion);
    await transformAndSaveCsdl(csdlResp, filePath);
  } catch (error) {
    if (error instanceof HttpClientError || error instanceof Error) {
      ghaCore.setFailed(error);
    } else throw error;
  } finally {
    client.dispose();
  }
}

run();
