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

import { ScannerResults } from './result.interfaces';
import { License, getComponents, getLicenses } from './result.service';
import * as core from '@actions/core';
import { CONCLUSION, PolicyCheck } from '../policies/policy-check';
import { generateTable } from '../utils/markdown.utils';
import { context } from '@actions/github';
import { licenseUtil } from '../utils/license.utils';

export function generatePRSummary(scannerResults: ScannerResults, policies: PolicyCheck[]): string {
  const components = getComponents(scannerResults);
  const licenses = getLicenses(scannerResults);

  const polCount = {
    total: policies.length,
    success: policies.filter(p => p.conclusion === CONCLUSION.Success).length,
    fail: policies.filter(p => p.conclusion !== CONCLUSION.Success).length
  };

  const polTxt = {
    total: `(${polCount.total} total)`,
    success: polCount.success ? `:white_check_mark: ${polCount.success} pass` : '',
    fail: polCount.fail ? `:x: ${polCount.fail} fail` : ''
  };

  const content = `
  ### SCANOSS SCAN Completed :rocket:
  - **Components detected:** ${components.length}
  - **Licenses detected:** ${licenses.length}
  - **Policies:** ${polTxt.fail} ${polTxt.success} ${polTxt.total}

  View more details on [SCANOSS Action Summary](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})
  `;

  return content;
}

export async function generateJobSummary(scannerResults: ScannerResults, policies: PolicyCheck[]): Promise<void> {
  const licenses = getLicenses(scannerResults);
  licenses.sort((l1, l2) => l2.count - l1.count);

  const LicensesPie = (items: License[]): string => {
    let pie = `
    %%{init: { "pie" : {"textPosition": "0.75"} ,"themeVariables": {"pieSectionTextSize": "0px", 
    "pie1": "#E8B34B", "pie1":"#E8B34B","pie2":"#E22C2C","pie3":"#5754D0",
    "pie4":"#9F69C0","pie5":"#FE7F10","pie6":"#E56399","pie7":"#E637BF",
    "pie8":"#474647","pie9":"#153243","pie10":"#2DE1C2","pie11":"#F05365",
    "pie12":"#A2D729"}} }%%
    pie showData
      title Licenses chart`;

    items.forEach(l => {
      pie += `\n"${l.spdxid}" : ${l.count}`;
    });
    return pie;
  };

  const LicensesTable = (items: License[]): string => {
    const HEADERS: string[] = ['License', 'Copyleft', 'URL'];
    const centeredColumns = [1];
    const ROWS: string[][] = [];

    items.forEach(l => {
      const copyleftIcon = l.copyleft ? 'YES' : 'NO';
      ROWS.push([l.spdxid, copyleftIcon, `${licenseUtil.getOSADL(l?.spdxid) || ''}`]);
    });
    return generateTable(HEADERS, ROWS, centeredColumns);
  };

  const PoliciesTable = (items: PolicyCheck[]): string => {
    const HEADERS = ['Policy', 'Status', 'Details'];
    const ROWS: string[][] = [];

    items.forEach(p => {
      const statusIcon = p.conclusion === CONCLUSION.Success ? ':white_check_mark:' : ':x:';
      ROWS.push([p.name, statusIcon, `[More Details](${p.url})`]);
    });

    return generateTable(HEADERS, ROWS);
  };

  await core.summary
    .addHeading('Scan Report Section', 2)
    .addHeading('Licenses', 3)
    .addCodeBlock(LicensesPie(licenses), 'mermaid')
    .addRaw(LicensesTable(licenses))
    .addSeparator()
    .addHeading('Policies', 3)
    .addRaw(PoliciesTable(policies))
    .write();
}
