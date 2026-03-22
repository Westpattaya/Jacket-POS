import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
  location?: string;
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

// Supabase client (optional - falls back to in-memory if not configured)
let supabase: SupabaseClient | null = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Supabase connected – orders will persist to database");
} else {
  console.warn("Supabase not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Using in-memory storage.");
}

// In-memory state (synced from Supabase when available)
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

// Map DB row to app Order
function dbOrderToApp(dbOrder: any, dbItems: any[]): Order {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    createdAt: dbOrder.created_at,
    status: dbOrder.status,
    paymentStatus: dbOrder.payment_status,
    paymentMethod: dbOrder.payment_method,
    totalAmount: dbOrder.total_amount,
    location: dbOrder.location ?? undefined,
    preparingAt: dbOrder.preparing_at ?? undefined,
    readyAt: dbOrder.ready_at ?? undefined,
    completedAt: dbOrder.completed_at ?? undefined,
    items: dbItems.map((oi) => ({
      id: oi.id,
      menuItemId: oi.menu_item_id,
      name: oi.name,
      qty: oi.qty,
      price: oi.price,
    })),
  };
}

async function loadOrdersFromSupabase(): Promise<Order[]> {
  if (!supabase) return [];
  try {
    const { data: ordersData, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (ordersErr) throw ordersErr;
    if (!ordersData?.length) return [];

    const { data: itemsData, error: itemsErr } = await supabase
      .from("order_items")
      .select("*");
    if (itemsErr) throw itemsErr;
    const itemsByOrder = (itemsData ?? []).reduce((acc: Record<string, any[]>, i) => {
      (acc[i.order_id] ??= []).push(i);
      return acc;
    }, {});

    const result = ordersData.map((o) => dbOrderToApp(o, itemsByOrder[o.id] ?? [])).reverse();
    await backfillPhaseTimestamps(ordersData);
    return result;
  } catch (e) {
    console.error("Failed to load orders from Supabase:", e);
    return [];
  }
}

async function backfillPhaseTimestamps(ordersData: any[]): Promise<void> {
  if (!supabase) return;
  let count = 0;
  for (const row of ordersData) {
    const updates: Record<string, string> = {};
    if (row.status === "preparing" && !row.preparing_at) updates.preparing_at = row.created_at;
    if (row.status === "ready" && !row.ready_at) updates.ready_at = row.preparing_at || row.created_at;
    if (row.status === "completed" && !row.completed_at) updates.completed_at = row.ready_at || row.preparing_at || row.created_at;
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("orders").update(updates).eq("id", row.id);
      if (!error) count++;
    }
  }
  if (count > 0) console.log(`Backfilled phase timestamps for ${count} orders`);
}

async function loadInventoryFromSupabase(): Promise<Inventory | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("inventory").select("*").limit(1).maybeSingle();
    if (error || !data) return null;
    return {
      potatoStock: data.potato_stock,
      openingPotatoStock: data.opening_potato_stock,
      flavorStocks: data.flavor_stocks ?? {},
      openingFlavorStocks: data.opening_flavor_stocks ?? {},
      thresholds: data.thresholds ?? { potato: 15, flavor: 5 },
    };
  } catch (e) {
    console.error("Failed to load inventory from Supabase:", e);
    return null;
  }
}

async function getNextOrderNumber(): Promise<number> {
  if (!supabase) return 1;
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("order_number")
      .order("order_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return 1;
    return (data.order_number ?? 0) + 1;
  } catch {
    return 1;
  }
}

async function saveOrderToSupabase(order: Order): Promise<void> {
  if (!supabase) return;
  try {
    const { error: orderErr } = await supabase.from("orders").insert({
      id: order.id,
      order_number: order.orderNumber,
      created_at: order.createdAt,
      status: order.status,
      payment_status: order.paymentStatus,
      payment_method: order.paymentMethod,
      total_amount: order.totalAmount,
      location: order.location ?? null,
    });
    if (orderErr) throw orderErr;

    if (order.items.length > 0) {
      const rows = order.items.map((i) => ({
        order_id: order.id,
        menu_item_id: i.menuItemId,
        name: i.name,
        qty: i.qty,
        price: i.price,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(rows);
      if (itemsErr) throw itemsErr;
    }
    console.log(`Order #${order.orderNumber} saved to Supabase`);
  } catch (e) {
    console.error("Failed to save order to Supabase:", e instanceof Error ? e.message : e);
    if (e && typeof e === "object" && "details" in e) console.error("Details:", (e as any).details);
  }
}

async function updateOrderStatusInSupabase(
  orderId: string,
  status: OrderStatus,
  phaseTimestamps: { preparing_at?: string; ready_at?: string; completed_at?: string }
): Promise<void> {
  if (!supabase) return;
  const payload = { status, ...phaseTimestamps };
  if (Object.keys(phaseTimestamps).length > 0) {
    console.log(`Updating order ${orderId} phase timestamps:`, phaseTimestamps);
  }
  try {
    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId);
    if (error) {
      console.error("Supabase update error:", error.message, error.details);
    }
  } catch (e) {
    console.error("Failed to update order status in Supabase:", e);
  }
}

async function updatePaymentStatusInSupabase(orderId: string, paymentStatus: PaymentStatus): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("orders").update({ payment_status: paymentStatus }).eq("id", orderId);
  } catch (e) {
    console.error("Failed to update payment status in Supabase:", e);
  }
}

async function resetOrdersInSupabase(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("order_items").delete().gte("qty", 1);
    await supabase.from("orders").delete().gte("order_number", 1);
  } catch (e) {
    console.error("Failed to reset orders in Supabase:", e);
  }
}

async function saveInventoryToSupabase(inv: Inventory): Promise<void> {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase.from("inventory").select("id").limit(1).maybeSingle();
    const row = {
      potato_stock: inv.potatoStock,
      opening_potato_stock: inv.openingPotatoStock,
      flavor_stocks: inv.flavorStocks,
      opening_flavor_stocks: inv.openingFlavorStocks,
      thresholds: inv.thresholds,
      updated_at: new Date().toISOString(),
    };
    if (existing?.id) {
      await supabase.from("inventory").update(row).eq("id", existing.id);
    } else {
      await supabase.from("inventory").insert(row);
    }
  } catch (e) {
    console.error("Failed to save inventory to Supabase:", e);
  }
}

async function startServer() {
  if (supabase) {
    orders = await loadOrdersFromSupabase();
    nextOrderNumber = await getNextOrderNumber();
    const dbInventory = await loadInventoryFromSupabase();
    if (dbInventory) inventory = dbInventory;
    console.log(`Loaded ${orders.length} orders, next order #${nextOrderNumber}`);
  }

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  app.use(express.json());

  app.get("/api/state", (req, res) => {
    res.json({ orders, inventory });
  });

  app.post("/api/inventory/setup", async (req, res) => {
    const { potatoStock, flavorStocks } = req.body;
    inventory.potatoStock = potatoStock;
    inventory.openingPotatoStock = potatoStock;
    inventory.flavorStocks = { ...flavorStocks };
    inventory.openingFlavorStocks = { ...flavorStocks };
    await saveInventoryToSupabase(inventory);
    io.emit("inventoryUpdate", inventory);
    res.json({ success: true, inventory });
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.emit("initialState", { orders, inventory });

    socket.on("createOrder", async (orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "status"> & { location?: string }) => {
      const orderId = supabase ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
      const newOrder: Order = {
        ...orderData,
        id: orderId,
        orderNumber: nextOrderNumber++,
        createdAt: new Date().toISOString(),
        status: "new",
      };

      if (newOrder.paymentStatus === "paid") {
        newOrder.items.forEach((item) => {
          inventory.potatoStock -= item.qty;
          if (inventory.flavorStocks[item.menuItemId] !== undefined) {
            inventory.flavorStocks[item.menuItemId] -= item.qty;
          }
        });
      }

      await saveOrderToSupabase(newOrder);
      await saveInventoryToSupabase(inventory);

      orders.push(newOrder);
      io.emit("orderCreated", newOrder);
      io.emit("inventoryUpdate", inventory);
    });

    socket.on("updateOrderStatus", async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        const now = new Date().toISOString();
        const phaseTimestamps: Record<string, string> = {};
        if (status === "preparing") {
          order.preparingAt = now;
          phaseTimestamps.preparing_at = now;
        } else if (status === "ready") {
          order.readyAt = now;
          phaseTimestamps.ready_at = now;
        } else if (status === "completed") {
          order.completedAt = now;
          phaseTimestamps.completed_at = now;
        }
        order.status = status;
        await updateOrderStatusInSupabase(orderId, status, phaseTimestamps);
        io.emit("orderUpdated", order);
      }
    });

    socket.on("updatePaymentStatus", async ({ orderId, paymentStatus }: { orderId: string; paymentStatus: PaymentStatus }) => {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        const wasPaid = order.paymentStatus === "paid";
        const isNowPaid = paymentStatus === "paid";

        order.paymentStatus = paymentStatus;

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

        await updatePaymentStatusInSupabase(orderId, paymentStatus);
        await saveInventoryToSupabase(inventory);
        io.emit("orderUpdated", order);
        io.emit("inventoryUpdate", inventory);
      }
    });

    socket.on("resetDay", async () => {
      orders = [];
      nextOrderNumber = 1;
      await resetOrdersInSupabase();
      io.emit("dayReset", { orders, inventory });
    });
  });

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
