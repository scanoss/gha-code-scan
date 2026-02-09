// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2024, SCANOSS

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
import * as path from 'path';
import { sanitiseUrl } from './utils/url.utils';
import { RAW_RESULT_FILE_NAME } from './app.output';

/**
 * Validates a filename to prevent directory traversal and ensure safe file operations.
 * @param filename - The filename to validate
 * @returns A safe filename or throws an error if invalid
 */
function validateFilename(filename: string | undefined): string {
  if (!filename) {
    return RAW_RESULT_FILE_NAME;
  }

  // Normalize the path to handle any path traversal attempts
  const normalizedPath = path.normalize(filename);

  // Check for directory traversal attempts
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.includes('\\')) {
    core.warning(`Invalid filename detected: ${filename}. Using default: ${RAW_RESULT_FILE_NAME}`);
    return RAW_RESULT_FILE_NAME;
  }

  // Extract just the filename (no directory components)
  const basename = path.basename(normalizedPath);

  // Ensure it's a valid filename (alphanumeric, dots, dashes, underscores)
  const safeFilenameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!safeFilenameRegex.test(basename)) {
    core.warning(`Unsafe filename detected: ${filename}. Using default: ${RAW_RESULT_FILE_NAME}`);
    return RAW_RESULT_FILE_NAME;
  }

  // Ensure it has a proper extension
  if (!basename.includes('.')) {
    return `${basename}.json`;
  }

  return basename;
}

/**
 * Validates a scan path to prevent directory traversal and ensure safe operations.
 * @param scanPath - The scan path to validate
 * @returns A safe scan path or defaults to current directory
 */
function validateScanPath(scanPath: string | undefined): string {
  if (!scanPath) {
    return '.';
  }

  // Normalize and convert to forward slashes for consistency
  const normalizedPath = path.normalize(scanPath).replace(/\\/g, '/');

  // Reject absolute paths (Unix-style and Windows-style)
  // Windows paths: C:/, D:/, etc. (drive letter followed by colon)
  const windowsAbsolutePattern = /^[a-zA-Z]:/;
  if (path.isAbsolute(scanPath) || windowsAbsolutePattern.test(normalizedPath)) {
    core.warning(`Absolute scan paths not allowed: ${scanPath}. Using default: .`);
    return '.';
  }

  // Reject directory traversal attempts
  if (normalizedPath.includes('..')) {
    core.warning(`Invalid scan path detected: "${scanPath}". Using default: .`);
    return '.';
  }

  // Remove leading './' for consistency
  const cleaned = normalizedPath.startsWith('./') ? normalizedPath.slice(2) : normalizedPath;

  return cleaned || '.';
}

/**
 * Input configuration constants for the SCANOSS GitHub Action.
 * All values are loaded from GitHub Actions input parameters or environment variables.
 */

// Policy Configuration
/** Comma-separated list of policy names to execute */
export const POLICIES = core.getInput('policies');
/** Whether policy failures should halt the workflow (default: true) */
export const POLICIES_HALT_ON_FAILURE = !(core.getInput('policies.halt_on_failure') === 'false');
/** Whether technical errors should halt the workflow (default: true) */
export const HALT_ON_ERROR = !(core.getInput('halt_on_error') === 'false');

// Dependency Scanning Configuration
/** Enable dependency scanning functionality */
export const DEPENDENCIES_ENABLED = core.getInput('dependencies.enabled') === 'true';
/** Dependency scope filter (prod/dev) */
export const DEPENDENCIES_SCOPE = core.getInput('dependencies.scope');
/** Exclude specific dependency scopes */
export const DEPENDENCY_SCOPE_EXCLUDE = core.getInput('dependencies.scope.exclude');
/** Include specific dependency scopes */
export const DEPENDENCY_SCOPE_INCLUDE = core.getInput('dependencies.scope.include');

// SCANOSS API Configuration
/** API key for SCANOSS service authentication */
export const API_KEY = core.getInput('api.key');
/** SCANOSS API endpoint URL */
export const API_URL = sanitiseUrl(core.getInput('api.url'));

// File System Configuration
/** Path for scan results output */
export const OUTPUT_FILEPATH = validateFilename(core.getInput('output.filepath'));
/** GitHub token for API access */
export const GITHUB_TOKEN = core.getInput('github.token');
/** Repository directory path */
export const REPO_DIR = process.env.GITHUB_WORKSPACE as string;

// License Policy Configuration
/** Additional copyleft licenses to include */
export const COPYLEFT_LICENSE_INCLUDE = core.getInput('licenses.copyleft.include');
/** Copyleft licenses to exclude */
export const COPYLEFT_LICENSE_EXCLUDE = core.getInput('licenses.copyleft.exclude');
/** Explicit list of copyleft licenses */
export const COPYLEFT_LICENSE_EXPLICIT = core.getInput('licenses.copyleft.explicit');

// Runtime Configuration
/** Docker container image for scanoss-py execution */
export const RUNTIME_CONTAINER = core.getInput('runtimeContainer') || 'ghcr.io/scanoss/scanoss-py:v1.45.0';
/** Skip snippet generation during scan */
export const SKIP_SNIPPETS = core.getInput('skipSnippets') === 'true';
/** Enable match annotations and commit comments */
export const MATCH_ANNOTATIONS = core.getInput('matchAnnotations') === 'true';
/** Enable file scanning */
export const SCAN_FILES = core.getInput('scanFiles') === 'true';
/** Enable SCANOSS settings file usage */
export const SCANOSS_SETTINGS = core.getInput('scanossSettings') === 'true';
/** Path to SCANOSS settings file */
export const SETTINGS_FILE_PATH = core.getInput('settingsFilepath') || 'scanoss.json';
/** Set scan mode (delta or full) */
export const SCAN_MODE = core.getInput('scanMode') || 'full';
/** Set scan root */
export const SCAN_PATH = validateScanPath(core.getInput('scanPath'));
/** Docker executable command */
export const EXECUTABLE = 'docker';
/** Enable debug mode */
export const DEBUG = core.getInput('debug') === 'true';

// Dependency Track Configuration
/** Enable Dependency Track integration */
export const DEPENDENCY_TRACK_ENABLED = core.getInput('deptrack.upload') === 'true';
/** Dependency Track server URL */
export const DEPENDENCY_TRACK_URL = sanitiseUrl(core.getInput('deptrack.url'));
/** Dependency Track API key */
export const DEPENDENCY_TRACK_API_KEY = core.getInput('deptrack.apikey');
/** Dependency Track project ID (mutable) */
// eslint-disable-next-line import/no-mutable-exports
export let DEPENDENCY_TRACK_PROJECT_ID = core.getInput('deptrack.projectid');
/** Dependency Track project name */
export const DEPENDENCY_TRACK_PROJECT_NAME = core.getInput('deptrack.projectname');
/** Dependency Track project version */
export const DEPENDENCY_TRACK_PROJECT_VERSION = core.getInput('deptrack.projectversion');
/** Upload token received from Dependency Track (set at runtime) */
// eslint-disable-next-line import/no-mutable-exports
export let DEPENDENCY_TRACK_UPLOAD_TOKEN = '';

// Setter Functions
/** Sets the Dependency Track upload token received from API */
export const setDependencyTrackUploadToken = (version: string): void => {
  DEPENDENCY_TRACK_UPLOAD_TOKEN = version;
};
/** Sets the Dependency Track project ID received from API */
export const setDependencyTrackProjectId = (id: string): void => {
  DEPENDENCY_TRACK_PROJECT_ID = id;
};
