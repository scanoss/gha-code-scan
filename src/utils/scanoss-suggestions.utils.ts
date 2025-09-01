// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2024, SCANOSS

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
 */

import * as core from '@actions/core';
import * as fs from 'fs';
import { CommitSuggestion } from './github.utils';
import { SETTINGS_FILE_PATH } from '../app.input';

/**
 * Interface representing an undeclared component found in scan results
 */
interface UndeclaredComponent {
  name: string;
  version?: string;
  purl: string;
}

/**
 * Interface representing the scanoss.json file structure
 */
interface ScanossConfig {
  bom: {
    include: {
      purl: string;
    }[];
  };
}

/**
 * Parses undeclared components from the policy check output
 * Extracts components that need to be added to scanoss.json
 */
export function parseUndeclaredComponents(policyOutput: string): UndeclaredComponent[] {
  const components: UndeclaredComponent[] = [];

  core.debug(`Parsing policy output for undeclared components. Output length: ${policyOutput.length} chars`);
  core.debug(`First 500 chars of output: ${policyOutput.substring(0, 500)}`);

  // Look for lines in the markdown table format
  // Example: "| pkg:github/scanoss/scanner.c | GPL-2.0-only |"
  const componentRegex = /^\s*\|\s*([^|]+?)\s*\|\s*[^|]*\s*\|/gm;

  let match;
  while ((match = componentRegex.exec(policyOutput)) !== null) {
    const [fullMatch, purl] = match;
    
    // Skip header rows
    if (purl.includes('Component') || purl.includes('-')) {
      continue;
    }
    
    const cleanPurl = purl.trim();
    const name = cleanPurl.split('/').pop() || cleanPurl; // Get the last part for display name

    core.debug(
      `Found undeclared component match: "${fullMatch}" -> purl: "${cleanPurl}", name: "${name}"`
    );

    components.push({
      name,
      purl: cleanPurl
    });
  }

  core.info(`Parsed ${components.length} undeclared components from policy output`);
  if (components.length === 0) {
    core.warning(
      'No undeclared components found in policy output. Check if the regex pattern matches the actual output format.'
    );
  }
  return components;
}

/**
 * Generates commit suggestions to add undeclared components to scanoss.json
 */
export function generateScanossJsonSuggestions(undeclaredComponents: UndeclaredComponent[]): CommitSuggestion[] {
  if (undeclaredComponents.length === 0) {
    core.debug('No undeclared components found, skipping suggestion generation');
    return [];
  }

  const scanossJsonPath = SETTINGS_FILE_PATH || 'scanoss.json';
  core.debug(`Generating suggestions for ${undeclaredComponents.length} components to ${scanossJsonPath}`);

  try {
    // Create the updated configuration
    const updatedConfig: ScanossConfig = { bom: { include: [] } };
    let fileContent = '';

    // Check if scanoss.json exists and read its content
    if (fs.existsSync(scanossJsonPath)) {
      core.debug(`Reading existing ${scanossJsonPath}`);
      fileContent = fs.readFileSync(scanossJsonPath, 'utf8');
      try {
        const existingConfig = JSON.parse(fileContent);
        updatedConfig.bom = existingConfig.bom || { include: [] };
        if (!updatedConfig.bom.include) {
          updatedConfig.bom.include = [];
        }
      } catch (error) {
        core.warning(`Failed to parse existing ${scanossJsonPath}: ${error}`);
        updatedConfig.bom = { include: [] };
      }
    } else {
      core.debug(`${scanossJsonPath} does not exist, will suggest creating it`);
    }

    // Add undeclared components to the include list
    const componentsToAdd = [];
    for (const component of undeclaredComponents) {
      // Check if component is already declared
      const alreadyExists = updatedConfig.bom.include.some(existing => existing.purl === component.purl);

      if (!alreadyExists) {
        updatedConfig.bom.include.push({ purl: component.purl });
        componentsToAdd.push(component);
      }
    }

    if (componentsToAdd.length === 0) {
      core.info('All undeclared components are already in scanoss.json');
      return [];
    }

    // Generate the new file content
    const newContent = JSON.stringify(updatedConfig, null, 2);

    const suggestions: CommitSuggestion[] = [];
    const componentNames = componentsToAdd.map(c => c.name).join(', ');

    // For GitHub PR reviews, we need to use line 1 for new files or the last line for existing files
    // GitHub's PR review API has specific requirements about which lines can be commented on
    suggestions.push({
      path: scanossJsonPath,
      line: 1, // Always use line 1 - GitHub will handle this appropriately
      body: fs.existsSync(scanossJsonPath)
        ? `📦 Add undeclared component(s): **${componentNames}** to resolve policy violations.\n\nClick "Commit suggestion" to automatically add these components to your scanoss.json file.`
        : `📦 Create scanoss.json with ${componentsToAdd.length} undeclared component(s): **${componentNames}** to resolve policy violations.\n\nClick "Commit suggestion" to create the configuration file.`,
      suggestedFix: newContent
    });

    core.info(`Generated ${suggestions.length} commit suggestions for ${componentsToAdd.length} undeclared components`);
    core.debug(`Suggestion details: ${JSON.stringify(suggestions, null, 2)}`);
    return suggestions;
  } catch (error) {
    core.error(`Failed to generate scanoss.json suggestions: ${error}`);
    return [];
  }
}

/**
 * Creates commit suggestions for undeclared components found in policy output
 */
export function createUndeclaredComponentSuggestions(policyOutput: string): CommitSuggestion[] {
  const undeclaredComponents = parseUndeclaredComponents(policyOutput);
  return generateScanossJsonSuggestions(undeclaredComponents);
}
