/**
 * @param {{
 *  github: InstanceType<typeof import('@actions/github/lib/utils').GitHub>,
 *  context: import('@actions/github/lib/context').Context,
 *  core: import('@actions/core')
 * }} param0
 */
module.exports = async ({github, context, core}) => {
  core.debug('requesting details about current run from GitHub API')
  const run_resp = await github.rest.actions.getWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId
  })
  const { workflow_id } = run_resp.data
  core.info(`Determined ${workflow_id} as the wokflow id of the current run`)
  core.setOutput('workflow_id', workflow_id)
  core.setOutput('branch_name', `workflows/w${workflow_id}`)
}
