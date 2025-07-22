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

import { generateJobSummary, generatePRSummary } from '../src/services/report.service';
import path from 'path';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: '',
  SCANOSS_SETTINGS: true,
  SBOM_ENABLED: false
}));

describe('Test report service', () => {
  beforeEach(() => {
    jest.spyOn(github.context, 'repo', 'get').mockReturnValue({ owner: 'x', repo: 'y' });
    jest.spyOn(core.summary, 'write').mockImplementation();
    github.context.runId = 0;
    const appInput = jest.requireMock('../src/app.input');
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
  });

  it('Should generate job summary', async () => {
    await expect(generateJobSummary([])).resolves.toEqual(undefined);
  }, 10000);

  it('Should generate PR summary', async () => {
    const report = await generatePRSummary([]);
    const expectedOutput = `
  ### SCANOSS SCAN Completed :rocket:
  - **Detected components:** 2
  - **Undeclared components:** 2
  - **Declared components:** 0
  - **Detected files:** 4
  - **Detected files undeclared:** 4
  - **Detected files declared:** 0
  - **Licenses detected:** 3
  - **Licenses detected with copyleft:** 1
  - **Policies:**   (0 total)

  View more details on [SCANOSS Action Summary](https://github.com/x/y/actions/runs/0)
  `;
    expect(report).toEqual(expectedOutput);
  }, 50000);
});
