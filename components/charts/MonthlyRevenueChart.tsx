"use client";

import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { RecordData } from "@/lib/types";
import { CHART_COLORS, formatCurrency, CustomTooltip } from "@/components/charts/chart-utils";

interface MonthlyRevenueChartProps {
    records: RecordData[];
}

export function MonthlyRevenueChart({ records }: MonthlyRevenueChartProps) {
    const monthlyData = useMemo(() => {
        const grouped = new Map<string, {
            revenue: number;
            guide: number;
            sputnik: number;
            orders: number;
            tickets: number;
        }>();

        for (const record of records) {
            if (!record.date) continue;

            const [year, month] = record.date.split('-');
            const key = `${year}-${month}`;

            if (!grouped.has(key)) {
                grouped.set(key, { revenue: 0, guide: 0, sputnik: 0, orders: 0, tickets: 0 });
            }

            const data = grouped.get(key)!;
            data.revenue += record.paid_amount || 0;
            data.guide += record.guide_amount || 0;
            data.sputnik += record.sputnik_amount || 0;
            data.orders += 1;
            data.tickets += record.quantity || 0;
        }

        return Array.from(grouped.entries())
            .map(([key, data]) => {
                const [year, month] = key.split('-');
                const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                return {
                    month: `${monthNames[parseInt(month) - 1]} ${year}`,
                    sortKey: key,
                    ...data,
                };
            })
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [records]);

    if (monthlyData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="size-5 text-primary" />
                        Динамика по месяцам
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Нет данных для отображения
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="size-5 text-primary" />
                    Динамика по месяцам
                </CardTitle>
                <CardDescription>
                    Выручка, комиссия гиду и Спутнику по месяцам
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                        />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => formatCurrency(value)}
                            className="text-muted-foreground"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar
                            dataKey="revenue"
                            name="Выручка"
                            fill={CHART_COLORS.primary}
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            dataKey="guide"
                            name="Гиду"
                            fill={CHART_COLORS.success}
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            dataKey="sputnik"
                            name="Спутнику"
                            fill={CHART_COLORS.warning}
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default MonthlyRevenueChart;
