import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return rubFormatter.format(value || 0);
}

export function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₽`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ₽`;
  return `${value.toFixed(0)} ₽`;
}

export function formatCurrencyTable(value: number | null | undefined): string {
  if (!value && value !== 0) return "-";
  return numFormatter.format(value) + " ₽";
}

