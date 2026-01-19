#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { Command } from 'commander';
import chalk from 'chalk';
import { getDatabase, closeDatabase } from '../db/client.js';
import { ingestDealsFromFile } from '../services/ingestion.js';
import { getEmailPreviewHTML } from '../services/email.js';

const program = new Command();

program
  .name('preview')
  .description('Generate email preview HTML file')
  .option('-u, --user <email>', 'User email to preview (defaults to first user)')
  .option('-o, --output <path>', 'Output HTML file path', './preview.html')
  .action(async (options) => {
    console.log(chalk.bold.blue('\n📧 Generating Email Preview\n'));
    
    try {
      // Initialize and ensure data exists
      await getDatabase();
      await ingestDealsFromFile();
      
      const html = await getEmailPreviewHTML(options.user);
      
      if (!html) {
        console.log(chalk.red('❌ Could not generate preview. Check if users and deals exist.'));
        process.exit(1);
      }
      
      writeFileSync(options.output, html);
      console.log(chalk.green(`✓ Preview saved to: ${options.output}`));
      console.log(chalk.gray(`\nOpen in browser to view the email template.\n`));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    } finally {
      closeDatabase();
    }
  });

program.parse();
