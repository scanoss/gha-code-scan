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

import path from 'path';
import { getLicenseSummary } from '../src/services/license.service';
import * as exec from '@actions/exec';

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

describe('Test license service', () => {
  beforeEach(() => {
    const appInput = jest.requireMock('../src/app.input');
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
  });

  it('Test get license summary', async () => {
    // Mock exec.getExecOutput to return license summary
    const mockLicenseSummary = {
      licenses: [
        { spdxid: 'MIT', copyleft: false, url: 'https://spdx.org/licenses/MIT.html', componentCount: 1 },
        { spdxid: 'Apache-2.0', copyleft: false, url: 'https://spdx.org/licenses/Apache-2.0.html', componentCount: 1 },
        {
          spdxid: 'GPL-2.0-only',
          copyleft: true,
          url: 'https://spdx.org/licenses/GPL-2.0-only.html',
          componentCount: 1
        }
      ],
      detectedLicenses: 3,
      detectedLicensesWithCopyleft: 1
    };

    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: JSON.stringify(mockLicenseSummary),
      stderr: '',
      exitCode: 0
    });

    const summary = await getLicenseSummary();
    expect(summary.detectedLicenses).toEqual(3);
    expect(summary.detectedLicensesWithCopyleft).toEqual(1);
    expect(summary.licenses.length).toEqual(3);
  }, 10000);
});
