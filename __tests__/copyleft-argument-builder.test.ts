import { CopyLeftArgumentBuilder } from '../src/policies/argument_builders/licenses/copyleft-argument-builder';
import { RUNTIME_CONTAINER } from '../src/app.input';
import * as core from '@actions/core';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: 'scanoss',
  OUTPUT_FILEPATH: 'results.json',
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
      'results.json',
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
      'results.json',
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
      'results.json',
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
      'results.json',
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
      'results.json',
      '--format',
      'md'
    ]);
  });

  it('should include --debug paramter', async () => {
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
      'results.json',
      '--format',
      'md',
      '--exclude',
      'MIT,Apache-2.0',
      '--debug'
    ]);
  });
});
