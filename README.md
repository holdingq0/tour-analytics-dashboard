# Tour Analytics Dashboard

Локальный аналитический дашборд для учёта и статистики экскурсий. Все данные обрабатываются и хранятся исключительно на вашем компьютере — никакой телеметрии и внешних запросов.

Доступен как **веб-приложение** (для разработки) и как **десктопное приложение** для Windows.

## Скачать

Перейдите на страницу [Releases](https://github.com/holdingq0/tour-analytics-dashboard/releases) и скачайте последнюю версию установщика (`.exe`).

## Возможности

- **Загрузка ODS-файлов** — Drag & Drop или выбор через диалог
- **Вставка текста** — Прямое копирование заказов из системы бронирования
- **Автоматический парсинг** — Распознавание структуры отчётов
- **Локальная SQLite БД** — Надёжное хранение всех загруженных данных
- **Интерактивные графики** — Динамика по месяцам, топ экскурсий, распределение по категориям
- **Экспорт** — CSV и Excel (XLSX)
- **Тёмная тема** — Автоматическая и ручная
- **Адаптивность** — Работает на любых экранах
- **Десктопное приложение** — Нативное окно через Tauri v2

## Технологии

| Компонент | Версия |
|-----------|--------|
| Next.js | 16 |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| Tauri | 2 |
| SQLite | better-sqlite3 |
| Recharts | 3 |
| shadcn/ui | latest |

## Быстрый старт (разработка)

```bash
# Установка зависимостей
npm install

# Веб-режим
npm run dev

# Десктопное приложение (требуется Rust)
npm run tauri:dev
```

Веб-версия: [http://localhost:3000](http://localhost:3000)

## Сборка десктопного приложения

```bash
# Полная сборка (создаёт установщик в src-tauri/target/release/bundle/)
npm run tauri:build
```

Требуется:
- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/) 1.77+
- Visual Studio Build Tools (Windows)

## Структура проекта

```
app/
├── api/
│   ├── upload/route.ts        # Загрузка ODS-файлов
│   ├── upload-text/route.ts   # Загрузка текстовых данных
│   ├── records/route.ts       # Получение записей с фильтрами
│   └── uploads/route.ts       # Управление загрузками
├── layout.tsx
├── page.tsx
└── globals.css

components/
├── Dashboard.tsx              # Главный компонент
├── FileUpload.tsx             # Загрузка файлов и текста
├── DataTable.tsx              # Таблица с сортировкой
├── StatsCards.tsx             # Карточки статистики
├── Charts.tsx                 # Графики (Recharts)
├── DateRangePicker.tsx        # Фильтр по датам
├── ThemeToggle.tsx            # Переключение тем
├── charts/                    # Отдельные компоненты графиков
└── ui/                        # shadcn/ui компоненты

lib/
├── db.ts                      # SQLite (better-sqlite3)
├── api.ts                     # Клиентский API
├── parseOds.ts                # Парсинг ODS
├── parseText.ts               # Парсинг текстовых заказов
├── types.ts                   # TypeScript типы
├── timezone.ts                # Московское время
├── logger.ts                  # Логирование
└── utils.ts                   # Утилиты
```

## API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/upload` | Загрузка ODS-файла (FormData) |
| POST | `/api/upload-text` | Загрузка текстовых данных |
| GET | `/api/records` | Записи с фильтрами (`uploadId`, `dateFrom`, `dateTo`, `tourName`, `search`) |
| GET | `/api/uploads` | Список загрузок |
| DELETE | `/api/uploads` | Удаление загрузки или всех данных |

## Конфиденциальность

- Нулевая телеметрия — Next.js telemetry отключена
- Все данные хранятся локально в SQLite
- Никаких внешних API-запросов
- Никакой аналитики или трекинга

## Лицензия

MIT

