import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
export type OrderStatus = "new" | "preparing" | "ready" | "completed";
export type PaymentStatus = "unpaid" | "paid" | "voided" | "refunded";
export type PaymentMethod = "cash" | "qr" | "transfer";

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  items: OrderItem[];
}

export interface Inventory {
  potatoStock: number;
  openingPotatoStock: number;
  flavorStocks: Record<string, number>;
  openingFlavorStocks: Record<string, number>;
  thresholds: {
    potato: number;
    flavor: number;
  };
}

// Initial State
let orders: Order[] = [];
let nextOrderNumber = 1;

let inventory: Inventory = {
  potatoStock: 80,
  openingPotatoStock: 80,
  flavorStocks: {
    "classic-bacon": 30,
    "hunter-chicken": 30,
    "truffle-mushroom": 20,
  },
  openingFlavorStocks: {
    "classic-bacon": 30,
    "hunter-chicken": 30,
    "truffle-mushroom": 20,
  },
  thresholds: {
    potato: 15,
    flavor: 5,
  },
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/state", (req, res) => {
    res.json({ orders, inventory });
  });

  app.post("/api/inventory/setup", (req, res) => {
    const { potatoStock, flavorStocks } = req.body;
    inventory.potatoStock = potatoStock;
    inventory.openingPotatoStock = potatoStock;
    inventory.flavorStocks = { ...flavorStocks };
    inventory.openingFlavorStocks = { ...flavorStocks };
    io.emit("inventoryUpdate", inventory);
    res.json({ success: true, inventory });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.emit("initialState", { orders, inventory });

    socket.on("createOrder", (orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "status">) => {
      const newOrder: Order = {
        ...orderData,
        id: Math.random().toString(36).substr(2, 9),
        orderNumber: nextOrderNumber++,
        createdAt: new Date().toISOString(),
        status: "new",
      };

      // Deduct inventory if paid
      if (newOrder.paymentStatus === "paid") {
        newOrder.items.forEach((item) => {
          inventory.potatoStock -= item.qty;
          if (inventory.flavorStocks[item.menuItemId] !== undefined) {
            inventory.flavorStocks[item.menuItemId] -= item.qty;
          }
        });
      }

      orders.push(newOrder);
      io.emit("orderCreated", newOrder);
      io.emit("inventoryUpdate", inventory);
    });

    socket.on("updateOrderStatus", ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        order.status = status;
        io.emit("orderUpdated", order);
      }
    });

    socket.on("updatePaymentStatus", ({ orderId, paymentStatus }: { orderId: string; paymentStatus: PaymentStatus }) => {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        const wasPaid = order.paymentStatus === "paid";
        const isNowPaid = paymentStatus === "paid";

        order.paymentStatus = paymentStatus;

        // Inventory logic for payment status change
        if (!wasPaid && isNowPaid) {
          order.items.forEach((item) => {
            inventory.potatoStock -= item.qty;
            if (inventory.flavorStocks[item.menuItemId] !== undefined) {
              inventory.flavorStocks[item.menuItemId] -= item.qty;
            }
          });
        } else if (wasPaid && (paymentStatus === "voided" || paymentStatus === "refunded")) {
          order.items.forEach((item) => {
            inventory.potatoStock += item.qty;
            if (inventory.flavorStocks[item.menuItemId] !== undefined) {
              inventory.flavorStocks[item.menuItemId] += item.qty;
            }
          });
        }

        io.emit("orderUpdated", order);
        io.emit("inventoryUpdate", inventory);
      }
    });

    socket.on("resetDay", () => {
      orders = [];
      nextOrderNumber = 1;
      // Reset to opening stock or keep current? Usually reset day means clear orders.
      io.emit("dayReset", { orders, inventory });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
