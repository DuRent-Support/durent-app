"use client";

import { useContext } from "react";
import { CartContext } from "@/providers/CartProvider";
import { type CartContextValue } from "@/types/cart";

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }

  return context;
}
