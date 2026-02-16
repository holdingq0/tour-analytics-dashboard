import { NextRequest, NextResponse } from 'next/server';
import { getAllRecords, getStatistics, getFilteredRecords } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uploadId = searchParams.get('uploadId') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const tourName = searchParams.get('tourName') || undefined;
    const search = searchParams.get('search') || undefined;

    // Если есть фильтры - используем фильтрованный запрос
    const hasFilters = dateFrom || dateTo || tourName || search;

    let records;
    let statistics;

    if (hasFilters) {
      records = await getFilteredRecords({
        uploadId,
        dateFrom,
        dateTo,
        tourName,
        search,
      });

      // Пересчитываем статистику для отфильтрованных данных
      statistics = calculateStatistics(records);
    } else {
      [records, statistics] = await Promise.all([
        getAllRecords(uploadId),
        getStatistics(uploadId)
      ]);
    }

    return NextResponse.json({
      records,
      statistics,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Records fetch error:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при получении записей',
        details: error?.message || 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

function calculateStatistics(records: any[]) {
  if (!records || records.length === 0) return null;

  return {
    total_records: records.length,
    total_paid: records.reduce((sum, r) => sum + (r.paid_amount || 0), 0),
    total_guide: records.reduce((sum, r) => sum + (r.guide_amount || 0), 0),
    total_sputnik: records.reduce((sum, r) => sum + (r.sputnik_amount || 0), 0),
    avg_ticket_price: records.reduce((sum, r) => sum + (r.ticket_price || 0), 0) / records.length,
    total_tickets: records.reduce((sum, r) => sum + (r.quantity || 0), 0),
    unique_orders: new Set(records.map(r => r.order_id).filter(Boolean)).size,
  };
}
