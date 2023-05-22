/* eslint-disable dot-notation */

const ghaCore = require('@actions/core');
const { HttpClientError, HttpCodes } = require('@actions/http-client');
const { BearerCredentialHandler } = require('@actions/http-client/lib/auth');

const { GhaHttpClient } = require('@thnetii/gh-actions-http-client');

const apiUrlSym = Symbol('#apiUrl');
const httpClientSym = Symbol('#httpClient');
const headersSym = Symbol('#headers');
const downloadSym = Symbol('#download');

class SharePointClient {
  /**
   * @param {string | URL} url
   * @param {string} accessToken
   */
  constructor(url, accessToken) {
    const httpHandler = new BearerCredentialHandler(accessToken);
    this[httpClientSym] = new GhaHttpClient(undefined, [httpHandler]);
    this.webUrl = url;
    this[headersSym] =
      /** @type {import('node:http').OutgoingHttpHeaders} */ ({});
    this.useODataVersion('4.0', '4.01');
  }

  /**
   * @param {string | undefined} [version='4.0']
   * @param {string | undefined} [maxVersion=version]
   */
  useODataVersion(version, maxVersion) {
    // eslint-disable-next-line no-param-reassign
    if (typeof version !== 'string' || !version) version = '4.0';
    // eslint-disable-next-line no-param-reassign
    if (typeof maxVersion !== 'string' || !maxVersion) maxVersion = version;
    Object.assign(this[headersSym], {
      'OData-Version': version,
      'OData-MaxVersion': maxVersion,
    });
  }

  /**
   * @param {string | null | undefined} [level]
   */
  requestMetadataLevel(level) {
    if (typeof level === 'string' && level)
      Object.assign(this[headersSym], {
        accept: `application/json; odata.metadata=${level}`,
      });
    else delete this[headersSym]['accept'];
  }

  /**
   * Gets the API URL as a string. There is NO trailing slash at the end of the URL.
   * @returns {`${string | URL}_api`}
   */
  [apiUrlSym]() {
    const webUrl = this.webUrl.toString();
    const apiSep = webUrl.endsWith('/') ? '' : '/';
    return `${webUrl}${apiSep}_api/`;
  }

  /**
   * @param {number | undefined} [maxRetries=60]
   * @param {number | undefined} [intervalMs=5000]
   */
  async validateConnection(maxRetries, intervalMs) {
    // eslint-disable-next-line no-param-reassign
    if (typeof maxRetries !== 'number') maxRetries = 60;
    // eslint-disable-next-line no-param-reassign
    else if (maxRetries < 1) maxRetries = 1;
    // eslint-disable-next-line no-param-reassign
    if (typeof intervalMs !== 'number') intervalMs = 5000;

    ghaCore.info(`Validating connection to: ${this.webUrl}`);
    let error;
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        if (attempt > 0) {
          ghaCore.info(
            `Attempt ${attempt} failed. Waiting for ${
              intervalMs / 1000
            } second(s) before retrying.`
          );
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => {
            setTimeout(resolve, intervalMs);
          });
        }
        // eslint-disable-next-line no-await-in-loop
        const resp = await this.meUser();
        if (resp.statusCode === HttpCodes.OK) {
          ghaCore.info(`Connected to: ${this.webUrl}`);
          return resp;
        }
      } catch (except) {
        if (except instanceof HttpClientError) {
          error = except;
        } else throw except;
      }
    }

    throw error;
  }

  async meUser() {
    const httpClient = this[httpClientSym];
    const requUrl = `${this[apiUrlSym]()}/me/User`;
    /** @type {TypedResponse<import('./sp-odata-types').SP.User>}  */
    const resp = await httpClient.getJson(requUrl);
    const { result, statusCode } = resp;
    if (!result) throw new HttpClientError(`No from '${requUrl}'`, statusCode);
    const { LoginName } = result;
    ghaCore.info(`[SharePoint] Current User LoginName: ${LoginName}`);
    return resp;
  }

  /**
   * @param {string} url
   */
  async [downloadSym](url) {
    const httpClient = this[httpClientSym];
    const headers = { ...this[headersSym] };
    delete headers['accept'];
    const resp = await httpClient.get(url, headers);
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

  downloadCsdl() {
    const url = `${this[apiUrlSym]()}/$metadata`;
    return this[downloadSym](url);
  }

  /**
   * @param {'v2' | 'v2.0' | 'v2.1' | undefined} [version='v2.1']
   */
  downloadOneDriveCsdl(version) {
    // eslint-disable-next-line no-param-reassign
    version = version || 'v2.1';
    const url = `${this[apiUrlSym]()}/${version}/$metadata`;
    return this[downloadSym](url);
  }

  dispose() {
    this[httpClientSym].dispose();
  }
}

module.exports = {
  SharePointClient,
};

/**
 * @typedef {import('@actions/http-client/lib/interfaces').TypedResponse<T>} TypedResponse
 * @template T
 */
