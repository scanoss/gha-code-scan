import path from 'path';
import { getLicenseSummary } from '../src/services/license.service';

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
    const summary = await getLicenseSummary();
    expect(summary.detectedLicenses).toEqual(3);
    expect(summary.detectedLicensesWithCopyleft).toEqual(1);
    expect(summary.licenses.length).toEqual(3);
  }, 10000);
});
