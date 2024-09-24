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

import { PolicyCheck } from './policy-check';
import { CHECK_NAME } from '../app.config';
import { ScannerResults } from '../services/result.interfaces';
import { Component, getComponents } from '../services/result.service';
import * as inputs from '../app.input';
import * as core from '@actions/core';
import { parseSBOM } from '../utils/sbom.utils';
import { generateTable } from '../utils/markdown.utils';

/**
 * Verifies that all components identified in scanner results are declared in the project's SBOM.
 * The run method compares components found by the scanner against those declared in the SBOM.
 *
 * It identifies and reports undeclared components, generating a summary and detailed report of the findings.
 *
 */
export class UndeclaredPolicyCheck extends PolicyCheck {
  static policyName = 'Undeclared Policy';
  constructor() {
    super(`${CHECK_NAME}: ${UndeclaredPolicyCheck.policyName}`);
  }

  async run(scannerResults: ScannerResults): Promise<void> {
    super.initStatus();

    const nonDeclaredComponents: Component[] = [];
    let declaredComponents: Partial<Component>[] = [];

    const comps = getComponents(scannerResults);

    // get declared components
    try {
      const sbom = await parseSBOM(inputs.SBOM_FILEPATH);
      declaredComponents = sbom.components || [];
    } catch (e) {
      core.info(`Warning on policy check: ${this.checkName}. SBOM file could not be parsed (${inputs.SBOM_FILEPATH})`);
    }

    comps.forEach(c => {
      if (!declaredComponents.some(component => component.purl === c.purl)) {
        nonDeclaredComponents.push(c);
      }
    });

    const summary = this.getSummary(nonDeclaredComponents);
    let details = this.getDetails(nonDeclaredComponents);

    if (details) {
      const { id } = await this.uploadArtifact(details);
      if (id) details = await this.concatPolicyArtifactURLToPolicyCheck(details, id);
    }

    if (nonDeclaredComponents.length === 0) {
      return this.success(summary, details);
    } else {
      return this.reject(summary, details);
    }
  }

  private getSummary(components: Component[]): string {
    return components.length === 0
      ? '### :white_check_mark: Policy Pass \n #### Not undeclared components were found'
      : `### :x: Policy Fail \n #### ${components.length} undeclared component(s) were found. \n See details for more information.`;
  }

  private getDetails(components: Component[]): string | undefined {
    if (components.length === 0) return undefined;

    const headers = ['Component', 'Version', 'License'];
    const rows: string[][] = [];

    components.forEach(component => {
      const licenses = component.licenses.map(l => l.spdxid).join(' - ');
      rows.push([component.purl, component.version, licenses]);
    });

    const snippet = JSON.stringify(
      components.map(({ purl }) => ({ purl })),
      null,
      4
    );

    let content = `### Undeclared components \n ${generateTable(headers, rows)}`;
    content += `#### Add the following snippet into your \`sbom.json\` file \n \`\`\`json \n ${snippet} \n \`\`\``;

    return content;
  }

  artifactPolicyFileName(): string {
    return 'policy-check-undeclared-results.md';
  }

  getPolicyName(): string {
    return UndeclaredPolicyCheck.policyName;
  }
}
