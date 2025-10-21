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

import { CopyLeftArgumentBuilder } from '../src/policies/argument_builders/licenses/copyleft-argument-builder';
import { RUNTIME_CONTAINER } from '../src/app.input';
import * as core from '@actions/core';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: 'scanoss',
  OUTPUT_FILEPATH: 'scanoss-raw.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: ''
}));
describe('CopyleftArgumentBuilder', () => {
  // Store the module for direct manipulation
  const appInput = jest.requireMock('../src/app.input');

  afterEach(() => {
    appInput.COPYLEFT_LICENSE_EXPLICIT = '';
    appInput.COPYLEFT_LICENSE_EXCLUDE = '';
    appInput.COPYLEFT_LICENSE_INCLUDE = '';
  });

  it('Copyleft explicit test', async () => {
    appInput.COPYLEFT_LICENSE_EXPLICIT = 'MIT,Apache-2.0';
    appInput.COPYLEFT_LICENSE_EXCLUDE = 'MIT,Apache-2.0';
    const builder = new CopyLeftArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'scanoss:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'copyleft',
      '--input',
      'scanoss-raw.json',
      '--format',
      'md',
      '--explicit',
      'MIT,Apache-2.0'
    ]);
  });

  it('Copyleft exclude test', async () => {
    appInput.COPYLEFT_LICENSE_EXCLUDE = 'MIT,Apache-2.0';
    const builder = new CopyLeftArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'scanoss:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'copyleft',
      '--input',
      'scanoss-raw.json',
      '--format',
      'md',
      '--exclude',
      'MIT,Apache-2.0'
    ]);
  });

  it('Copyleft include test', async () => {
    appInput.COPYLEFT_LICENSE_INCLUDE = 'MIT,Apache-2.0,LGPL-3.0-only';
    const builder = new CopyLeftArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'scanoss:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'copyleft',
      '--input',
      'scanoss-raw.json',
      '--format',
      'md',
      '--include',
      'MIT,Apache-2.0,LGPL-3.0-only'
    ]);
  });

  it('Copyleft empty parameters test', async () => {
    const builder = new CopyLeftArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'scanoss:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'copyleft',
      '--input',
      'scanoss-raw.json',
      '--format',
      'md'
    ]);
  });

  it('Build Command test', async () => {
    const builder = new CopyLeftArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'scanoss:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'copyleft',
      '--input',
      'scanoss-raw.json',
      '--format',
      'md'
    ]);
  });

  it('should include --debug parameter', async () => {
    appInput.COPYLEFT_LICENSE_EXCLUDE = 'MIT,Apache-2.0';
    appInput.DEBUG = true;
    const builder = new CopyLeftArgumentBuilder();
    const cmd = await builder.build();
    core.debug(`CMD: ${cmd}`);
    expect(cmd).toEqual([
      'run',
      '-v',
      'scanoss:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'copyleft',
      '--input',
      'scanoss-raw.json',
      '--format',
      'md',
      '--exclude',
      'MIT,Apache-2.0',
      '--debug'
    ]);
  });
});
