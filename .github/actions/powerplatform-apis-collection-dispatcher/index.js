/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */

/**
 * @param {{
 *  context: import('@actions/github/lib/context').Context;
 *  core: import('@actions/core');
 *  github: InstanceType<import('@actions/github/lib/utils').GitHub>;
 *  inputs: {
 *    'api-endpoint': string;
 *    'environment': string;
 *    'api-connector-names': string;
 *    'api-version': string;
 *  };
 * }} args
 */
module.exports = async (args) => {
  const {
    context: {
      repo: { owner, repo },
      ref,
    },
    github,
    core,
    inputs: {
      'api-endpoint': apiEndpoint,
      environment,
      'api-version': apiVersion,
      'api-connector-names': apiConnectorNamesJson,
    },
  } = args;
  /** @type {string[]} */
  const apiConnectorNames = JSON.parse(apiConnectorNamesJson);
  let groupNr = 0;
  do {
    groupNr += 1;
    const groupNames = apiConnectorNames.splice(0, 256);
    await core.group(
      `Power Platform API connector group ${groupNr}`,
      async () => {
        core.info(`Group contains ${groupNames.length} connectors`);
        for (const apiConnector of groupNames) {
          core.info(`- ${apiConnector}`);
        }
        try {
          core.info('Dispatching group to workflow');
          const dispRequest = {
            'api-endpoint': apiEndpoint,
            environment,
            'api-connector-list': JSON.stringify(groupNames),
            'api-version': apiVersion,
          };
          const dispResponse = await github.rest.actions.createWorkflowDispatch(
            {
              owner,
              repo,
              ref,
              workflow_id: '.github/workflows/powerplatform-api-connector.yml',
              inputs: dispRequest,
            }
          );
          if (core.isDebug()) {
            const {
              url: dispUrl,
              status: dispStatus,
              headers: dispHeaders,
            } = dispResponse;
            core.debug(`${dispUrl}: ${dispStatus}`);
            for (const [headerName, headerValue] of Object.entries(
              dispHeaders
            )) {
              core.debug(`${headerName}: ${headerValue}`);
            }
          }
          core.info('Successfully dispatched API connector group');
        } catch (error) {
          core.error(error instanceof Error ? error : `${error}`, {
            title: `Failed to dispatch API Connector group ${groupNr}`,
          });
          process.exitCode = core.ExitCode.Failure;
        }
      }
    );
  } while (apiConnectorNames.length > 0);
};
