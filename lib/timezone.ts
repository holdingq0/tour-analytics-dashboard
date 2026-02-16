/**
 * Утилиты для работы с московским временем (MSK)
 * Московское время: UTC+3
 */

/**
 * Получить текущее московское время
 */
export function getMoscowTime(): Date {
  const now = new Date();
  // Конвертируем в московское время (UTC+3)
  const mskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  return mskTime;
}

/**
 * Получить московское время в формате YYYY-MM-DD HH:mm:ss
 */
export function getMoscowTimestamp(): string {
  const msk = getMoscowTime();
  const year = msk.getFullYear();
  const month = String(msk.getMonth() + 1).padStart(2, '0');
  const day = String(msk.getDate()).padStart(2, '0');
  const hours = String(msk.getHours()).padStart(2, '0');
  const minutes = String(msk.getMinutes()).padStart(2, '0');
  const seconds = String(msk.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Конвертировать дату в московское время
 */
export function toMoscowTime(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const mskTime = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  return mskTime;
}

/**
 * Парсить дату из формата YYYY-MM-DD в московское время
 * Важно: устанавливаем время в полночь по МСК, а не UTC
 */
export function parseDateAsMoscow(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Если формат YYYY-MM-DD
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    // Создаем дату в московском timezone
    const dateStr = `${year}-${month}-${day}T00:00:00`;
    const utcDate = new Date(dateStr);
    // Корректируем на московское время (добавляем 3 часа к UTC)
    const moscowOffset = 3 * 60; // MSK = UTC+3
    const localOffset = utcDate.getTimezoneOffset(); // в минутах от UTC
    const totalOffset = moscowOffset + localOffset; // разница между локальным временем и MSK
    
    return new Date(utcDate.getTime() + totalOffset * 60000);
  }
  
  return new Date(dateString);
}

/**
 * Форматировать дату в формат DD.MM.YYYY (московское время)
 */
export function formatMoscowDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateAsMoscow(date) : date;
  const msk = toMoscowTime(d);
  
  const day = String(msk.getDate()).padStart(2, '0');
  const month = String(msk.getMonth() + 1).padStart(2, '0');
  const year = msk.getFullYear();
  
  return `${day}.${month}.${year}`;
}

/**
 * Форматировать дату и время в формат DD.MM.YYYY HH:mm (московское время)
 */
export function formatMoscowDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const msk = toMoscowTime(d);
  
  const day = String(msk.getDate()).padStart(2, '0');
  const month = String(msk.getMonth() + 1).padStart(2, '0');
  const year = msk.getFullYear();
  const hours = String(msk.getHours()).padStart(2, '0');
  const minutes = String(msk.getMinutes()).padStart(2, '0');
  
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Проверить, находится ли дата в диапазоне (московское время)
 */
export function isDateInRange(
  date: Date | string,
  from: Date | undefined,
  to: Date | undefined
): boolean {
  if (!from) return true;
  
  const checkDate = typeof date === 'string' ? parseDateAsMoscow(date) : toMoscowTime(date);
  const fromMsk = toMoscowTime(from);
  const toMsk = to ? toMoscowTime(to) : fromMsk;
  
  // Сбрасываем время до полуночи для корректного сравнения дат
  checkDate.setHours(0, 0, 0, 0);
  fromMsk.setHours(0, 0, 0, 0);
  toMsk.setHours(23, 59, 59, 999);
  
  return checkDate >= fromMsk && checkDate <= toMsk;
}

/**
 * Получить начало дня в московском времени
 */
export function getMoscowDayStart(date?: Date): Date {
  const d = date || getMoscowTime();
  const msk = toMoscowTime(d);
  msk.setHours(0, 0, 0, 0);
  return msk;
}

/**
 * Получить конец дня в московском времени
 */
export function getMoscowDayEnd(date?: Date): Date {
  const d = date || getMoscowTime();
  const msk = toMoscowTime(d);
  msk.setHours(23, 59, 59, 999);
  return msk;
}

