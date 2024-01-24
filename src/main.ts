import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { getLicenses, readResult } from './services/result.service';
import { createCommentOnPR, isPullRequest } from './utils/github.utils';
import { LicensePolicyCheck } from './policies/license-policy-check';
import { getLicensesReport } from './services/report.service';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug(`SCANOSS Scan Action started...`);

    const repoDir = process.env.GITHUB_WORKSPACE as string;
    const outputPath = 'results.json';

    // create policies
    core.debug(`Creating policies`);
    const policies = [new LicensePolicyCheck()];
    policies.forEach(async policy => policy.start());

    // run scan
    const { stdout, stderr } = await exec.getExecOutput(
      `docker run -v "${repoDir}":"/scanoss" ghcr.io/scanoss/scanoss-py:v1.9.0 scan . --output ${outputPath}`,
      []
    );

    const scannerResults = await readResult(outputPath);

    // run policies // TODO: define run action for each policy
    policies.forEach(async policy => await policy.run(scannerResults));

    if (isPullRequest()) {
      // create reports
      const licenses = getLicenses(scannerResults);
      const licensesReport = getLicensesReport(licenses);
      createCommentOnPR(licensesReport);
    }

    // set outputs for other workflow steps to use
    core.setOutput('output-command', stdout);
    core.setOutput('result-filepath', outputPath);
  } catch (error) {
    // fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
