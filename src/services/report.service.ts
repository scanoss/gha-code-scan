import { ScannerResults } from './result.interfaces';
import { License, getLicenses } from './result.service';
import * as core from '@actions/core';
import { SummaryTableRow } from '@actions/core/lib/summary';

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

export async function generateJobSummary(scannerResults: ScannerResults): Promise<void> {
  const licenses = getLicenses(scannerResults);
  licenses.sort((l1, l2) => l2.count - l1.count);

  const genPie = (licenses: License[]): string => {
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

  const genTable = (licenses: License[]): SummaryTableRow[] => {
    const rows: SummaryTableRow[] = [];

    rows.push([
      { data: 'License', header: true },
      { data: 'Copyleft', header: true },
      { data: 'URL', header: true }
    ]);

    licenses.forEach(l => {
      const copyleftIcon = l.copyleft ? ':x:' : ' ';
      rows.push([l.spdxid, copyleftIcon, `${l.url || ''}`]);
    });
    return rows;
  };

  await core.summary
    .addHeading('Scan Report Section')
    .addCodeBlock(genPie(licenses), 'mermaid')
    .addRaw('<div align="center">')
    .addTable(genTable(licenses))
    .addRaw('</div>')
    .write();
}
