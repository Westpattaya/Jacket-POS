import React from "react";
import { Order, OrderStatus } from "../types";
import { Clock, CheckCircle, ChefHat, Package } from "lucide-react";
import { cn } from "../utils";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from "date-fns";

interface KitchenViewProps {
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

export function KitchenView({ orders, updateOrderStatus }: KitchenViewProps) {
  // Only show paid orders that are not completed
  const activeOrders = orders.filter(
    (o) => o.paymentStatus === "paid" && o.status !== "completed"
  );

  const columns: { id: OrderStatus; name: string; icon: any; color: string }[] = [
    { id: "new", name: "New", icon: Package, color: "bg-blue-500" },
    { id: "preparing", name: "Preparing", icon: ChefHat, color: "bg-orange-500" },
    { id: "ready", name: "Ready", icon: CheckCircle, color: "bg-emerald-500" },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-100">
      <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-emerald-600" />
          Kitchen Queue
        </h2>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-bold text-slate-600">
            Active Orders: {activeOrders.length}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {columns.map((col) => (
          <div key={col.id} className="flex-1 flex flex-col min-w-[320px]">
            <div className={cn("flex items-center gap-3 p-4 rounded-t-3xl text-white font-bold text-xl", col.color)}>
              <col.icon className="w-6 h-6" />
              {col.name}
              <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm">
                {activeOrders.filter((o) => o.status === col.id).length}
              </span>
            </div>
            <div className="flex-1 bg-slate-50/50 rounded-b-3xl border-2 border-slate-200/50 overflow-y-auto p-4 space-y-4">
              <AnimatePresence mode="popLayout">
                {activeOrders
                  .filter((o) => o.status === col.id)
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Order</span>
                          <h3 className="text-3xl font-black text-slate-900">#{order.orderNumber}</h3>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(order.createdAt))} ago
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                            <span className="font-bold text-slate-800">
                              <span className="text-emerald-600 mr-2">{item.qty}x</span>
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        {col.id === "new" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "preparing")}
                            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
                          >
                            Start Prep
                          </button>
                        )}
                        {col.id === "preparing" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "ready")}
                            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors"
                          >
                            Mark Ready
                          </button>
                        )}
                        {col.id === "ready" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "completed")}
                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
