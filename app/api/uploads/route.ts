import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE() {
  try {
    const db = await getDb();
    if (db._inMemory) {
      db.records = [];
    } else if (db.prepare) {
      db.prepare('DELETE FROM records').run();
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении данных: ' + (error?.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
