import * as XLSX from 'xlsx';
import { Record } from './db';
import { parseLogger as logger } from './logger';

export interface ParsedData {
  headers: string[];
  rows: any[][];
  records: Record[];
  tourName: string;
  summary?: {
    totalTickets: number;
    totalAmount: number;
    totalCommission: number;
    tours: number;
  };
}

interface TourSummary {
  tourName: string;
  commission: number;
}

export function parseOdsFile(buffer: Buffer, uploadId: string): ParsedData {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false
    });

    if (rawData.length < 5) {
      throw new Error('Файл не содержит достаточно данных');
    }

    const records: Record[] = [];
    const tourSummaries: Map<string, TourSummary> = new Map();
    let globalStats = {
      totalTickets: 0,
      totalAmount: 0,
      totalCommission: 0,
    };

    // Парсим весь файл, определяя разные типы строк
    let i = 0;
    while (i < rawData.length) {
      const row = rawData[i];

      // Пропускаем совсем пустые строки
      if (!row || row.every((cell: any) => !cell || cell === '')) {
        i++;
        continue;
      }

      const firstCell = String(row[0] || '').toLowerCase().trim();

      // ═══ ГЛОБАЛЬНЫЕ ИТОГИ В КОНЦЕ ФАЙЛА ═══
      if (firstCell.includes('всего реализовано')) {
        // "Всего реализовано билетов: 3069 на сумму 7556750.0 RUB"
        const match = firstCell.match(/(\d+)\s+на\s+сумму\s+([\d.]+)/);
        if (match) {
          globalStats.totalTickets = parseInt(match[1]);
          globalStats.totalAmount = parseFloat(match[2]);
        }
        logger.stats('Найдены глобальные итоги по билетам');
        i++;
        continue;
      }

      if (firstCell.includes('суммарная комиссия')) {
        // "Суммарная комиссия ООО "СПУТНИК" за период: 1603210.0 RUB"
        const match = firstCell.match(/([\d.]+)\s+RUB/);
        if (match) {
          globalStats.totalCommission = parseFloat(match[1]);
        }
        logger.money('Найдена суммарная комиссия');
        i++;
        continue;
      }

      if (firstCell.includes('итого к перечислению')) {
        // Конец файла, дальше ничего нет
        logger.end('Достигнут конец данных');
        break;
      }

      // ═══ ИТОГИ ПО ЭКСКУРСИИ ═══
      if (firstCell.includes('комиссия за все заказы данной экскурсии')) {
        // "Комиссия за все заказы данной экскурсии в указанном периоде: 22580.0"
        const commission = row[3] ? parseNumber(row[3]) : 0;
        if (commission && records.length > 0) {
          // Находим последнюю экскурсию в записях и сохраняем сумму
          const lastTour = records[records.length - 1]?.tour_name;
          if (lastTour) {
            tourSummaries.set(lastTour, {
              tourName: lastTour,
              commission: commission,
            });
            logger.info(`💼 Итоги по экскурсии "${lastTour}": комиссия ${commission}`);
          }
        }
        i++;
        continue;
      }

      // ═══ НОВАЯ ЭКСКУРСИЯ (без даты) ═══
      if (firstCell && !isDateString(firstCell) && firstCell.length > 3) {
        const secondCell = String(row[1] || '').toLowerCase().trim();

        // Если второй элемент - это не служебная информация, это новое название экскурсии
        if (secondCell !== 'гиду' && secondCell !== 'спутнику' && secondCell !== 'время' &&
          !secondCell.includes('id') && !secondCell.includes('дата')) {
          logger.tour(`Новая экскурсия: ${firstCell}`);
          i++;
          continue;
        }

        // Это строка с названием экскурсии
        if (secondCell === '') {
          logger.tour(`Новая экскурсия: ${firstCell}`);
          i++;
          continue;
        }
      }

      // ═══ ЗАГОЛОВКИ ТАБЛИЦЫ ═══
      const secondCell = String(row[1] || '').toLowerCase().trim();
      const thirdCell = String(row[2] || '').toLowerCase().trim();

      if (
        (firstCell === 'дата' && secondCell === 'время') ||
        (secondCell === 'гиду' && thirdCell === 'спутнику') ||
        secondCell === 'время' ||
        firstCell.includes('id заказа')
      ) {
        logger.skip('Пропущена служебная строка заголовка');
        i++;
        continue;
      }

      // ═══ ДАННЫЕ ЗАКАЗОВ И БИЛЕТОВ ═══
      // Проверяем, есть ли дата в первой колонке
      const hasDate = firstCell && isDateString(firstCell);
      let currentTourName = '';

      if (hasDate) {
        // ═══ ОСНОВНОЙ ЗАКАЗ ═══
        // Структура: [дата, время, ID, участник, категория, цена, кол-во, оплачено, ?, комиссия%, причитается гиду, причитается спутнику]
        const date = formatDate(row[0]);
        const time = row[1] ? String(row[1]).trim() : '';
        const orderId = row[2] ? String(row[2]).trim() : '';
        const participant = row[3] ? String(row[3]).trim() : '';
        const category = row[4] ? String(row[4]).trim() : undefined;
        const price = row[5] ? parseNumber(row[5]) : undefined;
        const quantity = row[6] ? parseInt(String(row[6])) : undefined;
        const paidAmount = row[7] ? parseNumber(row[7]) : undefined;
        const commissionPercent = row[9] ? parseNumber(row[9]) : 0;
        const guideAmount = row[10] ? parseNumber(row[10]) : undefined;
        const sputnikAmount = row[11] ? parseNumber(row[11]) : undefined;

        // Находим текущее название экскурсии (смотрим назад в records)
        if (records.length > 0) {
          currentTourName = records[records.length - 1].tour_name || 'Не указано';
        }

        const record: Record = {
          upload_id: uploadId,
          tour_name: currentTourName || 'Не указано',
          date: date || undefined,
          time: time || undefined,
          order_id: orderId || undefined,
          participant_name: participant || undefined,
          ticket_category: category,
          ticket_price: price,
          quantity: quantity,
          paid_amount: paidAmount,
          commission_percent: commissionPercent || undefined,
          guide_amount: guideAmount,
          sputnik_amount: sputnikAmount,
          comment: row[12] ? String(row[12]).trim() : undefined,
        };

        if (record.ticket_category || record.paid_amount) {
          records.push(record);
        }
      } else if (!firstCell || firstCell === '') {
        // ═══ ДОПОЛНИТЕЛЬНЫЙ БИЛЕТ К ТЕКУЩЕМУ ЗАКАЗУ ═══
        // Структура смещена: [пусто, категория, цена, кол-во, оплачено?, ?, комиссия%, гиду, спутнику]
        // НО могут быть служебные строки типа ["", "гиду", "спутнику", ...]

        const ticketCategory = row[1] ? String(row[1]).trim() : undefined;

        // Пропускаем служебные подзаголовки
        if (ticketCategory === 'гиду' || ticketCategory === 'спутнику' ||
          ticketCategory === 'время' || ticketCategory === '') {
          logger.skip('Пропущена служебная подстрока');
          i++;
          continue;
        }

        const ticketPrice = row[2] ? parseNumber(row[2]) : undefined;
        const quantity = row[3] ? parseInt(String(row[3])) : undefined;

        // Получаем данные последнего заказа для контекста
        if (records.length > 0) {
          const lastRecord = records[records.length - 1];

          const record: Record = {
            upload_id: uploadId,
            tour_name: lastRecord.tour_name,
            date: lastRecord.date,
            time: lastRecord.time,
            order_id: lastRecord.order_id,
            participant_name: lastRecord.participant_name,
            ticket_category: ticketCategory,
            ticket_price: ticketPrice,
            quantity: quantity,
            paid_amount: undefined, // Нет данных в файле для дополнительных билетов
            commission_percent: lastRecord.commission_percent,
            guide_amount: undefined,
            sputnik_amount: undefined,
            comment: undefined,
          };

          if (record.ticket_category) {
            records.push(record);
          }
        }
      }

      i++;
    }

    logger.success(`Распарсено записей: ${records.length}`);
    logger.stats(`Найдено экскурсий: ${new Set(records.map(r => r.tour_name)).size}`);

    // Получаем последний заголовок если он был
    let headers: string[] = [];
    for (let j = 0; j < rawData.length; j++) {
      const row = rawData[j];
      if (row[0] === 'дата' && row[1] === 'время') {
        headers = row.map((h: any) => String(h || '').trim());
        break;
      }
    }

    return {
      headers,
      rows: records.length > 0 ? rawData.slice(4) : [],
      records,
      tourName: records[0]?.tour_name || 'Не указано',
      summary: {
        totalTickets: globalStats.totalTickets,
        totalAmount: globalStats.totalAmount,
        totalCommission: globalStats.totalCommission,
        tours: new Set(records.map(r => r.tour_name)).size,
      },
    };
  } catch (error) {
    logger.error('Error parsing ODS file:', error);
    throw new Error('Ошибка при парсинге ODS файла: ' + (error as Error).message);
  }
}

function isDateString(str: string): boolean {
  // Проверяем формат DD.MM.YYYY или Excel дату
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) return true;
  if (!isNaN(Number(str)) && Number(str) > 40000 && Number(str) < 60000) return true; // Excel date range
  return false;
}

function formatDate(value: any): string {
  if (!value) return '';

  const str = String(value).trim();

  // Если это уже в формате DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    const [day, month, year] = str.split('.');
    return `${year}-${month}-${day}`;
  }

  // Если это Excel дата (число)
  if (!isNaN(Number(value))) {
    try {
      const date = XLSX.SSF.parse_date_code(Number(value));
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    } catch {
      return str;
    }
  }

  return str;
}

function parseNumber(value: any): number | undefined {
  if (!value || value === '') return undefined;
  const num = parseFloat(String(value).replace(',', '.'));
  return isNaN(num) ? undefined : num;
}
