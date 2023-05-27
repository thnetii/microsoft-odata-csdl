/**
 * @param {{
 *  github: InstanceType<typeof import('@actions/github/lib/utils').GitHub>,
 *  context: import('@actions/github/lib/context').Context,
 *  core: import('@actions/core'),
 *  inputs: {
 *    'branch-name': string,
 *    'pr-title': string,
 *    'pr-body': string,
 *  },
 * }} args
 * @param {(prNumber: number) => void} [resolve]
 */
module.exports = async (args, resolve) => {
  const {
    github,
    context,
    core,
    inputs: {
      'branch-name': branchName,
      'pr-title': prTitle,
      'pr-body': prBody,
    },
  } = args;
  const pullsQuery = {
    owner: context.repo.owner,
    repo: context.repo.repo,
    head: branchName,
  };
  const pullsDefinition = {
    title: prTitle,
    body: prBody || '',
    ...pullsQuery,
  };
  let pullNumber;
  const pullsResp = await github.rest.pulls.list(pullsQuery);
  const pullObject =
    pullsResp && pullsResp.data
      ? pullsResp.data.find((pr) => pr.head.ref.endsWith(branchName))
      : undefined;
  if (pullObject) {
    pullNumber = pullObject.number;
    core.debug(`Found existing PR with PR number ${pullNumber}`);
    await github.rest.pulls.update({
      pull_number: pullNumber,
      ...pullsDefinition,
    });
  } else {
    core.debug('No existing PR found, creating new PR.');
    const pullResp = await github.rest.pulls.create({
      base: context.ref,
      ...pullsDefinition,
    });
    pullNumber = pullResp.data.number;
  }
  if (pullNumber > 0) {
    core.setOutput('pr-number', pullNumber);
  }
  if (typeof resolve === 'function') {
    resolve(pullNumber);
  }
};
