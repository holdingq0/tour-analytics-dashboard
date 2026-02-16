import { NextRequest, NextResponse } from 'next/server';
import { parseOdsFile } from '@/lib/parseOds';
import { insertRecords } from '@/lib/db';
import { randomBytes } from 'crypto';
import { FILE_CONFIG } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      );
    }

    // Проверяем размер файла
    if (file.size > FILE_CONFIG.MAX_SIZE) {
      return NextResponse.json(
        { error: `Файл слишком большой. Максимальный размер: ${FILE_CONFIG.MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Проверяем расширение файла
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!FILE_CONFIG.ALLOWED_EXTENSIONS.includes(extension as '.ods')) {
      return NextResponse.json(
        { error: `Неверный формат файла. Поддерживаются: ${FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Читаем файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Генерируем уникальный ID для загрузки
    const uploadId = randomBytes(16).toString('hex');

    // Парсим файл
    const parsedData = parseOdsFile(buffer, uploadId);

    // Сохраняем в базу данных
    if (parsedData.records.length > 0) {
      await insertRecords(parsedData.records);
    }

    return NextResponse.json({
      success: true,
      uploadId,
      recordCount: parsedData.records.length,
      headers: parsedData.headers,
      summary: parsedData.summary,
      message: `✅ Успешно загружено ${parsedData.records.length} записей из ${parsedData.summary?.tours} экскурсий`,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при загрузке файла: ' + (error?.message || 'Unknown error'),
        details: error?.stack
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
