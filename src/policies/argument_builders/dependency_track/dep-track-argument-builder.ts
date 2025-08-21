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

import { ArgumentBuilder } from '../argument-builder';
import {
  REPO_DIR,
  RUNTIME_CONTAINER,
  DEBUG,
  DEPENDENCY_TRACK_URL,
  DEPENDENCY_TRACK_API_KEY,
  DEPENDENCY_TRACK_PROJECT_ID,
  DEPENDENCY_TRACK_PROJECT_NAME,
  DEPENDENCY_TRACK_UPLOAD_TOKEN,
  DEPENDENCY_TRACK_PROJECT_VERSION
} from '../../../app.input';

/**
 * Builds arguments for Dependency Track policy violation checks using scanoss-py.
 */
export class DependencyTrackArgumentBuilder extends ArgumentBuilder {
  /**
   * Builds command arguments for Dependency Track policy checks.
   */
  async build(): Promise<string[]> {
    return [
      'run',
      '-v',
      `${REPO_DIR}:/scanoss`,
      RUNTIME_CONTAINER,
      'inspect',
      'dt',
      'pv',
      '--url',
      DEPENDENCY_TRACK_URL,
      '--apikey',
      DEPENDENCY_TRACK_API_KEY,
      ...(DEPENDENCY_TRACK_PROJECT_ID ? ['--project-id', DEPENDENCY_TRACK_PROJECT_ID] : []),
      ...(DEPENDENCY_TRACK_UPLOAD_TOKEN ? ['--upload-token', DEPENDENCY_TRACK_UPLOAD_TOKEN] : []),
      ...(DEPENDENCY_TRACK_PROJECT_NAME ? ['--project-name', DEPENDENCY_TRACK_PROJECT_NAME] : []),
      ...(DEPENDENCY_TRACK_PROJECT_VERSION ? ['--project-version', DEPENDENCY_TRACK_PROJECT_VERSION] : []),
      '--format',
      'md',
      ...(DEBUG ? ['--debug'] : [])
    ];
  }
}
