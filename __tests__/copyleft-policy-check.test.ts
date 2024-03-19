import { CopyleftPolicyCheck } from '../src/policies/copyleft-policy-check';
import { CONCLUSION, PolicyCheck } from '../src/policies/policy-check';
import { ScannerResults } from '../src/services/result.interfaces';
import * as github from '@actions/github';
import { resultsMock } from './results.mock';

describe('CopyleftPolicyCheck', () => {
  let scannerResults: ScannerResults;
  let policyCheck: CopyleftPolicyCheck;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(github, 'getOctokit').mockImplementation();
    jest.spyOn(PolicyCheck.prototype, 'run').mockImplementation();
    jest.spyOn(PolicyCheck.prototype, 'finish').mockImplementation();

    policyCheck = new CopyleftPolicyCheck();
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
});
