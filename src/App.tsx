import React, { useState } from "react";
import { useSocket } from "./useSocket";
import { UserRole } from "./types";
import { CashierView } from "./components/CashierView";
import { KitchenView } from "./components/KitchenView";
import { ManagerView } from "./components/ManagerView";
import { 
  Users, 
  ChefHat, 
  TrendingUp, 
  LogOut, 
  Wifi, 
  WifiOff,
  LayoutDashboard
} from "lucide-react";
import { cn } from "./utils";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [role, setRole] = useState<UserRole>(null);
  const { 
    orders, 
    inventory, 
    isConnected, 
    createOrder, 
    updateOrderStatus, 
    updatePaymentStatus, 
    resetDay, 
    setupInventory 
  } = useSocket();

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#0f172a_100%)]">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block p-4 bg-emerald-500 rounded-3xl mb-6 shadow-2xl shadow-emerald-500/20"
            >
              <LayoutDashboard className="w-12 h-12 text-white" />
            </motion.div>
            <h1 className="text-6xl font-black text-white mb-4 tracking-tight">JACKET POS</h1>
            <p className="text-slate-400 text-xl font-medium">Select your station to begin service</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RoleCard 
              title="Cashier" 
              description="Take orders & payments" 
              icon={Users} 
              color="bg-emerald-500" 
              onClick={() => setRole("cashier")} 
            />
            <RoleCard 
              title="Kitchen" 
              description="Prep & queue management" 
              icon={ChefHat} 
              color="bg-blue-500" 
              onClick={() => setRole("kitchen")} 
            />
            <RoleCard 
              title="Manager" 
              description="Sales & stock control" 
              icon={TrendingUp} 
              color="bg-indigo-500" 
              onClick={() => setRole("manager")} 
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none">JACKET</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{role} station</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors",
            isConnected ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? "Connected" : "Disconnected"}
          </div>
          
          <button 
            onClick={() => setRole(null)}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            Switch Station
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="h-full"
          >
            {role === "cashier" && (
              <CashierView 
                inventory={inventory} 
                createOrder={createOrder} 
              />
            )}
            {role === "kitchen" && (
              <KitchenView 
                orders={orders} 
                updateOrderStatus={updateOrderStatus} 
              />
            )}
            {role === "manager" && (
              <ManagerView 
                orders={orders} 
                inventory={inventory} 
                updatePaymentStatus={updatePaymentStatus}
                resetDay={resetDay}
                setupInventory={setupInventory}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function RoleCard({ title, description, icon: Icon, color, onClick }: any) {
  return (
    <motion.button
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-[2.5rem] text-left transition-all hover:bg-slate-800 hover:border-slate-600 shadow-2xl"
    >
      <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3", color)}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-3xl font-black text-white mb-2">{title}</h3>
      <p className="text-slate-400 font-medium text-lg leading-relaxed">{description}</p>
    </motion.button>
  );
}
