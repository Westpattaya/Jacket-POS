import React, { useState } from "react";
import { useSocket } from "./hooks/useSocket";
import { UserRole, cn } from "./lib";
import { CashierView } from "./components/CashierView";
import { KitchenView } from "./components/KitchenView";
import { ManagerView } from "./components/ManagerView";
import { 
  Users, 
  ChefHat, 
  TrendingUp, 
  Wifi, 
  WifiOff,
  MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const LOCATION_STORAGE_KEY = "jacket-pos-location";

export default function App() {
  const [role, setRole] = useState<UserRole>(null);
  const [location, setLocation] = useState(() => localStorage.getItem(LOCATION_STORAGE_KEY) || "");
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const locationInputRef = React.useRef<HTMLInputElement>(null);
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
      <div className="min-h-[100dvh] min-h-screen relative flex items-center justify-center p-6 sm:p-8 lg:p-10 safe-area-inset bg-sunburst">
        <div className="absolute inset-0 bg-halftone" />
        <div className="max-w-4xl w-full relative z-10">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block mb-6"
            >
              <img src="/logo.png" alt="JACKET" className="h-14 sm:h-16 lg:h-20 w-auto drop-shadow-lg" style={{ filter: 'brightness(0) invert(1)' }} />
            </motion.div>
            <p className="text-white/90 text-lg sm:text-xl font-medium mb-8">Select your station to begin service</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <RoleCard 
              title="Cashier" 
              description="Take orders & payments" 
              icon={Users} 
              color="bg-[#FFC107]" 
              onClick={() => setRole("cashier")} 
            />
            <RoleCard 
              title="Kitchen" 
              description="Prep & queue management" 
              icon={ChefHat} 
              color="bg-[#FFC107]" 
              onClick={() => setRole("kitchen")} 
            />
            <RoleCard 
              title="Manager" 
              description="Sales & stock control" 
              icon={TrendingUp} 
              color="bg-[#FFC107]" 
              onClick={() => setRole("manager")} 
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] h-screen overflow-hidden bg-[#C62828] safe-area-inset">
      {/* Header */}
      <header className="bg-[#B71C1C] border-b-2 border-white/30 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="JACKET" className="h-10 sm:h-12 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          <span className="text-sm font-bold text-white/90 uppercase tracking-widest">{role} station</span>
          <button
            onClick={() => {
              setIsEditingLocation(true);
              setTimeout(() => locationInputRef.current?.focus(), 0);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 rounded-xl transition-colors touch-target min-h-[44px]"
          >
            <MapPin className="w-4 h-4 text-white flex-shrink-0" />
            {isEditingLocation ? (
              <input
                ref={locationInputRef}
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  localStorage.setItem(LOCATION_STORAGE_KEY, e.target.value);
                }}
                onBlur={() => setIsEditingLocation(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsEditingLocation(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Location"
                className="bg-transparent text-white text-sm font-bold min-w-[80px] outline-none placeholder:text-white/60"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm font-bold text-white">{location || "Set location"}</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex bg-white/20 p-1 rounded-xl border border-white/30">
            {(["cashier", "kitchen", "manager"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm capitalize transition-all touch-target",
                  role === r
                    ? "bg-[#FFC107] text-[#B71C1C] shadow-lg"
                    : "text-white/90 hover:text-white"
                )}
              >
                {r === "cashier" && <Users className="w-4 h-4 sm:w-4 sm:h-4" />}
                {r === "kitchen" && <ChefHat className="w-4 h-4 sm:w-4 sm:h-4" />}
                {r === "manager" && <TrendingUp className="w-4 h-4 sm:w-4 sm:h-4" />}
                <span className="hidden sm:inline">{r}</span>
              </button>
            ))}
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex-shrink-0 border border-white/30",
            isConnected ? "bg-[#4CAF50]/30 text-white" : "bg-red-900/50 text-red-200"
          )}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? "Connected" : "Disconnected"}
          </div>
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
                orders={orders}
                inventory={inventory} 
                createOrder={createOrder}
                updateOrderStatus={updateOrderStatus}
                location={location}
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
                location={location}
                setLocation={(loc) => {
                  setLocation(loc);
                  localStorage.setItem(LOCATION_STORAGE_KEY, loc);
                }}
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
      className="group bg-white/15 backdrop-blur-xl border-2 border-white/40 p-6 sm:p-8 rounded-2xl text-left transition-all hover:bg-white/25 hover:border-white shadow-2xl touch-target min-h-[140px] lg:min-h-[180px] flex flex-col"
    >
      <div className={cn("w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3 flex-shrink-0", color)}>
        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-[#B71C1C]" />
      </div>
      <h3 className="text-2xl sm:text-3xl font-black text-white mb-1 sm:mb-2 drop-shadow" style={{ fontFamily: "Fredoka, sans-serif" }}>{title}</h3>
      <p className="text-white/90 font-medium text-base sm:text-lg leading-relaxed">{description}</p>
    </motion.button>
  );
}
