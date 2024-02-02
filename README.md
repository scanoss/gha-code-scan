# SCANOSS Action

[![GitHub Super-Linter](https://github.com/scanoss/actions-scan/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/scanoss/actions-scan/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/scanoss/actions-scan/actions/workflows/check-dist.yml/badge.svg)](https://github.com/scanoss/actions-scan/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/scanoss/actions-scan/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/scanoss/actions-scan/actions/workflows/codeql-analysis.yml)

The SCANOSS Scan Action enhances your software development process by automatically scanning your code for security
vulnerabilities and license compliance with configurable policies.

![JOB Summary](./.github/assets/img_job_summary.jpg)

## Usage

To begin using this action, you'll need to set up a basic GitHub workflow and define a job within it:

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

| **Parameter**            | **Description**                                                                    | **Required** | **Default**                         | 
|--------------------------|------------------------------------------------------------------------------------|--------------|-------------------------------------|
| output.filepath          | Scan output file name.                                                             | Optional     | `results.json`                      |
| sbom.enabled             | Enable or disable scanning based on the SBOM file                                  | Optional     | `true`                              |
| sbom.filepath            | Filepath of the SBOM file to be used for scanning                                  | Optional     | `sbom.json`                         |
| sbom.type                | Type of SBOM operation: either 'identify' or 'ignore                               | Optional     | `identify`                          |
| dependencies.enabled     | Option to enable or disable scanning of dependencies.                              | Optional     | `true`                              |
| policies                 | List of policies separated by commas, options available are: copyleft, undeclared. | Optional     | `true`                              |
| policies.halt_on_failure | Halt check on policy failure. If set to false checks will not fail.                | Optional     | `true`                              |
| api.url                  | SCANOSS API URL                                                                    | Optional     | `https://osskb.org/api/scan/direct` |
| api.key                  | SCANOSS API Key token                                                              | Optional     | -                                   |

### Action Output Parameters

In addition to the automatically generated reports, the action also outputs the raw scan data, enabling you to integrate
the output into your custom workflow

| **Parameter**       | **Description**          |
|---------------------|--------------------------|
| result-filepath     | Scanner results filepath |  
| stdout-scan-command | Scanner command output   |

## Policy Checks (wip)

The SCANOSS Scan action includes two configurable policies:

1. Copyleft: This policy checks if any component or code snippet is associated with a copyleft license. If such a
   license is detected, the pull request (PR) is rejected.

2. Undeclared: This policy compares the components detected in the repository against those declared in an sbom.json
   file (customizable through the sbom.filepath parameter). If there are undeclared components, the PR is rejected.

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
          policies: copyleft, undeclared  #NOTE: undeclared policy requires a sbom.json in the project root
          dependencies.enabled: true
          # api-url: <YOUR_API_URL>
          # api-key: <YOUR_API_KEY>


      - name: Print stdout scan command
        run: echo "${{ steps.scanoss-scan-action.outputs.stdout-scan-command }}"

      - name: Print Results
        run: cat "${{ steps.scanoss-scan-action.outputs.result-filepath }}"
```