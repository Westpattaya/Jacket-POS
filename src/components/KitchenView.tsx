import React from "react";
import { Order, OrderStatus } from "../lib";
import { Clock, CheckCircle, ChefHat, Package, Timer } from "lucide-react";
import { cn } from "../lib";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { ElapsedTimer } from "./ElapsedTimer";

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
    <div className="h-full flex flex-col bg-sunburst overflow-hidden relative">
      <div className="absolute inset-0 bg-halftone" />
      <div className="p-4 md:p-6 bg-white/10 backdrop-blur border-b-2 border-white/30 flex items-center justify-between flex-shrink-0 relative z-10">
        <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3" style={{ fontFamily: "Fredoka, sans-serif" }}>
          <ChefHat className="w-8 h-8 text-[#FFC107]" />
          Kitchen Queue
        </h2>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-[#FFC107] text-[#B71C1C] rounded-xl border-2 border-white/40 text-sm font-bold">
            Active Orders: {activeOrders.length}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-4 md:p-6 gap-4 md:gap-6 min-h-0 relative z-10">
        {columns.map((col) => (
          <div key={col.id} className="flex-1 flex flex-col min-w-0 lg:min-w-[260px]">
            <div className={cn("flex items-center gap-3 p-3 md:p-4 rounded-t-2xl text-white font-bold text-lg md:text-xl border-2 border-b-0 border-white/40", col.color)}>
              <col.icon className="w-6 h-6" />
              {col.name}
              <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm">
                {activeOrders.filter((o) => o.status === col.id).length}
              </span>
            </div>
            <div className="flex-1 min-h-0 bg-white/95 rounded-b-2xl border-2 border-t-0 border-white/60 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
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
                      className="bg-white p-4 md:p-5 rounded-xl shadow-lg border-2 border-slate-100 hover:border-[#FFC107]/50 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Order</span>
                          <h3 className="text-3xl font-black text-slate-900">#{order.orderNumber}</h3>
                        </div>
                        <div className="flex flex-col items-end text-right">
                          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {format(new Date(order.createdAt), "MMM d, h:mm a")}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Timer className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <ElapsedTimer
                              startTime={
                                col.id === "new"
                                  ? order.createdAt
                                  : col.id === "preparing"
                                  ? order.preparingAt || order.createdAt
                                  : order.readyAt || order.preparingAt || order.createdAt
                              }
                              warningThresholdMinutes={col.id === "preparing" ? 5 : 10}
                              className="text-lg"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                            <span className="font-bold text-slate-800">
                              <span className="text-[#B71C1C] mr-2 font-black">{item.qty}x</span>
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        {col.id === "new" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "preparing")}
                            className="flex-1 py-3 min-h-[48px] bg-[#FFC107] hover:bg-[#FFD54F] text-[#B71C1C] font-bold rounded-xl transition-colors touch-target border-2 border-white/40"
                          >
                            Start Prep
                          </button>
                        )}
                        {col.id === "preparing" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "ready")}
                            className="flex-1 py-3 min-h-[48px] bg-[#4CAF50] hover:bg-[#66BB6A] text-white font-bold rounded-xl transition-colors touch-target"
                          >
                            Mark Ready
                          </button>
                        )}
                        {col.id === "ready" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "completed")}
                            className="flex-1 py-3 min-h-[48px] bg-[#B71C1C] hover:bg-[#C62828] text-white font-bold rounded-xl transition-colors touch-target border-2 border-white/40"
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
