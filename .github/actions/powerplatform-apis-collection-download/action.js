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
  const apiVersion = getInput('api-version', {
    required: false,
    trimWhitespace: true,
  });
  const environment = getInput('environment', {
    required: false,
    trimWhitespace: true,
  });
  return { accessToken, apiVersion, environment };
}

/**
 * @param {PowerPlatformClient} client
 */
async function getEnvironmentInfo(client) {
  try {
    await client.getEnvironmentInfo();
    const { environmentPath: environment, apiEndpoint } = client;
    ghaCore.setOutput('environment', environment);
    ghaCore.setOutput('api-endpoint', apiEndpoint.toString());
  } catch (error) {
    /** @type {Parameters<ghaCore['warning']>[1]} */
    const warnProps = { title: getEnvironmentInfo.name };
    if (error instanceof Error) ghaCore.warning(error, warnProps);
    else ghaCore.warning(`${error}`, warnProps);
  }
}

async function run() {
  const { accessToken, apiVersion, environment } = getActionInputs();
  const client = new PowerPlatformClient(accessToken, undefined, apiVersion);
  try {
    client.environmentPath = environment;
    await getEnvironmentInfo(client);
    const apiCollection = await client.getApis();
    ghaCore.setOutput(
      'api-connector-names',
      apiCollection.map((api) => api.name)
    );
  } catch (error) {
    if (error instanceof HttpClientError || error instanceof Error) {
      ghaCore.setFailed(error);
    } else throw error;
  } finally {
    client.dispose();
  }
}

run();
