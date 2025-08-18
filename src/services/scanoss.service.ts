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
import * as inputs from '../app.input';
import * as core from '@actions/core';
import { uploadToArtifacts } from './github.service';
import { CYCLONEDX_FILE_NAME } from '../app.output';

/**
 * Service for converting SCANOSS scan results to different formats using scanoss-py.
 * Currently supports CycloneDX format conversion for integration with other tools.
 */
export class ScanOssService {
  /**
   * Build scanoss-py CycloneDX conversion parameters */
  private buildCycloneDXParameters(): string[] {
    // TODO fix
    const args = [
      'run',
      '-v',
      `${inputs.REPO_DIR}:/scanoss`,
      inputs.RUNTIME_CONTAINER,
      'convert',
      '--input',
      `./${inputs.OUTPUT_FILEPATH}`,
      '--format',
      'cyclonedx',
      '--output',
      `./${CYCLONEDX_FILE_NAME}`
    ];
    return args;
  }

  /**
   * Converts SCANOSS results to CycloneDX format using scanoss-py.
   * Currently always generates CycloneDX file which can be used by Dependency Track
   * or uploaded as an artifact for other integrations.
   */
  async scanResultsToCycloneDX(): Promise<Error | undefined> {
    try {
      core.info('Converting SCANOSS results to CycloneDX format...');
      const options = {
        failOnStdErr: false,
        ignoreReturnCode: false
      };
      const { exitCode } = await exec.getExecOutput(inputs.EXECUTABLE, this.buildCycloneDXParameters(), options);
      if (exitCode !== 0) {
        return new Error(`Error converting scan results into CycloneDX format`);
      }
      
      // Check if CycloneDX file was actually created before trying to upload it
      try {
        const fs = await import('fs');
        await fs.promises.access(CYCLONEDX_FILE_NAME, fs.constants.F_OK);
        await uploadToArtifacts(CYCLONEDX_FILE_NAME);
        core.info('Successfully converted results into CycloneDX format');
      } catch (fileError) {
        // File doesn't exist - this can happen with empty repos
        core.info('CycloneDX conversion completed but no file generated (likely empty repository)');
      }
    } catch (e: any) {
      core.error(e.message);
    }
  }
}

export const scanossService = new ScanOssService();
