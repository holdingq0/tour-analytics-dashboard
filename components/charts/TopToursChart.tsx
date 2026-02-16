"use client";

import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { RecordData } from "@/lib/types";
import { CHART_COLORS, formatCurrency, CustomTooltip } from "@/components/charts/chart-utils";

interface TopToursChartProps {
    records: RecordData[];
    limit?: number;
}

export function TopToursChart({ records, limit = 10 }: TopToursChartProps) {
    const tourData = useMemo(() => {
        const grouped = new Map<string, {
            revenue: number;
            orders: number;
            tickets: number;
        }>();

        for (const record of records) {
            const tourName = record.tour_name || 'Без названия';

            if (!grouped.has(tourName)) {
                grouped.set(tourName, { revenue: 0, orders: 0, tickets: 0 });
            }

            const data = grouped.get(tourName)!;
            data.revenue += record.paid_amount || 0;
            data.orders += 1;
            data.tickets += record.quantity || 0;
        }

        return Array.from(grouped.entries())
            .map(([name, data]) => ({
                name: name.length > 40 ? name.substring(0, 40) + '...' : name,
                fullName: name,
                ...data,
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);
    }, [records, limit]);

    if (tourData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="size-5 text-primary" />
                        Топ экскурсий по выручке
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
                    <Trophy className="size-5 text-primary" />
                    Топ {limit} экскурсий по выручке
                </CardTitle>
                <CardDescription>
                    Рейтинг экскурсий по общей выручке
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(350, tourData.length * 45)}>
                    <BarChart
                        data={tourData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => formatCurrency(value)}
                            className="text-muted-foreground"
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            width={200}
                            className="text-muted-foreground"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="revenue"
                            name="Выручка"
                            fill={CHART_COLORS.primary}
                            radius={[0, 4, 4, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default TopToursChart;
