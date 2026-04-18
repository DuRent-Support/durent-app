"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  id: number;
  item_type: InventoryType;
  code: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
};

type InventoryResponse = {
  items?: InventoryItem[];
  message?: string;
};

type InventoryType =
  | "locations"
  | "crews"
  | "rentals"
  | "food-and-beverage"
  | "expendables"
  | "bundles";

type TypeFilter = InventoryType | "all";

type SortBy = "price_desc" | "price_asc";

const typeLabelMap: Record<InventoryType, string> = {
  locations: "Locations",
  crews: "Crews",
  rentals: "Rentals",
  "food-and-beverage": "Food & Beverage",
  expendables: "Expendables",
  bundles: "Bundles",
};

const typePathMap: Record<InventoryType, string> = {
  locations: "/admin/locations",
  crews: "/admin/crews",
  rentals: "/admin/rentals",
  "food-and-beverage": "/admin/food-and-beverage",
  expendables: "/admin/expendables",
  bundles: "/admin/bundles",
};

function formatPrice(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function AdminInventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("price_desc");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInventory = async () => {
    try {
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
        return;
      }

      setItems(result.items ?? []);
    } catch (error) {
      console.error("Load inventory error:", error);
      setErrorMessage("Terjadi kesalahan saat memuat data inventory.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInventory();
  }, []);

  const processedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = items.filter((item) => {
      const typeMatched = typeFilter === "all" || item.item_type === typeFilter;
      if (!typeMatched) return false;

      if (!query) return true;

      return (
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "price_desc") {
        return b.price - a.price;
      }

      return a.price - b.price;
    });

    return sorted;
  }, [items, searchQuery, sortBy, typeFilter]);

  const goToItemPage = (item: InventoryItem) => {
    const targetPath = typePathMap[item.item_type];
    const params = new URLSearchParams();
    if (item.code) {
      params.set("code", item.code);
    }

    const queryString = params.toString();
    router.push(queryString ? `${targetPath}?${queryString}` : targetPath);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Gabungan data dari locations, crews, rentals, food & beverage, dan
            expendables, serta bundles.
          </p>
        </div>
        <Badge variant="outline">{processedItems.length} item</Badge>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
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
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Filter tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="locations">Locations</SelectItem>
              <SelectItem value="crews">Crews</SelectItem>
              <SelectItem value="rentals">Rentals</SelectItem>
              <SelectItem value="food-and-beverage">Food & Beverage</SelectItem>
              <SelectItem value="expendables">Expendables</SelectItem>
              <SelectItem value="bundles">Bundles</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortBy)}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Sort harga" />
            </SelectTrigger>
            <SelectContent>
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
                    <TableHead className="w-[140px]">Type</TableHead>
                    <TableHead className="w-[220px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-[100px] text-right">
                      Detail
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedItems.map((item, index) => (
                    <TableRow key={`${item.code}-${index}`}>
                      <TableCell>
                        <Badge variant="secondary">
                          {typeLabelMap[item.item_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        {item.is_available ? "Available" : "Unavailable"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatPrice(item.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Lihat detail ${item.name}`}
                          onClick={() => goToItemPage(item)}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
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
