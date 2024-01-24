import { getLicensesReport } from '../src/services/report.service';
import { ScannerResults } from '../src/services/result.interfaces';
import { getLicenses, Licenses } from '../src/services/result.service';

const licenseTableTest = [
  {
    name: '1) report test',
    licenses: [{ spdxid: 'MIT', url: null, copyleft: null }],
    output: '| License | Copyleft | URL |\n| ------- | -------- | --- |\n| MIT | :x: |  |\n'
  },
  {
    name: '2) report test',
    licenses: [
      { spdxid: 'MIT', url: null, copyleft: null },
      { spdxid: 'Apache-2.0', url: null, copyleft: null },
      { spdxid: '0BSD', url: null, copyleft: null }
    ],
    output:
      '| License | Copyleft | URL |\n| ------- | -------- | --- |\n| MIT | :x: |  |\n| Apache-2.0 | :x: |  |\n| 0BSD | :x: |  |\n'
  },
  {
    name: '3) report test',
    licenses: [
      { spdxid: 'GPL-2.0-only', url: 'https://spdx.org/licenses/GPL-2.0-only.html', copyleft: true },
      { spdxid: 'GPL-2.0-or-later', url: 'https://spdx.org/licenses/GPL-2.0-or-later.html', copyleft: true },
      { spdxid: 'JSON', url: 'https://spdx.org/licenses/JSON.html', copyleft: null },
      { spdxid: 'LicenseRef-scancode-unknown-license-reference', url: null, copyleft: null }
    ],
    output:
      '| License | Copyleft | URL |\n| ------- | -------- | --- |\n| GPL-2.0-only | :heavy_check_mark: | https://spdx.org/licenses/GPL-2.0-only.html |\n| GPL-2.0-or-later | :heavy_check_mark: | https://spdx.org/licenses/GPL-2.0-or-later.html |\n| JSON | :x: | https://spdx.org/licenses/JSON.html |\n| LicenseRef-scancode-unknown-license-reference | :x: |  |\n'
  }
];

describe('Test report service', () => {
  for (const t of licenseTableTest) {
    it(`${t.name}`, () => {
      const report = getLicensesReport(t.licenses);
      expect(report).toEqual(t.output);
    });
  }
});
