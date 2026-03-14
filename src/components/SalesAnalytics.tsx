import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { format, isSameDay, isWithinInterval, startOfDay, endOfDay, parseISO, subDays } from 'date-fns';
import { Download, Printer, Filter, Calendar, TrendingUp, DollarSign, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import { motion } from 'motion/react';
import { Item, Transaction } from '../types';

interface SalesAnalyticsProps {
  transactions: Transaction[];
  items: Item[];
  storeName: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ transactions, items, storeName }) => {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  const componentRef = useRef<HTMLDivElement>(null);

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'OUT') return false;
      
      const tDate = new Date(t.date);
      const start = startOfDay(parseISO(dateRange.start));
      const end = endOfDay(parseISO(dateRange.end));
      
      const inDateRange = isWithinInterval(tDate, { start, end });
      
      if (!inDateRange) return false;

      if (selectedCategory !== 'ALL') {
        const item = items.find(i => i.id === t.item_id);
        if (item?.category !== selectedCategory) return false;
      }

      return true;
    });
  }, [transactions, items, dateRange, selectedCategory]);

  // Calculations
  const metrics = useMemo(() => {
    const totalSales = filteredTransactions.reduce((acc, t) => acc + ((t.retail_price || 0) * t.quantity), 0);
    const totalQty = filteredTransactions.reduce((acc, t) => acc + t.quantity, 0);
    const totalTrans = filteredTransactions.length;
    const avgOrderValue = totalTrans > 0 ? totalSales / totalTrans : 0;

    return { totalSales, totalQty, totalTrans, avgOrderValue };
  }, [filteredTransactions]);

  // Chart Data
  const chartData = useMemo(() => {
    const data: Record<string, { name: string; sales: number; quantity: number }> = {};

    filteredTransactions.forEach(t => {
      const dateKey = format(new Date(t.date), viewMode === 'daily' ? 'MMM dd' : 'MMM yyyy');
      if (!data[dateKey]) {
        data[dateKey] = { name: dateKey, sales: 0, quantity: 0 };
      }
      data[dateKey].sales += (t.retail_price || 0) * t.quantity;
      data[dateKey].quantity += t.quantity;
    });

    return Object.values(data);
  }, [filteredTransactions, viewMode]);

  // Category Data
  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const item = items.find(i => i.id === t.item_id);
      const cat = item?.category || 'Unknown';
      if (!data[cat]) data[cat] = 0;
      data[cat] += (t.retail_price || 0) * t.quantity;
    });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 categories
  }, [filteredTransactions, items]);

  // Handlers
  const handleExportExcel = () => {
    const data = filteredTransactions.map(t => {
      const item = items.find(i => i.id === t.item_id);
      return {
        Date: format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
        Item: t.item_name,
        Category: item?.category || 'N/A',
        Particulars: t.particulars,
        Quantity: t.quantity,
        'Unit Price': t.retail_price,
        'Total Amount': (t.retail_price || 0) * t.quantity,
        Customer: t.customer_name || 'Walk-in'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `${storeName}_Sales_Report_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${storeName} Sales Report`
  });

  const setPresetRange = (range: 'today' | 'week' | 'month' | 'year') => {
    const end = new Date();
    let start = new Date();

    switch (range) {
      case 'today':
        start = new Date();
        break;
      case 'week':
        start = subDays(new Date(), 7);
        break;
      case 'month':
        start = subDays(new Date(), 30);
        break;
      case 'year':
        start = subDays(new Date(), 365);
        break;
    }

    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 font-display">Sales Analytics</h2>
          <p className="text-stone-500 text-sm">Real-time performance metrics and insights</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-stone-50 p-1 rounded-xl border border-stone-200">
            <button 
              onClick={() => setPresetRange('today')}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg transition-all"
            >
              Today
            </button>
            <button 
              onClick={() => setPresetRange('week')}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg transition-all"
            >
              Week
            </button>
            <button 
              onClick={() => setPresetRange('month')}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg transition-all"
            >
              Month
            </button>
             <button 
              onClick={() => setPresetRange('year')}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg transition-all"
            >
              Year
            </button>
          </div>

          <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200">
            <Calendar size={16} className="text-stone-400" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent text-xs font-bold text-stone-600 focus:outline-none w-28"
            />
            <span className="text-stone-400 text-xs">to</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent text-xs font-bold text-stone-600 focus:outline-none w-28"
            />
          </div>

          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Categories</option>
            {Array.from(new Set(items.map(i => i.category))).sort().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportExcel}
              className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
              title="Export to Excel"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={() => handlePrint()}
              className="p-2 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              title="Print Report"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Sales" 
          value={`₱${metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign size={24} />}
          color="indigo"
        />
        <MetricCard 
          title="Total Transactions" 
          value={metrics.totalTrans.toString()}
          icon={<TrendingUp size={24} />}
          color="emerald"
        />
        <MetricCard 
          title="Items Sold" 
          value={metrics.totalQty.toString()}
          icon={<Package size={24} />}
          color="amber"
        />
        <MetricCard 
          title="Avg. Transaction" 
          value={`₱${metrics.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Filter size={24} />} // Placeholder icon
          color="rose"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-stone-900">Sales Trend</h3>
            <div className="flex bg-stone-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'daily' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}
              >
                Daily
              </button>
              <button 
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'monthly' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}
              >
                Monthly
              </button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#78716c' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#78716c' }} 
                  tickFormatter={(value) => `₱${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Sales']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Top Categories</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₱${value.toLocaleString()}`} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table (Hidden for Print, but exported via Excel) */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <h3 className="text-lg font-bold text-stone-900">Detailed Transaction Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Item</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Particulars</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-right">Qty</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTransactions.slice(0, 10).map((t) => {
                const item = items.find(i => i.id === t.item_id);
                const isNonSales = ['RETAIL', 'TRANSFER', 'PERSONAL USE', 'PROJECT', 'DAMAGE', 'ADJUSTMENT'].includes(t.particulars);
                return (
                  <tr key={t.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-stone-500">
                      {format(new Date(t.date), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-stone-800">{t.item_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-stone-100 text-stone-500 rounded text-[10px] font-bold uppercase">
                        {item?.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">{t.particulars}</td>
                    <td className="px-6 py-4 text-sm text-stone-600 text-right font-mono">{t.quantity}</td>
                    <td className="px-6 py-4 text-sm font-bold text-stone-900 text-right font-mono">
                      {isNonSales ? (
                        <span className="text-stone-400">₱0.00</span>
                      ) : (
                        `₱${((t.retail_price || 0) * t.quantity).toFixed(2)}`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTransactions.length > 10 && (
            <div className="p-4 text-center border-t border-stone-100">
              <p className="text-xs text-stone-400 italic">Showing 10 of {filteredTransactions.length} transactions. Export to Excel for full list.</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Print Component */}
      <div style={{ display: 'none' }}>
        <PrintableReport ref={componentRef} transactions={filteredTransactions} items={items} storeName={storeName} dateRange={dateRange} metrics={metrics} />
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) => {
  const colorStyles = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorStyles[color as keyof typeof colorStyles]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-bold text-stone-900 font-display mt-1">{value}</p>
      </div>
    </motion.div>
  );
};

// Printable Report Component
const PrintableReport = React.forwardRef<HTMLDivElement, any>(({ transactions, items, storeName, dateRange, metrics }, ref) => {
  return (
    <div ref={ref} className="p-8 font-sans">
      <div className="text-center mb-8 border-b pb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">{storeName}</h1>
        <h2 className="text-xl font-medium text-stone-600">Sales Report</h2>
        <p className="text-sm text-stone-400 mt-2">
          Period: {format(parseISO(dateRange.start), 'MMM dd, yyyy')} - {format(parseISO(dateRange.end), 'MMM dd, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="p-4 border rounded-lg bg-stone-50">
          <p className="text-xs font-bold text-stone-500 uppercase">Total Sales</p>
          <p className="text-xl font-bold">₱{metrics.totalSales.toLocaleString()}</p>
        </div>
        <div className="p-4 border rounded-lg bg-stone-50">
          <p className="text-xs font-bold text-stone-500 uppercase">Transactions</p>
          <p className="text-xl font-bold">{metrics.totalTrans}</p>
        </div>
        <div className="p-4 border rounded-lg bg-stone-50">
          <p className="text-xs font-bold text-stone-500 uppercase">Items Sold</p>
          <p className="text-xl font-bold">{metrics.totalQty}</p>
        </div>
        <div className="p-4 border rounded-lg bg-stone-50">
          <p className="text-xs font-bold text-stone-500 uppercase">Avg. Value</p>
          <p className="text-xl font-bold">₱{metrics.avgOrderValue.toFixed(2)}</p>
        </div>
      </div>

      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-stone-800">
            <th className="py-2">Date</th>
            <th className="py-2">Item</th>
            <th className="py-2">Particulars</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t: any) => {
            const isNonSales = ['RETAIL', 'TRANSFER', 'PERSONAL USE', 'PROJECT', 'DAMAGE', 'ADJUSTMENT'].includes(t.particulars);
            const total = isNonSales ? 0 : ((t.retail_price || 0) * t.quantity);
            
            return (
              <tr key={t.id} className="border-b border-stone-200">
                <td className="py-2">{format(new Date(t.date), 'MM/dd/yy HH:mm')}</td>
                <td className="py-2">{t.item_name}</td>
                <td className="py-2 text-xs uppercase">{t.particulars}</td>
                <td className="py-2 text-right">{t.quantity}</td>
                <td className="py-2 text-right">
                  {isNonSales ? '₱0.00' : `₱${t.retail_price?.toFixed(2)}`}
                </td>
                <td className="py-2 text-right font-bold">
                  ₱{total.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-stone-800">
            <td colSpan={4} className="py-4 text-right font-bold uppercase">Grand Total</td>
            <td className="py-4 text-right font-bold text-lg">₱{metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>
      
      <div className="mt-8 text-center text-xs text-stone-400">
        Generated on {format(new Date(), 'MMMM dd, yyyy HH:mm a')}
      </div>
    </div>
  );
});
