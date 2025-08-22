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
import { context, getOctokit } from '@actions/github';
import { getSHA } from '../utils/github.utils';
import * as inputs from '../app.input';
import { STATUS_NAME } from '../app.config';

export interface DependencyTrackUploadResult {
  success: boolean;
  enabled: boolean;
  error?: string;
  projectId?: string;
  uploadToken?: string;
  projectName?: string;
  projectVersion?: string;
  fileSize?: number;
  componentsCount?: number;
  uploadTime?: number;
  checkRunId?: number;
}

/**
 * Service for reporting Dependency Track upload status as a GitHub check
 */
export class DependencyTrackStatusService {
  private readonly checkName = `${STATUS_NAME}: Dependency Track Upload`;

  /**
   * Reports the Dependency Track upload status as a GitHub check run
   * Returns the created check run ID for linking purposes
   */
  async reportUploadStatus(result: DependencyTrackUploadResult) {
    if (!result.enabled) {
      return
    }
    try {
      const octokit = getOctokit(inputs.GITHUB_TOKEN);
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const sha = await getSHA();  // TODO review with Groh

      let conclusion: 'success' | 'failure' | 'neutral';
      let title: string;
      let summary: string;
      let text: string;

      if (result.success) {
        conclusion = 'success';
        title = 'SBOM successfully uploaded to Dependency Track';
        summary = '### ✅ Dependency Track Upload\n#### SBOM successfully uploaded to Dependency Track';
        text = this.createSuccessDetails(result);
      } else {
        conclusion = 'failure';
        title = 'Failed to upload SBOM to Dependency Track';
        summary = '### ❌ Dependency Track Upload\n#### Failed to upload SBOM to Dependency Track';
        text = this.createFailureDetails(result);
      }

      const response = await octokit.rest.checks.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: this.checkName,
        head_sha: sha,
        status: 'completed',
        conclusion,
        output: {
          title,
          summary,
          text
        }
      });
      core.debug(`Dependency Track upload status check created: ${conclusion}, ID: ${response.data.id}`);
      result.checkRunId = response.data.id;
    } catch (error) {
      core.warning(`Failed to create Dependency Track upload status check: ${error}`);
    }
  }

  /**
   * Creates details text for successful upload
   */
  private createSuccessDetails(result: DependencyTrackUploadResult): string {
    const details = ['**Upload Details:**', `• Project Name: ${result.projectName || 'Unknown'}`];

    if (result.projectVersion) {
      details.push(`• Project Version: ${result.projectVersion}`);
    }

    if (result.projectId) {
      details.push(`• Project ID: ${result.projectId}`);
    }

    details.push(`• Server: ${inputs.DEPENDENCY_TRACK_URL}`);

    if (result.fileSize) {
      const fileSizeKB = (result.fileSize / 1024).toFixed(1);
      details.push(
        `• File: scanoss-cyclonedx.json (${fileSizeKB} KB${result.componentsCount ? `, ${result.componentsCount} components` : ''})`
      );
    }

    if (result.uploadTime) {
      details.push(`• Upload Time: ${result.uploadTime.toFixed(1)}s`);
    }

    if (result.projectId && inputs.DEPENDENCY_TRACK_URL) {
      details.push(
        '',
        `View project in Dependency Track [here](${inputs.DEPENDENCY_TRACK_URL}/projects/${result.projectId}).`
      );
    }

    return details.join('\n');
  }

  /**
   * Creates details text for failed upload
   */
  private createFailureDetails(result: DependencyTrackUploadResult): string {
    const details = ['**Upload Details:**', `• Server: ${inputs.DEPENDENCY_TRACK_URL}`];
    if (result.error) {
      details.push(`• Error: ${result.error}`);
    }
    return details.join('\n');
  }
}

export const dependencyTrackStatusService = new DependencyTrackStatusService();
