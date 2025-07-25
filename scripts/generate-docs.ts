#!/usr/bin/env ts-node
import { Command } from 'commander';
import { buildCmd } from '../src/cli';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate markdown documentation for all commands in the CLI
 */
function generateCommandDocs(command: Command, level = 1): string {
  let docs = '';
  
  // Skip the root command if it's the first level
  if (level > 1 || command.name() !== 'octomind-cli') {
    const prefix = '#'.repeat(level);
    docs += `${prefix} ${command.name()}\n\n`;
    
    if (command.description()) {
      docs += `${command.description()}\n\n`;
    }
    
    // Add usage information
    const usage = command.usage();
    if (usage) {
      docs += `**Usage:** \`${command.name()} ${usage}\`\n\n`;
    }
    
    // Add options
    const options = command.options;
    if (options && options.length > 0) {
      docs += '### Options\n\n';
      docs += '| Option | Description | Required | Default |\n';
      docs += '|--------|-------------|----------|--------|\n';
      
      options.forEach(option => {
        const flags = option.flags;
        const description = option.description || '';
        const defaultValue = option.defaultValue !== undefined ? String(option.defaultValue) : '';
        const requiredText = option.required ? 'Yes' : 'No';
        
        docs += `| \`${flags}\` | ${description} | ${requiredText} | ${defaultValue} |\n`;
      });
      
      docs += '\n';
    }
  }
  
  // Process subcommands
  const subcommands = command.commands;
  if (subcommands && subcommands.length > 0) {
    // If this is the root command, add a title
    if (level === 1) {
      docs += `# ${command.name()} CLI Documentation\n\n`;
      docs += `${command.description()}\n\n`;
      docs += '## Commands\n\n';
    }
    
    subcommands.forEach(subcommand => {
      docs += generateCommandDocs(subcommand, level + 1);
    });
  }
  
  return docs;
}

/**
 * Main function to generate documentation
 */
async function main() {
  try {
    // Get the program object from buildCmd
    const program = buildCmd();
    
    // Generate markdown documentation
    const markdown = generateCommandDocs(program);
    
    // Check if README template exists
    const templatePath = path.join(__dirname, '..', 'README-template.md');
    if (fs.existsSync(templatePath)) {
      // Load template and replace ${commands} with generated docs
      const template = fs.readFileSync(templatePath, 'utf8');
      const result = template.replace('${commands}', markdown);
      
      // Output the result to console (can be redirected to a file)
      console.log(result);
    } else {
      // If template doesn't exist, just output the docs
      console.log(markdown);
    }
  } catch (error) {
    console.error('Error generating documentation:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
