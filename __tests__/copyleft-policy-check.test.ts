import { CopyleftPolicyCheck } from '../src/policies/copyleft-policy-check';
import { CONCLUSION, PolicyCheck } from '../src/policies/policy-check';
import { ScannerResults } from '../src/services/result.interfaces';
import { resultsMock } from './results.mock';

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

describe('CopyleftPolicyCheck', () => {
  let scannerResults: ScannerResults;
  let policyCheck: CopyleftPolicyCheck;

  beforeEach(() => {
    jest.clearAllMocks();

    policyCheck = new CopyleftPolicyCheck();
    jest.spyOn(PolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(PolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(PolicyCheck.prototype, 'finish').mockImplementation();
  });

  it('should pass the policy check when no copyleft components are found', async () => {
    scannerResults = JSON.parse(resultsMock[0].content);
    await policyCheck.run(scannerResults);
    expect(policyCheck.conclusion).toEqual(CONCLUSION.Success);
  });

  it('should fail the policy check when copyleft components are found', async () => {
    scannerResults = JSON.parse(resultsMock[2].content);
    await policyCheck.run(scannerResults);
    expect(policyCheck.conclusion).toEqual(CONCLUSION.Neutral);
  });

  it('should fail the policy check when copyleft dependencies are found', async () => {
    scannerResults = JSON.parse(resultsMock[4].content);
    await policyCheck.run(scannerResults);
    // NEUTRAL is the same as failure in this context.  See inputs.POLICIES_HALT_ON_FAILURE. (Default FALSE)
    expect(policyCheck.conclusion).toEqual(CONCLUSION.Neutral);
  });

  it('should pass the copyleft policy check', async () => {
    scannerResults = JSON.parse(resultsMock[5].content);
    await policyCheck.run(scannerResults);
    expect(policyCheck.conclusion).toEqual(CONCLUSION.Success);
  });
});
