// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2024, SCANOSS

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
