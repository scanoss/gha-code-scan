import { LicenseSummaryArgumentBuilder } from '../policies/argument_builders/licenses/license-summary-argument-builder';
import * as exec from '@actions/exec';
import { EXECUTABLE } from '../app.input';
import * as core from '@actions/core';

export interface License {
  spdxid: string;
  copyleft: boolean | null;
  url: string | null;
  componentCount: number;
}

interface LicenseSummary {
  licenses: License[];
  detectedLicenses: number;
  detectedLicensesWithCopyleft: number;
}

export async function getLicenseSummary(): Promise<LicenseSummary> {
  const licenseSummaryBuilder = new LicenseSummaryArgumentBuilder();
  const args = await licenseSummaryBuilder.build();
  const options = {
    failOnStdErr: false,
    ignoreReturnCode: true
  };
  const { stdout, stderr, exitCode } = await exec.getExecOutput(EXECUTABLE, args, options);
  if (exitCode === 1) {
    core.warning(`Unable to extract licenses for job summary: ${stderr}`);
    return { licenses: [], detectedLicenses: 0, detectedLicensesWithCopyleft: 0 };
  }
  return JSON.parse(stdout) as LicenseSummary;
}
