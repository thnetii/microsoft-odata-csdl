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
        try {
          const dispRequest = {
            'api-endpoint': apiEndpoint,
            environment,
            'api-connector-list': JSON.stringify(groupNames),
            'api-version': apiVersion,
          };
          await github.rest.actions.createWorkflowDispatch({
            owner,
            repo,
            ref,
            workflow_id: '.github/workflows/powerplatform-api-connector.yml',
            inputs: dispRequest,
          });
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
