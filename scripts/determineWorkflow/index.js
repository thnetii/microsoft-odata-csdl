/**
 * @param {{
 *  github: import('@octokit/rest').Octokit,
 *  context: import('@actions/github/lib/context').Context,
 *  core: import('@actions/core')
 * }} param0
 */
module.exports = async ({github, context, core}) => {
  core.debug('requesting details about current run from GitHub API')
  const run_resp = await github.actions.getWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId
  })
  const { workflow_id } = run_resp.data
  core.debug(`Determined ${workflow_id} as the wokflow id of the current run`)
  core.setOutput('workflow_id', workflow_id)
}
