-- Prox Deals Database Schema
-- Compatible with both SQLite and PostgreSQL (Supabase)

-- Retailers table
CREATE TABLE IF NOT EXISTS retailers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    size TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, size)
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retailer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    price REAL NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (retailer_id) REFERENCES retailers(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(retailer_id, product_id, start_date)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    preferred_retailers TEXT NOT NULL, -- JSON array stored as text for SQLite compatibility
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_dates ON deals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_deals_retailer ON deals(retailer_id);
CREATE INDEX IF NOT EXISTS idx_deals_price ON deals(price);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
