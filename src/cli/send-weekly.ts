#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import config, { validateConfig } from '../config.js';
import { getDatabase, closeDatabase } from '../db/client.js';
import { ingestDealsFromFile, formatIngestionResult } from '../services/ingestion.js';
import { sendWeeklyEmails, formatEmailResults } from '../services/email.js';

const program = new Command();

program
  .name('send-weekly')
  .description('Prox Weekly Deals Email Automation')
  .version('1.0.0')
  .option('-d, --deals <path>', 'Path to deals JSON file', './data/deals.json')
  .option('--skip-ingest', 'Skip data ingestion step')
  .option('--skip-email', 'Skip email sending step (ingest only)')
  .option('--dry-run', 'Preview emails without sending (uses console provider)')
  .action(async (options) => {
    console.log(chalk.bold.green(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🛒  ${config.brand.name.toUpperCase()} WEEKLY DEALS AUTOMATION                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `));
    
    // Validate configuration
    const validation = validateConfig();
    if (!validation.valid) {
      console.log(chalk.yellow('\n⚠️  Configuration warnings:'));
      validation.errors.forEach(err => {
        console.log(chalk.yellow(`   • ${err}`));
      });
      
      if (config.email.provider === 'resend' && !config.email.resendApiKey) {
        console.log(chalk.blue('\n💡 Tip: Set EMAIL_PROVIDER=console in .env to preview emails without Resend.\n'));
      }
    }
    
    // Show current configuration
    console.log(chalk.gray('Configuration:'));
    console.log(chalk.gray(`  Database: ${config.database.type}`));
    console.log(chalk.gray(`  Email provider: ${options.dryRun ? 'console (dry run)' : config.email.provider}`));
    console.log(chalk.gray(`  Deals file: ${options.deals}`));
    
    const startTime = Date.now();
    
    try {
      // Initialize database
      console.log(chalk.blue('\n🔌 Connecting to database...'));
      await getDatabase();
      console.log(chalk.green('  ✓ Database connected'));
      
      // Step 1: Ingest deals data
      if (!options.skipIngest) {
        console.log(chalk.bold.blue('\n━━━ STEP 1: DATA INGESTION ━━━'));
        const ingestionResult = await ingestDealsFromFile(options.deals);
        console.log(formatIngestionResult(ingestionResult));
      } else {
        console.log(chalk.gray('\n⏭ Skipping data ingestion (--skip-ingest)'));
      }
      
      // Step 2: Send emails
      if (!options.skipEmail) {
        console.log(chalk.bold.blue('\n━━━ STEP 2: EMAIL GENERATION & DELIVERY ━━━'));
        
        // Override to console for dry run
        if (options.dryRun) {
          config.email.provider = 'console';
        }
        
        const emailResults = await sendWeeklyEmails();
        console.log(formatEmailResults(emailResults));
      } else {
        console.log(chalk.gray('\n⏭ Skipping email sending (--skip-email)'));
      }
      
      // Done
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(chalk.bold.green(`\n✅ Completed in ${duration}s\n`));
      
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error);
      process.exit(1);
    } finally {
      closeDatabase();
    }
  });

// Parse command line arguments
program.parse();
