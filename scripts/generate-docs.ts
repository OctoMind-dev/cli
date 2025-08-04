#!/usr/bin/env ts-node
import { Command } from 'commander';
import { buildCmd } from '../src/cli';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate markdown documentation for all commands in the CLI
 */
export function generateCommandDocs(command: Command, level = 1): string {
  let docs = '';
  
  // Skip the root command if it's the first level
  if (level > 1 || command.name() !== 'octomind-cli') {
    const prefix = '#'.repeat(level);
    docs += `${prefix} ${command.name()}\n\n`;
    
    if (command.description()) {
      docs += `${command.description()}\n\n`;
    }
    
    const usage = command.usage();
    if (usage) {
      docs += `**Usage:** \`${command.name()} ${usage}\`\n\n`;
    }
    
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
  
  const subcommands = command.commands;
  if (subcommands && subcommands.length > 0) {
    if (level === 1) {
      docs += `# ${command.name()} CLI Documentation\n\n`;
      docs += `${command.description()}\n\n`;
      
      const commandsByGroup = new Map<string, Command[]>();
      const ungroupedCommands: Command[] = [];
      
      subcommands.forEach(subcommand => {
        const helpGroup = subcommand.helpGroup();
        if (helpGroup) {
          if (!commandsByGroup.has(helpGroup)) {
            commandsByGroup.set(helpGroup, []);
          }
          const groupCommands = commandsByGroup.get(helpGroup);
          if (groupCommands) {
            groupCommands.push(subcommand);
          }
        } else {
          ungroupedCommands.push(subcommand);
        }
      });
      
      const allGroups = Array.from(commandsByGroup.keys());
      const setupGroup = allGroups.find(group => group === 'setup');
      const otherGroups = allGroups.filter(group => group !== 'setup').sort();
      const sortedGroups = setupGroup ? [setupGroup, ...otherGroups] : otherGroups;
      
      sortedGroups.forEach(groupName => {
        const groupCommands = commandsByGroup.get(groupName);
        if (groupCommands) {
          const capitalizedGroupName = groupName.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          docs += `## ${capitalizedGroupName}\n\n`;
          
          groupCommands.forEach(subcommand => {
            docs += generateCommandDocs(subcommand, level + 1);
          });
        }
      });
      
      if (ungroupedCommands.length > 0) {
        docs += '## Other Commands\n\n';
        ungroupedCommands.forEach(subcommand => {
          docs += generateCommandDocs(subcommand, level + 1);
        });
      }
    } else {
      subcommands.forEach(subcommand => {
        docs += generateCommandDocs(subcommand, level + 1);
      });
    }
  }
  
  return docs;
}

/**
 * Main function to generate documentation
 */
async function main() {
  try {
    const program = buildCmd();
    
    const markdown = generateCommandDocs(program);
    
    const templatePath = path.join(__dirname, '..', 'README-template.md');
    if (fs.existsSync(templatePath)) {
      const template = fs.readFileSync(templatePath, 'utf8');
      const result = template.replace('${commands}', markdown);
      
      console.log(result);
    } else {
      console.log(markdown);
    }
  } catch (error) {
    console.error('Error generating documentation:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
