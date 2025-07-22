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

import { RUNTIME_CONTAINER } from '../src/app.input';
import { ScanOssService } from '../src/services/scanoss.service';
import { CYCLONEDX_FILE_NAME } from '../src/app.output';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: ''
}));

describe('Scanoss service tests', () => {
  it('should correctly return the scanoss-py CycloneDX conversion command', () => {
    const scanossService = new ScanOssService();
    const command = (scanossService as any).buildCycloneDXParameters();
    expect(command).toEqual([
      'run',
      '-v',
      ':/scanoss',
      RUNTIME_CONTAINER,
      'convert',
      '--input',
      './results.json',
      '--format',
      'cyclonedx',
      '--output',
      `./${CYCLONEDX_FILE_NAME}`
    ]);
  });
});
