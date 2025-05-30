import { CONCLUSION, PolicyCheck } from '../src/policies/policy-check';
import { UndeclaredPolicyCheck } from '../src/policies/undeclared-policy-check';
import path from 'path';
import { UploadResponse } from '@actions/artifact';

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
        update: jest.fn().mockResolvedValue({})
      }
    }
  })
}));

describe('UndeclaredPolicyCheck', () => {
  let undeclaredPolicyCheck: UndeclaredPolicyCheck;
  const appInput = jest.requireMock('../src/app.input');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(UndeclaredPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve<UploadResponse>({
        artifactName: 'test-artifact',
        artifactItems: ['test-file.json'],
        size: 1024,
        failedItems: []
      });
    });
    jest.spyOn(PolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(UndeclaredPolicyCheck.prototype, 'updateCheck').mockImplementation();

    undeclaredPolicyCheck = new UndeclaredPolicyCheck();
  }, 30000);

  it('should pass the policy check when undeclared components are not found', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'empty-results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;

    await undeclaredPolicyCheck.run();
    expect(undeclaredPolicyCheck.conclusion).toEqual(CONCLUSION.Success);
  }, 30000);

  it('should fail the policy check when undeclared components are found', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;

    await undeclaredPolicyCheck.run();
    expect(undeclaredPolicyCheck.conclusion).toEqual(CONCLUSION.Neutral);
  }, 30000);
});
