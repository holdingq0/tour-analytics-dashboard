import { NextRequest, NextResponse } from 'next/server';
import { parseTextData } from '@/lib/parseText';
import { insertRecords } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text } = body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json(
                { error: 'Текст не найден или пустой' },
                { status: 400 }
            );
        }

        // Генерируем уникальный ID для загрузки
        const uploadId = randomBytes(16).toString('hex');

        // Парсим текст
        const parsedData = parseTextData(text, uploadId);

        if (parsedData.records.length === 0) {
            return NextResponse.json(
                { error: 'Не удалось распознать данные заказов в тексте. Проверьте формат.' },
                { status: 400 }
            );
        }

        // Сохраняем в базу данных
        await insertRecords(parsedData.records);

        return NextResponse.json({
            success: true,
            uploadId,
            recordCount: parsedData.records.length,
            summary: parsedData.summary,
            message: `✅ Успешно загружено ${parsedData.records.length} записей из ${parsedData.summary.tours} экскурсий`,
        });
    } catch (error: any) {
        console.error('Text upload error:', error);
        return NextResponse.json(
            {
                error: 'Ошибка при обработке текста: ' + (error?.message || 'Unknown error'),
                details: error?.stack
            },
            { status: 500 }
        );
    }
}
