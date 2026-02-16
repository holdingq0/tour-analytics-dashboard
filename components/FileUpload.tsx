"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle, CloudUpload, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiException } from "@/lib/api";
import { FILE_CONFIG } from "@/lib/types";

interface FileUploadProps {
  onUploadSuccess: (uploadId: string) => void;
  compact?: boolean;
}

export default function FileUpload({ onUploadSuccess, compact = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Модальное окно для текстового ввода
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [textInput, setTextInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = async (file: File) => {
    // Валидация формата
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!FILE_CONFIG.ALLOWED_EXTENSIONS.includes(extension as '.ods')) {
      const errorMessage = `Неверный формат. Поддерживается: ${FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`;
      setUploadStatus({ type: "error", message: errorMessage });
      toast.error("Ошибка формата", { description: errorMessage });
      return;
    }

    // Валидация размера
    if (file.size > FILE_CONFIG.MAX_SIZE) {
      const errorMessage = `Файл слишком большой. Макс.: ${FILE_CONFIG.MAX_SIZE / 1024 / 1024}MB`;
      setUploadStatus({ type: "error", message: errorMessage });
      toast.error("Ошибка размера", { description: errorMessage });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });
    setUploadProgress(0);

    // Симуляция прогресса
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const data = await api.uploads.upload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadStatus({
        type: "success",
        message: `Загружено ${data.recordCount} записей`,
      });

      toast.success("Файл загружен", {
        description: data.message || `Загружено ${data.recordCount} записей`,
      });

      onUploadSuccess(data.uploadId);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => {
        setUploadStatus({ type: null, message: "" });
        setUploadProgress(0);
      }, 3000);
    } catch (error: any) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof ApiException
        ? error.message
        : error.message || "Ошибка при загрузке файла";

      setUploadStatus({ type: "error", message: errorMessage });
      toast.error("Ошибка загрузки", { description: errorMessage });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Обработка текстового ввода
  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      toast.error("Ошибка", { description: "Введите текст для обработки" });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });
    setUploadProgress(0);

    // Симуляция прогресса
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 20;
      });
    }, 150);

    try {
      const data = await api.uploads.uploadText(textInput);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadStatus({
        type: "success",
        message: `Загружено ${data.recordCount} записей`,
      });

      toast.success("Текст обработан", {
        description: data.message || `Загружено ${data.recordCount} записей`,
      });

      onUploadSuccess(data.uploadId);
      setTextInput("");
      setIsTextDialogOpen(false);

      setTimeout(() => {
        setUploadStatus({ type: null, message: "" });
        setUploadProgress(0);
      }, 3000);
    } catch (error: any) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof ApiException
        ? error.message
        : error.message || "Ошибка при обработке текста";

      setUploadStatus({ type: "error", message: errorMessage });
      toast.error("Ошибка обработки", { description: errorMessage });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Компактный вид (для тулбара)
  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ods"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload-compact"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isUploading}
                size="sm"
                variant="outline"
                className="h-9 px-3 rounded-full text-xs apple-button"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    <span>Загрузка...</span>
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 size-3.5" />
                    <span>Загрузить</span>
                    <ChevronDown className="ml-1 size-3" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer"
              >
                <FileSpreadsheet className="mr-2 size-4" />
                Файл (.ods)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsTextDialogOpen(true)}
                className="cursor-pointer"
              >
                <FileText className="mr-2 size-4" />
                Вставить текст
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {uploadStatus.type && (
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full animate-fade-in ${uploadStatus.type === "success"
              ? "bg-muted text-foreground"
              : "bg-destructive/10 text-destructive"
              }`}>
              {uploadStatus.type === "success" ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <XCircle className="size-3.5 shrink-0" />
              )}
              <span className="truncate max-w-[120px]">{uploadStatus.message}</span>
            </div>
          )}
        </div>

        {/* Модальное окно для ввода текста */}
        <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Вставить данные из текста
              </DialogTitle>
              <DialogDescription>
                Вставьте скопированный текст с заказами. Каждый заказ должен начинаться с ID (6-7 цифр).
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 py-4">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Пример формата:

5113680
Групповая обзорная экскурсия «Город-герой Волгоград» и Мамаев Курган
04 янв 2026 в 12:00
Не подтвержден гидом, Не подтвержден туристом

Предоплата: 1200.00 ₽
Оплата на месте: 3800.00 ₽
Учтена скидка: —

Анна
+79001234567
anna@example.com

2 билета:
Взрослый 12+ (4 часа) x2`}
                className="min-h-[300px] font-mono text-sm resize-none"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {textInput.trim() ? `${textInput.split('\n').filter(l => /^\d{5,8}$/.test(l.trim())).length} заказов найдено` : 'Введите текст'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsTextDialogOpen(false)}
                  className="rounded-full"
                  size="sm"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleTextSubmit}
                  disabled={isUploading || !textInput.trim()}
                  className="rounded-full"
                  size="sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 size-4" />
                      Загрузить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Полный вид (для пустого состояния)
  return (
    <>
      <div className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all duration-200 overflow-hidden ${isDragging
            ? "border-accent-blue bg-accent-blue-lighter"
            : "border-border hover:border-accent-blue-light hover:bg-muted/30"
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".ods"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-blue-lighter via-transparent to-accent-orange-lighter opacity-30 pointer-events-none" />

          <div className="relative flex flex-col items-center gap-5 text-center">
            {/* Icon */}
            <div className={`size-16 sm:size-20 rounded-2xl flex items-center justify-center transition-all duration-200 ${isDragging ? 'bg-accent-blue scale-110' : 'bg-muted'
              }`}>
              {isUploading ? (
                <div className="relative">
                  <Loader2 className="size-8 sm:size-10 text-muted-foreground animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
              ) : isDragging ? (
                <CloudUpload className="size-8 sm:size-10 text-white" />
              ) : (
                <FileSpreadsheet className="size-8 sm:size-10 text-muted-foreground" />
              )}
            </div>

            {/* Text */}
            <div className="space-y-2">
              <p className="text-base font-medium">
                {isUploading ? (
                  "Обработка файла..."
                ) : isDragging ? (
                  "Отпустите файл"
                ) : (
                  "Перетащите файл сюда"
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                или выберите способ загрузки • Макс. {FILE_CONFIG.MAX_SIZE / 1024 / 1024}MB
              </p>
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="w-full max-w-xs">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                size="sm"
                className="h-9 px-6 text-sm font-medium rounded-full apple-button"
              >
                <FileSpreadsheet className="size-4 mr-2" />
                Выбрать файл
              </Button>
              <Button
                onClick={() => setIsTextDialogOpen(true)}
                disabled={isUploading}
                size="sm"
                variant="outline"
                className="h-9 px-6 text-sm font-medium rounded-full apple-button"
              >
                <FileText className="size-4 mr-2" />
                Вставить текст
              </Button>
            </div>

            {/* Supported formats */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
                <FileSpreadsheet className="size-3" />
                <span>.ods</span>
              </div>
              <span>LibreOffice / OpenOffice</span>
            </div>
          </div>
        </div>

        {/* Upload status */}
        {uploadStatus.type && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl animate-fade-in ${uploadStatus.type === "success"
              ? "bg-muted"
              : "bg-destructive/10"
              }`}
          >
            {uploadStatus.type === "success" ? (
              <CheckCircle2 className="size-5 text-foreground shrink-0" />
            ) : (
              <XCircle className="size-5 text-destructive shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">{uploadStatus.type === "success" ? "Успешно" : "Ошибка"}</p>
              <p className="text-xs text-muted-foreground">{uploadStatus.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно для ввода текста */}
      <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Вставить данные из текста
            </DialogTitle>
            <DialogDescription>
              Вставьте скопированный текст с заказами из Sputnik8. Каждый заказ должен начинаться с ID (6-7 цифр).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 py-4">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Пример формата:

5113680
Групповая обзорная экскурсия «Город-герой Волгоград» и Мамаев Курган
04 янв 2026 в 12:00
Не подтвержден гидом, Не подтвержден туристом

Предоплата: 1200.00 ₽
Оплата на месте: 3800.00 ₽
Учтена скидка: —

Анна
+79001234567
anna@example.com

2 билета:
Взрослый 12+ (4 часа) x2`}
              className="min-h-[300px] font-mono text-sm resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {textInput.trim() ? `${textInput.split('\n').filter(l => /^\d{5,8}$/.test(l.trim())).length} заказов найдено` : 'Введите текст'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsTextDialogOpen(false)}
                className="rounded-full"
                size="sm"
              >
                Отмена
              </Button>
              <Button
                onClick={handleTextSubmit}
                disabled={isUploading || !textInput.trim()}
                className="rounded-full"
                size="sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 size-4" />
                    Загрузить
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
