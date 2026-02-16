"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Upload,
  Database,
  RefreshCw,
  Trash2,
  Calendar,
  BarChart3,
  TrendingUp,
  Download,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

import FileUpload from "./FileUpload";
import StatsCards, { StatsCardsSkeleton } from "./StatsCards";
import DataTable from "./DataTable";
import { DateRangePicker } from "./DateRangePicker";
import { ThemeToggle } from "./ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { api, ApiException } from "@/lib/api";
import { RecordData, Statistics } from "@/lib/types";

const Charts = dynamic(() => import("./Charts"), {
  loading: () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <div className="skeleton h-4 w-20 mb-3" />
            <div className="skeleton h-8 w-32 mb-2" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-6">
        <div className="skeleton h-[280px] w-full rounded-lg" />
      </div>
    </div>
  ),
  ssr: false,
});

export default function Dashboard() {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [tourName, setTourName] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"table" | "charts">("table");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsRefreshing(true);
    try {
      const data = await api.records.getAll();
      setRecords(data.records || []);
      setStatistics(data.statistics || null);
      if (data.records && data.records.length > 0) {
        setTourName(data.records[0].tour_name || "");
      }
    } catch (error) {
      if (error instanceof ApiException) {
        toast.error("Ошибка загрузки", { description: error.message });
      } else {
        toast.error("Ошибка", { description: "Не удалось загрузить данные" });
      }
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUploadSuccess = useCallback((uploadId: string) => {
    setCurrentUploadId(uploadId);
    toast.success("Файл загружен", { description: "Данные успешно импортированы" });
    loadData();
  }, [loadData]);

  const handleDeleteAll = async () => {
    try {
      await api.uploads.deleteAll();
      setRecords([]);
      setStatistics(null);
      setTourName("");
      setCurrentUploadId(null);
      setDateRange(undefined);
      toast.success("Данные удалены", { description: "Все отчёты были удалены" });
    } catch (error) {
      if (error instanceof ApiException) {
        toast.error("Ошибка удаления", { description: error.message });
      } else {
        toast.error("Ошибка", { description: "Не удалось удалить данные" });
      }
      console.error("Error deleting data:", error);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!dateRange?.from) return records;
    return records.filter((record) => {
      if (!record.date) return false;
      const [year, month, day] = record.date.split('-').map(Number);
      const recordDate = new Date(year, month - 1, day);
      const from = new Date(dateRange.from!);
      from.setHours(0, 0, 0, 0);
      const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from!);
      to.setHours(23, 59, 59, 999);
      return recordDate >= from && recordDate <= to;
    });
  }, [records, dateRange]);

  const filteredStatistics = useMemo(() => {
    if (!filteredRecords.length) return null;
    return {
      total_records: filteredRecords.length,
      total_paid: filteredRecords.reduce((sum, r) => sum + (r.paid_amount || 0), 0),
      total_guide: filteredRecords.reduce((sum, r) => sum + (r.guide_amount || 0), 0),
      total_sputnik: filteredRecords.reduce((sum, r) => sum + (r.sputnik_amount || 0), 0),
      avg_ticket_price: filteredRecords.reduce((sum, r) => sum + (r.ticket_price || 0), 0) / filteredRecords.length,
      total_tickets: filteredRecords.reduce((sum, r) => sum + (r.quantity || 0), 0),
      unique_orders: new Set(filteredRecords.map(r => r.order_id).filter(Boolean)).size,
    };
  }, [filteredRecords]);

  const handleExportCSV = async () => {
    if (filteredRecords.length === 0) { toast.warning("Нет данных для экспорта"); return; }
    setIsExporting(true);
    try {
      const filename = `tour_export_${new Date().toISOString().split('T')[0]}.csv`;
      api.export.toCSV(filteredRecords, filename);
      toast.success("Экспорт завершён", { description: `Файл ${filename} сохранён` });
    } catch (error) {
      toast.error("Ошибка экспорта", { description: "Не удалось экспортировать данные" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) { toast.warning("Нет данных для экспорта"); return; }
    setIsExporting(true);
    try {
      const filename = `tour_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      await api.export.toExcel(filteredRecords, filename);
      toast.success("Экспорт завершён", { description: `Файл ${filename} сохранён` });
    } catch (error) {
      toast.error("Ошибка экспорта", { description: "Не удалось экспортировать данные" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/70 glass-header sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-accent-blue flex items-center justify-center shadow-sm">
                <Database className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Tour Analytics
                </h1>
                <p className="text-sm text-muted-foreground">
                  Аналитика и отчётность
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <ThemeToggle />

              {records.length > 0 && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-sm rounded-full apple-button"
                        disabled={isExporting}
                      >
                        <Download className="mr-2 size-4" />
                        <span className="hidden sm:inline">Экспорт</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                        <FileSpreadsheet className="mr-2 size-4" />
                        CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                        <FileSpreadsheet className="mr-2 size-4" />
                        Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full apple-button"
                      >
                        <Trash2 className="mr-2 size-4" />
                        <span className="hidden sm:inline">Удалить</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="mx-4 max-w-md rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить все данные?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие нельзя отменить. Все загруженные данные будут безвозвратно удалены.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="h-9 rounded-full">Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAll}
                          className="h-9 rounded-full bg-destructive hover:bg-destructive/90"
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}

              <Button
                onClick={loadData}
                variant="outline"
                size="sm"
                className="h-9 text-sm rounded-full apple-button"
                disabled={isLoading}
              >
                <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Обновить</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Upload Section */}
        {records.length === 0 && !isLoading && (
          <Card className="border opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-accent-blue-lighter flex items-center justify-center">
                  <Upload className="size-6 text-accent-blue" />
                </div>
                <div>
                  <CardTitle className="text-xl">Загрузите отчёт</CardTitle>
                  <CardDescription>
                    Файл .ods с данными сверки Спутник8
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton for empty state */}
        {records.length === 0 && isLoading && (
          <StatsCardsSkeleton />
        )}

        {records.length > 0 && (
          <>
            {/* Quick Toolbar */}
            <div className="flex flex-wrap items-center gap-2 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-1.5 h-9 px-3 bg-accent-blue-lighter rounded-full border border-accent-blue/20">
                <Database className="size-3.5 text-accent-blue" />
                <span className="text-xs text-muted-foreground">Записей:</span>
                <span className="text-xs font-semibold tabular-nums">{records.length.toLocaleString('ru-RU')}</span>
              </div>

              {filteredStatistics && dateRange && (
                <div className="flex items-center gap-1.5 h-9 px-3 bg-accent-purple-lighter rounded-full border border-accent-purple/20">
                  <Calendar className="size-3.5 text-accent-purple" />
                  <span className="text-xs text-muted-foreground">Выбрано:</span>
                  <span className="text-xs font-semibold tabular-nums">{filteredRecords.length.toLocaleString('ru-RU')}</span>
                </div>
              )}

              <div className="hidden sm:block w-px h-5 bg-border/60 mx-1" />

              <FileUpload onUploadSuccess={handleUploadSuccess} compact />

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
                {dateRange && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDateRange(undefined)}
                    className="size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Сбросить фильтр"
                  >
                    <XCircle className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Statistics */}
            {filteredStatistics ? <StatsCards statistics={filteredStatistics} /> : isLoading ? <StatsCardsSkeleton /> : null}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "table" | "charts")} className="space-y-6">
              <TabsList className="relative inline-flex h-10 p-1 bg-muted rounded-full gap-0">
                <div
                  className="absolute top-1 bottom-1 bg-background rounded-full transition-all duration-300 ease-out pointer-events-none border border-accent-blue/25 shadow-sm"
                  style={{
                    width: 'calc(50% - 4px)',
                    left: activeTab === "table" ? '4px' : 'calc(50%)',
                  }}
                />
                <TabsTrigger
                  value="table"
                  className="relative z-10 flex-1 inline-flex items-center justify-center h-8 px-4 text-sm font-medium rounded-full transition-colors bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-accent-blue data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
                >
                  <BarChart3 className="size-4 mr-2" />
                  Таблица
                </TabsTrigger>
                <TabsTrigger
                  value="charts"
                  className="relative z-10 flex-1 inline-flex items-center justify-center h-8 px-4 text-sm font-medium rounded-full transition-colors bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-accent-blue data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
                >
                  <TrendingUp className="size-4 mr-2" />
                  Аналитика
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="space-y-4 mt-0">
                <DataTable records={filteredRecords} isLoading={isLoading} />
              </TabsContent>

              <TabsContent value="charts" className="space-y-4 mt-0">
                <Charts records={filteredRecords} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
