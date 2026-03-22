import React, { useState } from "react";
import { Order, Inventory, OrderStatus, PaymentStatus } from "../types";
import { MENU_ITEMS } from "../constants";
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight,
  BarChart3,
  PieChart,
  Settings
} from "lucide-react";
import { cn } from "../utils";
import { motion } from "motion/react";

interface ManagerViewProps {
  orders: Order[];
  inventory: Inventory | null;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => void;
  resetDay: () => void;
  setupInventory: (data: { potatoStock: number; flavorStocks: Record<string, number> }) => void;
}

export function ManagerView({ orders, inventory, updatePaymentStatus, resetDay, setupInventory }: ManagerViewProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "orders" | "summary" | "settings">("dashboard");

  // Stats
  const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
  
  const paymentBreakdown = paidOrders.reduce((acc, o) => {
    acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const flavorSales = paidOrders.reduce((acc, o) => {
    o.items.forEach(item => {
      acc[item.menuItemId] = (acc[item.menuItemId] || 0) + item.qty;
    });
    return acc;
  }, {} as Record<string, number>);

  const [setupData, setSetupData] = useState({
    potatoStock: inventory?.potatoStock || 80,
    flavorStocks: inventory?.flavorStocks || {
      "classic-bacon": 30,
      "hunter-chicken": 30,
      "truffle-mushroom": 20,
    }
  });

  const handleSetup = () => {
    setupInventory(setupData);
    alert("Inventory updated successfully!");
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-indigo-600" />
          Manager Dashboard
        </h2>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {(['dashboard', 'inventory', 'orders', 'summary', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all",
                activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Revenue" value={`${totalRevenue}฿`} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" />
              <StatCard title="Total Orders" value={paidOrders.length} icon={ShoppingCart} color="text-indigo-600" bg="bg-indigo-50" />
              <StatCard title="Avg. Order" value={`${avgOrderValue.toFixed(0)}฿`} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50" />
              <StatCard title="Potatoes Left" value={inventory?.potatoStock || 0} icon={Package} color="text-orange-600" bg="bg-orange-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sales by Flavor */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  Sales by Flavor
                </h3>
                <div className="space-y-6">
                  {MENU_ITEMS.map(item => {
                    const sold = flavorSales[item.id] || 0;
                    const max = Math.max(...Object.values(flavorSales), 1);
                    const percentage = (sold / max) * 100;
                    return (
                      <div key={item.id} className="space-y-2">
                        <div className="flex justify-between text-sm font-bold text-slate-600">
                          <span>{item.name}</span>
                          <span>{sold} sold</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className="h-full bg-indigo-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-slate-400" />
                  Payment Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(paymentBreakdown).map(([method, amount]) => (
                    <div key={method} className="bg-slate-50 p-6 rounded-2xl text-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">{method}</span>
                      <span className="text-2xl font-black text-slate-900">{amount}฿</span>
                    </div>
                  ))}
                  {Object.keys(paymentBreakdown).length === 0 && (
                    <div className="col-span-3 py-12 text-center text-slate-400">No sales yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "summary" && (
          <div className="max-w-3xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-black text-slate-900 mb-2">End of Day Summary</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Business & Beat Booth Report</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12">
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Gross Sales</p>
                  <p className="text-4xl font-black text-emerald-600">{totalRevenue}฿</p>
                </div>
                <div className="border-b border-slate-100 pb-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
                  <p className="text-3xl font-black text-slate-900">{paidOrders.length}</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Order Value</p>
                  <p className="text-3xl font-black text-slate-900">{avgOrderValue.toFixed(0)}฿</p>
                </div>
                <div className="border-b border-slate-100 pb-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Potatoes Sold</p>
                  <p className="text-3xl font-black text-slate-900">{(inventory?.openingPotatoStock || 0) - (inventory?.potatoStock || 0)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-8 mb-12">
              <div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Sales by Item</h4>
                <div className="space-y-3">
                  {MENU_ITEMS.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <span className="font-bold text-slate-700">{item.name}</span>
                      <span className="font-black text-slate-900">{flavorSales[item.id] || 0} units</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Payment Reconciliation</h4>
                <div className="space-y-3">
                  {Object.entries(paymentBreakdown).map(([method, amount]) => (
                    <div key={method} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <span className="font-bold text-slate-700 capitalize">{method}</span>
                      <span className="font-black text-slate-900">{amount}฿</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
            >
              <Package className="w-6 h-6" />
              Export / Print Report
            </button>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-2xl font-bold text-slate-800 mb-8">Inventory Management</h3>
              
              <div className="space-y-8">
                <div className="p-6 bg-slate-50 rounded-2xl">
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Total Potato Stock</label>
                  <div className="flex items-center gap-6">
                    <input 
                      type="number" 
                      value={setupData.potatoStock} 
                      onChange={(e) => setSetupData(prev => ({ ...prev, potatoStock: parseInt(e.target.value) || 0 }))}
                      className="w-32 text-3xl font-black p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none"
                    />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all",
                            (inventory?.potatoStock || 0) <= (inventory?.thresholds.potato || 0) ? "bg-orange-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${((inventory?.potatoStock || 0) / (inventory?.openingPotatoStock || 1)) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-500">Current: {inventory?.potatoStock} / {inventory?.openingPotatoStock}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {MENU_ITEMS.map(item => (
                    <div key={item.id} className="p-6 bg-slate-50 rounded-2xl">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{item.name}</label>
                      <input 
                        type="number" 
                        value={setupData.flavorStocks[item.id]} 
                        onChange={(e) => setSetupData(prev => ({ 
                          ...prev, 
                          flavorStocks: { ...prev.flavorStocks, [item.id]: parseInt(e.target.value) || 0 } 
                        }))}
                        className="w-full text-2xl font-black p-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none"
                      />
                      <p className="mt-2 text-xs font-bold text-slate-400">Current: {inventory?.flavorStocks[item.id] || 0}</p>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleSetup}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-100"
                >
                  Update Inventory
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice().reverse().map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-900">#{order.orderNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(order.createdAt).toLocaleTimeString()}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-700">
                        {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{order.totalAmount}฿</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter",
                        order.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter",
                        order.status === 'completed' ? "bg-slate-800 text-white" : "bg-blue-100 text-blue-700"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.paymentStatus === 'paid' && (
                        <button 
                          onClick={() => updatePaymentStatus(order.id, 'voided')}
                          className="text-xs font-bold text-red-500 hover:underline"
                        >
                          Void
                        </button>
                      )}
                      {order.paymentStatus === 'unpaid' && (
                        <button 
                          onClick={() => updatePaymentStatus(order.id, 'paid')}
                          className="text-xs font-bold text-emerald-500 hover:underline"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="py-20 text-center text-slate-400 font-medium">No orders found</div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-xl mx-auto space-y-8">
             <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-6">System Controls</h3>
              <div className="space-y-4">
                <button 
                  onClick={() => { if(confirm("Are you sure you want to reset all orders for the day?")) resetDay(); }}
                  className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="font-bold">Reset Day (Clear Orders)</span>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", bg)}>
        <Icon className={cn("w-7 h-7", color)} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ShoppingCart(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
