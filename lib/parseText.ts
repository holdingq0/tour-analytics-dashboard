import { Record } from './db';
import { parseLogger as logger } from './logger';

export interface TextParsedData {
    records: Record[];
    summary: {
        totalTickets: number;
        totalAmount: number;
        tours: number;
    };
}

interface ParsedOrder {
    orderId: string;
    tourName: string;
    date: string;
    time: string;
    status: string;
    prepayment: number;
    paymentOnSpot: number;
    discount: string;
    participantName: string;
    phone: string;
    email: string;
    tickets: {
        category: string;
        quantity: number;
    }[];
}

// Парсинг текстового формата заказов
export function parseTextData(text: string, uploadId: string): TextParsedData {
    const records: Record[] = [];
    const orders = splitIntoOrders(text);

    logger.info(`Найдено ${orders.length} заказов в тексте`);

    for (const orderText of orders) {
        try {
            const order = parseOrder(orderText);
            if (order) {
                const orderRecords = convertOrderToRecords(order, uploadId);
                records.push(...orderRecords);
            }
        } catch (error) {
            logger.error('Ошибка парсинга заказа:', error);
        }
    }

    const summary = {
        totalTickets: records.reduce((sum, r) => sum + (r.quantity || 0), 0),
        totalAmount: records.reduce((sum, r) => sum + (r.paid_amount || 0), 0),
        tours: new Set(records.map(r => r.tour_name)).size,
    };

    logger.success(`Распарсено записей: ${records.length}`);

    return { records, summary };
}

// Разделяем текст на отдельные заказы
function splitIntoOrders(text: string): string[] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const orders: string[] = [];
    let currentOrder: string[] = [];

    for (const line of lines) {
        // Новый заказ начинается с числового ID (6-7 цифр)
        if (/^\d{5,8}$/.test(line) && currentOrder.length > 0) {
            orders.push(currentOrder.join('\n'));
            currentOrder = [line];
        } else {
            currentOrder.push(line);
        }
    }

    // Не забываем последний заказ
    if (currentOrder.length > 0) {
        orders.push(currentOrder.join('\n'));
    }

    return orders;
}

// Парсинг одного заказа
function parseOrder(orderText: string): ParsedOrder | null {
    const lines = orderText.split('\n').map(l => l.trim()).filter(l => l);

    if (lines.length < 5) {
        return null;
    }

    // Первая строка - ID заказа
    const orderId = lines[0];
    if (!/^\d{5,8}$/.test(orderId)) {
        return null;
    }

    // Вторая строка - название экскурсии
    const tourName = lines[1];

    // Третья строка - дата и время (например: "04 янв 2026 в 12:00")
    const dateTimeLine = lines[2];
    const { date, time } = parseDateTimeLine(dateTimeLine);

    // Четвёртая строка - статус
    const status = lines[3];

    // Ищем строки с финансами
    let prepayment = 0;
    let paymentOnSpot = 0;
    let discount = '—';

    for (const line of lines) {
        if (line.startsWith('Предоплата:')) {
            prepayment = parseAmount(line);
        } else if (line.startsWith('Оплата на месте:')) {
            paymentOnSpot = parseAmount(line);
        } else if (line.startsWith('Учтена скидка:')) {
            discount = line.replace('Учтена скидка:', '').trim();
        }
    }

    // Ищем имя участника, телефон и email
    let participantName = '';
    let phone = '';
    let email = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Телефон в формате +79...
        if (/^\+?\d{10,12}$/.test(line.replace(/\s/g, ''))) {
            phone = line;
            // Имя обычно перед телефоном
            if (i > 0 && !lines[i - 1].includes(':') && !lines[i - 1].includes('₽')) {
                participantName = lines[i - 1];
            }
        }

        // Email
        if (/@/.test(line) && /\.[a-z]{2,}$/i.test(line)) {
            email = line;
        }
    }

    // Ищем билеты (после строки с "билет")
    const tickets: { category: string; quantity: number }[] = [];
    let ticketSectionStarted = false;

    for (const line of lines) {
        if (/^\d+\s+билет/i.test(line)) {
            ticketSectionStarted = true;
            continue;
        }

        if (ticketSectionStarted) {
            const ticketMatch = line.match(/^(.+?)\s+x(\d+)$/);
            if (ticketMatch) {
                tickets.push({
                    category: ticketMatch[1].trim(),
                    quantity: parseInt(ticketMatch[2]),
                });
            }
        }
    }

    return {
        orderId,
        tourName,
        date,
        time,
        status,
        prepayment,
        paymentOnSpot,
        discount,
        participantName,
        phone,
        email,
        tickets,
    };
}

// Парсинг даты и времени из строки "04 янв 2026 в 12:00"
function parseDateTimeLine(line: string): { date: string; time: string } {
    const months: { [key: string]: string } = {
        'янв': '01', 'января': '01',
        'фев': '02', 'февраля': '02',
        'мар': '03', 'марта': '03',
        'апр': '04', 'апреля': '04',
        'май': '05', 'мая': '05',
        'июн': '06', 'июня': '06',
        'июл': '07', 'июля': '07',
        'авг': '08', 'августа': '08',
        'сен': '09', 'сентября': '09',
        'окт': '10', 'октября': '10',
        'ноя': '11', 'ноября': '11',
        'дек': '12', 'декабря': '12',
    };

    // Пример: "04 янв 2026 в 12:00"
    const match = line.match(/(\d{1,2})\s+(\S+)\s+(\d{4})\s+в\s+(\d{1,2}):(\d{2})/);

    if (match) {
        const day = match[1].padStart(2, '0');
        const monthKey = match[2].toLowerCase();
        const month = months[monthKey] || '01';
        const year = match[3];
        const hour = match[4].padStart(2, '0');
        const minute = match[5];

        return {
            date: `${year}-${month}-${day}`,
            time: `${hour}:${minute}`,
        };
    }

    return { date: '', time: '' };
}

// Парсинг суммы из строки "Предоплата: 1200.00 ₽"
function parseAmount(line: string): number {
    const match = line.match(/([\d.,]+)\s*₽/);
    if (match) {
        return parseFloat(match[1].replace(',', '.'));
    }
    return 0;
}

// Конвертация заказа в записи базы данных
function convertOrderToRecords(order: ParsedOrder, uploadId: string): Record[] {
    const records: Record[] = [];
    const totalAmount = order.prepayment + order.paymentOnSpot;

    // Если есть билеты, создаём запись для каждого типа
    if (order.tickets.length > 0) {
        const ticketCount = order.tickets.reduce((sum, t) => sum + t.quantity, 0);
        const pricePerTicket = ticketCount > 0 ? totalAmount / ticketCount : 0;

        for (const ticket of order.tickets) {
            records.push({
                upload_id: uploadId,
                tour_name: order.tourName,
                date: order.date,
                time: order.time,
                order_id: order.orderId,
                participant_name: order.participantName,
                ticket_category: ticket.category,
                ticket_price: pricePerTicket,
                quantity: ticket.quantity,
                paid_amount: pricePerTicket * ticket.quantity,
                commission_percent: undefined,
                guide_amount: undefined,
                sputnik_amount: undefined,
                comment: order.phone ? `${order.phone} / ${order.email}` : order.email,
            });
        }
    } else {
        // Если билеты не указаны, создаём одну запись
        records.push({
            upload_id: uploadId,
            tour_name: order.tourName,
            date: order.date,
            time: order.time,
            order_id: order.orderId,
            participant_name: order.participantName,
            ticket_category: undefined,
            ticket_price: totalAmount,
            quantity: 1,
            paid_amount: totalAmount,
            commission_percent: undefined,
            guide_amount: undefined,
            sputnik_amount: undefined,
            comment: order.phone ? `${order.phone} / ${order.email}` : order.email,
        });
    }

    return records;
}
