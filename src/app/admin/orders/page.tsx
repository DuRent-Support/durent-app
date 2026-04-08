"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type OrderItem = {
  id: string;
  itemType: string;
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  bookingStart: string | null;
  bookingEnd: string | null;
  isFromBundle: boolean;
  bundleId: number | null;
};

type OrderRow = {
  id: number;
  orderCode: string;
  customerName: string;
  purpose: string;
  paymentStatus: string;
  createdAt: string | null;
  totalAmount: number;
  itemCount: number;
  items: OrderItem[];
};

type OrdersResponse = {
  orders?: OrderRow[];
  message?: string;
};

type SortOption =
  | "latest"
  | "oldest"
  | "amount_desc"
  | "amount_asc"
  | "code_asc"
  | "code_desc";

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPrice(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function getStatusBadgeClass(status: string) {
  const normalized = String(status).trim().toLowerCase();

  if (normalized === "paid" || normalized === "settlement") {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }

  if (normalized === "pending") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  if (
    normalized === "failed" ||
    normalized === "cancel" ||
    normalized === "deny" ||
    normalized === "expire"
  ) {
    return "bg-rose-100 text-rose-700 border border-rose-200";
  }

  return "bg-secondary text-secondary-foreground";
}

function getItemTypeLabel(itemType: string) {
  return String(itemType)
    .trim()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/admin/orders", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as OrdersResponse;

      if (!response.ok) {
        setErrorMessage(result.message || "Gagal memuat data orders.");
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setOrders(result.orders ?? []);
      setIsLoading(false);
    };

    void loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        query.length === 0 ||
        order.orderCode.toLowerCase().includes(query) ||
        order.purpose.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        String(order.paymentStatus).toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];

    list.sort((a, b) => {
      if (sortBy === "amount_desc") {
        return b.totalAmount - a.totalAmount;
      }

      if (sortBy === "amount_asc") {
        return a.totalAmount - b.totalAmount;
      }

      if (sortBy === "code_asc") {
        return a.orderCode.localeCompare(b.orderCode, "id");
      }

      if (sortBy === "code_desc") {
        return b.orderCode.localeCompare(a.orderCode, "id");
      }

      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (sortBy === "oldest") {
        return timeA - timeB;
      }

      return timeB - timeA;
    });

    return list;
  }, [filteredOrders, sortBy]);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Daftar seluruh order yang telah dibuat, lengkap dengan detail item.
          </p>
        </div>
        <Badge variant="outline">{sortedOrders.length} order</Badge>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by order code / purpose"
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="challenge">Challenge</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Terbaru</SelectItem>
                <SelectItem value="oldest">Terlama</SelectItem>
                <SelectItem value="amount_desc">Total terbesar</SelectItem>
                <SelectItem value="amount_asc">Total terkecil</SelectItem>
                <SelectItem value="code_asc">Kode A-Z</SelectItem>
                <SelectItem value="code_desc">Kode Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Memuat data orders...
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className="border-destructive/50">
          <CardContent className="py-10 text-center text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : sortedOrders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada order yang cocok dengan filter/search saat ini.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button type="button" className="group w-full text-left">
                    <CardHeader className="gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="text-base md:text-lg">
                          Order {order.orderCode}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={getStatusBadgeClass(order.paymentStatus)}
                          >
                            {order.paymentStatus}
                          </Badge>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          Customer: {order.customerName}
                        </Badge>
                        <Badge variant="outline">
                          Purpose: {order.purpose}
                        </Badge>
                        <Badge variant="outline">
                          <CalendarDays className="mr-1 h-3.5 w-3.5" />
                          {formatDate(order.createdAt)}
                        </Badge>
                        <Badge variant="outline">{order.itemCount} item</Badge>
                        <Badge variant="outline">
                          {formatPrice(order.totalAmount)}
                        </Badge>
                      </div>
                    </CardHeader>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-2 pt-0">
                    {order.items.length === 0 ? (
                      <p className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
                        Tidak ada item detail pada order ini.
                      </p>
                    ) : (
                      order.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-border/60 p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {item.itemName}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary">
                                  {getItemTypeLabel(item.itemType)}
                                </Badge>
                                <span>Qty: {item.quantity}</span>
                                {item.isFromBundle ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    Bundle #{item.bundleId ?? "-"}
                                  </Badge>
                                ) : null}
                              </div>
                              {item.bookingStart || item.bookingEnd ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatDate(item.bookingStart)} -{" "}
                                  {formatDate(item.bookingEnd)}
                                </p>
                              ) : null}
                            </div>

                            <div className="text-right text-sm">
                              <p className="text-muted-foreground">
                                {formatPrice(item.unitPrice)} x {item.quantity}
                              </p>
                              <p className="font-semibold text-primary">
                                {formatPrice(item.lineTotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
