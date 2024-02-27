import { ScannerResults } from './result.interfaces';
import { License, getComponents, getLicenses } from './result.service';
import * as core from '@actions/core';
import { CONCLUSION, PolicyCheck } from '../policies/policy-check';
import { generateTable } from '../utils/markdown.utils';
import { context } from '@actions/github';

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
    const ROWS: string[][] = [];

    items.forEach(l => {
      const copyleftIcon = l.copyleft ? ':x:' : ' ';
      ROWS.push([l.spdxid, copyleftIcon, `${l.url || ''}`]);
    });
    return generateTable(HEADERS, ROWS);
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
