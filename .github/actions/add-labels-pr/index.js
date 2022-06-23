/**
 * @param {{
 *  github: InstanceType<typeof import('@actions/github/lib/utils').GitHub>,
 *  context: import('@actions/github/lib/context').Context
 * }} param0
 * @param {number} issueNumber
 * @param {string[]} labels
 */
module.exports = async ({ github, context }, issueNumber, labels) => {
  await github.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber,
    labels,
  });
};
