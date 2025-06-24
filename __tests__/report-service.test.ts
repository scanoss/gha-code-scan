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
  - **Detected files:** 3
  - **Detected files undeclared:** 3
  - **Detected files declared:** 0
  - **Licenses detected:** 3
  - **Licenses detected with copyleft:** 1
  - **Policies:**   (0 total)

  View more details on [SCANOSS Action Summary](https://github.com/x/y/actions/runs/0)
  `;
    expect(report).toEqual(expectedOutput);
  }, 50000);
});
