/**
 * @param {{
 *  github: import('@octokit/rest').Octokit,
 *  context: import('@actions/github/lib/context').Context,
 *  core: import('@actions/core'),
 *  exec: import('@actions/exec')
 * }} param0
 * @param {string} branch_name
 * @param {string} git_commit_message
 * @param {string} pr_title
 * @param {string} pr_body
 */
module.exports = async (
  { github, context, core, exec },
  branch_name, git_commit_message, pr_title, pr_body
) => {
  // git config user.name github-actions
  // git config user.email github-actions@github.com
  let gitExitCode = 0
  gitExitCode = await exec.exec('git', [
    'config',
    'user.name',
    'github-actions'
  ])
  if (gitExitCode) {
    throw new Error(`git process exited with error code ${gitExitCode}.`)
  }
  gitExitCode = await exec.exec('git', [
    'config',
    'user.email',
    'github-actions@github.com'
  ])
  if (gitExitCode) {
    throw new Error(`git process exited with error code ${gitExitCode}.`)
  }

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

  gitExitCode = await exec.exec('git', [
    'commit',
    '-m',
    git_commit_message
  ])
  if (gitExitCode) {
    throw new Error(`git process exited with error code ${gitExitCode}.`)
  }
  gitExitCode = await exec.exec('git', [
    'push',
    'origin',
    '--force',
    `HEAD:${branch_name}`
  ])
  if (gitExitCode) {
    throw new Error(`git process exited with error code ${gitExitCode}.`)
  }

  const pullsQuery = {
    owner: context.repo.owner,
    repo: context.repo.repo,
    head: branch_name
  }
  const pullsDefinition = {
    title: pr_title,
    body: pr_body,
    ...pullsQuery
  }
  let pullNumber = undefined
  let pullsResp = await github.pulls.list(pullsQuery)
  if (pullsResp && pullsResp.data && pullsResp.data[0]) {
    pullNumber = pullsResp.data[0].number
    _ = await github.pulls.update({
      pull_number: pullNumber,
      ...pullsDefinition
    })
  } else {
    pullsResp = await github.pulls.create({
      base: context.ref,
      ...pullsDefinition
    })
    pullNumber = pullsResp.data[0].number
  }
  if (pullNumber > 0) {
    core.setOutput('prNumber', pullNumber)
  }
}
