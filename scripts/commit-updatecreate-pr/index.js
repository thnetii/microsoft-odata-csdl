/**
 * @param {{
 *  github: import('@octokit/rest').Octokit,
 *  context: import('@actions/github/lib/context').Context,
 *  core: import('@actions/core'),
 *  exec: import('@actions/exec')
 * }} param0
 * @param {string} git_commit_message
 * @param {string} branch_name
 */
module.exports = async ({ github, context, core, exec }, git_commit_message, branch_name) => {
  // git config user.name github-actions
  // git config user.email github-actions@github.com
  _ = await exec.exec('git', [
    'config',
    'user.name',
    'github-actions'
  ])
  _ = await exec.exec('git', [
    'config',
    'user.email',
    'github-actions@github.com'
  ])

  _ = await exec.exec('git', [
    'add',
    '.'
  ])

  const gitStatusOutput = await exec.getExecOutput('git', [
    'status',
    '--porcelain'
  ])
  if (!gitStatusOutput.stdout) {
    core.info('No changes detected. Skipping Commit and PR Update/Create')
    return
  }

  _ = await exec.exec('git', [
    'commit',
    '-m',
    git_commit_message
  ])

  const pullsResp = await github.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    head: branch_name
  })
  const pullsData = pullsResp.data
  if (pullsData) {
    core.debug('Existing Pull Request detected.')
  } else {
    core.debug('No existing Pull Requrest detected.')
  }
}
