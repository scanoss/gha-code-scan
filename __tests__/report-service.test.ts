import { getLicensesTable } from '../src/services/report.service';

const licenseTableTest = [
  {
    name: '1) report test',
    licenses: [{ spdxid: 'MIT', url: null, copyleft: true, count: 1 }],
    output: '| License | Copyleft | URL |\n| ------- | -------- | --- |\n| MIT | :x: |  |\n'
  },
  {
    name: '2) report test',
    licenses: [
      { spdxid: 'MIT', url: null, copyleft: null, count: 1 },
      { spdxid: 'Apache-2.0', url: null, copyleft: null, count: 1 },
      { spdxid: '0BSD', url: null, copyleft: null, count: 1 }
    ],
    output:
      '| License | Copyleft | URL |\n| ------- | -------- | --- |\n| MIT |   |  |\n| Apache-2.0 |   |  |\n| 0BSD |   |  |\n'
  },
  {
    name: '3) report test',
    licenses: [
      { spdxid: 'GPL-2.0-only', url: 'https://spdx.org/licenses/GPL-2.0-only.html', copyleft: true, count: 1 },
      { spdxid: 'GPL-2.0-or-later', url: 'https://spdx.org/licenses/GPL-2.0-or-later.html', copyleft: true, count: 1 },
      { spdxid: 'JSON', url: 'https://spdx.org/licenses/JSON.html', copyleft: null, count: 1 },
      { spdxid: 'LicenseRef-scancode-unknown-license-reference', url: null, copyleft: null, count: 1 }
    ],
    output:
      '| License | Copyleft | URL |\n| ------- | -------- | --- |\n| GPL-2.0-only | :x: | https://spdx.org/licenses/GPL-2.0-only.html |\n| GPL-2.0-or-later | :x: | https://spdx.org/licenses/GPL-2.0-or-later.html |\n| JSON |   | https://spdx.org/licenses/JSON.html |\n| LicenseRef-scancode-unknown-license-reference |   |  |\n'
  }
];

describe('Test report service', () => {
  for (const t of licenseTableTest) {
    it(`${t.name}`, () => {
      const report = getLicensesTable(t.licenses);
      expect(report).toEqual(t.output);
    });
  }
});
