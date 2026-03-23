import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Order, Inventory, OrderStatus, PaymentStatus } from "../lib/types";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || socketUrl || "";

  useEffect(() => {
    const newSocket = socketUrl ? io(socketUrl) : io();
    setSocket(newSocket);

    newSocket.on("connect", () => setIsConnected(true));
    newSocket.on("disconnect", () => setIsConnected(false));

    newSocket.on("initialState", (data: { orders: Order[]; inventory: Inventory }) => {
      setOrders(data.orders);
      setInventory(data.inventory);
    });

    newSocket.on("orderCreated", (order: Order) => {
      setOrders((prev) => [...prev, order]);
    });

    newSocket.on("orderUpdated", (updatedOrder: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
    });

    newSocket.on("inventoryUpdate", (newInventory: Inventory) => {
      setInventory(newInventory);
    });

    newSocket.on("dayReset", (data: { orders: Order[]; inventory: Inventory }) => {
      setOrders(data.orders);
      setInventory(data.inventory);
    });

    return () => {
      newSocket.close();
    };
  }, [socketUrl]);

  const createOrder = useCallback(
    (orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "status">) => {
      socket?.emit("createOrder", orderData);
    },
    [socket]
  );

  const updateOrderStatus = useCallback(
    (orderId: string, status: OrderStatus) => {
      socket?.emit("updateOrderStatus", { orderId, status });
    },
    [socket]
  );

  const updatePaymentStatus = useCallback(
    (orderId: string, paymentStatus: PaymentStatus) => {
      socket?.emit("updatePaymentStatus", { orderId, paymentStatus });
    },
    [socket]
  );

  const resetDay = useCallback(() => {
    socket?.emit("resetDay");
  }, [socket]);

  const setupInventory = useCallback(
    async (data: { potatoStock: number; flavorStocks: Record<string, number> }) => {
      const response = await fetch(`${apiBaseUrl}/api/inventory/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    [apiBaseUrl]
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
