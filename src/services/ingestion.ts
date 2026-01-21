import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { getDatabase } from '../db/client.js';
import type { RawDeal, RawUser, IngestionResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function ingestDealsFromFile(filePath?: string): Promise<IngestionResult> {
  const dealsPath = filePath || join(__dirname, '../../data/deals.json');
  const rawDeals: RawDeal[] = JSON.parse(readFileSync(dealsPath, 'utf-8'));
  
  return ingestDeals(rawDeals);
}

export async function seedUsersFromFile(filePath?: string): Promise<{ inserted: number; existing: number }> {
  const usersPath = filePath || join(__dirname, '../../data/users.json');
  const rawUsers: RawUser[] = JSON.parse(readFileSync(usersPath, 'utf-8'));
  
  const db = await getDatabase();
  const result = { inserted: 0, existing: 0 };
  
  console.log(chalk.blue(`\n👥 Processing ${rawUsers.length} users...`));
  
  for (const user of rawUsers) {
    const existingUser = await db.getUserByEmail(user.email);
    if (existingUser) {
      result.existing++;
    } else {
      await db.insertUser(user.name, user.email, user.preferred_retailers);
      result.inserted++;
      console.log(chalk.green(`  ✓ New user: ${user.name} (${user.email})`));
    }
  }
  
  if (result.inserted === 0 && result.existing > 0) {
    console.log(chalk.gray(`  ⏭ All ${result.existing} users already exist`));
  }
  
  return result;
}

export async function ingestDeals(rawDeals: RawDeal[]): Promise<IngestionResult> {
  const db = await getDatabase();
  
  const result: IngestionResult = {
    retailers: { inserted: 0, existing: 0 },
    products: { inserted: 0, existing: 0 },
    deals: { inserted: 0, skipped: 0 },
  };
  
  console.log(chalk.blue(`\n📦 Processing ${rawDeals.length} deals...`));
  
  for (const rawDeal of rawDeals) {
    // Upsert retailer
    let retailer = await db.getRetailerByName(rawDeal.retailer);
    if (!retailer) {
      retailer = await db.insertRetailer(rawDeal.retailer);
      result.retailers.inserted++;
      console.log(chalk.green(`  ✓ New retailer: ${rawDeal.retailer}`));
    } else {
      result.retailers.existing++;
    }
    
    // Upsert product
    let product = await db.getProductByNameAndSize(rawDeal.product, rawDeal.size);
    if (!product) {
      product = await db.insertProduct(rawDeal.product, rawDeal.size, rawDeal.category);
      result.products.inserted++;
      console.log(chalk.green(`  ✓ New product: ${rawDeal.product}`));
    } else {
      result.products.existing++;
    }
    
    // Check for duplicate deal (retailer + product + start_date)
    const existingDeal = await db.getDealByKey(retailer.id, product.id, rawDeal.start);
    if (existingDeal) {
      result.deals.skipped++;
      console.log(chalk.gray(`  ⏭ Duplicate deal: ${rawDeal.product} @ ${rawDeal.retailer}`));
    } else {
      await db.insertDeal(
        retailer.id,
        product.id,
        rawDeal.price,
        rawDeal.start,
        rawDeal.end
      );
      result.deals.inserted++;
      console.log(chalk.cyan(`  + Deal: ${rawDeal.product} @ ${rawDeal.retailer} - $${rawDeal.price}`));
    }
  }
  
  return result;
}

export function formatIngestionResult(result: IngestionResult): string {
  const lines = [
    '',
    chalk.bold('📊 Ingestion Summary:'),
    chalk.gray('─'.repeat(30)),
    `  Retailers: ${chalk.green(result.retailers.inserted + ' new')}, ${chalk.gray(result.retailers.existing + ' existing')}`,
    `  Products:  ${chalk.green(result.products.inserted + ' new')}, ${chalk.gray(result.products.existing + ' existing')}`,
    `  Deals:     ${chalk.green(result.deals.inserted + ' new')}, ${chalk.yellow(result.deals.skipped + ' skipped (duplicates)')}`,
    '',
  ];
  return lines.join('\n');
}
