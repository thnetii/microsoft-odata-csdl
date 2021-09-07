/**
 * @param {{
 *  github: import('@octokit/rest').Octokit,
 *  context: import('@actions/github/lib/context').Context
 * }} param0
 * @param {number} issue_number
 * @param {string[]} labels
 */
module.exports = async ({ github, context }, issue_number, labels) => {
  _ = await github.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issue_number,
    labels: labels
  })
}
