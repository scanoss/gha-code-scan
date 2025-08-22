// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2025, SCANOSS

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
 */

import { LicenseSummaryArgumentBuilder } from '../policies/argument_builders/licenses/license-summary-argument-builder';
import * as exec from '@actions/exec';
import { EXECUTABLE } from '../app.input';
import * as core from '@actions/core';

/**
 * Represents a software license detected in the scan results.
 */
export interface License {
  spdxid: string;
  copyleft: boolean | null;
  url: string | null;
  componentCount: number;
}

/**
 * Summary of all licenses detected in the scan results.
 */
interface LicenseSummary {
  licenses: License[];
  detectedLicenses: number;
  detectedLicensesWithCopyleft: number;
}

/**
 * Retrieves a summary of all licenses detected in the scan results.
 * Uses scanoss-py to analyze scan results and generate license statistics.
 */
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
