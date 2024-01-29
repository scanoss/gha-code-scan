# SCANOSS Action

[![GitHub Super-Linter](https://github.com/scanoss/actions-scan/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/scanoss/actions-scan/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/scanoss/actions-scan/actions/workflows/check-dist.yml/badge.svg)](https://github.com/scanoss/actions-scan/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/scanoss/actions-scan/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/scanoss/actions-scan/actions/workflows/codeql-analysis.yml)


The SCANOSS Scan Action enhances your software development workflow by automatically scanning for security vulnerabilities and license compliance issues.

![JOB Summary](./.github/assets/img_job_summary.jpg)


## Usage
To begin using this action, you'll need to set up a basic GitHub workflow and define a JOB within it:


```yaml
name: Example Workflow with SCANOSS

on:
  pull_request:
  push:
    branches:
      - '*'

permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  scanoss-analysis:
    name: SCANOSS Analysis
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      id: checkout
      uses: actions/checkout@v4

    - name: Run SCANOSS analysis
      id: scanoss-scan-action
      uses: scanoss/actions-scan@main
```

For example workflow runs, check out the
[Actions Tab](https://github.com/scanoss/actions-scan/actions)! :rocket:

### Action Input Parameters

| **Parameter** | **Description**                               | **Required** | **Default** | 
|--------------|------------------------------------------------|--------------|-------------|
| github-token | Your GitHub token | Optional     |  `${{ github.token }}` | 
| output-path  | Output result file name. | Optional | `results.json` |
| sbom-identify  | Scan and identify components in SBOM file | Optional     | - |
| sbom-ignore  | Ignore components specified in the SBOM file | Optional     | - |
| api-url  | SCANOSS API URL | Optional     | `https://osskb.org/api/scan/direct` |
| api-key  | SCANOSS API Key token | Optional     | - |
| with-dependencies  | Scan dependencies | Optional     | `false` |

### Action Output Parameters
In addition to the automatically generated reports, the action also outputs the raw scan data, enabling you to integrate the output into your custom workflow

| **Parameter** | **Description**                                |
|---------------|------------------------------------------------|
| result-filepath | Scanner results filepath |  
| stdout-scan-command  | Scanner command output |


## Policy Checks (wip)
Once the workflow is set up, the SCANOSS Scan action will execute checks using some "out of the box" policies. The workflow will fail if any of the policies are not met.

In this scenario, a classic policy is executed that will fail if copyleft licenses are found within the results:

![GH Checks](./.github/assets/img_checks.png)


Additionally, if it is a Pull Request, a comment with a summary of the report will be automatically generated.

![Comments on PR](./.github/assets/img_pr_comment.png)


## Full example

```yaml
name: Full Example Workflow with SCANOSS

on:
  pull_request:
  push:
    branches:
      - '*'

permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  scanoss-analysis:
    name: SCANOSS Analysis
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      id: checkout
      uses: actions/checkout@v4

    - name: Run SCANOSS analysis
      id: scanoss-scan-action
      uses: scanoss/actions-scan@main
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        output-path: example_results.json
        sbom-ignore: sbom.json
        # api-url: <YOUR_API_URL>
        # api-key: <YOUR_API_KEY>
        with-dependencies: true

      - name: Print stdout scan command
        run: echo "${{ steps.scanoss-scan-action.outputs.stdout-scan-command }}"

      - name: Print Results
        run: cat "${{ steps.scanoss-scan-action.outputs.result-filepath }}"
```