"use client";

import Image from "next/image";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";

type PaymentStatus =
  | "paid"
  | "unpaid"
  | "refunded"
  | "partial"
  | "pending"
  | "challenge"
  | "failed";

interface BookingPlace {
  locationTitle: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  days: number;
  pricePerDay: number;
  subtotal: number;
}

interface BookingOrder {
  orderId: string;
  customerName: string;
  paymentStatus: PaymentStatus;
  places: BookingPlace[];
  totalPrice: number;
}

type OrderRow = {
  order_id: string;
  user_id: string;
  payment_status: string | null;
  total_price: string | number | null;
  created_at: string | null;
};

type OrderItemRow = {
  order_id: string;
  location_id: string;
  booking_start: string;
  booking_end: string;
  price: string | number | null;
  quantity: number | null;
};

type LocationRow = {
  shooting_location_id: string;
  shooting_location_name: string;
  shooting_location_image_url: string[] | null;
};

type AuthUserRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

const paymentConfig: Record<
  PaymentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  paid: { label: "Lunas", variant: "default" },
  unpaid: { label: "Belum Bayar", variant: "outline" },
  pending: { label: "Pending", variant: "outline" },
  partial: { label: "Sebagian", variant: "secondary" },
  refunded: { label: "Refund", variant: "destructive" },
  challenge: { label: "Challenge", variant: "secondary" },
  failed: { label: "Gagal", variant: "destructive" },
};

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const sanitized = value.replace(/[^0-9]/g, "");
    return Number.parseInt(sanitized, 10) || 0;
  }

  return 0;
}

function normalizePaymentStatus(
  value: string | null | undefined,
): PaymentStatus {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (status === "paid" || status === "settlement") return "paid";
  if (status === "partial") return "partial";
  if (status === "refunded") return "refunded";
  if (status === "challenge") return "challenge";
  if (status === "cancel" || status === "deny" || status === "expire") {
    return "failed";
  }
  if (status === "unpaid") return "unpaid";
  return "pending";
}

function getExecutionStatus(startDate: string, endDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now > end) {
    return {
      label: "Selesai",
      icon: CheckCircle2,
      className: "text-emerald-500",
    };
  }

  if (now >= start && now <= end) {
    return {
      label: "Berlangsung",
      icon: CircleDot,
      className: "text-amber-500",
    };
  }

  return { label: "Akan Datang", icon: Clock, className: "text-sky-500" };
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRupiah(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}

export default function BookingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<BookingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data: orderRows, error: orderError } = await supabase
      .from("orders")
      .select("order_id, user_id, payment_status, total_price, created_at")
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error("Fetch orders error:", orderError);
      setErrorMessage("Gagal mengambil data orders.");
      setOrders([]);
      setLoading(false);
      return;
    }

    const fetchedOrders = (orderRows ?? []) as OrderRow[];

    if (fetchedOrders.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = fetchedOrders.map((order) => order.order_id);

    const { data: orderItemRows, error: orderItemsError } = await supabase
      .from("order_items")
      .select(
        "order_id, location_id, booking_start, booking_end, price, quantity",
      )
      .in("order_id", orderIds)
      .order("booking_start", { ascending: true });

    if (orderItemsError) {
      console.error("Fetch order_items error:", orderItemsError);
      setErrorMessage("Gagal mengambil data order items.");
      setOrders([]);
      setLoading(false);
      return;
    }

    const fetchedOrderItems = (orderItemRows ?? []) as OrderItemRow[];
    const userIds = [...new Set(fetchedOrders.map((order) => order.user_id))];
    const locationIds = [
      ...new Set(fetchedOrderItems.map((item) => item.location_id)),
    ];

    let locationMap = new Map<string, LocationRow>();
    let authUserMap = new Map<
      string,
      { fullName: string | null; email: string | null }
    >();

    if (userIds.length > 0) {
      const response = await fetch("/api/admin/auth-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds }),
      });

      if (!response.ok) {
        console.error("Fetch auth users error:", response.statusText);
      } else {
        const data = (await response.json()) as { users?: AuthUserRow[] };
        const users = data.users ?? [];
        authUserMap = new Map(
          users.map((authUser) => [
            authUser.user_id,
            {
              fullName: authUser.full_name,
              email: authUser.email,
            },
          ]),
        );
      }
    }

    if (locationIds.length > 0) {
      const { data: locationRows, error: locationError } = await supabase
        .from("shooting_locations")
        .select(
          "shooting_location_id, shooting_location_name, shooting_location_image_url",
        )
        .in("shooting_location_id", locationIds);

      if (locationError) {
        console.error("Fetch shooting_locations error:", locationError);
      } else {
        const locations = (locationRows ?? []) as LocationRow[];
        locationMap = new Map(
          locations.map((location) => [
            location.shooting_location_id,
            location,
          ]),
        );
      }
    }

    const itemsByOrder = new Map<string, OrderItemRow[]>();

    for (const item of fetchedOrderItems) {
      const bucket = itemsByOrder.get(item.order_id) ?? [];
      bucket.push(item);
      itemsByOrder.set(item.order_id, bucket);
    }

    const mappedOrders: BookingOrder[] = fetchedOrders.map((order) => {
      const itemRows = itemsByOrder.get(order.order_id) ?? [];

      const places = itemRows.map((item) => {
        const location = locationMap.get(item.location_id);
        const days = Math.max(1, Number(item.quantity ?? 1));
        const pricePerDay = parseNumber(item.price);

        return {
          locationTitle:
            location?.shooting_location_name || `Lokasi ${item.location_id}`,
          imageUrl:
            location?.shooting_location_image_url?.[1] ||
            location?.shooting_location_image_url?.[0] ||
            "/hero.webp",
          startDate: item.booking_start,
          endDate: item.booking_end,
          days,
          pricePerDay,
          subtotal: days * pricePerDay,
        };
      });

      const calculatedTotal = places.reduce(
        (acc, place) => acc + place.subtotal,
        0,
      );
      const totalPrice = parseNumber(order.total_price) || calculatedTotal;
      const authUser = authUserMap.get(order.user_id);
      const customerName =
        authUser?.fullName || authUser?.email || order.user_id;

      return {
        orderId: order.order_id,
        customerName,
        paymentStatus: normalizePaymentStatus(order.payment_status),
        places,
        totalPrice,
      };
    });

    setOrders(mappedOrders);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBookings();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadBookings]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesQuery =
        query.length === 0 ||
        order.customerName.toLowerCase().includes(query) ||
        order.orderId.toLowerCase().includes(query);
      const matchesPayment =
        paymentFilter === "all" || order.paymentStatus === paymentFilter;

      return matchesQuery && matchesPayment;
    });
  }, [orders, searchQuery, paymentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, safeCurrentPage, pageSize]);

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, safeCurrentPage - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    const adjustedStart = Math.max(1, end - maxVisible + 1);

    return Array.from(
      { length: end - adjustedStart + 1 },
      (_, index) => adjustedStart + index,
    );
  }, [safeCurrentPage, totalPages]);

  const toggle = (id: string) => {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-foreground">
          Monitoring Booking
        </h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan order terbaru dengan detail lokasi per transaksi.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama pelanggan atau Order ID"
            className="sm:max-w-sm"
          />

          <Select
            value={paymentFilter}
            onValueChange={(value) => {
              setPaymentFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="sm:w-[220px]">
              <SelectValue placeholder="Filter pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pembayaran</SelectItem>
              <SelectItem value="paid">Lunas</SelectItem>
              <SelectItem value="unpaid">Belum Bayar</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Sebagian</SelectItem>
              <SelectItem value="challenge">Challenge</SelectItem>
              <SelectItem value="refunded">Refund</SelectItem>
              <SelectItem value="failed">Gagal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Per halaman</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => void loadBookings()}>Coba Lagi</Button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            Belum ada data booking.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12" />
                  <TableHead>Order ID</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Pembayaran
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-right">
                    Lokasi
                  </TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const isOpen = openRows.has(order.orderId);
                  const payment = paymentConfig[order.paymentStatus];

                  return (
                    <Fragment key={order.orderId}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggle(order.orderId)}
                      >
                        <TableCell>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={`Toggle detail ${order.orderId}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground">
                          {order.orderId}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate font-medium text-foreground">
                          {order.customerName}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={payment.variant}>{payment.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right text-muted-foreground">
                          {order.places.length} lokasi
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatRupiah(order.totalPrice)}
                        </TableCell>
                      </TableRow>

                      {isOpen && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="bg-muted/30 p-0">
                            <div className="space-y-3 px-4 py-4 md:px-6">
                              {order.places.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
                                  Order ini belum memiliki detail item.
                                </div>
                              ) : (
                                order.places.map((place, index) => {
                                  const status = getExecutionStatus(
                                    place.startDate,
                                    place.endDate,
                                  );

                                  return (
                                    <div
                                      key={`${order.orderId}-${index}`}
                                      className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-background p-3"
                                    >
                                      <Image
                                        src={place.imageUrl}
                                        alt={place.locationTitle}
                                        width={64}
                                        height={64}
                                        className="h-16 w-16 rounded-lg object-cover"
                                      />

                                      <div className="min-w-[200px] flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                          {place.locationTitle}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                          <span className="inline-flex items-center gap-1">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {formatDate(place.startDate)} -{" "}
                                            {formatDate(place.endDate)}
                                          </span>
                                          <span>{place.days} hari</span>
                                        </div>
                                      </div>

                                      <div
                                        className={`inline-flex items-center gap-1 text-xs font-medium ${status.className}`}
                                      >
                                        <status.icon className="h-3.5 w-3.5" />
                                        <span>{status.label}</span>
                                      </div>

                                      <div className="ml-auto text-right">
                                        <p className="text-sm font-semibold text-foreground">
                                          {formatRupiah(place.subtotal)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {formatRupiah(place.pricePerDay)}/hari
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Menampilkan {(safeCurrentPage - 1) * pageSize + 1}-
                {Math.min(safeCurrentPage * pageSize, filteredOrders.length)} dari {filteredOrders.length} data
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.max(1, Math.min(prev, totalPages) - 1),
                    )
                  }
                  disabled={safeCurrentPage === 1}
                >
                  Sebelumnya
                </Button>

                {pageNumbers.map((page) => (
                  <Button
                    key={page}
                    variant={page === safeCurrentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-9"
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(totalPages, Math.min(prev, totalPages) + 1),
                    )
                  }
                  disabled={safeCurrentPage === totalPages}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
