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

import * as core from '@actions/core';
import { CONCLUSION, PolicyCheck } from '../policies/policy-check';
import { generateTable } from '../utils/markdown.utils';
import { context } from '@actions/github';
import { getFirstRunId } from '../utils/github.utils';
import { licenseUtil } from '../utils/license.utils';
import { isOverMaxCharacterLimitAPI } from './github.service';
import { getLicenseSummary, License } from './license.service';
import { getComponentSummary } from './component.service';
import { DependencyTrackUploadResult } from './dependency-track-status.service';
import * as inputs from '../app.input';

/**
 * Generates a summary report for pull request comments.
 * Includes policy check results, component counts, and license statistics.
 */
export async function generatePRSummary(policies: PolicyCheck[]): Promise<string> {
  const componentSummary = await getComponentSummary();
  const licenseSummary = await getLicenseSummary();

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
  return `### SCANOSS SCAN Completed :rocket:
- **Detected components:** ${componentSummary.totalComponents}
- **Undeclared components:** ${componentSummary.undeclaredComponents}
- **Declared components:** ${componentSummary.declaredComponents}
- **Detected files:** ${componentSummary.totalFilesDetected}
- **Detected files undeclared:** ${componentSummary.totalFilesUndeclared}
- **Detected files declared:** ${componentSummary.totalFilesDeclared}
- **Licenses detected:** ${licenseSummary.detectedLicenses}
- **Licenses detected with copyleft:** ${licenseSummary.detectedLicensesWithCopyleft}
- **Policies:** ${polTxt.fail} ${polTxt.success} ${polTxt.total}

View more details on [SCANOSS Action Summary](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`;
}

/**
 * Generates and publishes a detailed job summary to GitHub Actions.
 * Creates visual reports with license distributions, component summaries, policy results, and Dependency Track upload status.
 */
export async function generateJobSummary(
  policies: PolicyCheck[],
  uploadResult?: DependencyTrackUploadResult
): Promise<void> {
  const licenseSummary = await getLicenseSummary();
  licenseSummary.licenses.sort((l1, l2) => l2.componentCount - l1.componentCount);
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
      pie += `\n"${l.spdxid}" : ${l.componentCount}`;
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

  const StatusChecksTable = async (uploadResult?: DependencyTrackUploadResult): Promise<string> => {
    if (!uploadResult) {
      return '';
    }

    const HEADERS = ['Status Check', 'Status', 'Details'];
    const ROWS: string[][] = [];

    let statusIcon: string;
    if (!uploadResult.enabled) {
      statusIcon = ':white_circle:';
    } else if (uploadResult.success) {
      statusIcon = ':white_check_mark:';
    } else {
      statusIcon = ':x:';
    }
    // Generate link to GitHub status check details
    // Use specific job ID if available, otherwise fallback to general run page
    let statusCheckUrl: string;
    if (uploadResult.checkRunId) {
      const firstRunId = await getFirstRunId();
      statusCheckUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${firstRunId}/job/${uploadResult.checkRunId}`;
    } else {
      const firstRunId = await getFirstRunId();
      statusCheckUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${firstRunId}`;
    }
    ROWS.push(['Dependency Track Upload', statusIcon, `[More Details](${statusCheckUrl})`]);

    return generateTable(HEADERS, ROWS);
  };

  const LinksTable = (uploadResult?: DependencyTrackUploadResult): string => {
    if (!uploadResult) {
      return '';
    }

    // Check if we have project link data
    if (!(uploadResult.projectId || inputs.DEPENDENCY_TRACK_PROJECT_ID) || !inputs.DEPENDENCY_TRACK_URL) {
      return '';
    }

    const HEADERS = ['Resource', 'Link'];
    const ROWS: string[][] = [];
    const projectId = uploadResult.projectId || inputs.DEPENDENCY_TRACK_PROJECT_ID;
    const projectUrl = `${inputs.DEPENDENCY_TRACK_URL}/projects/${projectId}`;

    ROWS.push(['Dependency Track Project', `[View Project](${projectUrl})`]);
    return generateTable(HEADERS, ROWS);
  };

  let licenseTable = LicensesTable(licenseSummary.licenses);
  if (isOverMaxCharacterLimitAPI(licenseTable)) {
    licenseTable = 'License table too large to display, omitted from GitHub UI due to length';
  }

  const summary = core.summary
    .addHeading('Scan Report Section', 2)
    .addHeading('Licenses', 3)
    .addCodeBlock(LicensesPie(licenseSummary.licenses), 'mermaid')
    .addRaw(licenseTable)
    .addSeparator()
    .addHeading('Policies', 3)
    .addRaw(PoliciesTable(policies));

  // Add Details section if upload result is provided
  if (uploadResult) {
    const statusChecksTable = await StatusChecksTable(uploadResult);
    const linksTable = LinksTable(uploadResult);
    if (statusChecksTable || linksTable) {
      summary.addSeparator().addHeading('Details', 3);
      if (statusChecksTable) {
        summary.addHeading('Status Checks', 4).addRaw(statusChecksTable);
      }
      if (linksTable) {
        summary.addHeading('Links', 4).addRaw(linksTable);
      }
    }
  }

  await summary.write();
}
