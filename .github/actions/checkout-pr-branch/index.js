/**
 * @param {{
 *  github: InstanceType<typeof import('@actions/github/lib/utils').GitHub>,
 *  context: import('@actions/github/lib/context').Context,
 *  core: import('@actions/core'),
 *  exec: import('@actions/exec')
 * }} param0
 * @param {string} branch_name
 */
module.exports = async ({
  github, context, core, exec,
}, branch_name) => {
  let git_exitcode = 0;
  git_exitcode = await exec.exec('git', [
    'checkout',
    '-B',
    branch_name,
    'HEAD',
  ]);
  core.info(`Asking GitHub API about ref named ${branch_name}`);
  try {
    await github.rest.git.getRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: `heads/${branch_name}`,
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
  git_exitcode = await exec.exec('git', [
    'fetch',
    'origin',
  ]);
  core.info('git ref found, staging merge');
  git_exitcode = await exec.exec('git', [
    'merge',
    '--no-commit',
    '--allow-unrelated-histories',
    '-s',
    'ours',
    `origin/${branch_name}`,
  ]);
};

/**
 * @typedef {import('@octokit/request-error').RequestError} RequestError
 */
