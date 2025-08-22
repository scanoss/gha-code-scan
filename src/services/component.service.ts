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

import * as exec from '@actions/exec';
import { EXECUTABLE } from '../app.input';
import * as core from '@actions/core';
import { ComponentSummaryArgumentBuilder } from '../policies/argument_builders/components/component-summary-argument-builder';

/**
 * Represents a software component detected in the scan results.
 */
interface Component {
  purl: string;
  version: string;
  count: number;
  undeclared: number;
  declared: number;
}

/**
 * Summary of all components detected in the scan results, including declaration status.
 */
interface ComponentSummary {
  components: Component[];
  totalComponents: number;
  undeclaredComponents: number;
  declaredComponents: number;
  totalFilesDetected: number;
  totalFilesUndeclared: number;
  totalFilesDeclared: number;
}

/**
 * Retrieves a summary of all components detected in the scan results.
 * Uses scanoss-py to analyze scan results and determine component declaration status.
 */
export async function getComponentSummary(): Promise<ComponentSummary> {
  const componentSummaryBuilder = new ComponentSummaryArgumentBuilder();
  const args = await componentSummaryBuilder.build();
  const options = {
    failOnStdErr: false,
    ignoreReturnCode: true
  };
  const { stdout, stderr, exitCode } = await exec.getExecOutput(EXECUTABLE, args, options);
  if (exitCode === 1) {
    core.warning(`Unable to extract components for job summary: ${stderr}`);
    return {
      components: [],
      totalComponents: 0,
      undeclaredComponents: 0,
      declaredComponents: 0,
      totalFilesDeclared: 0,
      totalFilesDetected: 0,
      totalFilesUndeclared: 0
    };
  }
  return JSON.parse(stdout) as ComponentSummary;
}
