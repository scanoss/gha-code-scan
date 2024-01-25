import { ScannerResults } from './result.interfaces';
import { Licenses, getLicenses } from './result.service';

export function getLicensesTable(licenses: Licenses[]): string {
  let markdownTable = '| License | Copyleft | URL |\n';
  markdownTable += '| ------- | -------- | --- |\n';

  licenses.forEach(license => {
    const copyleftIcon = license.copyleft ? ':heavy_check_mark:' : ':x:';
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
