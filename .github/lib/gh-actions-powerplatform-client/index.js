/* eslint-disable dot-notation */
/* eslint-disable no-param-reassign */
const { URL } = require('node:url');

const { HttpClientError } = require('@actions/http-client');
const { BearerCredentialHandler } = require('@actions/http-client/lib/auth');

const { GhaHttpClient } = require('@thnetii/gh-actions-http-client');

const httpClientSym = Symbol('#httpClient');
const environmentSym = Symbol('#environment');

class PowerPlatformClient {
  /**
   * @param {string} accessToken
   * @param {string | URL | undefined} [apiEndpoint='https://api.flow.microsoft.com']
   * @param {string | undefined} [apiVersion='2016-06-01']
   */
  constructor(accessToken, apiEndpoint, apiVersion) {
    const httpHandler = new BearerCredentialHandler(accessToken);
    this[httpClientSym] = new GhaHttpClient(undefined, [httpHandler]);
    if (typeof apiEndpoint === 'undefined' || !apiEndpoint)
      apiEndpoint = 'https://api.flow.microsoft.com';
    this.apiEndpoint = new URL('/', apiEndpoint);
    if (typeof apiVersion !== 'string' || !apiVersion) {
      const now = new Date();
      const nowIso = now.toISOString();
      const [todayIso = '2016-06-01'] = nowIso.split('T', 2);
      const [year = '2016', month = '06'] = todayIso.split('-', 3);
      apiVersion = `${year}-${month}-01`;
    }
    this.apiVersion = apiVersion;
    this[environmentSym] = '~default';
  }

  get environmentPath() {
    return this[environmentSym];
  }

  set environmentPath(environment) {
    if (typeof environment !== 'string' || !environment)
      environment = '~default';
    this[environmentSym] = environment;
  }

  async getEnvironmentInfo() {
    const {
      [httpClientSym]: httpClient,
      apiEndpoint,
      apiVersion,
      environmentPath: environment,
    } = this;
    const url = new URL(
      `/providers/Microsoft.Flow/environments/${environment}?api-version=${apiVersion}`,
      apiEndpoint
    );
    /**
     * @type {import('@actions/http-client/lib/interfaces').TypedResponse<
     *  import('./powerplatform.types').PowerAutomateEnvironmentInfo
     * >}
     */
    const response = await httpClient.getJson(url.toString());
    const { statusCode, result } = response;
    if (!result)
      throw new HttpClientError(`Response from '${url}' is null`, statusCode);
    const {
      name: environmentFromApi,
      properties: {
        runtimeEndpoints: { 'microsoft.Flow': apiEndpointFromApi },
      },
    } = result;
    if (environmentFromApi) this.environmentPath = environmentFromApi;
    if (apiEndpointFromApi) this.apiEndpoint = new URL(apiEndpointFromApi);
    return result;
  }

  async getApis() {
    const {
      [httpClientSym]: httpClient,
      apiEndpoint,
      apiVersion,
      environmentPath: environment,
    } = this;
    const url = new URL(
      `/providers/Microsoft.Flow/environments/${environment}/apis?api-version=${apiVersion}`,
      apiEndpoint
    );
    /**
     * @type {import('@actions/http-client/lib/interfaces').TypedResponse<
     *  import('./powerplatform.types').PowerAutomateApiCollection
     * >}
     */
    const response = await httpClient.getJson(url.toString());
    const { statusCode, result } = response;
    if (!result)
      throw new HttpClientError(`Response from '${url}' is null`, statusCode);
    return result.value;
  }

  /**
   * @param {string} name
   */
  async getApiDetail(name) {
    const {
      [httpClientSym]: httpClient,
      apiEndpoint,
      apiVersion,
      environmentPath: environment,
    } = this;
    const url = new URL(
      `/providers/Microsoft.Flow/environments/${environment}/apis/${name}?api-version=${apiVersion}`,
      apiEndpoint
    );
    /**
     * @type {import('@actions/http-client/lib/interfaces').TypedResponse<
     *  import('./powerplatform.types').PowerAutomateApiDetailInfo
     * >}
     */
    const response = await httpClient.getJson(url.toString());
    const { statusCode, result } = response;
    if (!result)
      throw new HttpClientError(`Response from '${url}' is null`, statusCode);
    return result;
  }

  dispose() {
    this[httpClientSym].dispose();
  }
}

module.exports = {
  PowerPlatformClient,
};
