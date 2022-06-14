/**
 * @param {{
 *  github: InstanceType<typeof import('@actions/github/lib/utils').GitHub>,
 *  context: import('@actions/github/lib/context').Context
 * }} param0
 * @param {number} issue_number
 * @param {string[]} labels
 */
module.exports = async ({ github, context }, issue_number, labels) => {
  _ = await github.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issue_number,
    labels: labels
  })
}
