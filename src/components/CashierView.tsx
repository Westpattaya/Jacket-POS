import React, { useState } from "react";
import { MENU_ITEMS, PAYMENT_METHODS } from "../constants";
import { Order, OrderItem, PaymentMethod, PaymentStatus, Inventory } from "../types";
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "../utils";
import { motion, AnimatePresence } from "motion/react";

interface CashierViewProps {
  inventory: Inventory | null;
  createOrder: (orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "status">) => void;
}

export function CashierView({ inventory, createOrder }: CashierViewProps) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
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
      paymentMethod,
      paymentStatus,
      totalAmount: total,
      items: orderItems,
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
    <div className="flex h-full flex-col lg:flex-row gap-6 p-6 bg-slate-50">
      {/* Menu Section */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900">Menu</h2>
          {inventory && (
            <div className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2",
              inventory.potatoStock <= inventory.thresholds.potato ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
            )}>
              <AlertTriangle className="w-4 h-4" />
              Potatoes: {inventory.potatoStock}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  "relative bg-white rounded-3xl overflow-hidden shadow-md border-2 transition-all cursor-pointer",
                  soldOut ? "opacity-60 grayscale border-slate-200" : "border-transparent hover:border-emerald-500",
                  inCart > 0 && "border-emerald-500 ring-4 ring-emerald-500/10"
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
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl text-slate-800 leading-tight">{item.name}</h3>
                    <span className="font-black text-emerald-600 text-lg">{item.price}฿</span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                      {inCart > 0 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                            className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                          >
                            <Minus className="w-5 h-5 text-slate-600" />
                          </button>
                          <span className="font-bold text-xl w-6 text-center">{inCart}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(item.id); }}
                            className="p-2 bg-emerald-100 rounded-xl hover:bg-emerald-200 transition-colors"
                          >
                            <Plus className="w-5 h-5 text-emerald-600" />
                          </button>
                        </>
                      )}
                    </div>
                    {inCart === 0 && !soldOut && (
                      <span className="text-slate-400 text-sm font-medium">Tap to add</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-bottom border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Order Cart
            </h2>
            {cartItems.length > 0 && (
              <button onClick={clearCart} className="text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {cartItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10" />
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
                  className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{item.name}</h4>
                    <p className="text-sm text-slate-500">{item.price}฿ × {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.id)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => addToCart(item.id)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Payment Method</h4>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                    paymentMethod === method.id
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200"
                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                  )}
                >
                  <span className="text-xs font-bold">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Payment Status</h4>
            <div className="flex gap-2">
              {(["paid", "unpaid"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setPaymentStatus(status)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl border-2 font-bold transition-all capitalize",
                    paymentStatus === status
                      ? "bg-slate-800 border-slate-800 text-white shadow-lg shadow-slate-200"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-500 font-bold">Total Amount</span>
              <span className="text-4xl font-black text-slate-900">{total}฿</span>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={cartItems.length === 0}
              className={cn(
                "w-full py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl",
                cartItems.length === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : isOrderComplete
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 shadow-emerald-200"
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
  );
}
