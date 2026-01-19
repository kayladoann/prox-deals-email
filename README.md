# 🛒 Prox Deals Email Automation

An automated system that ingests weekly deal data, stores it in a database, and sends personalized branded "Weekly Deals" emails to users based on their preferred retailers.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![License](https://img.shields.io/badge/License-ISC-yellow)

## ✨ Features

- **Data Ingestion**: Load deal data from JSON with automatic deduplication
- **Flexible Database**: Works with SQLite (local) or Supabase (production)
- **Personalized Emails**: Filter deals based on user's preferred retailers
- **Branded Templates**: Professional HTML emails with Prox brand colors
- **Plain Text Fallback**: Accessible email for all clients
- **CLI Automation**: Single command to run the entire pipeline

## 📁 Project Structure

```
prox-deals-email/
├── data/
│   ├── deals.json          # Sample deal data
│   └── users.json          # Test user data
├── src/
│   ├── cli/
│   │   ├── send-weekly.ts  # Main CLI command
│   │   └── preview.ts      # Email preview generator
│   ├── db/
│   │   ├── client.ts       # Database abstraction layer
│   │   ├── schema.sql      # Database schema
│   │   ├── seed.ts         # User seeding script
│   │   └── reset.ts        # Database reset utility
│   ├── services/
│   │   ├── ingestion.ts    # Deal data ingestion
│   │   └── email.ts        # Email generation & sending
│   ├── templates/
│   │   └── weekly-deals.ts # HTML/text email templates
│   ├── config.ts           # Configuration management
│   └── types.ts            # TypeScript definitions
├── .env.example            # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## 🗄️ Database Schema

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  retailers  │     │  products   │     │    users    │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ name        │     │ name        │     │ name        │
│ created_at  │     │ size        │     │ email       │
└──────┬──────┘     │ category    │     │ preferred_  │
       │            │ created_at  │     │  retailers[]│
       │            └──────┬──────┘     │ created_at  │
       │                   │            └─────────────┘
       │    ┌──────────────┴──────────────┐
       │    │           deals             │
       │    ├─────────────────────────────┤
       └────┤ id (PK)                     │
            │ retailer_id (FK)            │
            │ product_id (FK)             │
            │ price                       │
            │ start_date                  │
            │ end_date                    │
            │ created_at                  │
            │ UNIQUE(retailer_id,         │
            │   product_id, start_date)   │
            └─────────────────────────────┘
```

**Deduplication Key**: `retailer_id + product_id + start_date`

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/prox-deals-email.git
cd prox-deals-email

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Basic Usage (Local Testing)

```bash
# Run the full pipeline with console output (no email sending)
npm run send:weekly

# Or use dry-run mode explicitly
npm run send:weekly -- --dry-run
```

This will:
1. Initialize the SQLite database
2. Ingest deal data from `data/deals.json`
3. Seed users from `data/users.json`
4. Generate and display personalized emails for each user

### Generate Email Preview

```bash
# Create an HTML preview file
npm run preview

# Then open preview.html in your browser
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_TYPE` | Database type: `sqlite` or `supabase` | `sqlite` |
| `SQLITE_PATH` | SQLite database file path | `./data/prox.db` |
| `SUPABASE_URL` | Supabase project URL | - |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | - |
| `EMAIL_PROVIDER` | Email provider: `resend` or `console` | `console` |
| `RESEND_API_KEY` | Resend API key | - |
| `FROM_EMAIL` | Sender email address | `deals@joinprox.com` |

### Using Supabase

1. Create a new Supabase project
2. Run the schema SQL in `src/db/schema.sql` via the SQL editor
3. Update your `.env`:

```env
DB_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Using Resend

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use the sandbox
3. Get your API key
4. Update your `.env`:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=deals@yourdomain.com
```

## 📧 CLI Commands

### Main Command: `npm run send:weekly`

```bash
# Full pipeline (ingest + email)
npm run send:weekly

# Custom deals file
npm run send:weekly -- --deals ./my-deals.json

# Skip ingestion (use existing data)
npm run send:weekly -- --skip-ingest

# Skip email sending (ingest only)
npm run send:weekly -- --skip-email

# Dry run (preview emails without sending)
npm run send:weekly -- --dry-run
```

### Other Commands

```bash
# Seed test users
npm run db:seed

# Reset database (SQLite only)
npm run db:reset

# Generate email preview HTML
npm run preview
npm run preview -- --user mike.test@example.com
npm run preview -- --output my-preview.html

# Type checking
npm run typecheck
```

## 📊 Sample Output

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🛒  PROX WEEKLY DEALS AUTOMATION                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

🔌 Connecting to database...
  ✓ Database connected

━━━ STEP 1: DATA INGESTION ━━━

📦 Processing 8 deals...
  ✓ New retailer: Ralphs
  ✓ New product: Boneless Skinless Chicken Breasts
  + Deal: Boneless Skinless Chicken Breasts @ Ralphs - $2.99
  ...

📊 Ingestion Summary:
──────────────────────────────
  Retailers: 8 new, 0 existing
  Products:  8 new, 0 existing
  Deals:     8 new, 0 skipped (duplicates)

━━━ STEP 2: EMAIL GENERATION & DELIVERY ━━━

📧 Sending weekly emails to 3 users...

📬 Preparing email for Sarah Chen (sarah.test@example.com)...
   Preferred retailers: Whole Foods, Sprouts
   Found 2 deals
  ✓ Email sent via console

...

📊 Email Summary:
──────────────────────────────
  Total users: 3
  Sent: 3
  Failed: 0

✅ Completed in 0.15s
```

## 🎨 Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#0FB872` | Buttons, links, highlights |
| Dark | `#0A4D3C` | Headers, text emphasis |
| Background | `#F4FBF8` | Email background |

## 🔮 What I'd Build Next (2 More Days)

### Day 1: Web Dashboard & Scraper
- **Admin Dashboard**: Simple React/Next.js app showing deal stats, user engagement, and email history
- **Basic Scraper**: Puppeteer-based scraper for one retailer (e.g., Ralphs) that outputs the standard JSON format
- **Price History**: Track price changes over time for trending/alert features

### Day 2: Enhanced Features
- **Price-per-unit**: Parse sizes and calculate comparable unit prices (e.g., $/oz)
- **Deal Scoring**: Algorithm to rank deals by value, not just absolute price
- **Scheduling**: Cron job integration for automated weekly sends
- **User Preferences UI**: Simple web form to manage retailer preferences and email frequency

## 🤔 Tradeoffs & Decisions

1. **SQLite as default**: Chose SQLite for zero-config local development. Supabase support is fully implemented for production deployment.

2. **Dual email providers**: Console mode allows full testing without email service setup. Resend integration is production-ready.

3. **Simple deduplication**: Using `retailer + product + start_date` as the unique key. More sophisticated matching (fuzzy product names) would require additional infrastructure.

4. **Preference storage**: Stored as JSON array for SQLite compatibility. In Supabase, this could be a proper array column or a separate junction table.

5. **No authentication**: This is a backend service; user management would be handled by a separate auth system in production.

## 🧪 Testing

```bash
# Type checking
npm run typecheck

# Run with test data
npm run send:weekly -- --dry-run
```

## 📝 License

ISC

---

Built for the Prox Software Engineering Intern Technical Assessment
