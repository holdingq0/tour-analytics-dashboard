"use client";

import { useMemo } from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ticket } from "lucide-react";
import { RecordData } from "@/lib/types";
import { CHART_COLORS_ARRAY, formatCurrency } from "@/components/charts/chart-utils";

interface CategoryDistributionChartProps {
    records: RecordData[];
}

export function CategoryDistributionChart({ records }: CategoryDistributionChartProps) {
    const categoryData = useMemo(() => {
        const grouped = new Map<string, { value: number; count: number }>();

        for (const record of records) {
            const category = record.ticket_category || 'Без категории';

            if (!grouped.has(category)) {
                grouped.set(category, { value: 0, count: 0 });
            }

            const data = grouped.get(category)!;
            data.value += record.paid_amount || 0;
            data.count += record.quantity || 1;
        }

        return Array.from(grouped.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 categories
    }, [records]);

    if (categoryData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="size-5 text-primary" />
                        Распределение по категориям
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
                    <Ticket className="size-5 text-primary" />
                    Распределение по категориям
                </CardTitle>
                <CardDescription>
                    Выручка по категориям билетов
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {categoryData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS_ARRAY[index % CHART_COLORS_ARRAY.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value) => formatCurrency(value as number)}
                            contentStyle={{
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default CategoryDistributionChart;
