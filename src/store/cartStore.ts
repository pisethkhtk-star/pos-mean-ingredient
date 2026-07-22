import { create } from "zustand";

export interface CartItem {
  id: number;
  name: string;
  code: string;
  price: number;
  cost: number;
  quantity: number;
  stock: number;
  ingredients?: any[];
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  points: number;
}

export interface Discount {
  id: number;
  name: string | null;
  type: "PERCENT" | "FIXED" | string;
  value: number;
  minPurchase: number;
}

interface CartState {
  cartItems: CartItem[];
  selectedCustomer: Customer | null;
  selectedDiscount: Discount | null;
  taxRate: number;
  taxEnabled: boolean;
  addItem: (product: any) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  selectCustomer: (customer: Customer | null) => void;
  selectDiscount: (discount: Discount | null) => void;
  setTaxRate: (rate: number) => void;
  setTaxEnabled: (enabled: boolean) => void;
  clearCart: () => void;
  getTotals: () => {
    subtotal: number;
    discountValue: number;
    taxValue: number;
    total: number;
  };
}

export function getMaxAvailableStock(product: any): number {
  if (product.hasRecipe !== false && product.ingredients && product.ingredients.length > 0) {
    const portions = product.ingredients.map((pi: any) => {
      const ingStock = pi.ingredient ? Number(pi.ingredient.stock) : 0;
      const reqQty = Number(pi.quantity) || 1;
      return Math.floor(ingStock / reqQty);
    });
    return portions.length > 0 ? Math.min(...portions) : 0;
  }
  return Number(product.stock) || 0;
}

export const useCartStore = create<CartState>((set, get) => ({
  cartItems: [],
  selectedCustomer: null,
  selectedDiscount: null,
  taxRate: 10,
  taxEnabled: false,

  addItem: (product) => {
    const items = get().cartItems;
    const existing = items.find((item) => item.id === product.id);
    const maxStock = getMaxAvailableStock(product);

    if (existing) {
      if (existing.quantity >= maxStock) {
        return; // Exceeds available portion stock
      }
      set({
        cartItems: items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      if (maxStock < 1) return; // No portion stock available
      set({
        cartItems: [
          ...items,
          {
            id: product.id,
            name: product.name,
            code: product.code || product.sku,
            price: Number(product.price),
            cost: Number(product.cost),
            quantity: 1,
            stock: maxStock,
            ingredients: product.ingredients || [],
          },
        ],
      });
    }
  },

  removeItem: (productId) => {
    set({
      cartItems: get().cartItems.filter((item) => item.id !== productId),
    });
  },

  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }

    set({
      cartItems: get().cartItems.map((item) => {
        if (item.id === productId) {
          const maxStock = getMaxAvailableStock(item);
          const clampedQty = Math.min(qty, maxStock);
          return { ...item, quantity: clampedQty };
        }
        return item;
      }),
    });
  },

  selectCustomer: (customer) => set({ selectedCustomer: customer }),
  selectDiscount: (discount) => set({ selectedDiscount: discount }),
  setTaxRate: (rate) => set({ taxRate: rate }),
  setTaxEnabled: (enabled) => set({ taxEnabled: enabled }),
  clearCart: () =>
    set({ cartItems: [], selectedCustomer: null, selectedDiscount: null }),

  getTotals: () => {
    const items = get().cartItems;
    const discount = get().selectedDiscount;
    const taxRate = get().taxRate;
    const taxEnabled = get().taxEnabled;

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    let discountValue = 0;
    if (discount && subtotal >= Number(discount.minPurchase)) {
      if (discount.type === "PERCENT") {
        discountValue = subtotal * (Number(discount.value) / 100);
      } else {
        discountValue = Number(discount.value);
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountValue);
    const taxValue = taxEnabled ? discountedSubtotal * (taxRate / 100) : 0;
    const total = discountedSubtotal + taxValue;

    return {
      subtotal,
      discountValue,
      taxValue,
      total,
    };
  },
}));
