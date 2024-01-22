import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { getLicenses, readResult } from './services/result.service';
import { createCommentOnPR, isPullRequest } from './utils/github.utils';
import { LicensePolicyCheck } from './policies/license-policy-check';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const repoDir = process.env.GITHUB_WORKSPACE as string;
    const outputPath = 'results.json';

    // create policies
    const policies = [new LicensePolicyCheck()];
    policies.forEach(policy => policy.start());

    // options to get standar output
    const options: exec.ExecOptions = {};
    let output = '';
    options.listeners = {
      stdout: (data: Buffer) => {
        output += data.toString();
      },
      stderr: (data: Buffer) => {
        output += data.toString();
      }
    };
    options.silent = true;

    // run scan
    await exec.exec(
      `docker run -v "${repoDir}":"/scanoss" ghcr.io/scanoss/scanoss-py:v1.9.0 scan . --output ${outputPath}`,
      [],
      options
    );

    const scannerResults = await readResult(outputPath);
    const licenses = getLicenses(scannerResults);

    // get reports
    const licenseReport = 'Here are the licenses found:';

    // run policies // TODO: define run action for each policy
    policies.forEach(async (policy) => await policy.run(licenseReport));

    if (isPullRequest()) {
      createCommentOnPR(licenseReport);
    }

    // set outputs for other workflow steps to use
    core.setOutput('licenses', licenses.toString());
    core.setOutput('output-command', output);
    core.setOutput('result-filepath', outputPath);
  } catch (error) {
    // fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
