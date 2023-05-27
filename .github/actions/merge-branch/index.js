/**
 * @param {{
 *  github: InstanceType<typeof import('@actions/github/lib/utils').GitHub>,
 *  context: import('@actions/github/lib/context').Context,
 *  inputs: {
 *    'branch-name': string,
 *    'commit-message'?: string | undefined,
 *  },
 * }} args
 */
module.exports = ({
  github,
  context: {
    ref,
    repo: { owner, repo },
  },
  inputs: { 'branch-name': branchName, 'commit-message': commitMessage },
}) => {
  /** @type {Parameters<(typeof github)['rest']['repos']['merge']>[0]} */
  const request = {
    owner,
    repo,
    head: branchName,
    base: ref,
  };
  if (commitMessage) request.commit_message = commitMessage;
  return github.rest.repos.merge(request);
};
