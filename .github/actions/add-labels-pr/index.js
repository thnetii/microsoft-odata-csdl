/**
 * @param {{
 *  github: InstanceType<typeof import('@actions/github/lib/utils').GitHub>,
 *  context: import('@actions/github/lib/context').Context,
 *  inputs: {
 *    'pr-number': string,
 *    'labels': string
 *  },
 * }} args
 */
module.exports = async ({ github, context, inputs }) => {
  const issueNumber = parseInt(inputs['pr-number'], 10);
  const labels = inputs.labels
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);
  await github.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber,
    labels,
  });
};
