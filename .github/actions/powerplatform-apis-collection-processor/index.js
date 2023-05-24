const { EOL } = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

const { HttpClientError } = require('@actions/http-client');

const commitUpdatePr = require('@thnetii/microsoft-odata-csdl-github-actions-commit-updatecreate-pr');
const addLabelsPr = require('@thnetii/microsoft-odata-csdl-github-actions-add-labels-pr');

const {
  PowerPlatformClient,
} = require('@thnetii/microsoft-odata-csdl-github-actions-powerplatform-client');

/**
 * @param {Awaited<ReturnType<PowerPlatformClient['getApiDetail']>>} connector
 * @param {import('@actions/io')} io
 */
async function saveApiConnectorProperties(connector, io) {
  const {
    name,
    properties: { swagger },
  } = connector;
  const connectorFolder = path.join('powerplatform', 'apis', name);
  await io.mkdirP(connectorFolder);
  const swaggerPath = path.join(connectorFolder, 'swagger.json');
  const swaggerText = JSON.stringify(swagger, undefined, 2).replaceAll(
    '\n',
    EOL
  );
  await fs.writeFile(swaggerPath, swaggerText, 'utf-8');
  /** @type {PartiallyOptional<(typeof connector)['properties']>} */
  const props = connector.properties;
  delete props.runtimeUrls;
  delete props.primaryRuntimeUrl;
  delete props.swagger;
  const connectorPath = path.join(connectorFolder, 'api.json');
  const connectorText = JSON.stringify(connector, undefined, 2).replaceAll(
    '\n',
    EOL
  );
  await fs.writeFile(connectorPath, connectorText, 'utf-8');
}

/**
 * @param {PowerPlatformClient} client
 * @param {string} name
 * @param {Parameters<module['exports']>[0]} args
 */
async function processConnector(client, name, args) {
  const { core, io } = args;
  /** @type {Awaited<ReturnType<PowerPlatformClient['getApiDetail']>>} */
  let info;
  try {
    info = await client.getApiDetail(name);
  } catch (error) {
    if (error instanceof HttpClientError || error instanceof Error) {
      core.setFailed(error);
      return;
    }
    throw error;
  }

  await saveApiConnectorProperties(info, io);

  /** @type {number} */
  const pullNumber = await new Promise((resolve) => {
    commitUpdatePr(
      {
        ...args,
        inputs: {
          'branch-name': `powerplatform-fetcher/${name}`,
          'commit-message': `Power Platform API Connector ${name}, version ${info.properties.metadata.version.current}`,
          'pr-title': `Update Power Platform API Connector: ${info.properties.displayName}`,
          'pr-body': [
            'Automatic download of Power Platform API Connector',
            '',
            `API name: \`${info.name}\``,
            `Display name: **${info.properties.displayName}**`,
            `Tier: ${info.properties.tier}`,
            `Version: \`${info.properties.metadata.version.current}\``,
            `Publisher: **${info.properties.publisher}**`,
            `Created: ${new Date(info.properties.createdTime)}`,
            `Modified: ${new Date(info.properties.changedTime)}`,
            'Description:',
            `> ${info.properties.description}`,
            '',
            'Includes:',
            '- Swagger document',
            '- API Connector resource information',
          ].join('\n'),
        },
      },
      resolve
    );
  });
  if (typeof pullNumber === 'number' && pullNumber > 0) {
    await addLabelsPr({
      ...args,
      inputs: {
        'pr-number': pullNumber.toString(),
        labels: ['swagger-update', 'powerplatform'].join('\n'),
      },
    });
  }
}

/**
 * @param {{
 *  context: import('@actions/github/lib/context').Context;
 *  core: import('@actions/core');
 *  github: InstanceType<import('@actions/github/lib/utils').GitHub>;
 *  exec: import('@actions/exec');
 *  io: import('@actions/io');
 *  fetch: import('node-fetch')['default'];
 *  inputs: {
 *    'access-token': string;
 *    'api-endpoint'?: string | undefined;
 *    'environment'?: string | undefined;
 *    'api-version'?: string;
 *    'api-connector-names': string;
 *  };
 * }} args
 */
module.exports = async (args) => {
  const { core, inputs } = args;
  const {
    'access-token': accessToken,
    'api-endpoint': apiEndpoint,
    'api-version': apiVersion,
  } = inputs;

  /** @type {string[]} */
  const apiConnectorNames = JSON.parse(inputs['api-connector-names']);

  const client = new PowerPlatformClient(accessToken, apiEndpoint, apiVersion);
  try {
    for (const connectorName of apiConnectorNames) {
      core.group(`Power Platform API Connector: ${connectorName}`, async () => {
        try {
          await processConnector(client, connectorName, args);
        } catch (error) {
          core.error(error instanceof Error ? error : `${error}`, {
            title: `Failed to process API Connector: ${connectorName}`,
          });
        }
      });
    }
  } finally {
    client.dispose();
  }
};

/**
 * @typedef {{
 *  [P in keyof T]?: T[P] | undefined;
 * }} PartiallyOptional
 * @template T
 */
