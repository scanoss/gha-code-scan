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
    remove?: {
      purl: string;
    }[];
  };
}

/**
 * Interface for insertion point results
 */
interface InsertionPoint {
  targetLineNumber: number;
  replacementText: string;
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
      core.debug(`Raw file content: ${fileContent}`);
      
      try {
        // Try to clean up malformed JSON (like extra opening braces, missing commas)
        let cleanedContent = fileContent.trim();
        
        // Remove extra opening braces at the start
        while (cleanedContent.startsWith('{{')) {
          cleanedContent = cleanedContent.substring(1);
          core.debug(`Removed extra opening brace, content now: ${cleanedContent.substring(0, 100)}...`);
        }
        
        // Fix common JSON issues like missing commas between properties
        core.debug(`Before comma fixes: ${cleanedContent.substring(0, 200)}...`);
        
        // Look for pattern: ]\s*"property" and add comma: ],\s*"property" 
        const beforeArrayFix = cleanedContent;
        cleanedContent = cleanedContent.replace(/]\s*\n\s*"([^"]+)":/g, '],\n    "$1":');
        if (cleanedContent !== beforeArrayFix) {
          core.debug(`Fixed missing comma after array`);
        }
        
        // Also fix missing commas after closing braces: }\s*"property"
        const beforeBraceFix = cleanedContent;
        cleanedContent = cleanedContent.replace(/}\s*\n\s*"([^"]+)":/g, '},\n    "$1":');
        if (cleanedContent !== beforeBraceFix) {
          core.debug(`Fixed missing comma after brace`);
        }
        
        core.debug(`After comma fixes: ${cleanedContent.substring(0, 200)}...`);
        
        const existingConfig = JSON.parse(cleanedContent);
        updatedConfig.bom = existingConfig.bom || { include: [] };
        if (!updatedConfig.bom.include) {
          updatedConfig.bom.include = [];
        }
        
        core.debug(`Successfully parsed existing config with ${updatedConfig.bom.include.length} components`);
        updatedConfig.bom.include.forEach((comp, idx) => {
          core.debug(`Existing component ${idx + 1}: ${comp.purl}`);
        });
        
      } catch (error) {
        core.warning(`Failed to parse existing ${scanossJsonPath}: ${error}`);
        core.debug(`Failed content was: ${fileContent}`);
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
      
      core.debug(`Checking component: ${component.purl}`);
      core.debug(`Already exists: ${alreadyExists}`);
      
      if (!alreadyExists) {
        updatedConfig.bom.include.push({ purl: component.purl });
        componentsToAdd.push(component);
        core.debug(`Added component: ${component.purl}`);
      } else {
        core.debug(`Skipped already declared component: ${component.purl}`);
      }
    }

    if (componentsToAdd.length === 0) {
      core.info('All undeclared components are already in scanoss.json');
      return [];
    }

    const suggestions: CommitSuggestion[] = [];
    const componentNames = componentsToAdd.map(c => c.name).join(', ');

    if (fs.existsSync(scanossJsonPath)) {
      // Smart insertion: find the right place to add components
      try {
        const lines = fileContent.split('\n');
        
        // Generate suggestion 1: Add to include array
        const includeInsertion = findIncludeInsertionPoint(lines, componentsToAdd);
        if (includeInsertion.targetLineNumber > 0) {
          suggestions.push({
            path: scanossJsonPath,
            line: includeInsertion.targetLineNumber,
            body: `📦 **Option 1: Include Components** - Add undeclared component(s): **${componentNames}** to resolve policy violations.\n\nThis will add the components to your include array to allow them.`,
            suggestedFix: includeInsertion.replacementText
          });
        }
        
        // Generate suggestion 2: Add to remove array
        const removeInsertion = findRemoveInsertionPoint(lines, componentsToAdd);
        if (removeInsertion.targetLineNumber > 0) {
          suggestions.push({
            path: scanossJsonPath,
            line: removeInsertion.targetLineNumber,
            body: `🚫 **Option 2: Remove Components** - Add undeclared component(s): **${componentNames}** to remove list.\n\nThis will add the components to your remove array to explicitly exclude them.`,
            suggestedFix: removeInsertion.replacementText
          });
        }
        
        if (suggestions.length === 0) {
          core.warning('Could not find appropriate insertion points in scanoss.json');
        }
        
      } catch (parseError) {
        core.warning(`Could not parse file for smart insertion: ${parseError}`);
      }
    } else {
      // For new files, create two options
      
      // Option 1: File with include array
      const includeContent = JSON.stringify(updatedConfig, null, 2);
      suggestions.push({
        path: scanossJsonPath,
        line: 1,
        body: `📦 **Option 1: Include Components** - Create scanoss.json with ${componentsToAdd.length} component(s) in include array.\n\nThis will allow the undeclared components.`,
        suggestedFix: includeContent
      });
      
      // Option 2: File with remove array
      const removeConfig = {
        bom: {
          include: [],
          remove: componentsToAdd.map(c => ({ purl: c.purl }))
        }
      };
      const removeContent = JSON.stringify(removeConfig, null, 2);
      suggestions.push({
        path: scanossJsonPath,
        line: 1,
        body: `🚫 **Option 2: Remove Components** - Create scanoss.json with ${componentsToAdd.length} component(s) in remove array.\n\nThis will explicitly exclude the undeclared components.`,
        suggestedFix: removeContent
      });
    }

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

/**
 * Finds the insertion point for adding components to the include array
 */
function findIncludeInsertionPoint(lines: string[], componentsToAdd: UndeclaredComponent[]): InsertionPoint {
  let targetLineNumber = -1;
  let replacementText = '';
  
  // Find the include array specifically
  let includeStartIndex = -1;
  let includeEndIndex = -1;
  
  // First, locate the include array boundaries
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Found start of include array
    if (line.includes('"include":') && line.includes('[')) {
      includeStartIndex = i;
      
      // If it's a one-liner like "include": []
      if (line.includes(']')) {
        includeEndIndex = i;
        break;
      }
    }
    
    // Found end of include array (if we already found the start)
    if (includeStartIndex >= 0 && line === ']') {
      includeEndIndex = i;
      break;
    }
  }
  
  if (includeStartIndex >= 0 && includeEndIndex >= 0) {
    // Check if include array is empty
    const isEmpty = includeStartIndex === includeEndIndex || 
                   (includeEndIndex - includeStartIndex === 1);
    
    if (isEmpty) {
      // Empty include array, replace the ]
      targetLineNumber = includeEndIndex + 1; // Line numbers are 1-based
      const newComponents = componentsToAdd.map(c => 
        `      {\n        "purl": "${c.purl}"\n      }`
      ).join(',\n');
      replacementText = `[\n${newComponents}\n    ]`;
    } else {
      // Find last component in include array
      for (let i = includeEndIndex - 1; i > includeStartIndex; i--) {
        const line = lines[i].trim();
        if (line === '}') {
          const previousLine = lines[i - 1].trim();
          if (previousLine.endsWith('"')) {
            // Found last component in include array
            targetLineNumber = i + 1;
            const newComponents = componentsToAdd.map(c => 
              `      {\n        "purl": "${c.purl}"\n      }`
            ).join(',\n');
            replacementText = `},\n${newComponents}`;
            break;
          }
        }
      }
    }
  }
  
  return { targetLineNumber, replacementText };
}

/**
 * Finds the insertion point for adding components to the remove array
 */
function findRemoveInsertionPoint(lines: string[], componentsToAdd: UndeclaredComponent[]): InsertionPoint {
  let targetLineNumber = -1;
  let replacementText = '';
  
  // Look for existing remove array
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    
    // Look for closing brace of last component in remove array
    if (line === '}' && i > 0) {
      const previousLine = lines[i - 1].trim();
      if (previousLine.endsWith('"')) {
        // Check if we're in a remove array context
        let isInRemoveArray = false;
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].includes('"remove":')) {
            isInRemoveArray = true;
            break;
          }
          if (lines[j].includes('"include":')) {
            break; // Found include first, so we're not in remove
          }
        }
        
        if (isInRemoveArray) {
          // Found last component in remove array, add comma and new components
          targetLineNumber = i + 1;
          const newComponents = componentsToAdd.map(c => 
            `      {\n        "purl": "${c.purl}"\n      }`
          ).join(',\n');
          replacementText = `},\n${newComponents}`;
          break;
        }
      }
    }
    
    // Look for empty remove array: "remove": []
    if (line === ']' && i > 0) {
      const previousLine = lines[i - 1].trim();
      if (previousLine.includes('"remove":') && previousLine.includes('[')) {
        // Found empty remove array, replace with components
        targetLineNumber = i + 1;
        const newComponents = componentsToAdd.map(c => 
          `      {\n        "purl": "${c.purl}"\n      }`
        ).join(',\n');
        replacementText = `[\n${newComponents}\n    ]`;
        break;
      }
    }
  }
  
  // If no remove array found, create one after include array
  if (targetLineNumber === -1) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      // Look for end of include array
      if (line === ']' && i > 0) {
        const previousLine = lines[i - 1].trim();
        if (previousLine.endsWith('}') || previousLine.includes('"include":')) {
          // Found end of include array, add remove array after it
          targetLineNumber = i + 1;
          const newComponents = componentsToAdd.map(c => 
            `      {\n        "purl": "${c.purl}"\n      }`
          ).join(',\n');
          replacementText = `],\n    "remove": [\n${newComponents}\n    ]`;
          break;
        }
      }
    }
  }
  
  return { targetLineNumber, replacementText };
}
