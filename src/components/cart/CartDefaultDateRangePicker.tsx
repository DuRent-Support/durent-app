"use client";

import { useMemo } from "react";
import { CalendarDays, X } from "lucide-react";

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

type CartDefaultDateRangePickerProps = {
  title?: string;
  description?: string;
  className?: string;
};

export default function CartDefaultDateRangePicker({
  className,
}: CartDefaultDateRangePickerProps) {
  const { defaultDateRange, setDefaultDateRange } = useCart();
  const minBookingDate = startOfDay(new Date());

  // Format date for input type="date"
  const formattedFrom = useMemo(() => {
    if (!defaultDateRange?.from) return "";
    const d = defaultDateRange.from;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [defaultDateRange]);
  const formattedTo = useMemo(() => {
    if (!defaultDateRange?.to) return "";
    const d = defaultDateRange.to;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [defaultDateRange]);

  return (
    <section className={`rounded-xl border border-white ${className ?? ""}`}>
      <div className="flex h-9 flex-nowrap items-center gap-3 overflow-x-auto px-3">
        <div className="flex shrink-0 items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
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
            // variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs border-red-500 border bg-card text-red-500 hover:bg-red-500 focus-visible:bg-red-500 hover:text-white disabled:pointer-events-none disabled:opacity-50"
            onClick={() => setDefaultDateRange(null)}
            disabled={!defaultDateRange}
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Start</span>
            <span className="text-sm text-foreground tabular-nums">
              {formattedFrom || "-"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">End</span>
            <span className="text-sm text-foreground tabular-nums">
              {formattedTo || "-"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
