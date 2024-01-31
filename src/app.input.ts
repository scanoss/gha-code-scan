import * as core from '@actions/core';

export const POLICIES = core.getInput('policies');
export const POLICIES_HALT_ON_FAILURE = core.getInput('policies.halt_on_failure') === 'true';
export const SBOM_ENABLED = core.getInput('sbom.enabled') === 'true';
export const SBOM_FILEPATH = core.getInput('sbom.filepath');
export const SBOM_TYPE = core.getInput('sbom.type');
export const DEPENDENCIES_ENABLED = core.getInput('dependencies.enabled') === 'true';
export const API_KEY = core.getInput('api.key');
export const API_URL = core.getInput('api.url');
export const OUTPUT_FILEPATH = core.getInput('output.filepath');
export const GITHUB_TOKEN = core.getInput('github.token');
export const REPO_DIR = process.env.GITHUB_WORKSPACE as string;
