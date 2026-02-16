import path from 'path';
import { getMoscowTimestamp } from './timezone';

const dbPath = path.join(process.cwd(), 'data.db');

let db: any = null;
let Database: any = null;

// Initialize Database dynamically to handle Node version issues
async function initDatabase() {
  if (Database) return Database;

  try {
    const BetterSqlite3 = require('better-sqlite3');
    Database = BetterSqlite3;
  } catch (error) {
    console.error('Failed to load better-sqlite3:', error);
    // Fallback to in-memory database for development
    console.warn('Using in-memory database as fallback');
    return null;
  }

  return Database;
}

export async function getDb() {
  if (!db) {
    const Database = await initDatabase();

    if (!Database) {
      // Return mock database object for in-memory mode
      db = {
        records: [] as any[],
        _inMemory: true,
        exec: () => { },
        pragma: () => { },
        prepare: () => ({
          run: () => { },
          all: () => [],
          get: () => null,
          bind: () => { },
          step: () => false,
          getAsObject: () => ({}),
          free: () => { }
        })
      };
      return db;
    }

    try {
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
    } catch (error) {
      console.error('Database initialization error:', error);
      db = {
        records: [] as any[],
        _inMemory: true,
        exec: () => { },
        pragma: () => { },
        prepare: () => ({
          run: () => { },
          all: () => [],
          get: () => null
        })
      };
      return db;
    }

    // Создаем таблицу для хранения данных
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          upload_id TEXT NOT NULL,
          tour_name TEXT,
          date TEXT,
          time TEXT,
          order_id TEXT,
          participant_name TEXT,
          ticket_category TEXT,
          ticket_price REAL,
          quantity INTEGER,
          paid_amount REAL,
          commission_percent REAL,
          guide_amount REAL,
          sputnik_amount REAL,
          comment TEXT,
          created_at DATETIME
        );
        
        CREATE INDEX IF NOT EXISTS idx_upload_id ON records(upload_id);
        CREATE INDEX IF NOT EXISTS idx_date ON records(date);
        CREATE INDEX IF NOT EXISTS idx_order_id ON records(order_id);
      `);
    } catch (error) {
      console.error('Table creation error:', error);
    }
  }

  return db;
}

export interface Record {
  id?: number;
  upload_id: string;
  tour_name?: string;
  date?: string;
  time?: string;
  order_id?: string;
  participant_name?: string;
  ticket_category?: string;
  ticket_price?: number;
  quantity?: number;
  paid_amount?: number;
  commission_percent?: number;
  guide_amount?: number;
  sputnik_amount?: number;
  comment?: string;
  created_at?: string;
}

export async function insertRecords(records: Record[]) {
  const db = await getDb();
  const mskTimestamp = getMoscowTimestamp();

  if (db._inMemory) {
    // Store in memory array
    for (const record of records) {
      db.records.push({ ...record, created_at: mskTimestamp });
    }
    return;
  }

  const insert = db.prepare(`
    INSERT INTO records (
      upload_id, tour_name, date, time, order_id, participant_name,
      ticket_category, ticket_price, quantity, paid_amount,
      commission_percent, guide_amount, sputnik_amount, comment, created_at
    ) VALUES (
      :upload_id, :tour_name, :date, :time, :order_id, :participant_name,
      :ticket_category, :ticket_price, :quantity, :paid_amount,
      :commission_percent, :guide_amount, :sputnik_amount, :comment, :created_at
    )
  `);

  const insertMany = db.transaction((records: Record[]) => {
    for (const record of records) {
      const cleanRecord = Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, value ?? null])
      );
      cleanRecord.created_at = mskTimestamp;
      insert.run(cleanRecord);
    }
  });

  insertMany(records);
}

export async function getAllRecords(uploadId?: string) {
  const db = await getDb();

  if (db._inMemory) {
    if (uploadId) {
      return db.records.filter((r: any) => r.upload_id === uploadId);
    }
    return db.records;
  }

  if (uploadId) {
    return db.prepare('SELECT * FROM records WHERE upload_id = ? ORDER BY date DESC').all(uploadId);
  }

  return db.prepare('SELECT * FROM records ORDER BY created_at DESC').all();
}

export async function getUploads() {
  const db = await getDb();

  if (db._inMemory) {
    const grouped = new Map<string, any>();
    for (const record of db.records) {
      if (!grouped.has(record.upload_id)) {
        grouped.set(record.upload_id, {
          upload_id: record.upload_id,
          record_count: 0,
          created_at: record.created_at
        });
      }
      const group = grouped.get(record.upload_id)!;
      group.record_count++;
    }
    return Array.from(grouped.values());
  }

  return db.prepare(`
    SELECT 
      upload_id,
      COUNT(*) as record_count,
      MIN(created_at) as created_at
    FROM records
    GROUP BY upload_id
    ORDER BY created_at DESC
  `).all();
}

export async function deleteUpload(uploadId: string) {
  const db = await getDb();

  if (db._inMemory) {
    db.records = db.records.filter((r: any) => r.upload_id !== uploadId);
    return;
  }

  return db.prepare('DELETE FROM records WHERE upload_id = ?').run(uploadId);
}

export async function getStatistics(uploadId?: string) {
  const db = await getDb();

  if (db._inMemory) {
    const records = uploadId
      ? db.records.filter((r: any) => r.upload_id === uploadId)
      : db.records;

    return {
      total_records: records.length,
      total_paid: records.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0),
      total_guide: records.reduce((sum: number, r: any) => sum + (r.guide_amount || 0), 0),
      total_sputnik: records.reduce((sum: number, r: any) => sum + (r.sputnik_amount || 0), 0),
      avg_ticket_price: records.length ? records.reduce((sum: number, r: any) => sum + (r.ticket_price || 0), 0) / records.length : 0,
      total_tickets: records.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0),
      unique_orders: new Set(records.map((r: any) => r.order_id)).size
    };
  }

  let query = `
    SELECT 
      COUNT(*) as total_records,
      SUM(paid_amount) as total_paid,
      SUM(guide_amount) as total_guide,
      SUM(sputnik_amount) as total_sputnik,
      AVG(ticket_price) as avg_ticket_price,
      SUM(quantity) as total_tickets,
      COUNT(DISTINCT order_id) as unique_orders
    FROM records
  `;

  if (uploadId) {
    query += ' WHERE upload_id = ?';
    return db.prepare(query).get(uploadId);
  }

  return db.prepare(query).get();
}

// ===== FILTERED RECORDS =====

export interface RecordsFilter {
  uploadId?: string;
  dateFrom?: string;
  dateTo?: string;
  tourName?: string;
  search?: string;
}

export async function getFilteredRecords(filter: RecordsFilter) {
  const db = await getDb();

  if (db._inMemory) {
    let records = [...db.records];

    if (filter.uploadId) {
      records = records.filter((r: any) => r.upload_id === filter.uploadId);
    }
    if (filter.dateFrom) {
      records = records.filter((r: any) => r.date && r.date >= filter.dateFrom!);
    }
    if (filter.dateTo) {
      records = records.filter((r: any) => r.date && r.date <= filter.dateTo!);
    }
    if (filter.tourName) {
      records = records.filter((r: any) =>
        r.tour_name && r.tour_name.toLowerCase().includes(filter.tourName!.toLowerCase())
      );
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      records = records.filter((r: any) =>
        (r.tour_name && r.tour_name.toLowerCase().includes(searchLower)) ||
        (r.participant_name && r.participant_name.toLowerCase().includes(searchLower)) ||
        (r.order_id && r.order_id.toLowerCase().includes(searchLower))
      );
    }

    return records;
  }

  const conditions: string[] = [];
  const params: any[] = [];

  if (filter.uploadId) {
    conditions.push('upload_id = ?');
    params.push(filter.uploadId);
  }
  if (filter.dateFrom) {
    conditions.push('date >= ?');
    params.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    conditions.push('date <= ?');
    params.push(filter.dateTo);
  }
  if (filter.tourName) {
    conditions.push('tour_name LIKE ?');
    params.push(`%${filter.tourName}%`);
  }
  if (filter.search) {
    conditions.push('(tour_name LIKE ? OR participant_name LIKE ? OR order_id LIKE ?)');
    const searchPattern = `%${filter.search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  let query = 'SELECT * FROM records';
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY date DESC, time DESC';

  return db.prepare(query).all(...params);
}

