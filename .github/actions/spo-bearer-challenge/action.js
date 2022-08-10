const { URL } = require('url');
const ghaCore = require('@actions/core');
const { HttpClient } = require('@actions/http-client');

const main = async () => {
  const spoWebUrlInput = ghaCore.getInput('sharepoint-web-url');
  const spoApiSubPath = '_vti_bin/client.svc';
  const spoApiSep = spoWebUrlInput.endsWith('/') ? '' : '/';
  const spoApiUrl = `${spoWebUrlInput}${spoApiSep}${spoApiSubPath}`;

  const httpClient = new HttpClient();
  const { message: spoApiRespMsg } = await httpClient.head(spoApiUrl, {
    authorization: 'Bearer',
  });
  let spoTeamServicesHeader =
    // eslint-disable-next-line dot-notation
    spoApiRespMsg.headers['MicrosoftSharePointTeamServices'];
  if (!spoTeamServicesHeader) spoTeamServicesHeader = [];
  if (typeof spoTeamServicesHeader === 'string')
    spoTeamServicesHeader = [spoTeamServicesHeader];
  for (const spoTeamServicesVersion of spoTeamServicesHeader) {
    ghaCore.debug(
      `SharePoint Teams Services version: v${spoTeamServicesVersion}`
    );
    ghaCore.setOutput('sharepoint-version', spoTeamServicesVersion);
  }
  const spoAuthHeader = spoApiRespMsg.headers['www-authenticate'] || '';
  const spoAuthParams = spoAuthHeader.match(/^Bearer\s+(.*)\s*$/iu)?.[1] || '';
  const spoAuthRealm = /realm="([^"]*)"/u.exec(spoAuthParams)?.[1];
  if (spoAuthRealm) {
    ghaCore.setSecret(spoAuthRealm);
    ghaCore.setOutput('realm', spoAuthRealm);
  }
  const spoAuthResourceId = /client_id="([^"]*)"/u.exec(spoAuthParams)?.[1];
  if (spoAuthResourceId) {
    ghaCore.setSecret(spoAuthResourceId);
    ghaCore.setOutput('resource-id', spoAuthResourceId);
  }
  const spoAuthUriString = /authorization_uri="([^"]*)"/u.exec(
    spoAuthParams
  )?.[1];
  if (spoAuthUriString) {
    const spoAuthUrl = new URL(spoAuthUriString);
    const spoAuthInstance = spoAuthUrl.origin;
    ghaCore.setSecret(spoAuthInstance);
    ghaCore.setOutput('auth-instance', spoAuthInstance);
  }
};
main();
