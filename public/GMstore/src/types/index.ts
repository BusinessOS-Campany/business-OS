import type { Product, Category, Order } from "@prisma/client";

export type ProductWithCategory = Product & { category: Category };

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
  colors?: string[];
};

export type SafeUser = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "CUSTOMER";
};
