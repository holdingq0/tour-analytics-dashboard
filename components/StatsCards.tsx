"use client";

import React from "react";
import { FileText, TrendingUp, Ticket, ShoppingCart, User, Banknote, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Statistics } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface StatsCardsProps {
  statistics: Statistics;
}

const STAT_STYLES = [
  { borderColor: "border-l-accent-blue", iconBg: "bg-accent-blue-lighter", iconColor: "text-accent-blue" },
  { borderColor: "border-l-accent-purple", iconBg: "bg-accent-purple-lighter", iconColor: "text-accent-purple" },
  { borderColor: "border-l-accent-orange", iconBg: "bg-accent-orange-lighter", iconColor: "text-accent-orange" },
  { borderColor: "border-l-accent-green", iconBg: "bg-accent-green-lighter", iconColor: "text-accent-green" },
  { borderColor: "border-l-accent-orange", iconBg: "bg-accent-orange-lighter", iconColor: "text-accent-orange" },
];

const StatsCards = React.memo(function StatsCards({ statistics }: StatsCardsProps) {
  const cashAmount = statistics.total_paid;
  const cashlessAmount = statistics.total_guide - statistics.total_paid;

  const stats = [
    {
      title: "Записей",
      value: statistics.total_records?.toLocaleString("ru-RU") || "0",
      icon: FileText,
      description: "Всего в таблице",
      hasDetails: false,
    },
    {
      title: "Уникальных заказов",
      value: statistics.unique_orders?.toLocaleString("ru-RU") || "0",
      icon: ShoppingCart,
      description: "Разных ID",
      hasDetails: false,
    },
    {
      title: "Билетов",
      value: statistics.total_tickets?.toLocaleString("ru-RU") || "0",
      icon: Ticket,
      description: "Продано",
      hasDetails: false,
    },
    {
      title: "Причитается гиду",
      value: formatCurrency(statistics.total_guide),
      icon: User,
      description: "К выплате",
      hasDetails: true,
      details: { cash: cashAmount, cashless: cashlessAmount },
    },
    {
      title: "Комиссия платформы",
      value: formatCurrency(statistics.total_sputnik),
      icon: TrendingUp,
      description: "Удержано",
      hasDetails: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {stats.map((stat, index) => {
        const style = STAT_STYLES[index];
        return (
          <Card
            key={index}
            className={`apple-card opacity-0 animate-fade-in-up py-0 gap-0 border-l-4 ${style.borderColor}`}
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'forwards',
            }}
          >
            <CardHeader className="px-3 py-2.5 pb-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className={`p-1 rounded-md ${style.iconBg} shrink-0`}>
                  <stat.icon className={`size-3.5 ${style.iconColor}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="text-xl font-semibold tracking-tight tabular-nums leading-none mt-0.5">
                {stat.value}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stat.description}
              </p>
              {stat.hasDetails && stat.details && (
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Banknote className="size-2.5" />
                      <span>Наличными</span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(stat.details.cash)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CreditCard className="size-2.5" />
                      <span>Безналичными</span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(stat.details.cashless)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="py-0 gap-0 border-l-4 border-l-muted">
          <CardHeader className="px-3 py-2.5 pb-0">
            <div className="flex items-center justify-between gap-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton size-6 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="skeleton h-6 w-24 mt-1" />
            <div className="skeleton h-3 w-16 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default StatsCards;
