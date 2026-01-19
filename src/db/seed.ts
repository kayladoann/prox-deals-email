import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { getDatabase, closeDatabase } from './client.js';
import type { RawUser } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedUsers(): Promise<void> {
  console.log(chalk.blue('\n📋 Seeding users...'));
  
  const db = await getDatabase();
  const usersPath = join(__dirname, '../../data/users.json');
  const users: RawUser[] = JSON.parse(readFileSync(usersPath, 'utf-8'));
  
  let inserted = 0;
  let existing = 0;
  
  for (const user of users) {
    const existingUser = await db.getUserByEmail(user.email);
    if (existingUser) {
      existing++;
      console.log(chalk.gray(`  ⏭ Skipping existing user: ${user.email}`));
    } else {
      await db.insertUser(user.name, user.email, user.preferred_retailers);
      inserted++;
      console.log(chalk.green(`  ✓ Added user: ${user.name} (${user.email})`));
    }
  }
  
  console.log(chalk.blue(`\n  Users: ${inserted} inserted, ${existing} already existed`));
}

async function main(): Promise<void> {
  console.log(chalk.bold.green('\n🌱 Prox Database Seeder\n'));
  console.log(chalk.gray('─'.repeat(40)));
  
  try {
    await seedUsers();
    
    console.log(chalk.gray('\n─'.repeat(40)));
    console.log(chalk.bold.green('\n✅ Seeding complete!\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Seeding failed:'), error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

main();
