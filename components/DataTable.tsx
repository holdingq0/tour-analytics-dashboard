"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ArrowUpDown, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Layers } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecordData } from "@/lib/types";
import { formatCurrencyTable } from "@/lib/utils";

interface DataTableProps {
  records: RecordData[];
  isLoading: boolean;
}

type SortDirection = "asc" | "desc" | null;
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  try {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  } catch { return dateStr; }
};

const DataTable = React.memo(function DataTable({ records, isLoading }: DataTableProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, any[]>();
    records.forEach(record => {
      const orderId = record.order_id || `no-id-${record.id}`;
      if (!groups.has(orderId)) groups.set(orderId, []);
      groups.get(orderId)!.push(record);
    });

    return Array.from(groups.entries()).map(([orderId, items]) => {
      const first = items[0];
      const hasMultipleItems = items.length > 1;
      return {
        order_id: orderId,
        date: first.date,
        time: first.time,
        participant_name: first.participant_name,
        ticket_category: hasMultipleItems ? `${items.length} категорий` : first.ticket_category,
        ticket_price: items.reduce((sum: number, r: any) => sum + (r.ticket_price || 0), 0),
        quantity: items.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0),
        paid_amount: items.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0),
        guide_amount: items.reduce((sum: number, r: any) => sum + (r.guide_amount || 0), 0),
        sputnik_amount: items.reduce((sum: number, r: any) => sum + (r.sputnik_amount || 0), 0),
        _items: items,
        _hasMultiple: hasMultipleItems,
        _isExpanded: expandedOrders.has(orderId),
      };
    });
  }, [records, expandedOrders]);

  const filteredAndSortedRecords = useMemo(() => {
    let filtered = [...groupedRecords];
    if (searchTerm) {
      filtered = filtered.filter((record) =>
        Object.values(record).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[sortColumn];
        const bVal = (b as any)[sortColumn];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return sortDirection === "asc" ? aStr.localeCompare(bStr, "ru") : bStr.localeCompare(aStr, "ru");
      });
    }
    return filtered;
  }, [groupedRecords, searchTerm, sortColumn, sortDirection]);

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) newSet.delete(orderId);
      else newSet.add(orderId);
      return newSet;
    });
  };

  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedRecords.slice(start, start + itemsPerPage);
  }, [filteredAndSortedRecords, currentPage, itemsPerPage]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") { setSortDirection(null); setSortColumn(null); }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="size-3 ml-1 inline text-muted-foreground/30" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="size-3 ml-1 inline text-accent-blue" />;
    }
    return <ChevronDown className="size-3 ml-1 inline text-accent-blue" />;
  };

  if (isLoading) {
    return (
      <Card className="apple-card overflow-hidden">
        <CardHeader className="px-5 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="skeleton h-5 w-40 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
            <div className="skeleton h-9 w-72 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <div className="flex gap-4 px-4 py-3 bg-muted/50">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-t border-border/30">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} className="skeleton h-4 flex-1" style={{ animationDelay: `${(i * 8 + j) * 20}ms` }} />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="apple-card opacity-0 animate-fade-in-up overflow-hidden" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
      <CardHeader className="px-5 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">Детализация заказов</CardTitle>
            <CardDescription className="text-sm flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                {paginatedRecords.length} / {filteredAndSortedRecords.length}
              </Badge>
              <span>записей</span>
            </CardDescription>
          </div>

          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-9 text-sm rounded-full"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(""); setSearchTerm(""); setCurrentPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="border-t overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b bg-muted/50">
                  <TableHead className="w-8 sticky left-0 bg-muted/50 z-10"></TableHead>
                  {[
                    { key: "date", label: "Дата", width: "w-24" },
                    { key: "time", label: "Время", width: "w-16" },
                    { key: "order_id", label: "ID", width: "w-24" },
                    { key: "participant_name", label: "Участник", width: "min-w-[120px]" },
                    { key: "ticket_category", label: "Категория", width: "min-w-[140px]" },
                    { key: "ticket_price", label: "Цена", width: "w-20", align: "text-right" },
                    { key: "quantity", label: "Кол-во", width: "w-16", align: "text-center" },
                    { key: "paid_amount", label: "Оплачено", width: "w-24", align: "text-right" },
                    { key: "guide_amount", label: "Гиду", width: "w-24", align: "text-right" },
                    { key: "sputnik_amount", label: "Спутнику", width: "w-24", align: "text-right" },
                  ].map(col => (
                    <TableHead
                      key={col.key}
                      className={`cursor-pointer hover:bg-muted ${col.width} transition-colors ${col.align || ''} ${sortColumn === col.key ? 'text-foreground' : ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="text-xs font-medium">{col.label}</span>
                      <SortIcon column={col.key} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                          <Layers className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-sm">Нет данных</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.flatMap((record, index) => {
                    const rows = [];
                    rows.push(
                      <TableRow
                        key={record.order_id || index}
                        className={`text-sm transition-colors ${record._hasMultiple
                          ? 'bg-muted/30 hover:bg-muted/50'
                          : index % 2 === 0
                            ? 'hover:bg-muted/30'
                            : 'bg-muted/15 hover:bg-muted/30'
                          }`}
                      >
                        <TableCell className="w-8">
                          {record._hasMultiple && (
                            <button
                              onClick={() => toggleOrderExpansion(record.order_id)}
                              className="hover:bg-muted rounded-full p-1.5 transition-colors"
                            >
                              {expandedOrders.has(record.order_id) ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-xs sticky left-0 bg-background z-10">{formatDate(record.date)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{record.time || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">{record.order_id || "-"}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs" title={record.participant_name}>{record.participant_name || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs" title={record.ticket_category}>
                          {record._hasMultiple ? (
                            <Badge variant="secondary" className="text-xs">
                              <Layers className="size-3 mr-1" />
                              {record.ticket_category}
                            </Badge>
                          ) : (record.ticket_category || "-")}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">{formatCurrencyTable(record.ticket_price)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs tabular-nums">{record.quantity || "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs tabular-nums">{formatCurrencyTable(record.paid_amount)}</TableCell>
                        <TableCell className="text-right font-medium text-xs tabular-nums">{formatCurrencyTable(record.guide_amount)}</TableCell>
                        <TableCell className="text-right font-medium text-xs tabular-nums">{formatCurrencyTable(record.sputnik_amount)}</TableCell>
                      </TableRow>
                    );

                    if (record._hasMultiple && expandedOrders.has(record.order_id)) {
                      record._items.forEach((item: any, itemIndex: number) => {
                        rows.push(
                          <TableRow key={`${record.order_id}-${itemIndex}`} className="text-sm bg-muted/20 animate-fade-in" style={{ animationDuration: '0.15s' }}>
                            <TableCell className="pl-8"></TableCell>
                            <TableCell className="text-xs text-muted-foreground sticky left-0 bg-muted/20 z-10">
                              <span className="text-muted-foreground/50">↳</span> #{itemIndex + 1}
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.participant_name || "-"}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs" title={item.ticket_category}>{item.ticket_category || "-"}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground tabular-nums">{formatCurrencyTable(item.ticket_price)}</TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="text-xs">{item.quantity || "-"}</Badge></TableCell>
                            <TableCell className="text-right text-xs tabular-nums">{formatCurrencyTable(item.paid_amount)}</TableCell>
                            <TableCell className="text-right text-xs tabular-nums">{formatCurrencyTable(item.guide_amount)}</TableCell>
                            <TableCell className="text-right text-xs tabular-nums">{formatCurrencyTable(item.sputnik_amount)}</TableCell>
                          </TableRow>
                        );
                      });
                    }
                    return rows;
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Показывать:</span>
              <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20 h-9 text-sm rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 w-9 p-0 rounded-full">
                <ChevronLeft className="size-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-9 h-9 p-0 text-sm rounded-full"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 w-9 p-0 rounded-full">
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground text-center sm:text-right">
              Стр. <span className="font-medium text-foreground">{currentPage}</span> из <span className="font-medium text-foreground">{totalPages}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default DataTable;
