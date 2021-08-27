/**
 * @typedef {Object} InputState
 * @property { import("@octokit/rest").Octokit } github - A pre-authenticated octokit/rest.js client with pagination plugins
 * @property { import("@actions/github/lib/context").Context } context - An object containing the context of the workflow run
 * @property { import("@actions/core") } core - A reference to the @actions/core package
 */

/**
 * @param {InputState} param0
 */
export default async ({github, context, core}) => {
  const run_resp = await github.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId
  })
  /** @type {{ workflow_id: Number}} */
  const { workflow_id } = run_resp
  core.setOutput('workflow_id', workflow_id)
}
