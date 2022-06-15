/**
 * @param {{
 *  github: InstanceType<typeof import('@actions/github/lib/utils').GitHub>,
 *  context: import('@actions/github/lib/context').Context,
 *  core: import('@actions/core'),
 *  exec: import('@actions/exec')
 * }} param0
 * @param {string} branchName
 */
module.exports = async ({
  github, context, core, exec,
}, branchName) => {
  let gitExitCode = 0;
  gitExitCode = await exec.exec('git', [
    'checkout',
    '-B',
    branchName,
    'HEAD',
  ]);
  core.info(`Asking GitHub API about ref named ${branchName}`);
  try {
    await github.rest.git.getRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: `heads/${branchName}`,
    });
  } catch (err) {
    const reqError = /** @type {RequestError} */(err);
    const { name, status } = reqError;
    if (name !== 'HttpError' || status !== 404) {
      throw err;
    }
    core.info('git ref not found, no merge necessary');
    return;
  }
  gitExitCode = await exec.exec('git', [
    'fetch',
    'origin',
  ]);
  core.info('git ref found, staging merge');
  gitExitCode = await exec.exec('git', [
    'merge',
    '--no-commit',
    '--allow-unrelated-histories',
    '-s',
    'ours',
    `origin/${branchName}`,
  ]);
  core.setOutput('git-exit-code', gitExitCode);
};

/**
 * @typedef {import('@octokit/request-error').RequestError} RequestError
 */
