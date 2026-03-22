import React, { useState } from "react";
import { MENU_ITEMS, Order, OrderItem, Inventory, OrderStatus, cn } from "../lib";
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertTriangle, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CashierViewProps {
  orders: Order[];
  inventory: Inventory | null;
  createOrder: (orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "status"> & { location?: string }) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  location: string;
}

export function CashierView({ orders, inventory, createOrder, updateOrderStatus, location }: CashierViewProps) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isOrderComplete, setIsOrderComplete] = useState(false);

  const addToCart = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId] -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const clearCart = () => setCart({});

  const nextOrderNumber = orders.length > 0
    ? Math.max(...orders.map((o) => o.orderNumber)) + 1
    : 1;

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = MENU_ITEMS.find((m) => m.id === id)!;
    return { ...item, qty: qty as number };
  });

  const total = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const handleConfirmOrder = () => {
    if (cartItems.length === 0) return;

    const orderItems: OrderItem[] = cartItems.map((item) => ({
      id: Math.random().toString(36).substr(2, 9),
      menuItemId: item.id,
      name: item.name,
      qty: item.qty,
      price: item.price,
    }));

    createOrder({
      paymentMethod: "cash",
      paymentStatus: "paid",
      totalAmount: total,
      items: orderItems,
      location: (location || "").trim() || undefined,
    });

    setCart({});
    setIsOrderComplete(true);
    setTimeout(() => setIsOrderComplete(false), 2000);
  };

  const isItemSoldOut = (itemId: string) => {
    if (!inventory) return false;
    if (inventory.potatoStock <= 0) return true;
    if ((inventory.flavorStocks[itemId] || 0) <= 0) return true;
    return false;
  };

  const getStockWarning = (itemId: string) => {
    if (!inventory) return null;
    if (inventory.potatoStock <= inventory.thresholds.potato) return "Low Potato Stock";
    if ((inventory.flavorStocks[itemId] || 0) <= inventory.thresholds.flavor) return "Low Flavor Stock";
    return null;
  };

  return (
    <div className="flex h-full flex-col gap-4 md:gap-6 p-4 md:p-6 bg-sunburst overflow-hidden relative">
      <div className="absolute inset-0 bg-halftone" />

      {/* Ready Orders - Call out for pickup */}
      {(() => {
        const readyOrders = orders.filter((o) => o.paymentStatus === "paid" && o.status === "ready");
        if (readyOrders.length === 0) return null;
        return (
          <div className="flex-shrink-0 relative z-10 p-4 bg-[#4CAF50]/90 backdrop-blur rounded-2xl border-2 border-white/40">
            <div className="flex items-center gap-3 mb-3">
              <Megaphone className="w-6 h-6 text-white" />
              <h3 className="font-black text-white text-lg" style={{ fontFamily: "Fredoka, sans-serif" }}>Ready for pickup – call out!</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {readyOrders
                .sort((a, b) => a.orderNumber - b.orderNumber)
                .map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-lg"
                  >
                    <span className="text-3xl font-black text-[#B71C1C]" style={{ fontFamily: "Fredoka, sans-serif" }}>#{order.orderNumber}</span>
                    <span className="text-sm text-slate-600 font-medium">
                      {order.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                    </span>
                    <button
                      onClick={() => updateOrderStatus(order.id, "completed")}
                      className="ml-auto px-4 py-2 bg-[#4CAF50] hover:bg-[#43A047] text-white font-bold rounded-lg text-sm transition-colors touch-target"
                    >
                      Handed to customer
                    </button>
                  </motion.div>
                ))}
            </div>
          </div>
        );
      })()}

      <div className="flex flex-1 min-h-0 flex-col md:flex-row gap-4 md:gap-6 relative z-10">
      {/* Menu Section */}
      <div className="flex-1 min-w-0 space-y-4 md:space-y-6 overflow-y-auto pr-2">
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow" style={{ fontFamily: "Fredoka, sans-serif" }}>Menu</h2>
          {inventory && (
            <div className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border-2",
              inventory.potatoStock <= inventory.thresholds.potato ? "bg-orange-500/90 text-white border-orange-400" : "bg-[#FFC107] text-[#B71C1C] border-yellow-400"
            )}>
              <AlertTriangle className="w-4 h-4" />
              Potatoes: {inventory.potatoStock}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {MENU_ITEMS.map((item) => {
            const soldOut = isItemSoldOut(item.id);
            const warning = getStockWarning(item.id);
            const inCart = cart[item.id] || 0;

            return (
              <motion.div
                key={item.id}
                whileHover={!soldOut ? { scale: 1.02 } : {}}
                whileTap={!soldOut ? { scale: 0.98 } : {}}
                className={cn(
                  "relative bg-white/95 rounded-2xl overflow-hidden shadow-xl border-2 transition-all cursor-pointer",
                  soldOut ? "opacity-60 grayscale border-white/50" : "border-white/60 hover:border-[#4CAF50]",
                  inCart > 0 && "border-[#4CAF50] ring-4 ring-[#4CAF50]/40"
                )}
                onClick={() => !soldOut && addToCart(item.id)}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {soldOut && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-2xl uppercase tracking-widest">Sold Out</span>
                    </div>
                  )}
                  {warning && !soldOut && (
                    <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                      <AlertTriangle className="w-3 h-3" />
                      {warning}
                    </div>
                  )}
                </div>
                <div className="p-3 md:p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl text-slate-900 leading-tight" style={{ fontFamily: "Fredoka, sans-serif" }}>{item.name}</h3>
                    <span className="font-black text-[#B71C1C] bg-[#FFC107] min-w-[3rem] h-12 px-3 rounded-full flex items-center justify-center text-lg shadow-lg">{item.price}฿</span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      {inCart > 0 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                            className="p-2.5 md:p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center bg-[#FFC107]/30 rounded-xl hover:bg-[#FFC107]/50 transition-colors touch-target"
                          >
                            <Minus className="w-5 h-5 text-[#B71C1C]" />
                          </button>
                          <span className="font-bold text-lg md:text-xl w-6 text-center text-slate-900">{inCart}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(item.id); }}
                            className="p-2.5 md:p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center bg-[#FFC107] rounded-xl hover:bg-[#FFD54F] transition-colors touch-target"
                          >
                            <Plus className="w-5 h-5 text-[#B71C1C]" />
                          </button>
                        </>
                      )}
                    </div>
                    {inCart === 0 && !soldOut && (
                      <span className="text-slate-500 text-sm font-medium">Tap to add</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col flex-shrink-0 bg-white rounded-2xl shadow-2xl border-2 border-white/60 overflow-hidden">
        <div className="p-4 md:p-6 border-b-2 border-white/60 bg-[#FFF8E7]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-[#B71C1C] flex items-center gap-2" style={{ fontFamily: "Fredoka, sans-serif" }}>
              <ShoppingCart className="w-6 h-6" />
              Order Cart
              <span className="text-2xl">#{nextOrderNumber}</span>
            </h2>
            {cartItems.length > 0 && (
              <button onClick={clearCart} className="text-[#B71C1C] hover:text-red-800 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 bg-white/95">
          <AnimatePresence mode="popLayout">
            {cartItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4"
              >
                <div className="w-20 h-20 bg-[#FFC107]/20 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10 text-[#B71C1C]" />
                </div>
                <p className="font-medium">Cart is empty</p>
              </motion.div>
            ) : (
              cartItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between bg-white border-2 border-slate-100 p-4 rounded-xl"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900">{item.name}</h4>
                    <p className="text-sm text-slate-500">{item.price}฿ × {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-100 rounded-lg transition-colors touch-target text-[#B71C1C]">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold w-6 text-center text-slate-900">{item.qty}</span>
                    <button onClick={() => addToCart(item.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#FFC107] hover:bg-[#FFD54F] rounded-lg transition-colors touch-target text-[#B71C1C]">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 md:p-6 bg-[#FFF8E7] border-t-2 border-white/60">
          <div className="pt-2">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[#B71C1C] font-bold">Total Amount</span>
              <span className="text-4xl font-black text-[#B71C1C]" style={{ fontFamily: "Fredoka, sans-serif" }}>{total}฿</span>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={cartItems.length === 0}
              className={cn(
                "w-full py-4 md:py-5 min-h-[56px] rounded-2xl font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-xl touch-target",
                cartItems.length === 0
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : isOrderComplete
                  ? "bg-[#4CAF50] text-white"
                  : "bg-[#B71C1C] hover:bg-[#C62828] text-white active:scale-95 border-2 border-white/40"
              )}
            >
              {isOrderComplete ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Order Confirmed!
                </>
              ) : (
                "Confirm Order"
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
