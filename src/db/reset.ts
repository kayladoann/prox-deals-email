import { unlinkSync, existsSync } from 'fs';
import chalk from 'chalk';
import config from '../config.js';

async function main(): Promise<void> {
  console.log(chalk.bold.yellow('\n🗑️  Prox Database Reset\n'));
  
  if (config.database.type === 'sqlite') {
    const dbPath = config.database.sqlitePath || './data/prox.db';
    
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
      console.log(chalk.green(`✓ Deleted SQLite database: ${dbPath}`));
    } else {
      console.log(chalk.gray(`ℹ No database file found at: ${dbPath}`));
    }
    
    console.log(chalk.blue('\nRun `npm run db:seed` to recreate and seed the database.\n'));
  } else {
    console.log(chalk.yellow('⚠️  Supabase database reset must be done through the Supabase dashboard.'));
    console.log(chalk.gray('   Delete tables manually or run the schema SQL to truncate.\n'));
  }
}

main();
