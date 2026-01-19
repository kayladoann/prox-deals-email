import config from '../config.js';
import type { EnrichedDeal, DealsByRetailer, EmailData } from '../types.js';

const { brand } = config;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    produce: '🥬',
    protein: '🥩',
    dairy: '🥛',
    household: '🏠',
    bakery: '🍞',
    frozen: '❄️',
    beverages: '🥤',
    snacks: '🍿',
  };
  return emojis[category.toLowerCase()] || '🛒';
}

export function generateEmailHTML(data: EmailData): string {
  const { userName, topDeals, dealsByRetailer } = data;
  
  const topDealsHTML = topDeals
    .slice(0, 6)
    .map(deal => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E8F5F0;">
          <div style="display: flex; align-items: center;">
            <span style="font-size: 20px; margin-right: 12px;">${getCategoryEmoji(deal.category)}</span>
            <div>
              <div style="font-weight: 600; color: ${brand.dark};">${deal.product_name}</div>
              <div style="font-size: 13px; color: #666;">${deal.retailer_name} · ${deal.size}</div>
            </div>
          </div>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E8F5F0; text-align: right;">
          <div style="font-size: 20px; font-weight: 700; color: ${brand.primary};">${formatPrice(deal.price)}</div>
          <div style="font-size: 11px; color: #999;">${formatDateRange(deal.start_date, deal.end_date)}</div>
        </td>
      </tr>
    `)
    .join('');
  
  const retailerSectionsHTML = dealsByRetailer
    .map(group => {
      const dealsRows = group.deals
        .map(deal => `
          <tr>
            <td style="padding: 8px 0; color: #333;">
              ${getCategoryEmoji(deal.category)} ${deal.product_name}
              <span style="color: #999; font-size: 13px;">(${deal.size})</span>
            </td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${brand.primary};">
              ${formatPrice(deal.price)}
            </td>
          </tr>
        `)
        .join('');
      
      return `
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid ${brand.primary}; color: ${brand.dark}; font-size: 16px;">
            ${group.retailer}
          </h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            ${dealsRows}
          </table>
        </div>
      `;
    })
    .join('');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Deals from ${brand.name}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${brand.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${brand.background};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${brand.primary} 0%, ${brand.dark} 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                🛒 ${brand.name}
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">
                Your personalized weekly deals
              </p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 8px 24px;">
              <p style="margin: 0; font-size: 16px; color: #333;">
                Hi <strong>${userName}</strong>! 👋
              </p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #666; line-height: 1.5;">
                Here are this week's best deals from your favorite stores. Don't miss out on these savings!
              </p>
            </td>
          </tr>
          
          <!-- Top Deals Section -->
          <tr>
            <td style="padding: 16px 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: ${brand.dark}; display: flex; align-items: center;">
                🏆 Top ${Math.min(topDeals.length, 6)} Deals
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${brand.background}; border-radius: 8px; overflow: hidden;">
                ${topDealsHTML}
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 8px 24px;">
              <hr style="border: none; border-top: 1px solid #E8F5F0; margin: 0;">
            </td>
          </tr>
          
          <!-- Deals by Retailer -->
          <tr>
            <td style="padding: 16px 24px;">
              <h2 style="margin: 0 0 20px 0; font-size: 18px; color: ${brand.dark};">
                📍 All Deals by Store
              </h2>
              ${retailerSectionsHTML}
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 8px 24px 24px 24px; text-align: center;">
              <a href="https://joinprox.com/deals" style="display: inline-block; padding: 14px 32px; background-color: ${brand.primary}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px;">
                View All Deals →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAF9; padding: 24px; text-align: center; border-top: 1px solid #E8F5F0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                You're receiving this because you signed up for ${brand.name} deal alerts.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="https://joinprox.com/preferences" style="color: ${brand.primary}; text-decoration: none;">Manage preferences</a>
                &nbsp;·&nbsp;
                <a href="https://joinprox.com/unsubscribe" style="color: #999; text-decoration: none;">Unsubscribe</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 11px; color: #999;">
                © ${new Date().getFullYear()} ${brand.name}. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();
}

export function generatePlainTextEmail(data: EmailData): string {
  const { userName, topDeals, dealsByRetailer } = data;
  
  const lines: string[] = [
    `${brand.name} - Your Weekly Deals`,
    '='.repeat(40),
    '',
    `Hi ${userName}!`,
    '',
    `Here are this week's best deals from your favorite stores.`,
    '',
    `TOP ${Math.min(topDeals.length, 6)} DEALS`,
    '-'.repeat(30),
  ];
  
  topDeals.slice(0, 6).forEach((deal, i) => {
    lines.push(`${i + 1}. ${deal.product_name} (${deal.size})`);
    lines.push(`   ${deal.retailer_name} - ${formatPrice(deal.price)}`);
    lines.push(`   Valid: ${formatDateRange(deal.start_date, deal.end_date)}`);
    lines.push('');
  });
  
  lines.push('', 'ALL DEALS BY STORE', '-'.repeat(30));
  
  dealsByRetailer.forEach(group => {
    lines.push('', `[${group.retailer}]`);
    group.deals.forEach(deal => {
      lines.push(`  • ${deal.product_name} (${deal.size}) - ${formatPrice(deal.price)}`);
    });
  });
  
  lines.push(
    '',
    '-'.repeat(40),
    `View all deals: https://joinprox.com/deals`,
    `Manage preferences: https://joinprox.com/preferences`,
    `Unsubscribe: https://joinprox.com/unsubscribe`,
    '',
    `© ${new Date().getFullYear()} ${brand.name}`,
  );
  
  return lines.join('\n');
}
