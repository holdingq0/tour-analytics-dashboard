import {
    RecordsResponse,
    UploadResponse,
    UploadsResponse,
    RecordsFilter,
    ApiError,
    API_ENDPOINTS,
    FILE_CONFIG,
} from './types';

// ===== ERROR HANDLING =====

export class ApiException extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public details?: string
    ) {
        super(message);
        this.name = 'ApiException';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
            error: 'Неизвестная ошибка сервера',
        }));
        throw new ApiException(
            errorData.error,
            response.status,
            errorData.details
        );
    }
    return response.json();
}

// ===== RECORDS API =====

export const recordsApi = {
    /**
     * Получить все записи с фильтрацией
     */
    async getAll(filter?: RecordsFilter): Promise<RecordsResponse> {
        const params = new URLSearchParams();

        if (filter?.uploadId) params.set('uploadId', filter.uploadId);
        if (filter?.dateFrom) params.set('dateFrom', filter.dateFrom);
        if (filter?.dateTo) params.set('dateTo', filter.dateTo);
        if (filter?.tourName) params.set('tourName', filter.tourName);
        if (filter?.search) params.set('search', filter.search);

        const url = `${API_ENDPOINTS.RECORDS}${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url);
        return handleResponse<RecordsResponse>(response);
    },
};

// ===== UPLOADS API =====

export const uploadsApi = {
    /**
     * Загрузить файл
     */
    async upload(file: File): Promise<UploadResponse> {
        // Валидация на клиенте
        if (file.size > FILE_CONFIG.MAX_SIZE) {
            throw new ApiException(
                `Файл слишком большой. Максимальный размер: ${FILE_CONFIG.MAX_SIZE / 1024 / 1024}MB`,
                400
            );
        }

        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!FILE_CONFIG.ALLOWED_EXTENSIONS.includes(extension as '.ods')) {
            throw new ApiException(
                `Неподдерживаемый формат файла. Разрешены: ${FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`,
                400
            );
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(API_ENDPOINTS.UPLOAD, {
            method: 'POST',
            body: formData,
        });

        return handleResponse<UploadResponse>(response);
    },

    /**
     * Получить список загрузок
     */
    async getAll(): Promise<UploadsResponse> {
        const response = await fetch(API_ENDPOINTS.UPLOADS);
        return handleResponse<UploadsResponse>(response);
    },

    /**
     * Удалить загрузку
     */
    async delete(uploadId?: string): Promise<{ success: boolean }> {
        const response = await fetch(API_ENDPOINTS.UPLOADS, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uploadId }),
        });
        return handleResponse<{ success: boolean }>(response);
    },

    /**
     * Удалить все загрузки
     */
    async deleteAll(): Promise<{ success: boolean }> {
        const response = await fetch(API_ENDPOINTS.UPLOADS, {
            method: 'DELETE',
        });
        return handleResponse<{ success: boolean }>(response);
    },

    /**
     * Загрузить текстовые данные
     */
    async uploadText(text: string): Promise<UploadResponse> {
        if (!text || text.trim().length === 0) {
            throw new ApiException('Текст не может быть пустым', 400);
        }

        const response = await fetch('/api/upload-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        return handleResponse<UploadResponse>(response);
    },
};

// ===== EXPORT API =====

export const exportApi = {
    /**
     * Экспортировать данные в CSV
     */
    toCSV(records: any[], filename: string = 'export.csv'): void {
        if (records.length === 0) return;

        const headers = [
            'Дата',
            'Время',
            'ID Заказа',
            'Экскурсия',
            'Участник',
            'Категория',
            'Цена билета',
            'Кол-во',
            'Оплачено',
            'Комиссия %',
            'Гиду',
            'Спутнику',
        ];

        const rows = records.map(r => [
            r.date || '',
            r.time || '',
            r.order_id || '',
            r.tour_name || '',
            r.participant_name || '',
            r.ticket_category || '',
            r.ticket_price || '',
            r.quantity || '',
            r.paid_amount || '',
            r.commission_percent || '',
            r.guide_amount || '',
            r.sputnik_amount || '',
        ]);

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Экспортировать данные в Excel (XLSX)
     */
    async toExcel(records: any[], filename: string = 'export.xlsx'): Promise<void> {
        const XLSX = await import('xlsx');

        const data = records.map(r => ({
            'Дата': r.date || '',
            'Время': r.time || '',
            'ID Заказа': r.order_id || '',
            'Экскурсия': r.tour_name || '',
            'Участник': r.participant_name || '',
            'Категория': r.ticket_category || '',
            'Цена билета': r.ticket_price || 0,
            'Кол-во': r.quantity || 0,
            'Оплачено': r.paid_amount || 0,
            'Комиссия %': r.commission_percent || 0,
            'Гиду': r.guide_amount || 0,
            'Спутнику': r.sputnik_amount || 0,
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Данные');

        XLSX.writeFile(workbook, filename);
    },
};

// ===== COMBINED API OBJECT =====

export const api = {
    records: recordsApi,
    uploads: uploadsApi,
    export: exportApi,
};

export default api;
