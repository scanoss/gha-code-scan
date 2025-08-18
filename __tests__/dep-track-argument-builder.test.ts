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
import { DependencyTrackArgumentBuilder } from '../src/policies/argument_builders/dependency_track/dep-track-argument-builder';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: '',
  DEPENDENCY_TRACK_URL: '',
  DEPENDENCY_TRACK_API_KEY: '',
  DEPENDENCY_TRACK_PROJECT_ID: '',
  DEPENDENCY_TRACK_UPLOAD_TOKEN: '',
  DEPENDENCY_TRACK_PROJECT_NAME: '',
  DEPENDENCY_TRACK_PROJECT_VERSION: '',
  DEBUG: false
}));

describe('DependencyTrackArgumentBuilder', () => {
  const appInput = jest.requireMock('../src/app.input');

  beforeEach(() => {
    appInput.DEPENDENCY_TRACK_PROJECT_ID = '';
    appInput.DEPENDENCY_TRACK_UPLOAD_TOKEN = '';
    appInput.DEPENDENCY_TRACK_PROJECT_NAME = '';
    appInput.DEPENDENCY_TRACK_PROJECT_VERSION = '';
    appInput.REPO_DIR = 'repodir';
    appInput.DEPENDENCY_TRACK_URL = 'dep-track-url';
    appInput.DEPENDENCY_TRACK_API_KEY = 'abcdefghijklmno';
  });

  it('Build Command with id test', async function ()  {
    appInput.DEPENDENCY_TRACK_PROJECT_ID = '01234-56789';
    const builder = new DependencyTrackArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'repodir:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'dt',
      'pv',
      '--url',
      'dep-track-url',
      '--apikey',
      'abcdefghijklmno',
      '--project-id',
      '01234-56789',
      '--format',
      'md'
    ]);
  });

  it('Build Command with name and version test', async function ()  {
    appInput.DEPENDENCY_TRACK_PROJECT_NAME = 'test-project';
    appInput.DEPENDENCY_TRACK_PROJECT_VERSION = '1.0.0';
    const builder = new DependencyTrackArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'repodir:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'dt',
      'pv',
      '--url',
      'dep-track-url',
      '--apikey',
      'abcdefghijklmno',
      '--project-name',
      'test-project',
      '--project-version',
      '1.0.0',
      '--format',
      'md'
    ]);
  });

  it('Build Command with upload token test', async function ()  {
    appInput.DEPENDENCY_TRACK_PROJECT_ID = '01234-56789';
    appInput.DEPENDENCY_TRACK_UPLOAD_TOKEN = 'abcde-12345';
    const builder = new DependencyTrackArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'repodir:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'dt',
      'pv',
      '--url',
      'dep-track-url',
      '--apikey',
      'abcdefghijklmno',
      '--project-id',
      '01234-56789',
      '--upload-token',
      'abcde-12345',
      '--format',
      'md'
    ]);
  });

  it('Build Command with output test', async function ()  {
    appInput.DEPENDENCY_TRACK_PROJECT_ID = '01234-56789';
    appInput.OUTPUT_FILEPATH = 'scanoss-inspect-result.json';
    const builder = new DependencyTrackArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'repodir:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'dt',
      'pv',
      '--url',
      'dep-track-url',
      '--apikey',
      'abcdefghijklmno',
      '--project-id',
      '01234-56789',
      '--format',
      'md'
    ]);
  });
});