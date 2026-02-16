"use client";

// Цветовая палитра для графиков
export const CHART_COLORS = {
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    purple: "#8b5cf6",
    pink: "#ec4899",
    teal: "#14b8a6",
    indigo: "#6366f1",
} as const;

export const CHART_COLORS_ARRAY = [
    CHART_COLORS.primary,
    CHART_COLORS.success,
    CHART_COLORS.purple,
    CHART_COLORS.warning,
    CHART_COLORS.pink,
    CHART_COLORS.teal,
    CHART_COLORS.indigo,
    CHART_COLORS.danger,
];

// Форматирование валюты
export function formatCurrency(value: number): string {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M ₽`;
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K ₽`;
    }
    return `${value.toFixed(0)} ₽`;
}

// Полное форматирование валюты
export function formatCurrencyFull(value: number): string {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

// Кастомный Tooltip для графиков
interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
            <p className="font-medium text-foreground mb-2">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="font-medium text-foreground">
                        {typeof entry.value === 'number' ? formatCurrencyFull(entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Кастомный Label для Pie Chart
interface CustomLabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    name: string;
}

export function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: CustomLabelProps) {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Не показываем маленькие сегменты

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            fontSize={12}
            fontWeight={500}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
}

export default {
    CHART_COLORS,
    CHART_COLORS_ARRAY,
    formatCurrency,
    formatCurrencyFull,
    CustomTooltip,
    CustomLabel,
};
