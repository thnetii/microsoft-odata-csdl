/**
 * @param {{
 *  core: import('@actions/core'),
 *  exec: import('@actions/exec'),
 *  inputs: {
 *    'branch-name': string,
 *    'commit-message': string,
 *  },
 * }} args
 */
module.exports = async ({
  core,
  exec: { exec, getExecOutput },
  inputs: { 'branch-name': branchName, 'commit-message': commitMessage },
}) => {
  let gitExitCode = 0;
  gitExitCode = await exec('git', ['add', '.']);

  const gitStatusOutput = await getExecOutput('git', ['status', '--porcelain']);
  if (!gitStatusOutput.stdout) {
    core.info('No changes detected. Skipping commit and push');
    core.setOutput('committed', false);
    return;
  }
  core.setOutput('committed', true);

  gitExitCode = await exec('git', ['commit', '-m', commitMessage]);
  if (gitExitCode) {
    throw new Error(`git process exited with error code ${gitExitCode}.`);
  }
  gitExitCode = await exec('git', [
    'push',
    'origin',
    '--force',
    `HEAD:${branchName}`,
  ]);
  if (gitExitCode) {
    throw new Error(`git process exited with error code ${gitExitCode}.`);
  }
};
