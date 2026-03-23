import { useEffect, useState, useCallback } from "react";
import { Inventory, Order, OrderStatus, PaymentStatus } from "../lib/types";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

function requireSupabase() {
  if (!supabase) throw new Error("Supabase env not configured");
  return supabase;
}

function mapOrderRow(row: any, itemsByOrder: Record<string, any[]>): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    totalAmount: row.total_amount,
    location: row.location ?? undefined,
    preparingAt: row.preparing_at ?? undefined,
    readyAt: row.ready_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    items: (itemsByOrder[row.id] || []).map((i) => ({
      id: i.id,
      menuItemId: i.menu_item_id,
      name: i.name,
      qty: i.qty,
      price: i.price,
    })),
  };
}

async function loadOrders(): Promise<Order[]> {
  const client = requireSupabase();
  const { data: ordersData, error: ordersError } = await client
    .from("orders")
    .select("*")
    .order("order_number", { ascending: true });

  if (ordersError) throw ordersError;
  if (!ordersData?.length) return [];

  const { data: itemsData, error: itemsError } = await client
    .from("order_items")
    .select("*");

  if (itemsError) throw itemsError;

  const itemsByOrder = (itemsData || []).reduce((acc: Record<string, any[]>, item) => {
    (acc[item.order_id] ||= []).push(item);
    return acc;
  }, {});

  return ordersData.map((row) => mapOrderRow(row, itemsByOrder));
}

async function loadInventory(): Promise<Inventory | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("inventory")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    potatoStock: data.potato_stock,
    openingPotatoStock: data.opening_potato_stock,
    flavorStocks: data.flavor_stocks || {},
    openingFlavorStocks: data.opening_flavor_stocks || {},
    thresholds: data.thresholds || { potato: 15, flavor: 5 },
  };
}

export function useSocket() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const [ordersData, inventoryData] = await Promise.all([loadOrders(), loadInventory()]);
      setOrders(ordersData);
      setInventory(inventoryData);
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to refresh state from Supabase:", error);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsConnected(false);
      return;
    }

    // Base connectivity comes from successful DB reads.
    void refreshState();

    // Realtime subscription (best effort).
    const channel = supabase
      .channel("jacket-pos-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refreshState)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, refreshState)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, refreshState)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        } else if (status === "CHANNEL_ERROR") {
          console.warn("Supabase realtime channel error; using polling fallback");
        }
      });

    // Fallback polling so app still works if Realtime is blocked.
    const pollId = setInterval(() => {
      void refreshState();
    }, 4000);

    return () => {
      clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [refreshState]);

  const adjustInventoryByOrderItems = useCallback(
    async (orderItems: { menuItemId: string; qty: number }[], direction: "deduct" | "restore") => {
      const currentInventory = await loadInventory();
      if (!currentInventory) return;

      const sign = direction === "deduct" ? -1 : 1;
      const nextFlavorStocks = { ...currentInventory.flavorStocks };
      let nextPotato = currentInventory.potatoStock;

      for (const item of orderItems) {
        nextPotato += sign * item.qty;
        if (nextFlavorStocks[item.menuItemId] !== undefined) {
          nextFlavorStocks[item.menuItemId] += sign * item.qty;
        }
      }

      const client = requireSupabase();
      const { error } = await client
        .from("inventory")
        .update({
          potato_stock: Math.max(0, nextPotato),
          flavor_stocks: nextFlavorStocks,
          updated_at: new Date().toISOString(),
        })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
    },
    []
  );

  const createOrder = useCallback(
    async (orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "status">) => {
      const client = requireSupabase();
      const nextOrderNumber = orders.length > 0
        ? Math.max(...orders.map((o) => o.orderNumber)) + 1
        : 1;

      const { data: insertedOrder, error: orderError } = await client
        .from("orders")
        .insert({
          order_number: nextOrderNumber,
          payment_status: orderData.paymentStatus,
          payment_method: orderData.paymentMethod,
          total_amount: orderData.totalAmount,
          location: orderData.location || null,
          status: "new",
        })
        .select("id")
        .single();

      if (orderError || !insertedOrder) throw orderError || new Error("Order insert failed");

      const itemRows = orderData.items.map((i) => ({
        order_id: insertedOrder.id,
        menu_item_id: i.menuItemId,
        name: i.name,
        qty: i.qty,
        price: i.price,
      }));

      const { error: itemsError } = await client.from("order_items").insert(itemRows);
      if (itemsError) throw itemsError;

      if (orderData.paymentStatus === "paid") {
        await adjustInventoryByOrderItems(orderData.items, "deduct");
      }

      await refreshState();
    },
    [orders, adjustInventoryByOrderItems, refreshState]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const now = new Date().toISOString();
      const phasePatch: Record<string, string> = {};
      if (status === "preparing") phasePatch.preparing_at = now;
      if (status === "ready") phasePatch.ready_at = now;
      if (status === "completed") phasePatch.completed_at = now;

      const client = requireSupabase();
      const { error } = await client
        .from("orders")
        .update({ status, ...phasePatch })
        .eq("id", orderId);

      if (error) throw error;
      await refreshState();
    },
    [refreshState]
  );

  const updatePaymentStatus = useCallback(
    async (orderId: string, paymentStatus: PaymentStatus) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const wasPaid = target.paymentStatus === "paid";
      const isNowPaid = paymentStatus === "paid";

      const client = requireSupabase();
      const { error } = await client
        .from("orders")
        .update({ payment_status: paymentStatus })
        .eq("id", orderId);

      if (error) throw error;

      if (!wasPaid && isNowPaid) {
        await adjustInventoryByOrderItems(target.items, "deduct");
      } else if (wasPaid && (paymentStatus === "voided" || paymentStatus === "refunded")) {
        await adjustInventoryByOrderItems(target.items, "restore");
      }

      await refreshState();
    },
    [orders, adjustInventoryByOrderItems, refreshState]
  );

  const resetDay = useCallback(async () => {
    const client = requireSupabase();
    const { error: deleteItemsError } = await client
      .from("order_items")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteItemsError) throw deleteItemsError;

    const { error: deleteOrdersError } = await client
      .from("orders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteOrdersError) throw deleteOrdersError;

    await refreshState();
  }, [refreshState]);

  const setupInventory = useCallback(
    async (data: { potatoStock: number; flavorStocks: Record<string, number> }) => {
      const payload = {
        potato_stock: data.potatoStock,
        opening_potato_stock: data.potatoStock,
        flavor_stocks: data.flavorStocks,
        opening_flavor_stocks: data.flavorStocks,
        updated_at: new Date().toISOString(),
      };

      const client = requireSupabase();
      const { data: existing, error: existingError } = await client
        .from("inventory")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.id) {
        const { error } = await client.from("inventory").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await client.from("inventory").insert(payload);
        if (error) throw error;
      }

      await refreshState();
      return { success: true };
    },
    [refreshState]
  );

  return {
    orders,
    inventory,
    isConnected,
    createOrder,
    updateOrderStatus,
    updatePaymentStatus,
    resetDay,
    setupInventory,
  };
}
