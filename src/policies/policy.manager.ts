import { CopyleftPolicyCheck } from './copyleft-policy-check';
import { PolicyCheck } from './policy-check';
import * as inputs from '../app.input';
import { UndeclaredPolicyCheck } from './undeclared-policy-check';

type PolicyRegistry = Record<string, new () => PolicyCheck>;

export class PolicyManager {
  private policyRegistry: PolicyRegistry;

  constructor(policyRegistry?: PolicyRegistry) {
    this.policyRegistry = policyRegistry || {
      copyleft: CopyleftPolicyCheck,
      undeclared: UndeclaredPolicyCheck
    };
  }

  getPolicies(policiesNames?: string[]): PolicyCheck[] {
    const pNames = policiesNames || inputs.POLICIES.split(',').map(pn => pn.trim());

    //throw error if policy does not exist
    pNames.forEach(pName => {
      if (!this.policyRegistry[pName]) throw new Error(`Policy ${pNames} does not exist`);
    });

    return pNames.map(pName => new this.policyRegistry[pName]());
  }
}

export const policyManager = new PolicyManager();
