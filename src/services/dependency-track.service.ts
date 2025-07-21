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

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as inputs from '../app.input';

export interface DependencyTrackOptions {
  enabled: boolean;
  url: string;
  apiKey: string;
  projectId: string | undefined;
  projectName: string | undefined;
  projectVersion: string | undefined;
}

export class DependencyTrackService {
  private options: DependencyTrackOptions;
  private cycloneDXFileName = 'cyclonedx.json';

  constructor(options?: DependencyTrackOptions) {
    this.options = options || {
      enabled: inputs.DEPENDENCY_TRACK_ENABLED,
      url: inputs.DEPENDENCY_TRACK_URL,
      apiKey: inputs.DEPENDENCY_TRACK_API_KEY,
      projectId: inputs.DEPENDENCY_TRACK_PROJECT_ID,
      projectName: inputs.DEPENDENCY_TRACK_PROJECT_NAME,
      projectVersion: inputs.DEPENDENCY_TRACK_PROJECT_VERSION
    };
  }

  /**
   * Validates that all required Dependency Track parameters are provided
   */
  private validateConfiguration(): void {
    if (!this.options.projectId && !this.options.projectName && !this.options.projectVersion) {
      throw new Error('Dependency Track is enabled but you must specify a project ID or a project name and version');
    }

    if (!this.options.projectId && this.options.projectName && !this.options.projectVersion) {
      throw new Error('Dependency Track is enabled but you must specify a project version or project id');
    }

    if (!this.options.projectId && !this.options.projectName && this.options.projectVersion) {
      throw new Error('Dependency Track is enabled but you must specify a project name or project id');
    }

    const missingParams: string[] = [];

    if (!this.options.url) missingParams.push('dependencytrack.url');
    if (!this.options.apiKey) missingParams.push('dependencytrack.apikey');

    if (missingParams.length > 0) {
      throw new Error(`Dependency Track is enabled but required parameters are missing: ${missingParams.join(', ')}`);
    }
  }

  /**
   * Converts SCANOSS results to CycloneDX format and uploads to Dependency Track
   */
  async uploadToDependencyTrack(): Promise<void> {
    try {
      if (!this.options.enabled) {
        core.debug('Dependency Track upload is disabled');
      }
      this.validateConfiguration();

      core.info('Starting Dependency Track upload process...');
      await this.convertToCycloneDx();
      await this.uploadCycloneDXToDependencyTrack();
    } catch (e: any) {
      core.error(e.message);
    }
  }

  /**
   * Build scanoss-py CycloneDX conversion parameters */
  private buildCycloneDXParameters(): string[] {
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
      `./${this.cycloneDXFileName}`
    ];
    return args;
  }

  /**
   * Build scanoss-py dependency track upload parameters */
  private buildDependencyTrackUploadParameters(): string[] {
    const args = [
      'run',
      '-v',
      `${inputs.REPO_DIR}:/scanoss`,
      inputs.RUNTIME_CONTAINER,
      'export',
      '--input',
      `./${this.cycloneDXFileName}`,
      ...(this.options.apiKey ? ['--dt-apikey', this.options.apiKey] : []),
      ...(this.options.url ? ['--dt-url', this.options.url] : []),
      ...(this.options.projectId ? ['--dt-projectid', this.options.projectId] : []),
      ...(this.options.projectName ? ['--dt-projectname', this.options.projectName] : []),
      ...(this.options.projectVersion ? ['--dt-projectversion', this.options.projectVersion] : [])
    ];
    return args;
  }

  /**
   * Converts SCANOSS results to CycloneDX format using scanoss-py
   */
  private async convertToCycloneDx(): Promise<Error | undefined> {
    const options = {
      failOnStdErr: false,
      ignoreReturnCode: false
    };

    const { stderr } = await exec.getExecOutput(inputs.EXECUTABLE, this.buildCycloneDXParameters(), options);
    if (stderr) {
      return new Error(`Error converting scan results into CycloneDX format: ${stderr}`);
    }
    core.info('Successfully converted results to CycloneDX format');
  }

  /**
   * Upload CycloneDX file to Dependency Track using scanoss-py
   */
  private async uploadCycloneDXToDependencyTrack(): Promise<Error | undefined> {
    const options = {
      failOnStdErr: false,
      ignoreReturnCode: false
    };

    const { stderr } = await exec.getExecOutput(
      inputs.EXECUTABLE,
      this.buildDependencyTrackUploadParameters(),
      options
    );
    if (stderr) {
      return new Error(`Error uploading CycloneDX to Dependency Track: ${stderr}`);
    }
    core.info('CycloneDX successfully uploaded to Dependency Track');
  }
}

export const dependencyTrackService = new DependencyTrackService();
