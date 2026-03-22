import { MenuItem } from "./types";

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "classic-bacon",
    name: "Classic Bacon",
    price: 99,
    image: "/menu-classic-bacon.png",
  },
  {
    id: "hunter-chicken",
    name: "Hunter Chicken BBQ",
    price: 109,
    image: "/menu-hunter-chicken.png",
  },
  {
    id: "truffle-mushroom",
    name: "Truffle Mushroom Chicken",
    price: 129,
    image: "/menu-truffle-mushroom.png",
  },
];

export const PAYMENT_METHODS = [
  { id: "cash", name: "Cash", icon: "Banknote" },
  { id: "qr", name: "QR Code", icon: "QrCode" },
  { id: "transfer", name: "Transfer", icon: "Send" },
] as const;
