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
import { CopyleftPolicyCheck } from '../src/policies/copyleft-policy-check';
import { CONCLUSION } from '../src/policies/policy-check';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: ''
}));

// Mock the @actions/github module
jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'mock-owner', repo: 'mock-repo' },
    serverUrl: 'github',
    runId: 12345678
    // Add other properties as needed
  },
  getOctokit: jest.fn().mockReturnValue({
    rest: {
      checks: {
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockReturnValue({
          data: {
            id: 1
          }
        })
      }
    }
  })
}));

describe('CopyleftPolicyCheck', () => {
  const appInput = jest.requireMock('../src/app.input');

  afterEach(() => {
    appInput.COPYLEFT_LICENSE_EXPLICIT = '';
    appInput.COPYLEFT_LICENSE_EXCLUDE = '';
    appInput.COPYLEFT_LICENSE_INCLUDE = '';
  });

  it('Copyleft policy check fail', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;

    jest.spyOn(CopyleftPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(CopyleftPolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(CopyleftPolicyCheck.prototype, 'updateCheck').mockImplementation();
    const copyleftPolicyCheck = new CopyleftPolicyCheck();
    await copyleftPolicyCheck.start(1);
    await copyleftPolicyCheck.run();
    //neutral cause policy policy halt on failure is not set
    expect(copyleftPolicyCheck.conclusion).toEqual(CONCLUSION.Neutral);
  }, 50000);

  it('Copyleft policy empty results', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.COPYLEFT_LICENSE_EXCLUDE = 'GPL-2.0-only';

    jest.spyOn(CopyleftPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(CopyleftPolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(CopyleftPolicyCheck.prototype, 'updateCheck').mockImplementation();
    const copyleftPolicyCheck = new CopyleftPolicyCheck();
    await copyleftPolicyCheck.start(1);
    await copyleftPolicyCheck.run();
    //neutral cause policy policy halt on failure is not set
    expect(copyleftPolicyCheck.conclusion).toEqual(CONCLUSION.Success);
  }, 50000);

  it('Copyleft policy explicit licenses', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.COPYLEFT_LICENSE_EXPLICIT = 'MIT,Apache-2.0';

    jest.spyOn(CopyleftPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(CopyleftPolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(CopyleftPolicyCheck.prototype, 'updateCheck').mockImplementation();
    const copyleftPolicyCheck = new CopyleftPolicyCheck();
    await copyleftPolicyCheck.start(1);
    await copyleftPolicyCheck.run();
    //neutral cause policy policy halt on failure is not set
    expect(copyleftPolicyCheck.conclusion).toEqual(CONCLUSION.Neutral);
  }, 30000);
});
