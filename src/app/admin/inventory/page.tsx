"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InventoryItem = {
  code: string;
  name: string;
  price: number;
};

type InventoryResponse = {
  items?: InventoryItem[];
  message?: string;
};

type SortBy =
  | "code_asc"
  | "code_desc"
  | "name_asc"
  | "name_desc"
  | "price_desc"
  | "price_asc";

function formatPrice(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("code_asc");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadInventory = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/admin/inventory", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as InventoryResponse;

      if (!response.ok) {
        setErrorMessage(result.message || "Gagal memuat data inventory.");
        setItems([]);
        setIsLoading(false);
        return;
      }

      setItems(result.items ?? []);
      setIsLoading(false);
    };

    void loadInventory();
  }, []);

  const processedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (!query) return true;

      return (
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "code_desc") {
        return b.code.localeCompare(a.code, "id");
      }

      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, "id");
      }

      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name, "id");
      }

      if (sortBy === "price_desc") {
        return b.price - a.price;
      }

      if (sortBy === "price_asc") {
        return a.price - b.price;
      }

      return a.code.localeCompare(b.code, "id");
    });

    return sorted;
  }, [items, searchQuery, sortBy]);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Gabungan data dari locations, crews, rentals, food & beverage, dan
            expendables.
          </p>
        </div>
        <Badge variant="outline">{processedItems.length} item</Badge>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search code atau name"
              className="pl-9"
            />
          </div>

          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortBy)}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code_asc">Code A-Z</SelectItem>
              <SelectItem value="code_desc">Code Z-A</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
              <SelectItem value="price_desc">Price tertinggi</SelectItem>
              <SelectItem value="price_asc">Price terendah</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Memuat data inventory...
            </p>
          ) : errorMessage ? (
            <p className="py-10 text-center text-sm text-destructive">
              {errorMessage}
            </p>
          ) : processedItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Data tidak ditemukan untuk filter saat ini.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedItems.map((item, index) => (
                    <TableRow key={`${item.code}-${index}`}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatPrice(item.price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
