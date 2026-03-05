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

import { DefaultArtifactClient } from '@actions/artifact';
import { context, getOctokit } from '@actions/github';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as inputs from '../app.input';
import * as fs from 'fs';
import * as path from 'path';
import { isPullRequest } from '../utils/github.utils';

const artifact = new DefaultArtifactClient();

export interface DeltaResult {
  deltaDir: string;
  tempFile: string;
}

/**
 * @class DeltaService
 * @brief Service for handling delta scanning of only changed files
 *
 * @details
 * This service supports delta scanning for both pull request and push events:
 * - For pull requests: Fetches changed files from the PR using the GitHub API
 * - For push events: Fetches changed files from the commit using the GitHub API
 * - Creates a temporary file listing these file paths
 * - Executes the scanoss-py delta copy command
 * - Extracts the delta directory name from command output
 */
export class DeltaService {
  private readonly runtimeContainer: string;

  constructor(runtimeContainer?: string) {
    this.runtimeContainer = runtimeContainer || inputs.RUNTIME_CONTAINER;
  }

  /**
   * @brief Prepares delta scanning by fetching changed files and creating delta directory
   * @returns {Promise<DeltaResult | null>} The delta directory path and temporary file path, or null for full scan
   * @throws {Error} When not in a supported event context or when GitHub API fails
   */
  async prepareDeltaScan(): Promise<DeltaResult | null> {
    let changedFiles: string[];

    // Determine event type and fetch changed files accordingly
    if (isPullRequest()) {
      core.info('Fetching changed files from pull request...');
      changedFiles = await this.getChangedFilesFromPR();
    } else if (context.eventName === 'push') {
      core.info('Fetching changed files from push commit...');
      changedFiles = await this.getChangedFilesFromPush();
    } else {
      throw new Error(
        `Delta scan mode is not supported for '${context.eventName}' events. Only 'pull_request' and 'push' events are supported.`
      );
    }

    if (changedFiles.length === 0) {
      core.warning('No files changed, falling back to full scan');
      return null;
    }

    core.info(`Found ${changedFiles.length} changed files`);

    // Create temporary file with changed file paths
    const tempFile = await this.createTempFileList(changedFiles);

    try {
      // Run delta copy command to create delta directory
      const deltaDir = await this.runDeltaCopy(tempFile);
      return { deltaDir, tempFile };
    } catch (error) {
      // Clean up temp file if delta copy fails
      await this.cleanup(tempFile);
      throw error;
    }
  }

  /**
   * @brief Fetches the list of changed files from the current pull request
   * @returns {Promise<string[]>} Array of file paths changed in the PR
   * @throws {Error} When GitHub API request fails
   */
  private async getChangedFilesFromPR(): Promise<string[]> {
    const octokit = getOctokit(inputs.GITHUB_TOKEN);
    const pullNumber = context.payload.pull_request?.number;

    if (!pullNumber) {
      throw new Error('Unable to determine pull request number from context');
    }

    try {
      // Fetch all pages of changed files
      const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pullNumber
      });

      // Extract file paths (exclude removed to avoid missing paths)
      return files.filter(f => ['added', 'modified', 'renamed'].includes((f as any).status)).map(file => file.filename);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      core.error(`Failed to fetch PR files: ${message}`);
      throw new Error(`Failed to fetch changed files from GitHub API: ${message}`);
    }
  }

  /**
   * @brief Fetches the list of changed files from the current push commit(s)
   * @returns {Promise<string[]>} Array of file paths changed in the push
   * @throws {Error} When GitHub API request fails
   *
   * @note GitHub API may truncate file lists for commits with 3000+ files
   * @note For multi-commit pushes, uses compareCommits to capture all changes
   */
  private async getChangedFilesFromPush(): Promise<string[]> {
    const octokit = getOctokit(inputs.GITHUB_TOKEN);

    try {
      const owner = context.repo.owner;
      const repo = context.repo.repo;
      const before = (context.payload as any).before;
      const after = (context.payload as any).after || context.sha;

      let files: string[];
      if (before && after && before !== after) {
        // Multi-commit push: compare entire range
        const comparison = await octokit.rest.repos.compareCommitsWithBasehead({
          owner,
          repo,
          basehead: `${before}...${after}`,
          per_page: 100
        });
        files =
          comparison.data.files
            ?.filter(f => ['added', 'modified', 'renamed'].includes(f.status || ''))
            .map(f => f.filename) || [];
      } else {
        // Single commit or no before/after available: fallback to single commit
        const commit = await octokit.rest.repos.getCommit({ owner, repo, ref: after });
        files =
          commit.data.files
            ?.filter(f => ['added', 'modified', 'renamed'].includes(f.status || ''))
            .map(f => f.filename) || [];
      }

      // Warn if file list might be truncated by GitHub API
      if (files.length >= 3000) {
        core.warning(
          `Commit contains ${files.length} files. GitHub API may truncate file lists for commits with 3000+ files. ` +
            'Delta scan may be incomplete. Consider using full scan mode for very large commits.'
        );
      }

      return files;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      core.error(`Failed to fetch commit files: ${message}`);
      throw new Error(`Failed to fetch changed files from GitHub API: ${message}`);
    }
  }

  /**
   * @brief Creates a temporary file with one file path per line
   * @param {string[]} filePaths - Array of file paths to write
   * @returns {Promise<string>} Path to the created temporary file
   */
  private async createTempFileList(filePaths: string[]): Promise<string> {
    const tempFile = path.join(inputs.REPO_DIR, `delta-files-${Date.now()}.txt`);

    try {
      // Write file paths, one per line
      const content = filePaths.join('\n');
      await fs.promises.writeFile(tempFile, content, 'utf-8');

      core.debug(`Created temporary file list at: ${tempFile}`);
      await this.uploadDeltaResults(tempFile);
      return tempFile;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      core.error(`Failed to create temporary file: ${message}`);
      throw new Error(`Failed to create temporary file list: ${message}`);
    }
  }

  /**
   * @brief Executes the scanoss-py delta copy command
   * @param {string} inputFile - Path to the file containing list of changed files
   * @returns {Promise<string>} The delta directory name extracted from command output
   * @throws {Error} When docker command fails or delta directory cannot be extracted
   */
  private async runDeltaCopy(inputFile: string): Promise<string> {
    core.info('Running scanoss-py delta copy command...');

    const relativeTempFile = path.relative(inputs.REPO_DIR, inputFile);

    const args = [
      'run',
      '-v',
      `${inputs.REPO_DIR}:/scanoss`,
      this.runtimeContainer,
      'delta',
      'copy',
      '--input',
      `./${relativeTempFile}`
    ];

    const options = {
      failOnStdErr: false,
      ignoreReturnCode: true
    };

    const result = await exec.getExecOutput(inputs.EXECUTABLE, args, options);
    const stdout = result.stdout;
    const stderr = result.stderr;

    if (result.exitCode !== 0) {
      core.error(`Delta copy command failed with exit code ${result.exitCode}`);
      core.error(`Stderr: ${stderr}`);
      throw new Error(`Delta copy command failed: ${stderr}`);
    }

    core.debug(`Delta copy stdout: ${stdout}`);

    // Parse output to extract delta directory name
    const deltaDir = this.extractDeltaDir(stdout);

    if (!deltaDir) {
      throw new Error('Failed to extract delta directory from command output');
    }

    core.info(`Delta directory created: ${deltaDir}`);
    return deltaDir;
  }

  /**
   * @brief Extracts the delta directory name from scanoss-py output
   * @param {string} output - The stdout from the delta copy command
   * @returns {string | null} The delta directory name or null if not found
   *
   * @note The delta copy command outputs only the delta directory path
   */
  private extractDeltaDir(output: string): string | null {
    const trimmed = output.trim();
    if (!trimmed) {
      return null;
    }
    // Validate that the directory name is safe (no path traversal, no special chars)
    if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
      core.error(`Invalid delta directory name: ${trimmed}`);
      throw new Error('Delta directory name contains invalid path components');
    }
    // Ensure it matches expected pattern for a directory name
    const safeDirPattern = /^[a-zA-Z0-9._-]+$/;
    if (!safeDirPattern.test(trimmed)) {
      core.error(`Invalid delta directory name: ${trimmed}`);
      throw new Error('Delta directory name contains invalid characters');
    }
    return trimmed;
  }

  /**
   * @brief Uploads delta file list artifact for traceability
   * @param filename
   * @private
   */
  private async uploadDeltaResults(filename: string): Promise<void> {
    await artifact.uploadArtifact('delta-file-list.txt', [filename], '.', { skipArchive: true });
  }

  /**
   * @brief Cleans up temporary files created during delta scan preparation
   * @param {string} tempFile - Path to the temporary file to delete
   *
   * @note The delta directory itself is NOT cleaned up, as it may be needed for
   * subsequent operations and will be cleaned up by the CI environment teardown.
   * Only the temporary file list is removed.
   */
  async cleanup(tempFile: string): Promise<void> {
    try {
      await fs.promises.unlink(tempFile);
      core.debug(`Cleaned up temporary file: ${tempFile}`);
      core.debug(`Delta directory is preserved and will be cleaned up by CI environment`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      core.warning(`Failed to cleanup temporary file ${tempFile}: ${message}`);
    }
  }
}

export const deltaService = new DeltaService();
