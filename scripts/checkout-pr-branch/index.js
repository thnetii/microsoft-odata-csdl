/**
 * @param {{
 *  github: import('@octokit/rest').Octokit,
 *  context: import('@actions/github/lib/context').Context,
 *  core: import('@actions/core'),
 *  exec: import('@actions/exec')
 * }} param0
 * @param {string} branch_name
 */
module.exports = async ({ github, context, core, exec }, branch_name) => {
  let git_exitcode = 0
  git_exitcode = await exec.exec('git', [
    'checkout',
    '-B',
    branch_name,
    'HEAD'
  ])
  core.debug(`Asking GitHub API about ref named ${branch_name}`)
  const branch_resp = await github.git.getRef({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: `refs/heads/${branch_name}`,
  })
  core.debug('git ref found, staging merge')
  git_exitcode = await exec.exec('git', [
    'merge',
    '--no-commit',
    '--allow-unrelated-histories',
    '-s',
    'ours',
    `origin/${branch_name}`
  ])
}
