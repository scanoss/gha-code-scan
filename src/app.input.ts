import * as core from '@actions/core';

export const REPO_DIR = process.env.GITHUB_WORKSPACE as string;
export const OUTPUT_PATH = core.getInput('output-path');
export const SBOM_INDENTIFY = core.getInput('sbom-identify');
export const SBOM_IGNORE = core.getInput('sbom-ignore');
export const API_KEY = core.getInput('api-key');
export const API_URL = core.getInput('api-url');
