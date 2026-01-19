import Database from 'better-sqlite3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../config.js';
import type { Retailer, Product, Deal, User, EnrichedDeal, RawUser } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Abstract database interface
export interface DatabaseClient {
  initialize(): Promise<void>;
  close(): void;
  
  // Retailers
  getRetailerByName(name: string): Promise<Retailer | null>;
  insertRetailer(name: string): Promise<Retailer>;
  getAllRetailers(): Promise<Retailer[]>;
  
  // Products
  getProductByNameAndSize(name: string, size: string): Promise<Product | null>;
  insertProduct(name: string, size: string, category: string): Promise<Product>;
  
  // Deals
  getDealByKey(retailerId: number, productId: number, startDate: string): Promise<Deal | null>;
  insertDeal(retailerId: number, productId: number, price: number, startDate: string, endDate: string): Promise<Deal>;
  getActiveDeals(): Promise<EnrichedDeal[]>;
  getActiveDealsForRetailers(retailerNames: string[]): Promise<EnrichedDeal[]>;
  
  // Users
  getUserByEmail(email: string): Promise<User | null>;
  insertUser(name: string, email: string, preferredRetailers: string[]): Promise<User>;
  getAllUsers(): Promise<User[]>;
}

// SQLite implementation
class SQLiteClient implements DatabaseClient {
  private db: Database.Database | null = null;

  async initialize(): Promise<void> {
    const dbPath = config.database.sqlitePath || './data/prox.db';
    this.db = new Database(dbPath);
    
    // Read and execute schema
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  close(): void {
    this.db?.close();
  }

  private getDb(): Database.Database {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  async getRetailerByName(name: string): Promise<Retailer | null> {
    const row = this.getDb().prepare('SELECT * FROM retailers WHERE name = ?').get(name) as Retailer | undefined;
    return row || null;
  }

  async insertRetailer(name: string): Promise<Retailer> {
    const stmt = this.getDb().prepare('INSERT INTO retailers (name) VALUES (?)');
    const result = stmt.run(name);
    return { id: result.lastInsertRowid as number, name };
  }

  async getAllRetailers(): Promise<Retailer[]> {
    return this.getDb().prepare('SELECT * FROM retailers').all() as Retailer[];
  }

  async getProductByNameAndSize(name: string, size: string): Promise<Product | null> {
    const row = this.getDb().prepare('SELECT * FROM products WHERE name = ? AND size = ?').get(name, size) as Product | undefined;
    return row || null;
  }

  async insertProduct(name: string, size: string, category: string): Promise<Product> {
    const stmt = this.getDb().prepare('INSERT INTO products (name, size, category) VALUES (?, ?, ?)');
    const result = stmt.run(name, size, category);
    return { id: result.lastInsertRowid as number, name, size, category };
  }

  async getDealByKey(retailerId: number, productId: number, startDate: string): Promise<Deal | null> {
    const row = this.getDb().prepare(
      'SELECT * FROM deals WHERE retailer_id = ? AND product_id = ? AND start_date = ?'
    ).get(retailerId, productId, startDate) as Deal | undefined;
    return row || null;
  }

  async insertDeal(retailerId: number, productId: number, price: number, startDate: string, endDate: string): Promise<Deal> {
    const stmt = this.getDb().prepare(
      'INSERT INTO deals (retailer_id, product_id, price, start_date, end_date) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(retailerId, productId, price, startDate, endDate);
    return {
      id: result.lastInsertRowid as number,
      retailer_id: retailerId,
      product_id: productId,
      price,
      start_date: startDate,
      end_date: endDate,
    };
  }

  async getActiveDeals(): Promise<EnrichedDeal[]> {
    const today = new Date().toISOString().split('T')[0];
    const rows = this.getDb().prepare(`
      SELECT 
        d.id,
        r.name as retailer_name,
        p.name as product_name,
        p.size,
        p.category,
        d.price,
        d.start_date,
        d.end_date
      FROM deals d
      JOIN retailers r ON d.retailer_id = r.id
      JOIN products p ON d.product_id = p.id
      WHERE d.start_date <= ? AND d.end_date >= ?
      ORDER BY d.price ASC
    `).all(today, today) as EnrichedDeal[];
    return rows;
  }

  async getActiveDealsForRetailers(retailerNames: string[]): Promise<EnrichedDeal[]> {
    if (retailerNames.length === 0) return [];
    
    const today = new Date().toISOString().split('T')[0];
    const placeholders = retailerNames.map(() => '?').join(', ');
    const rows = this.getDb().prepare(`
      SELECT 
        d.id,
        r.name as retailer_name,
        p.name as product_name,
        p.size,
        p.category,
        d.price,
        d.start_date,
        d.end_date
      FROM deals d
      JOIN retailers r ON d.retailer_id = r.id
      JOIN products p ON d.product_id = p.id
      WHERE d.start_date <= ? AND d.end_date >= ?
        AND r.name IN (${placeholders})
      ORDER BY d.price ASC
    `).all(today, today, ...retailerNames) as EnrichedDeal[];
    return rows;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const row = this.getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as (Omit<User, 'preferred_retailers'> & { preferred_retailers: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      preferred_retailers: JSON.parse(row.preferred_retailers),
    };
  }

  async insertUser(name: string, email: string, preferredRetailers: string[]): Promise<User> {
    const stmt = this.getDb().prepare('INSERT INTO users (name, email, preferred_retailers) VALUES (?, ?, ?)');
    const result = stmt.run(name, email, JSON.stringify(preferredRetailers));
    return {
      id: result.lastInsertRowid as number,
      name,
      email,
      preferred_retailers: preferredRetailers,
    };
  }

  async getAllUsers(): Promise<User[]> {
    const rows = this.getDb().prepare('SELECT * FROM users').all() as (Omit<User, 'preferred_retailers'> & { preferred_retailers: string })[];
    return rows.map(row => ({
      ...row,
      preferred_retailers: JSON.parse(row.preferred_retailers),
    }));
  }
}

// Supabase implementation
class SupabaseDBClient implements DatabaseClient {
  private client: SupabaseClient | null = null;

  async initialize(): Promise<void> {
    if (!config.database.supabaseUrl || !config.database.supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }
    this.client = createClient(config.database.supabaseUrl, config.database.supabaseKey);
  }

  close(): void {
    // Supabase client doesn't need explicit closing
  }

  private getClient(): SupabaseClient {
    if (!this.client) throw new Error('Database not initialized');
    return this.client;
  }

  async getRetailerByName(name: string): Promise<Retailer | null> {
    const { data, error } = await this.getClient()
      .from('retailers')
      .select('*')
      .eq('name', name)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async insertRetailer(name: string): Promise<Retailer> {
    const { data, error } = await this.getClient()
      .from('retailers')
      .insert({ name })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getAllRetailers(): Promise<Retailer[]> {
    const { data, error } = await this.getClient()
      .from('retailers')
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async getProductByNameAndSize(name: string, size: string): Promise<Product | null> {
    const { data, error } = await this.getClient()
      .from('products')
      .select('*')
      .eq('name', name)
      .eq('size', size)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async insertProduct(name: string, size: string, category: string): Promise<Product> {
    const { data, error } = await this.getClient()
      .from('products')
      .insert({ name, size, category })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getDealByKey(retailerId: number, productId: number, startDate: string): Promise<Deal | null> {
    const { data, error } = await this.getClient()
      .from('deals')
      .select('*')
      .eq('retailer_id', retailerId)
      .eq('product_id', productId)
      .eq('start_date', startDate)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async insertDeal(retailerId: number, productId: number, price: number, startDate: string, endDate: string): Promise<Deal> {
    const { data, error } = await this.getClient()
      .from('deals')
      .insert({
        retailer_id: retailerId,
        product_id: productId,
        price,
        start_date: startDate,
        end_date: endDate,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getActiveDeals(): Promise<EnrichedDeal[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.getClient()
      .from('deals')
      .select(`
        id,
        price,
        start_date,
        end_date,
        retailers!inner(name),
        products!inner(name, size, category)
      `)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('price', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map((row: any) => ({
      id: row.id,
      retailer_name: row.retailers.name,
      product_name: row.products.name,
      size: row.products.size,
      category: row.products.category,
      price: row.price,
      start_date: row.start_date,
      end_date: row.end_date,
    }));
  }

  async getActiveDealsForRetailers(retailerNames: string[]): Promise<EnrichedDeal[]> {
    if (retailerNames.length === 0) return [];
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.getClient()
      .from('deals')
      .select(`
        id,
        price,
        start_date,
        end_date,
        retailers!inner(name),
        products!inner(name, size, category)
      `)
      .lte('start_date', today)
      .gte('end_date', today)
      .in('retailers.name', retailerNames)
      .order('price', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map((row: any) => ({
      id: row.id,
      retailer_name: row.retailers.name,
      product_name: row.products.name,
      size: row.products.size,
      category: row.products.category,
      price: row.price,
      start_date: row.start_date,
      end_date: row.end_date,
    }));
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async insertUser(name: string, email: string, preferredRetailers: string[]): Promise<User> {
    const { data, error } = await this.getClient()
      .from('users')
      .insert({ name, email, preferred_retailers: preferredRetailers })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await this.getClient()
      .from('users')
      .select('*');
    if (error) throw error;
    return data || [];
  }
}

// Factory function
export function createDatabaseClient(): DatabaseClient {
  if (config.database.type === 'supabase') {
    return new SupabaseDBClient();
  }
  return new SQLiteClient();
}

// Singleton instance
let dbInstance: DatabaseClient | null = null;

export async function getDatabase(): Promise<DatabaseClient> {
  if (!dbInstance) {
    dbInstance = createDatabaseClient();
    await dbInstance.initialize();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  dbInstance?.close();
  dbInstance = null;
}
