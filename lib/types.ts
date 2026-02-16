// ===== RECORD TYPES =====

export interface RecordData {
    id?: number;
    upload_id: string;
    tour_name: string;
    date: string;
    time: string;
    order_id: string;
    participant_name: string;
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

// ===== STATISTICS TYPES =====

export interface Statistics {
    total_records: number;
    total_paid: number;
    total_guide: number;
    total_sputnik: number;
    avg_ticket_price: number;
    total_tickets: number;
    unique_orders: number;
}

// ===== UPLOAD TYPES =====

export interface UploadInfo {
    upload_id: string;
    record_count: number;
    created_at: string;
}

export interface UploadResponse {
    success: boolean;
    uploadId: string;
    recordCount: number;
    headers: string[];
    summary?: ParsedSummary;
    message: string;
}

export interface ParsedSummary {
    totalTickets: number;
    totalAmount: number;
    totalCommission: number;
    tours: number;
}

// ===== API RESPONSE TYPES =====

export interface RecordsResponse {
    records: RecordData[];
    statistics: Statistics | null;
}

export interface UploadsResponse {
    uploads: UploadInfo[];
}

export interface ApiError {
    error: string;
    details?: string;
}

// ===== GROUPED DATA TYPES =====

export interface GroupedOrder {
    orderId: string;
    date: string;
    time: string;
    participantName: string;
    tourName: string;
    tickets: TicketInfo[];
    totalPaid: number;
    totalGuide: number;
    totalSputnik: number;
    commissionPercent: number;
}

export interface TicketInfo {
    category: string;
    price: number;
    quantity: number;
}

// ===== CHART DATA TYPES =====

export interface MonthlyData {
    month: string;
    revenue: number;
    guide: number;
    sputnik: number;
    orders: number;
    tickets: number;
}

export interface TourData {
    name: string;
    revenue: number;
    orders: number;
    tickets: number;
}

export interface CategoryData {
    name: string;
    value: number;
    count: number;
}

// ===== PAGINATION TYPES =====

export interface PaginationParams {
    page: number;
    pageSize: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ===== FILTER TYPES =====

export interface DateRangeFilter {
    from?: Date;
    to?: Date;
}

export interface RecordsFilter {
    uploadId?: string;
    dateFrom?: string;
    dateTo?: string;
    tourName?: string;
    search?: string;
}

// ===== CONSTANTS =====

export const FILE_CONFIG = {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_EXTENSIONS: ['.ods'],
} as const;

export const PAGINATION_CONFIG = {
    DEFAULT_PAGE_SIZE: 25,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100] as const,
} as const;

export const API_ENDPOINTS = {
    RECORDS: '/api/records',
    UPLOAD: '/api/upload',
    UPLOADS: '/api/uploads',
} as const;
