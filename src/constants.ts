import { MenuItem } from "./types";

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "classic-bacon",
    name: "Classic Bacon",
    price: 99,
    image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "hunter-chicken",
    name: "Hunter Chicken BBQ",
    price: 109,
    image: "https://images.unsplash.com/photo-1541288097308-7b8e3f58c4c6?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "truffle-mushroom",
    name: "Truffle Mushroom Chicken",
    price: 129,
    image: "https://images.unsplash.com/photo-1621841957884-1210fe19d66d?auto=format&fit=crop&q=80&w=800",
  },
];

export const PAYMENT_METHODS = [
  { id: "cash", name: "Cash", icon: "Banknote" },
  { id: "qr", name: "QR Code", icon: "QrCode" },
  { id: "transfer", name: "Transfer", icon: "Send" },
] as const;
