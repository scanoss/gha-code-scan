# SCANOSS GitHub Actions Code Scan: Monorepo Setup Guide

## Introduction

This guide explains how to configure SCANOSS code scanning for monorepos where you want to scan specific subdirectories independently.

## Overview

Instead of scanning the entire repository on every change, you can create separate workflows that:
- Trigger only when specific paths are modified
- Scan only the relevant subdirectory
- Run independently with their own results

## Architecture

The setup uses a **reusable workflow** pattern:
1. **Base workflow** (`scanoss.yml`) - The reusable workflow that performs the actual scanning
2. **Trigger workflows** (e.g., `scanoss-component1.yml`, `scanoss-component2.yml`) - Individual workflows that call the base workflow with specific parameters

## Setup Instructions

### Step 1: Modify Your Existing scanoss.yml

Add these sections to make it reusable:

  ```yaml
  on:
    workflow_call:
      inputs:
        FILTERED_PATH:
          description: 'Directory to scan'
          required: true
          type: string
      secrets:
        SC_API_KEY:
          required: false
        DT_API_KEY:
          required: false
```

  Then update the scanPath parameter to use the input:

```yaml
        - name: Run SCANOSS Code Scan
          uses: scanoss/code-scan-action@v1.4.0
          with:
            scanPath: ${{ inputs.FILTERED_PATH }}
            # ... other parameters
```

### Step 2: Create Trigger Workflows

Create separate workflow files for each component:

`.github/workflows/scanoss-component1.yml`:
```yaml
name: SCANOSS - Component1

on:
  push:
    paths:
      - 'component1/**'                            <-- 
  
  # OR

  pull_request:
    paths:
      - 'component1/**'                            <--

jobs:
  call-scanoss-workflow:
    uses: ./.github/workflows/scanoss.yml  # Exact path to scanoss.yml inside your repo
    with:
      FILTERED_PATH: 'component1'                   <-- Remove /** and add here
    secrets: inherit
```

`.github/workflows/scanoss-component2.yml`:
```yaml
name: SCANOSS - Component2

on:
  push:
    paths:
      - 'component2/**'                            <--

  # OR

  pull_request:
    paths:
      - 'component2/**'                            <--

jobs:
  call-scanoss-workflow:
    uses: ./.github/workflows/scanoss.yml  # Exact path to scanoss.yml inside your repo
    with:
      FILTERED_PATH: 'component2'                   <-- Remove /** and add here
    secrets: inherit
```

## Example Structure

my-monorepo/
├── .github/workflows/
│   ├── scanoss.yml              # Reusable workflow
│   ├── scanoss-component1.yml   # Triggers on component1/**
│   ├── scanoss-component2.yml   # Triggers on component2/**
│   └── scanoss-common.yml       # Triggers on common/**
├── component1/
├── component2/
└── common/

## Key Points

- Path filters: Only trigger workflows when specific directories change
- secrets: inherit: Required to pass repository secrets to the reusable workflow
- Local workflow reference: for example ./.github/workflows/scanoss.yml (no branch name)
- Secrets are optional: SC_API_KEY and DT_API_KEY (dt required if Dependency Track is enabled)

## Benefits

- Faster CI/CD - only scan affected components
- Clearer results - each component has its own scan
- Parallel execution - multiple components scan simultaneously
- Reduced noise - PRs only show results for changed components
