import { Resend } from 'resend';
import chalk from 'chalk';
import config from '../config.js';
import { getDatabase } from '../db/client.js';
import { generateEmailHTML, generatePlainTextEmail } from '../templates/weekly-deals.js';
import type { User, EnrichedDeal, DealsByRetailer, EmailData, EmailSendResult } from '../types.js';

// Group deals by retailer
function groupDealsByRetailer(deals: EnrichedDeal[]): DealsByRetailer[] {
  const grouped = new Map<string, EnrichedDeal[]>();
  
  for (const deal of deals) {
    const existing = grouped.get(deal.retailer_name) || [];
    existing.push(deal);
    grouped.set(deal.retailer_name, existing);
  }
  
  return Array.from(grouped.entries())
    .map(([retailer, deals]) => ({
      retailer,
      deals: deals.sort((a, b) => a.price - b.price),
    }))
    .sort((a, b) => a.retailer.localeCompare(b.retailer));
}

// Prepare email data for a user
async function prepareEmailData(user: User): Promise<EmailData | null> {
  const db = await getDatabase();
  const deals = await db.getActiveDealsForRetailers(user.preferred_retailers);
  
  if (deals.length === 0) {
    return null;
  }
  
  // Sort by price for top deals
  const sortedByPrice = [...deals].sort((a, b) => a.price - b.price);
  
  return {
    to: user.email,
    userName: user.name.split(' ')[0], // First name only
    deals,
    dealsByRetailer: groupDealsByRetailer(deals),
    topDeals: sortedByPrice,
  };
}

// Send email via Resend
async function sendViaResend(emailData: EmailData): Promise<boolean> {
  if (!config.email.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  
  const resend = new Resend(config.email.resendApiKey);
  
  const html = generateEmailHTML(emailData);
  const text = generatePlainTextEmail(emailData);
  
  const { data, error } = await resend.emails.send({
    from: config.email.fromEmail,
    to: emailData.to,
    subject: `🛒 Your Weekly Deals from ${config.brand.name}`,
    html,
    text,
  });
  
  if (error) {
    console.error(chalk.red(`  ❌ Resend error: ${error.message}`));
    return false;
  }
  
  console.log(chalk.green(`  ✓ Email sent via Resend (ID: ${data?.id})`));
  return true;
}

// Send to console (for testing without Resend)
function sendViaConsole(emailData: EmailData): boolean {
  const html = generateEmailHTML(emailData);
  const text = generatePlainTextEmail(emailData);
  
  console.log(chalk.cyan('\n' + '─'.repeat(60)));
  console.log(chalk.bold.cyan(`📧 EMAIL PREVIEW for ${emailData.to}`));
  console.log(chalk.cyan('─'.repeat(60)));
  console.log(chalk.gray('\n[Plain Text Version]\n'));
  console.log(text);
  console.log(chalk.cyan('\n' + '─'.repeat(60)));
  console.log(chalk.gray(`[HTML Version: ${html.length} characters]`));
  console.log(chalk.cyan('─'.repeat(60) + '\n'));
  
  return true;
}

// Send email to a user
async function sendEmailToUser(user: User): Promise<EmailSendResult> {
  console.log(chalk.blue(`\n📬 Preparing email for ${user.name} (${user.email})...`));
  console.log(chalk.gray(`   Preferred retailers: ${user.preferred_retailers.join(', ')}`));
  
  const emailData = await prepareEmailData(user);
  
  if (!emailData) {
    console.log(chalk.yellow(`  ⚠ No active deals found for user's preferred retailers`));
    return {
      success: false,
      email: user.email,
      userName: user.name,
      dealsCount: 0,
      error: 'No matching deals',
    };
  }
  
  console.log(chalk.gray(`   Found ${emailData.deals.length} deals`));
  
  try {
    let success: boolean;
    
    if (config.email.provider === 'resend') {
      success = await sendViaResend(emailData);
    } else {
      success = sendViaConsole(emailData);
    }
    
    return {
      success,
      email: user.email,
      userName: user.name,
      dealsCount: emailData.deals.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`  ❌ Failed to send: ${errorMessage}`));
    return {
      success: false,
      email: user.email,
      userName: user.name,
      dealsCount: emailData.deals.length,
      error: errorMessage,
    };
  }
}

// Send weekly emails to all users
export async function sendWeeklyEmails(): Promise<EmailSendResult[]> {
  const db = await getDatabase();
  const users = await db.getAllUsers();
  
  if (users.length === 0) {
    console.log(chalk.yellow('\n⚠ No users found. Run `npm run db:seed` to add test users.'));
    return [];
  }
  
  console.log(chalk.blue(`\n📧 Sending weekly emails to ${users.length} users...`));
  
  const results: EmailSendResult[] = [];
  
  for (const user of users) {
    const result = await sendEmailToUser(user);
    results.push(result);
  }
  
  return results;
}

// Format results summary
export function formatEmailResults(results: EmailSendResult[]): string {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  const lines = [
    '',
    chalk.bold('📊 Email Summary:'),
    chalk.gray('─'.repeat(30)),
    `  Total users: ${results.length}`,
    `  ${chalk.green('Sent:')} ${successful.length}`,
    `  ${chalk.red('Failed:')} ${failed.length}`,
  ];
  
  if (failed.length > 0) {
    lines.push('', chalk.yellow('  Failed emails:'));
    failed.forEach(r => {
      lines.push(chalk.gray(`    • ${r.email}: ${r.error}`));
    });
  }
  
  lines.push('');
  return lines.join('\n');
}

// Get email HTML for preview
export async function getEmailPreviewHTML(userEmail?: string): Promise<string | null> {
  const db = await getDatabase();
  const users = await db.getAllUsers();
  
  const user = userEmail 
    ? users.find(u => u.email === userEmail)
    : users[0];
  
  if (!user) {
    return null;
  }
  
  const emailData = await prepareEmailData(user);
  if (!emailData) {
    return null;
  }
  
  return generateEmailHTML(emailData);
}
