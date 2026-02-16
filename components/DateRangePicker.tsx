"use client";

import * as React from "react";
import { addDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
    dateRange: DateRange | undefined;
    onDateRangeChange: (range: DateRange | undefined) => void;
    className?: string;
}

const presets = [
    { label: "7 дней", days: 6 },
    { label: "14 дней", days: 13 },
    { label: "30 дней", days: 29 },
    { label: "90 дней", days: 89 },
];

export function DateRangePicker({
    dateRange,
    onDateRangeChange,
    className,
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant="outline"
                        className={cn(
                            "w-full sm:w-auto justify-start text-left font-normal h-9 px-3 rounded-full apple-button",
                            !dateRange && "text-muted-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="size-3.5 text-muted-foreground" />
                            <span className="text-xs">
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "dd MMM", { locale: ru })} — {format(dateRange.to, "dd MMM", { locale: ru })}
                                        </>
                                    ) : (
                                        format(dateRange.from, "dd LLL y", { locale: ru })
                                    )
                                ) : (
                                    "Выберите период"
                                )}
                            </span>
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl" align="start">
                    <div className="flex">
                        {/* Presets */}
                        <div className="border-r border-border">
                            <div className="p-3 space-y-1">
                                <div className="text-xs font-medium mb-3 px-2 text-muted-foreground">
                                    Быстрый выбор
                                </div>

                                {/* Days */}
                                {presets.map((preset) => (
                                    <Button
                                        key={preset.days}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start font-normal text-xs h-8 px-2.5 rounded-full"
                                        onClick={() => {
                                            const today = new Date();
                                            onDateRangeChange({
                                                from: addDays(today, -preset.days),
                                                to: today,
                                            });
                                        }}
                                    >
                                        {preset.label}
                                    </Button>
                                ))}

                                <div className="h-px bg-border my-2" />

                                {/* Months */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start font-normal text-xs h-8 px-2.5 rounded-full"
                                    onClick={() => {
                                        const today = new Date();
                                        onDateRangeChange({
                                            from: startOfMonth(today),
                                            to: endOfMonth(today),
                                        });
                                    }}
                                >
                                    Этот месяц
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start font-normal text-xs h-8 px-2.5 rounded-full"
                                    onClick={() => {
                                        const today = new Date();
                                        const lastMonth = subMonths(today, 1);
                                        onDateRangeChange({
                                            from: startOfMonth(lastMonth),
                                            to: endOfMonth(lastMonth),
                                        });
                                    }}
                                >
                                    Прошлый месяц
                                </Button>

                                <div className="h-px bg-border my-2" />

                                {/* Year */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start font-normal text-xs h-8 px-2.5 rounded-full"
                                    onClick={() => {
                                        const today = new Date();
                                        onDateRangeChange({
                                            from: startOfYear(today),
                                            to: endOfYear(today),
                                        });
                                    }}
                                >
                                    Весь год
                                </Button>
                            </div>
                        </div>

                        {/* Calendar */}
                        <div className="p-3">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={onDateRangeChange}
                                numberOfMonths={2}
                                locale={ru}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
