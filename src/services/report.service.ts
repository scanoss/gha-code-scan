import { Licenses } from './result.service';

export function getLicensesReport(licenses: Licenses[]): string {
  let markdownTable = '| License | Copyleft | URL |\n';
  markdownTable += '| ------- | -------- | --- |\n';

  licenses.forEach(license => {
    const copyleftIcon = license.copyleft ? ':heavy_check_mark:' : ':x:';
    markdownTable += `| ${license.spdxid} | ${copyleftIcon} | ${license.url || ''} |\n`;
  });

  return markdownTable;
}
