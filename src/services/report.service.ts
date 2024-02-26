import { ScannerResults } from './result.interfaces';
import { License, getLicenses } from './result.service';
import * as core from '@actions/core';
import { CONCLUSION, PolicyCheck } from '../policies/policy-check';
import { generateTable } from '../utils/markdown.utils';
export function getLicensesTable(licenses: License[]): string {
  let markdownTable = '| License | Copyleft | URL |\n';
  markdownTable += '| ------- | -------- | --- |\n';

  licenses.forEach(license => {
    const copyleftIcon = license.copyleft ? ':x:' : ' ';
    markdownTable += `| ${license.spdxid} | ${copyleftIcon} | ${license.url || ''} |\n`;
  });

  return markdownTable;
}

export function generateSummary(scannerResults: ScannerResults): string {
  const licenses = getLicenses(scannerResults);
  const licensesReport = getLicensesTable(licenses);

  const content = `
  ## SCANOSS Summary :rocket:
  ### Licenses detected: ${licenses.length}

  ${licensesReport}
  `;

  return content;
}

export async function generateJobSummary(scannerResults: ScannerResults, policies: PolicyCheck[]): Promise<void> {
  const licenses = getLicenses(scannerResults);
  licenses.sort((l1, l2) => l2.count - l1.count);

  const LicensesPie = (licenses: License[]): string => {
    let pie = `
    %%{init: { "pie" : {"textPosition": "0.75"} ,"themeVariables": {"pieSectionTextSize": "0px", 
    "pie1": "#E8B34B", "pie1":"#E8B34B","pie2":"#E22C2C","pie3":"#5754D0",
    "pie4":"#9F69C0","pie5":"#FE7F10","pie6":"#E56399","pie7":"#E637BF",
    "pie8":"#474647","pie9":"#153243","pie10":"#2DE1C2","pie11":"#F05365",
    "pie12":"#A2D729"}} }%%
    pie showData
      title Licenses chart`;

    licenses.forEach(l => {
      pie += `\n"${l.spdxid}" : ${l.count}`;
    });
    return pie;
  };

  const LicensesTable = (licenses: License[]): string => {
    const HEADERS: string[] = ['License', 'Copyleft', 'URL'];
    const ROWS: string[][] = [];

    licenses.forEach(l => {
      const copyleftIcon = l.copyleft ? ':x:' : ' ';
      ROWS.push([l.spdxid, copyleftIcon, `${l.url || ''}`]);
    });
    return generateTable(HEADERS, ROWS);
  };

  const PoliciesTable = (policies: PolicyCheck[]): string => {
    const HEADERS = ['Policy', 'Status', 'Details'];
    const ROWS: string[][] = [];

    policies.forEach(p => {
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
