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

import * as github from '@actions/github';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

import { generateJobSummary, generatePRSummary } from '../src/services/report.service';
import { DependencyTrackUploadResult } from '../src/services/dependency-track-status.service';
import path from 'path';

// Mock the github utils
jest.mock('../src/utils/github.utils', () => ({
  getFirstRunId: jest.fn().mockResolvedValue(12345),
  getSHA: jest.fn().mockReturnValue('mock-sha'),
  isPullRequest: jest.fn().mockReturnValue(false),
  createCommentOnPR: jest.fn()
}));

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: '',
  SCANOSS_SETTINGS: true,
  SBOM_ENABLED: false,
  DEPENDENCY_TRACK_URL: 'https://dt.example.com',
  DEPENDENCY_TRACK_PROJECT_ID: 'config-project-789'
}));

describe('Test report service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(github.context, 'repo', 'get').mockReturnValue({ owner: 'x', repo: 'y' });
    jest.spyOn(core.summary, 'write').mockImplementation();
    jest.spyOn(core.summary, 'addHeading').mockImplementation(() => core.summary);
    jest.spyOn(core.summary, 'addCodeBlock').mockImplementation(() => core.summary);
    jest.spyOn(core.summary, 'addRaw').mockImplementation(() => core.summary);
    jest.spyOn(core.summary, 'addSeparator').mockImplementation(() => core.summary);
    github.context.runId = 0;

    const appInput = jest.requireMock('../src/app.input');
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;

    // Mock the exec.getExecOutput calls that these services will make
    const mockExec = jest.spyOn(exec, 'getExecOutput');
    mockExec.mockClear();

    // Create a sequence of responses - each test will get fresh responses
    mockExec
      // License summary calls (multiple tests need this)
      .mockResolvedValue({
        stdout: JSON.stringify({
          licenses: [
            { spdxid: 'MIT', copyleft: false, url: 'https://spdx.org/licenses/MIT.html', componentCount: 1 },
            {
              spdxid: 'Apache-2.0',
              copyleft: false,
              url: 'https://spdx.org/licenses/Apache-2.0.html',
              componentCount: 1
            },
            {
              spdxid: 'GPL-2.0-only',
              copyleft: true,
              url: 'https://spdx.org/licenses/GPL-2.0-only.html',
              componentCount: 1
            }
          ],
          detectedLicenses: 3,
          detectedLicensesWithCopyleft: 1,
          components: [],
          totalComponents: 2,
          undeclaredComponents: 2,
          declaredComponents: 0,
          totalFilesDetected: 4,
          totalFilesUndeclared: 4,
          totalFilesDeclared: 0
        }),
        stderr: '',
        exitCode: 0
      });
  });

  it('Should generate job summary', async () => {
    await expect(generateJobSummary([])).resolves.toEqual(undefined);
  }, 10000);

  it('Should generate job summary with successful Dependency Track upload', async () => {
    const uploadResult: DependencyTrackUploadResult = {
      success: true,
      enabled: true,
      projectId: 'abc-123-def',
      projectName: 'test-project',
      projectVersion: '1.0.0',
      fileSize: 2048,
      componentsCount: 25,
      uploadTime: 1500
    };

    await expect(generateJobSummary([], uploadResult)).resolves.toEqual(undefined);

    // Verify that the summary was called with the Details section and subsections
    expect(core.summary.addHeading).toHaveBeenCalledWith('Details', 3);
    expect(core.summary.addHeading).toHaveBeenCalledWith('Status Checks', 4);
    expect(core.summary.addHeading).toHaveBeenCalledWith('Links', 4);

    // Verify that a "More Details" link is shown for successful uploads
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('[More Details](https://github.com/x/y/actions/runs/12345)')
    );

    // Verify that the project link was included in the Links table
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('[View Project](https://dt.example.com/projects/abc-123-def)')
    );
  }, 10000);

  it('Should generate job summary with disabled Dependency Track upload', async () => {
    const uploadResult: DependencyTrackUploadResult = {
      success: false,
      enabled: false,
      projectId: 'disabled-project-123'
    };

    await expect(generateJobSummary([], uploadResult)).resolves.toEqual(undefined);

    // Verify that the summary was called with the Details section and subsections
    expect(core.summary.addHeading).toHaveBeenCalledWith('Details', 3);
    expect(core.summary.addHeading).toHaveBeenCalledWith('Status Checks', 4);
    expect(core.summary.addHeading).toHaveBeenCalledWith('Links', 4);

    // Verify that "Dependency Track Upload disabled" is shown instead of a link
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('Dependency Track Upload disabled')
    );

    // Verify that the project link is still shown even when disabled
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('[View Project](https://dt.example.com/projects/disabled-project-123)')
    );
  }, 10000);

  it('Should generate job summary with failed Dependency Track upload', async () => {
    const uploadResult: DependencyTrackUploadResult = {
      success: false,
      enabled: true,
      error: 'Connection timeout',
      projectId: 'failed-project-456'
    };

    await expect(generateJobSummary([], uploadResult)).resolves.toEqual(undefined);

    // Verify that the summary was called with the Details section and subsections
    expect(core.summary.addHeading).toHaveBeenCalledWith('Details', 3);
    expect(core.summary.addHeading).toHaveBeenCalledWith('Status Checks', 4);
    expect(core.summary.addHeading).toHaveBeenCalledWith('Links', 4);

    // Verify that a "More Details" link is shown for failed uploads
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('[More Details](https://github.com/x/y/actions/runs/12345)')
    );

    // Verify that the project link appears even for failed uploads
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('[View Project](https://dt.example.com/projects/failed-project-456)')
    );
  }, 10000);

  it('Should generate job summary with project link from configuration when upload result has no project ID', async () => {
    const uploadResult: DependencyTrackUploadResult = {
      success: false,
      enabled: false
      // No projectId in upload result, should fall back to config
    };

    await expect(generateJobSummary([], uploadResult)).resolves.toEqual(undefined);
    
    // Verify that the summary was called with the Details section and subsections
    expect(core.summary.addHeading).toHaveBeenCalledWith('Details', 3);
    expect(core.summary.addHeading).toHaveBeenCalledWith('Status Checks', 4);
    expect(core.summary.addHeading).toHaveBeenCalledWith('Links', 4);

    // Verify that "Dependency Track Upload disabled" is shown when disabled
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('Dependency Track Upload disabled')
    );

    // Verify that the project link from configuration is included
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('[View Project](https://dt.example.com/projects/config-project-789)')
    );
  }, 10000);

  it('Should generate PR summary', async () => {
    const report = await generatePRSummary([]);
    const expectedOutput = `### SCANOSS SCAN Completed :rocket:
- **Detected components:** 2
- **Undeclared components:** 2
- **Declared components:** 0
- **Detected files:** 4
- **Detected files undeclared:** 4
- **Detected files declared:** 0
- **Licenses detected:** 3
- **Licenses detected with copyleft:** 1
- **Policies:**   (0 total)

View more details on [SCANOSS Action Summary](https://github.com/x/y/actions/runs/0)`;
    expect(report).toEqual(expectedOutput);
  }, 50000);
});
