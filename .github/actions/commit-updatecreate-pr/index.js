/**
 * @param {{
 *  github: InstanceType<typeof import('@actions/github/lib/utils').GitHub>,
 *  context: import('@actions/github/lib/context').Context,
 *  core: import('@actions/core'),
 *  exec: import('@actions/exec')
 * }} param0
 * @param {string} branchName
 * @param {string} commitMessage
 * @param {string} prTitle
 * @param {string} prBody
 */
module.exports = async (
  {
    github, context, core, exec,
  },
  branchName,
  commitMessage,
  prTitle,
  prBody,
) => {
  let gitExitCode = 0;

  gitExitCode = await exec.exec('git', [
    'add',
    '.',
  ]);

  const gitStatusOutput = await exec.getExecOutput('git', [
    'status',
    '--porcelain',
  ]);
  if (!gitStatusOutput.stdout) {
    core.info('No changes detected. Skipping Commit and PR Update/Create');
    return;
  }

  gitExitCode = await exec.exec('git', [
    'commit',
    '-m',
    commitMessage,
  ]);
  if (gitExitCode) {
    throw new Error(`git process exited with error code ${gitExitCode}.`);
  }
  gitExitCode = await exec.exec('git', [
    'push',
    'origin',
    '--force',
    `HEAD:${branchName}`,
  ]);
  if (gitExitCode) {
    throw new Error(`git process exited with error code ${gitExitCode}.`);
  }

  const pullsQuery = {
    owner: context.repo.owner,
    repo: context.repo.repo,
    head: branchName,
  };
  const pullsDefinition = {
    title: prTitle,
    body: prBody,
    ...pullsQuery,
  };
  let pullNumber;
  const pullsResp = await github.rest.pulls.list(pullsQuery);
  const pullObject = pullsResp && pullsResp.data
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
    core.setOutput('prNumber', pullNumber);
  }
};
