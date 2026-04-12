"use client";

import { CalendarDays, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCart } from "@/hooks/use-cart";

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDateLabel(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

type CartDefaultDateRangePickerProps = {
  title?: string;
  description?: string;
  className?: string;
};

export default function CartDefaultDateRangePicker({
  title = "Default Tanggal Add to Cart",
  description = "Pilih sekali. Item berikutnya otomatis memakai range ini.",
  className,
}: CartDefaultDateRangePickerProps) {
  const { defaultDateRange, setDefaultDateRange } = useCart();
  const minBookingDate = startOfDay(new Date());

  return (
    <section
      className={`rounded-xl border border-border bg-card p-3 md:p-4 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold md:text-base">{title}</h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            {description}
          </p>
        </div>

        <Badge variant="secondary" className="text-xs">
          {formatDateLabel(defaultDateRange?.from)} -{" "}
          {formatDateLabel(defaultDateRange?.to)}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Pilih Range Default
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={
                defaultDateRange?.from
                  ? {
                      from: defaultDateRange.from,
                      to: defaultDateRange.to,
                    }
                  : undefined
              }
              onSelect={(range) => {
                if (!range?.from) {
                  return;
                }

                const from = startOfDay(range.from);
                const to = startOfDay(range.to ?? range.from);

                setDefaultDateRange({
                  from: from <= to ? from : to,
                  to: to >= from ? to : from,
                });
              }}
              disabled={(date) => startOfDay(date) < minBookingDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => setDefaultDateRange(null)}
          disabled={!defaultDateRange}
        >
          <X className="h-3.5 w-3.5" />
          Reset Default
        </Button>
      </div>
    </section>
  );
}
