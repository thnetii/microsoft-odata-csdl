const { EOL } = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

const ghaCore = require('@actions/core');
const { HttpClientError } = require('@actions/http-client');

const { getInput } = require('@thnetii/gh-actions-core-helpers');
const {
  PowerPlatformClient,
} = require('@thnetii/microsoft-odata-csdl-github-actions-powerplatform-client');

function getActionInputs() {
  const accessToken = getInput('access-token', {
    required: true,
    trimWhitespace: true,
  });
  const apiEndpoint = getInput('api-endpoint', {
    required: false,
    trimWhitespace: true,
  });
  const apiVersion = getInput('api-version', {
    required: false,
    trimWhitespace: true,
  });
  const environment = getInput('environment', {
    required: false,
    trimWhitespace: true,
  });
  const apiConnector = getInput('api-connector', {
    required: true,
    trimWhitespace: true,
  });
  return { accessToken, apiEndpoint, apiVersion, environment, apiConnector };
}

/**
 * @param {Awaited<ReturnType<PowerPlatformClient['getApiDetail']>>} connector
 */
async function saveApiConnectorProperties(connector) {
  const {
    name,
    properties: { swagger },
  } = connector;
  const connectorFolder = path.join('powerplatform', 'apis', name);
  await fs.mkdir(connectorFolder, { recursive: true });
  const swaggerPath = path.join(connectorFolder, 'swagger.json');
  const swaggerText =
    JSON.stringify(swagger, undefined, 2).replaceAll('\n', EOL) + EOL;
  await fs.writeFile(swaggerPath, swaggerText, 'utf-8');
  /** @type {PartiallyOptional<(typeof connector)['properties']>} */
  const props = connector.properties;
  delete props.runtimeUrls;
  delete props.primaryRuntimeUrl;
  delete props.swagger;
  const connectorPath = path.join(connectorFolder, 'api.json');
  const connectorText =
    JSON.stringify(connector, undefined, 2).replaceAll('\n', EOL) + EOL;
  await fs.writeFile(connectorPath, connectorText, 'utf-8');
}

async function run() {
  const { accessToken, apiEndpoint, apiVersion, environment, apiConnector } =
    getActionInputs();
  const client = new PowerPlatformClient(accessToken, apiEndpoint, apiVersion);
  try {
    client.environmentPath = environment;
    const connector = await client.getApiDetail(apiConnector);
    await saveApiConnectorProperties(connector);
    const { properties } = connector;
    ghaCore.setOutput('properties', properties);
  } catch (error) {
    if (error instanceof HttpClientError || error instanceof Error) {
      ghaCore.setFailed(error);
    } else throw error;
  } finally {
    client.dispose();
  }
}

run();

/**
 * @typedef {{
 *  [P in keyof T]?: T[P] | undefined;
 * }} PartiallyOptional
 * @template T
 */
