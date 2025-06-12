import { RUNTIME_CONTAINER } from '../src/app.input';
import { UndeclaredArgumentBuilder } from '../src/policies/argument_builders/undeclared-argument-builder';

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

describe('UndeclaredArgumentBuilder', () => {
  const appInput = jest.requireMock('../src/app.input');

  it('Build Command test', async function () {
    appInput.REPO_DIR = 'repodir';
    appInput.OUTPUT_FILEPATH = 'results.json';
    appInput.SCANOSS_SETTINGS = false;
    const builder = new UndeclaredArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'repodir:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'undeclared',
      '--input',
      'results.json',
      '--format',
      'md'
    ]);
  });

  it('Build Command style scanoss.json', async function () {
    appInput.REPO_DIR = 'repodir';
    appInput.OUTPUT_FILEPATH = 'results.json';
    appInput.SCANOSS_SETTINGS = true;
    const builder = new UndeclaredArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'repodir:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'undeclared',
      '--input',
      'results.json',
      '--format',
      'md'
    ]);
  });

  it('Should build a command with --debug parameter', async function () {
    appInput.REPO_DIR = 'repodir';
    appInput.OUTPUT_FILEPATH = 'results.json';
    appInput.SCANOSS_SETTINGS = true;
    appInput.DEBUG = true;
    const builder = new UndeclaredArgumentBuilder();
    const cmd = await builder.build();
    expect(cmd).toEqual([
      'run',
      '-v',
      'repodir:/scanoss',
      RUNTIME_CONTAINER,
      'inspect',
      'undeclared',
      '--input',
      'results.json',
      '--format',
      'md',
      '--debug'
    ]);
  });
});
