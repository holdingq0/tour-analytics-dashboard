"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, TrendingUp, Calendar, Ticket, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { RecordData } from "@/lib/types";
import { formatCurrencyShort } from "@/lib/utils";

interface ChartsProps {
  records: RecordData[];
}

const CHART_COLORS = [
  "hsl(220 70% 50%)",
  "hsl(262 60% 55%)",
  "hsl(160 60% 45%)",
  "hsl(35 85% 55%)",
  "hsl(340 65% 55%)",
  "hsl(190 70% 45%)",
  "hsl(280 55% 60%)",
  "hsl(25 75% 55%)",
];

const ICON_STYLES = [
  { bg: "bg-accent-blue-lighter", text: "text-accent-blue" },
  { bg: "bg-accent-green-lighter", text: "text-accent-green" },
  { bg: "bg-accent-purple-lighter", text: "text-accent-purple" },
  { bg: "bg-accent-orange-lighter", text: "text-accent-orange" },
];

function MetricCard({ metric, index }: { metric: any; index: number }) {
  const style = ICON_STYLES[index % ICON_STYLES.length];
  return (
    <Card
      className="apple-card opacity-0 animate-fade-in-up"
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'forwards',
      }}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {metric.title}
            </p>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">
              {metric.value}
            </p>
            {metric.subtitle && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {metric.subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${style.bg} shrink-0`}>
            <metric.icon className={`size-6 ${style.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const weekday = dataPoint?.weekday;

    return (
      <div className="bg-background border border-border rounded-xl p-4 shadow-lg animate-fade-in">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
          <p className="font-medium text-sm">{label}</p>
        </div>
        {weekday && (
          <p className="text-xs text-muted-foreground mb-3 capitalize flex items-center gap-1.5">
            <Calendar className="size-3" />
            {weekday}
          </p>
        )}
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-medium tabular-nums">
                {typeof entry.value === 'number' &&
                  (entry.name.includes('Выручка') || entry.name.includes('Оплачено') ||
                    entry.name.includes('Гиду') || entry.name.includes('Спутнику'))
                  ? formatCurrencyShort(entry.value)
                  : entry.value?.toLocaleString('ru-RU')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Charts = React.memo(function Charts({ records }: ChartsProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomStart, setZoomStart] = useState(0);

  const dailyData = useMemo(() => {
    const dailyStats: Record<string, {
      paid: number;
      guide: number;
      sputnik: number;
      orderData: Map<string, number>;
      tickets: number;
    }> = {};

    records.forEach((record) => {
      if (!record.date) return;
      try {
        const dateKey = record.date;
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {
            paid: 0, guide: 0, sputnik: 0,
            orderData: new Map(), tickets: 0,
          };
        }
        dailyStats[dateKey].paid += record.paid_amount || 0;
        dailyStats[dateKey].guide += record.guide_amount || 0;
        dailyStats[dateKey].sputnik += record.sputnik_amount || 0;
        dailyStats[dateKey].tickets += record.quantity || 0;
        if (record.order_id) {
          const currentQty = dailyStats[dateKey].orderData.get(record.order_id) || 0;
          dailyStats[dateKey].orderData.set(record.order_id, currentQty + (record.quantity || 0));
        }
      } catch (error) { }
    });

    return Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => {
        const [year, month, day] = date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const totalParticipants = Array.from(stats.orderData.values()).reduce((sum, qty) => sum + qty, 0);
        return {
          date,
          weekday: dateObj.toLocaleDateString("ru-RU", { weekday: "long" }),
          dateFormatted: dateObj.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "2-digit" }),
          Оплачено: Math.round(stats.paid),
          Гиду: Math.round(stats.guide),
          Спутнику: Math.round(stats.sputnik),
          "Кол-во людей": totalParticipants,
          "Заказов": stats.orderData.size,
          "Билетов": stats.tickets,
        };
      });
  }, [records]);

  const monthlyData = useMemo(() => {
    const monthlyStats: Record<string, {
      paid: number; guide: number; sputnik: number;
      orderData: Map<string, number>; tickets: number;
    }> = {};

    records.forEach((record) => {
      if (!record.date) return;
      try {
        const [year, month] = record.date.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { paid: 0, guide: 0, sputnik: 0, orderData: new Map(), tickets: 0 };
        }
        monthlyStats[monthKey].paid += record.paid_amount || 0;
        monthlyStats[monthKey].guide += record.guide_amount || 0;
        monthlyStats[monthKey].sputnik += record.sputnik_amount || 0;
        monthlyStats[monthKey].tickets += record.quantity || 0;
        if (record.order_id) {
          const currentQty = monthlyStats[monthKey].orderData.get(record.order_id) || 0;
          monthlyStats[monthKey].orderData.set(record.order_id, currentQty + (record.quantity || 0));
        }
      } catch (error) { }
    });

    return Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, stats]) => {
        const totalParticipants = Array.from(stats.orderData.values()).reduce((sum, qty) => sum + qty, 0);
        return {
          month: new Date(month + "-01").toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }),
          Оплачено: Math.round(stats.paid),
          Гиду: Math.round(stats.guide),
          Спутнику: Math.round(stats.sputnik),
          "Кол-во людей": totalParticipants,
          "Заказов": stats.orderData.size,
          "Билетов": stats.tickets,
        };
      });
  }, [records]);

  const displayData = useMemo(() => {
    if (zoomLevel === 1) {
      return monthlyData.map(item => ({ ...item, label: item.month }));
    } else {
      const totalDays = dailyData.length;
      const visibleDays = Math.max(7, Math.floor(totalDays / zoomLevel));
      const maxStart = Math.max(0, totalDays - visibleDays);
      const start = Math.min(zoomStart, maxStart);
      const end = Math.min(start + visibleDays, totalDays);
      return dailyData.slice(start, end).map(item => ({ ...item, label: item.dateFormatted }));
    }
  }, [zoomLevel, zoomStart, monthlyData, dailyData]);

  const zoomIn = () => setZoomLevel(prev => {
    const newZoom = Math.min(10, prev + 1);
    if (newZoom > 1 && prev === 1) setZoomStart(0);
    return newZoom;
  });
  const zoomOut = () => setZoomLevel(prev => Math.max(1, prev - 1));
  const resetZoom = () => { setZoomLevel(1); setZoomStart(0); };
  const panLeft = () => setZoomStart(prev => Math.max(0, prev - 5));
  const panRight = () => {
    const totalDays = dailyData.length;
    const visibleDays = Math.max(7, Math.floor(totalDays / zoomLevel));
    setZoomStart(prev => Math.min(totalDays - visibleDays, prev + 5));
  };

  const ticketCategoryData = useMemo(() => {
    const categoryStats: Record<string, { count: number, revenue: number }> = {};
    records.forEach((record) => {
      const category = record.ticket_category || "Не указан";
      if (!categoryStats[category]) categoryStats[category] = { count: 0, revenue: 0 };
      categoryStats[category].count += record.quantity || 0;
      categoryStats[category].revenue += record.paid_amount || 0;
    });
    return Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 6)
      .map(([name, data]) => ({
        name: name.length > 20 ? name.slice(0, 20) + "..." : name,
        value: data.count,
        revenue: Math.round(data.revenue),
      }));
  }, [records]);

  const paymentDistribution = useMemo(() => {
    const totals = records.reduce((acc, record) => ({
      guide: acc.guide + (record.guide_amount || 0),
      sputnik: acc.sputnik + (record.sputnik_amount || 0),
    }), { guide: 0, sputnik: 0 });
    return [
      { name: "Гиду", value: Math.round(totals.guide) },
      { name: "Спутнику", value: Math.round(totals.sputnik) },
    ];
  }, [records]);

  const weekdayData = useMemo(() => {
    const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const weekdayStats: Record<number, { orderData: Map<string, number>, revenue: number }> = {};
    for (let i = 0; i < 7; i++) weekdayStats[i] = { orderData: new Map(), revenue: 0 };

    records.forEach((record) => {
      if (!record.date) return;
      try {
        const [year, month, day] = record.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (record.order_id) {
          const currentQty = weekdayStats[dayOfWeek].orderData.get(record.order_id) || 0;
          weekdayStats[dayOfWeek].orderData.set(record.order_id, currentQty + (record.quantity || 0));
        }
        weekdayStats[dayOfWeek].revenue += record.paid_amount || 0;
      } catch (error) { }
    });

    return weekdays.map((name, index) => ({
      day: name,
      Заказов: weekdayStats[index].orderData.size,
      "Кол-во людей": Array.from(weekdayStats[index].orderData.values()).reduce((sum, qty) => sum + qty, 0),
      Выручка: Math.round(weekdayStats[index].revenue),
    }));
  }, [records]);

  const totalOrders = useMemo(() => new Set(records.map(r => r.order_id).filter(Boolean)).size, [records]);
  const totalParticipants = useMemo(() => {
    const orderQuantities = new Map<string, number>();
    records.forEach(record => {
      if (record.order_id) {
        const currentQty = orderQuantities.get(record.order_id) || 0;
        orderQuantities.set(record.order_id, currentQty + (record.quantity || 0));
      }
    });
    return Array.from(orderQuantities.values()).reduce((sum, qty) => sum + qty, 0);
  }, [records]);

  const metrics = [
    {
      title: "Участников",
      value: totalParticipants.toLocaleString("ru-RU"),
      icon: Users,
      subtitle: `${(totalParticipants / Math.max(totalOrders, 1)).toFixed(1)} чел/заказ`,
    },
    {
      title: "Заказов",
      value: totalOrders.toLocaleString("ru-RU"),
      icon: Calendar,
      subtitle: `${monthlyData.length} мес. данных`,
    },
    {
      title: "Билетов",
      value: records.reduce((sum, r) => sum + (r.quantity || 0), 0).toLocaleString("ru-RU"),
      icon: Ticket,
      subtitle: `${ticketCategoryData.length} категорий`,
    },
    {
      title: "Средний чек",
      value: formatCurrencyShort(records.reduce((sum, r) => sum + (r.paid_amount || 0), 0) / Math.max(totalOrders, 1)),
      icon: TrendingUp,
      subtitle: "на заказ",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} index={index} />
        ))}
      </div>

      {/* Sales Dynamics */}
      <Card className="apple-card opacity-0 animate-fade-in-up overflow-hidden" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <CardHeader className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <div className={`size-9 rounded-xl ${ICON_STYLES[0].bg} flex items-center justify-center`}>
                  <TrendingUp className={`size-5 ${ICON_STYLES[0].text}`} />
                </div>
                <CardTitle className="text-lg">
                  Динамика {zoomLevel > 1 ? 'по дням' : 'по месяцам'}
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                {zoomLevel > 1 ? `Уровень ${zoomLevel}/10` : 'Используйте масштабирование для детализации'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              {zoomLevel > 1 && (
                <>
                  <button onClick={panLeft} className="p-2 hover:bg-muted rounded-full transition-colors" title="Назад">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button onClick={panRight} className="p-2 hover:bg-muted rounded-full transition-colors" title="Вперёд">
                    <ChevronRight className="size-4" />
                  </button>
                  <div className="w-px h-5 bg-border mx-1" />
                </>
              )}
              <button onClick={zoomOut} disabled={zoomLevel === 1} className="p-2 hover:bg-muted rounded-full transition-colors disabled:opacity-40" title="Отдалить">
                <ZoomOut className="size-4" />
              </button>
              <button onClick={zoomIn} disabled={zoomLevel === 10} className="p-2 hover:bg-muted rounded-full transition-colors disabled:opacity-40" title="Приблизить">
                <ZoomIn className="size-4" />
              </button>
              {zoomLevel > 1 && (
                <>
                  <div className="w-px h-5 bg-border mx-1" />
                  <button onClick={resetZoom} className="p-2 hover:bg-muted rounded-full transition-colors" title="Сбросить">
                    <RotateCcw className="size-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={displayData}>
              <defs>
                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220 70% 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(220 70% 50%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} angle={zoomLevel > 3 ? -45 : 0} textAnchor={zoomLevel > 3 ? "end" : "middle"} height={zoomLevel > 3 ? 60 : 30} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} tickFormatter={formatCurrencyShort} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} />
              <Area yAxisId="left" type="monotone" dataKey="Оплачено" stroke="hsl(220 70% 50%)" strokeWidth={2} fillOpacity={1} fill="url(#colorPaid)" animationDuration={600} />
              <Line yAxisId="right" type="monotone" dataKey="Кол-во людей" stroke="hsl(262 60% 55%)" strokeWidth={2} dot={zoomLevel > 2 ? { fill: "hsl(262 60% 55%)", r: 3, strokeWidth: 0 } : false} animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="apple-card opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <CardHeader className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className={`size-8 rounded-xl ${ICON_STYLES[1].bg} flex items-center justify-center`}>
                <TrendingUp className={`size-4 ${ICON_STYLES[1].text}`} />
              </div>
              <CardTitle className="text-lg">Распределение выплат</CardTitle>
            </div>
            <CardDescription className="text-sm">По месяцам</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} tickFormatter={formatCurrencyShort} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="Гиду" fill="hsl(160 60% 45%)" radius={[4, 4, 0, 0]} animationDuration={600} />
                <Bar dataKey="Спутнику" fill="hsl(35 85% 55%)" radius={[4, 4, 0, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="apple-card opacity-0 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <CardHeader className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className={`size-8 rounded-xl ${ICON_STYLES[2].bg} flex items-center justify-center`}>
                <Calendar className={`size-4 ${ICON_STYLES[2].text}`} />
              </div>
              <CardTitle className="text-lg">По дням недели</CardTitle>
            </div>
            <CardDescription className="text-sm">Активность</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={weekdayData}>
                <PolarGrid stroke="currentColor" opacity={0.1} />
                <PolarAngleAxis dataKey="day" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.6} />
                <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.4} />
                <Radar name="Заказов" dataKey="Заказов" stroke="hsl(220 70% 50%)" fill="hsl(220 70% 50%)" fillOpacity={0.15} strokeWidth={1.5} animationDuration={600} />
                <Radar name="Кол-во людей" dataKey="Кол-во людей" stroke="hsl(262 60% 55%)" fill="hsl(262 60% 55%)" fillOpacity={0.1} strokeWidth={1.5} animationDuration={600} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Third row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="apple-card opacity-0 animate-fade-in-up" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <CardHeader className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className={`size-8 rounded-xl ${ICON_STYLES[3].bg} flex items-center justify-center`}>
                <Ticket className={`size-4 ${ICON_STYLES[3].text}`} />
              </div>
              <CardTitle className="text-lg">Категории билетов</CardTitle>
            </div>
            <CardDescription className="text-sm">Топ по продажам</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-4 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ticketCategoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} animationDuration={600}>
                  {ticketCategoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="apple-card opacity-0 animate-fade-in-up" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
          <CardHeader className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className={`size-8 rounded-xl ${ICON_STYLES[1].bg} flex items-center justify-center`}>
                <TrendingUp className={`size-4 ${ICON_STYLES[1].text}`} />
              </div>
              <CardTitle className="text-lg">Итоговое распределение</CardTitle>
            </div>
            <CardDescription className="text-sm">Гид / Платформа</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-4 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${formatCurrencyShort(value)}`} labelLine={true} animationDuration={600}>
                  <Cell fill="hsl(160 60% 45%)" stroke="none" />
                  <Cell fill="hsl(35 85% 55%)" stroke="none" />
                </Pie>
                <Tooltip formatter={(value) => formatCurrencyShort(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default Charts;
