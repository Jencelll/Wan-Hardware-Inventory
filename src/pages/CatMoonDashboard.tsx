import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import UsersPage from './UsersPage';
import { 
    LayoutDashboard, 
    Package, 
    PlusCircle, 
    MinusCircle, 
    ClipboardList, 
    Search, 
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    AlertTriangle,
    TrendingUp,
    History,
    X,
    Bell,
    Settings,
    ShieldCheck,
    Lock,
    ChevronRight,
    LayoutGrid,
    LogOut,
    Users,
    Eye,
    EyeOff,
    Edit,
    Save,
    FileSpreadsheet
  } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import SearchableSelect from '../components/SearchableSelect';
import { Item, Transaction } from '../types';

import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { DeliveryReceiptTemplate } from '../components/DeliveryReceiptTemplate';
import { ReceiptModal } from '../components/ReceiptModal';
import { useReactToPrint } from 'react-to-print';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'dashboard' | 'inventory' | 'stock-in' | 'stock-out' | 'receipts' | 'register' | 'settings' | 'users';

export default function CatMoonDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [stockOutPassword, setStockOutPassword] = useState(() => localStorage.getItem('catmoon_stock_out_password') || "MOON");
  
  // Filter States
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [showDailySalesModal, setShowDailySalesModal] = useState(false);
  const [stockInSearch, setStockInSearch] = useState('');
  const [stockOutSearch, setStockOutSearch] = useState('');
  const [selectedStockInItem, setSelectedStockInItem] = useState<number>(0);
  const [selectedStockOutItem, setSelectedStockOutItem] = useState<number>(0);

  // Receipts Filter States
  const [receiptMonth, setReceiptMonth] = useState<string>(new Date().getMonth().toString());
  const [receiptYear, setReceiptYear] = useState<string>(new Date().getFullYear().toString());
  const [receiptTypeFilter, setReceiptTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Edit State
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Password Visibility States
  const [showStockOutAuthPassword, setShowStockOutAuthPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Invoice State
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [receiptType, setReceiptType] = useState<'INVOICE' | 'DELIVERY'>('INVOICE');

  const safeFormat = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, formatStr);
  };

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      const [itemsRes, transRes] = await Promise.all([
        fetch('/api/items', { headers }),
        fetch('/api/transactions', { headers })
      ]);
      
      if (itemsRes.status === 401 || transRes.status === 401) {
        logout();
        return;
      }

      if (!itemsRes.ok || !transRes.ok) throw new Error('API unavailable');
      const itemsData = await itemsRes.json();
      const transData = await transRes.json();
      
      const parsedItems = Array.isArray(itemsData) ? itemsData.map((item: any) => ({
        ...item,
        cost_price: Number(item.cost_price || 0),
        retail_price: Number(item.retail_price || 0),
        initial_count: Number(item.initial_count || 0),
        current_stock: Number(item.current_stock || 0),
        total_in: Number(item.total_in || 0),
        total_out: Number(item.total_out || 0)
      })) : [];

      const parsedTransactions = Array.isArray(transData) ? transData.map((t: any) => ({
        ...t,
        quantity: Number(t.quantity || 0),
        cost_price: t.cost_price ? Number(t.cost_price) : undefined,
        retail_price: t.retail_price ? Number(t.retail_price) : undefined
      })) : [];

      setItems(parsedItems);
      setTransactions(parsedTransactions);
    } catch (error) {
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/items/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(editingItem)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update item');
      }
      
      setEditingItem(null);
      fetchData();
      alert('Item updated successfully');
    } catch (error: any) {
      console.error('Update Failed:', error);
      alert(`Failed to update item: ${error.message}`);
    }
  };

  const handleExportExcel = () => {
    // Get PH Time (UTC+8)
    const phTime = new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Manila', 
      dateStyle: 'full', 
      timeStyle: 'medium' 
    });

    // --- Helper: Auto-fit Columns ---
    const getColumnWidths = (data: any[]) => {
      if (data.length === 0) return [];
      const keys = Object.keys(data[0]);
      return keys.map(key => {
        const maxLength = Math.max(
          key.length,
          ...data.map(row => (row[key] ? String(row[key]).length : 0))
        );
        return { wch: maxLength + 5 }; // Add padding
      });
    };

    // --- 1. REGISTER SHEET ---
    const registerData = filteredItems.map((item, index) => ({
      'SEQ. #': index + 1,
      'INVENTORY NAME': item.name,
      'ITEM CODE': item.item_code,
      'CATEGORY': item.category,
      'U.O.M.': item.uom,
      'COST PRICE': item.cost_price,
      'RETAIL PRICE': item.retail_price,
      'INITIAL COUNT': item.initial_count,
      'DATE': safeFormat(item.created_at, 'MMMM d, yyyy'),
      'STOCK IN': item.total_in || 0,
      'STOCK OUT': item.total_out || 0,
      'ENDING STOCK': item.current_stock
    }));

    const registerSheet = XLSX.utils.json_to_sheet(registerData, { origin: 'A3' } as any);
    registerSheet['!cols'] = getColumnWidths(registerData); // Set column widths
    
    XLSX.utils.sheet_add_aoa(registerSheet, [
      ['CATMOON INVENTORY REGISTER REPORT'],
      [`Generated on: ${phTime}`]
    ], { origin: 'A1' });

    // --- 2. STOCK IN SHEET ---
    const stockInTransactions = transactions
      .filter(t => t.type === 'IN')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stockInData = stockInTransactions.map(t => {
      const item = items.find(i => i.id === t.item_id);
      const costPrice = t.cost_price || item?.cost_price || 0;
      return {
        'DATE': safeFormat(t.date, 'MMMM d, yyyy'),
        'ITEM NAME': t.item_name || item?.name || 'Unknown',
        'PARTICULARS': t.particulars,
        'COST PRICE': costPrice,
        'AMOUNT': costPrice * t.quantity,
        'QTY': t.quantity,
        'ENDING STOCK': item?.current_stock || 0
      };
    });

    const stockInSheet = XLSX.utils.json_to_sheet(stockInData, { origin: 'A3' } as any);
    stockInSheet['!cols'] = getColumnWidths(stockInData); // Set column widths

    XLSX.utils.sheet_add_aoa(stockInSheet, [
      ['CATMOON STOCK IN REPORT'],
      [`Generated on: ${phTime}`]
    ], { origin: 'A1' });

    // --- 3. STOCK OUT SHEET ---
    const stockOutTransactions = transactions
      .filter(t => t.type === 'OUT')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stockOutData = stockOutTransactions.map(t => {
      const item = items.find(i => i.id === t.item_id);
      const retailPrice = t.retail_price || item?.retail_price || 0;
      return {
        'DATE': safeFormat(t.date, 'MMMM d, yyyy'),
        'ITEM NAME': t.item_name || item?.name || 'Unknown',
        'PARTICULARS': t.particulars,
        'RETAIL PRICE': retailPrice,
        'AMOUNT': retailPrice * t.quantity,
        'QTY': t.quantity,
        'ENDING STOCK': item?.current_stock || 0
      };
    });

    const stockOutSheet = XLSX.utils.json_to_sheet(stockOutData, { origin: 'A3' } as any);
    stockOutSheet['!cols'] = getColumnWidths(stockOutData); // Set column widths

    XLSX.utils.sheet_add_aoa(stockOutSheet, [
      ['CATMOON STOCK OUT REPORT'],
      [`Generated on: ${phTime}`]
    ], { origin: 'A1' });

    // --- CREATE WORKBOOK ---
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, registerSheet, "REGISTER");
    XLSX.utils.book_append_sheet(workbook, stockInSheet, "STOCK IN");
    XLSX.utils.book_append_sheet(workbook, stockOutSheet, "STOCK OUT");

    XLSX.writeFile(workbook, "CATMOON_INVENTORY.xlsx");
  };

  const handleTransaction = async (e: React.FormEvent<HTMLFormElement>, type: 'IN' | 'OUT') => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemId = Number(formData.get('item_id'));
    const qty = Number(formData.get('quantity'));
    const password = formData.get('password') as string;

    if (type === 'OUT' && password !== stockOutPassword) {
      setPasswordError("Incorrect authorization password.");
      return;
    }

    setPasswordError(null);
    const item = items.find(i => i.id === itemId);
    
    const customerName = formData.get('customer_name') as string;
    const customerAddress = formData.get('customer_address') as string;
    const customerTIN = formData.get('customer_tin') as string;

    const data = {
      id: Date.now(),
      item_id: itemId,
      item_name: item?.name,
      type,
      quantity: qty,
      particulars: formData.get('particulars') as string,
      cost_price: item?.cost_price,
      retail_price: item?.retail_price,
      date: new Date().toISOString(),
      customer_name: customerName,
      customer_address: customerAddress,
      customer_tin: customerTIN
    };

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'API error');
      }
      
      const serverResponse = await res.json();
      
      // Reset form states
      if (type === 'IN') {
        setSelectedStockInItem(0);
        setReceiptType('DELIVERY');
        
        setInvoiceData({
          id: serverResponse.id || data.id,
          date: serverResponse.date || data.date,
          deliveredTo: customerName || 'WAN HARDWARE',
          address: customerAddress || '',
          tin: customerTIN || '',
          terms: formData.get('terms') as string || '',
          businessStyle: formData.get('business_style') as string || '',
          items: [{
            quantity: qty,
            unit: item?.uom || 'PCS',
            description: item?.name || 'Unknown Item'
          }]
        });
      }
      
      if (type === 'OUT') {
        setSelectedStockOutItem(0);
        setReceiptType('INVOICE');
        
        // Prepare invoice data using server response ID
        const retailPrice = item?.retail_price || 0;
        
        setInvoiceData({
          id: serverResponse.id || data.id,
          date: serverResponse.date || data.date,
          customerName,
          customerAddress,
          customerTIN,
          items: [{
            quantity: qty,
            unit: item?.uom || 'PCS',
            description: item?.name || 'Unknown Item',
            unitPrice: retailPrice,
            amount: retailPrice * qty
          }],
          totalAmount: retailPrice * qty
        });
      }
      
      fetchData();
    } catch (error: any) {
      console.error('Transaction Failed:', error);
      alert(`Transaction failed to save: ${error.message}`);
    }
    setActiveTab('inventory');
  };

  // Helper to re-print a receipt from history
  const handleReprintReceipt = (t: Transaction) => {
    const item = items.find(i => i.id === t.item_id) || { name: t.item_name || 'Unknown', uom: 'PCS', retail_price: t.retail_price || 0 };
    const retailPrice = t.retail_price || item.retail_price || 0;
    
    if (t.type === 'IN') {
      setReceiptType('DELIVERY');
      setInvoiceData({
        id: t.id,
        date: t.date,
        deliveredTo: t.customer_name || 'WAN HARDWARE',
        address: t.customer_address || '',
        tin: t.customer_tin || '',
        terms: '', // You might want to save this in DB later if needed
        businessStyle: '',
        items: [{
          quantity: t.quantity,
          unit: item.uom,
          description: item.name
        }]
      });
    } else {
      setReceiptType('INVOICE');
      setInvoiceData({
        id: t.id,
        date: t.date,
        customerName: t.customer_name || '',
        customerAddress: t.customer_address || '',
        customerTIN: t.customer_tin || '',
        items: [{
          quantity: t.quantity,
          unit: item.uom,
          description: item.name,
          unitPrice: retailPrice,
          amount: retailPrice * t.quantity
        }],
        totalAmount: retailPrice * t.quantity
      });
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formValues = Object.fromEntries(formData.entries());
    
    const newItem: Item = {
      id: Date.now(),
      item_code: formValues.item_code as string,
      name: formValues.name as string,
      category: formValues.category as string,
      uom: formValues.uom as string,
      cost_price: Number(formValues.cost_price),
      retail_price: Number(formValues.retail_price),
      initial_count: Number(formValues.initial_count),
      current_stock: Number(formValues.initial_count),
      created_at: (formValues.created_at as string) || new Date().toISOString()
    };

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(newItem)
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'API error');
      }
      fetchData();
    } catch (error: any) {
      console.error('Registration Failed:', error);
      alert(`Failed to register item: ${error.message}`);
    }
    setActiveTab('inventory');
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      
      let matchesStatus = true;
      if (filterStatus === 'LOW_STOCK') {
        matchesStatus = item.current_stock < 5;
      } else if (filterStatus === 'OUT_OF_STOCK') {
        matchesStatus = item.current_stock <= 0;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, selectedCategory, filterStatus]);

  const stats = useMemo(() => {
    const totalValue = items.reduce((acc, item) => acc + (item.current_stock * item.cost_price), 0);
    const lowStock = items.filter(item => item.current_stock > 0 && item.current_stock < 5).length;
    const outOfStock = items.filter(item => item.current_stock <= 0).length;
    const recentSales = transactions
      .filter(t => t.type === 'OUT' && new Date(t.date).toDateString() === new Date().toDateString())
      .reduce((acc, t) => acc + t.quantity, 0);

    return { totalValue, lowStock, outOfStock, recentSales };
  }, [items, transactions]);

  const chartData = useMemo(() => {
    return [...items]
      .sort((a, b) => (b.current_stock || 0) - (a.current_stock || 0))
      .slice(0, 8)
      .map(item => ({
        name: (item.name || 'Unknown').length > 15 ? (item.name || 'Unknown').substring(0, 12) + '...' : (item.name || 'Unknown'),
        stock: item.current_stock || 0
      }));
  }, [items]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPasswordError(null);
    setIsSidebarOpen(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen bg-[#F8F9FA] selection:bg-purple-100 selection:text-purple-900"
    >
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-stone-950 text-stone-400 flex flex-col border-r border-stone-800/50 z-40 transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 lg:p-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                  <LayoutGrid size={28} className="text-purple-500 relative z-10" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-white font-black tracking-tighter text-2xl font-display italic leading-none">CatMoon</h1>
                  <p className="text-purple-500 font-bold text-[10px] tracking-[0.3em] uppercase mt-1">Inventory</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-stone-900 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-[1px] w-8 bg-stone-800" />
              <p className="text-[9px] uppercase tracking-[0.5em] text-stone-600 font-bold whitespace-nowrap">Inventory System</p>
            </div>
          </motion.div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <SidebarLink 
            active={activeTab === 'dashboard'} 
            onClick={() => handleTabChange('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
          />
          <SidebarLink 
            active={activeTab === 'inventory'} 
            onClick={() => handleTabChange('inventory')}
            icon={<Package size={20} />}
            label="Inventory List"
          />
          
          <div className="pt-8 pb-3 px-4">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-600">Operations</p>
          </div>
          
          <SidebarLink 
            active={activeTab === 'stock-in'} 
            onClick={() => handleTabChange('stock-in')}
            icon={<PlusCircle size={20} />}
            label="Stock In"
          />
          <SidebarLink 
            active={activeTab === 'stock-out'} 
            onClick={() => handleTabChange('stock-out')}
            icon={<MinusCircle size={20} />}
            label="Stock Out"
          />
          <SidebarLink 
            active={activeTab === 'receipts'} 
            onClick={() => handleTabChange('receipts')}
            icon={<ClipboardList size={20} />}
            label="Receipts History"
          />
          <SidebarLink 
            active={activeTab === 'register'} 
            onClick={() => handleTabChange('register')}
            icon={<Plus size={20} />}
            label="Register Item"
          />

          <div className="pt-8 pb-3 px-4">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-600">System</p>
          </div>

          {user?.role === 'super_admin' && (
            <SidebarLink 
              active={activeTab === 'users'} 
              onClick={() => handleTabChange('users')}
              icon={<Users size={20} />}
              label="User Management"
            />
          )}

          <SidebarLink 
            active={activeTab === 'settings'} 
            onClick={() => handleTabChange('settings')}
            icon={<Settings size={20} />}
            label="Settings"
          />
        </nav>

        <div className="p-6 border-t border-stone-800/50 space-y-4">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-stone-500 hover:text-rose-500 hover:bg-stone-900 rounded-xl transition-colors w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>

          <div className="bg-stone-900/50 rounded-2xl p-4 flex items-center gap-3 border border-stone-800/50">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-sm">
              {user?.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm text-white font-semibold truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] opacity-40 truncate font-mono">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 flex items-center justify-between px-4 lg:px-10 shrink-0 z-10">
          <div className="flex items-center gap-3 lg:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-stone-100 rounded-xl transition-colors text-stone-600"
            >
              <LayoutGrid size={24} />
            </button>
            <h2 className="text-lg lg:text-xl font-bold text-stone-900 font-display capitalize tracking-tight truncate max-w-[120px] sm:max-w-none">
              {activeTab.replace('-', ' ')}
            </h2>
            <div className="hidden sm:block h-4 w-[1px] bg-stone-200 mx-2" />
            <p className="hidden md:block text-xs text-stone-400 font-medium">
              {format(time, 'EEEE, MMMM do')}
              <span className="ml-2 font-bold text-stone-500">
                {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-6">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-purple-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-12 pr-6 py-2.5 bg-stone-100/50 border-transparent rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500/20 transition-all w-40 lg:w-72 outline-hidden"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-1 lg:gap-2">
              <HeaderAction icon={<Bell size={20} />} title="Notifications" />
              <HeaderAction icon={<Settings size={20} />} onClick={() => handleTabChange('settings')} title="Settings" />
              <HeaderAction icon={<LogOut size={20} />} onClick={logout} title="Logout" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-10">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
                    <StatCard 
                      label="Inventory Value" 
                      value={`₱${stats.totalValue.toLocaleString()}`} 
                      icon={<TrendingUp size={24} />}
                      trend="+2.5% vs last month"
                      color="bg-purple-500/10 text-purple-500"
                      onClick={() => { setActiveTab('inventory'); setFilterStatus('ALL'); }}
                    />
                    <StatCard 
                      label="Low Stock" 
                      value={stats.lowStock.toString()} 
                      icon={<AlertTriangle size={24} />}
                      trend="Requires attention"
                      color="bg-amber-500/10 text-amber-500"
                      onClick={() => { setActiveTab('inventory'); setFilterStatus('LOW_STOCK'); }}
                    />
                    <StatCard 
                      label="Out of Stock" 
                      value={stats.outOfStock.toString()} 
                      icon={<X size={24} />}
                      trend="Critical items"
                      color="bg-rose-500/10 text-rose-500"
                      onClick={() => { setActiveTab('inventory'); setFilterStatus('OUT_OF_STOCK'); }}
                    />
                    <StatCard 
                      label="Daily Sales" 
                      value={stats.recentSales.toString()} 
                      icon={<ArrowDownLeft size={24} />}
                      trend="Units sold today"
                      color="bg-blue-500/10 text-blue-500"
                      onClick={() => setShowDailySalesModal(true)}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
                    {/* Chart */}
                    <div className="lg:col-span-2 card-premium p-8">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="font-bold text-stone-900 text-lg font-display">Stock Distribution</h3>
                          <p className="text-xs text-stone-400 font-medium mt-1">Top 8 items by current stock levels</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500" />
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">In Stock</span>
                        </div>
                      </div>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#7e22ce" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 600 }}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 600 }}
                            />
                            <Tooltip 
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                padding: '12px'
                              }}
                            />
                            <Bar dataKey="stock" radius={[6, 6, 0, 0]} barSize={32}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="card-premium p-8">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-stone-900 text-lg font-display">Live Logs</h3>
                        <button className="text-[10px] font-bold text-purple-600 uppercase tracking-widest hover:text-purple-700 transition-colors">View All</button>
                      </div>
                      <div className="space-y-6">
                        {transactions.slice(0, 6).map((t, idx) => (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={t.id} 
                            className="flex items-start gap-4 group cursor-pointer"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-transform group-hover:scale-110",
                              t.type === 'IN' ? "bg-purple-50 text-purple-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {t.type === 'IN' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-stone-800 truncate group-hover:text-purple-600 transition-colors">{t.item_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                  t.type === 'IN' ? "bg-purple-100 text-purple-700" : "bg-rose-100 text-rose-700"
                                )}>
                                  {t.type === 'IN' ? '+' : '-'}{t.quantity}
                                </span>
                                <span className="text-[10px] text-stone-400 font-medium">{safeFormat(t.date, 'h:mm a')}</span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors self-center" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 no-print">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                        Total Registered Items: <span className="text-stone-900 ml-1">{filteredItems.length}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-600 focus:outline-hidden focus:ring-4 focus:ring-purple-500/5 transition-all"
                      >
                        <option value="ALL">All Status</option>
                        <option value="LOW_STOCK">Low Stock</option>
                        <option value="OUT_OF_STOCK">Out of Stock</option>
                      </select>
                      <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-600 focus:outline-hidden focus:ring-4 focus:ring-purple-500/5 transition-all"
                      >
                        {['ALL', 'ROCKS', 'POWDER', 'LIQUID', 'GAS', 'TOOLS', 'OTHERS'].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button 
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
                      >
                        <FileSpreadsheet size={14} />
                        Export Excel
                      </button>
                      <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
                      >
                        <ClipboardList size={14} />
                        Print List
                      </button>
                    </div>
                  </div>
                  
                  <div className="card-premium">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-50/50 border-b border-stone-200/60">
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Seq.</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Inventory Name</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Item Code</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Category</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">U.O.M.</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Cost</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Retail</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center">Initial</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Date</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center">Stock In</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center">Stock Out</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center">Ending</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100/60">
                          {filteredItems.map((item, index) => (
                            <tr key={item.id} className="hover:bg-stone-50/80 transition-colors group">
                              <td className="px-6 py-5 font-mono text-xs text-stone-400">{index + 1}</td>
                              <td className="px-6 py-5 font-bold text-stone-800">{item.name}</td>
                              <td className="px-6 py-5 font-mono text-xs text-stone-500">{item.item_code}</td>
                              <td className="px-6 py-5">
                                <span className="px-2.5 py-1 bg-stone-100 text-stone-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                  {item.category}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-[10px] font-bold text-stone-400">{item.uom}</td>
                              <td className="px-6 py-5 text-right font-mono text-sm font-medium text-stone-600">₱{item.cost_price.toFixed(2)}</td>
                              <td className="px-6 py-5 text-right font-mono text-sm font-bold text-stone-900">₱{item.retail_price.toFixed(2)}</td>
                              <td className="px-6 py-5 text-center font-mono text-sm text-stone-500">{item.initial_count}</td>
                              <td className="px-6 py-5 text-[10px] font-bold text-stone-400">{safeFormat(item.created_at, 'MMMM d, yyyy')}</td>
                              <td className="px-6 py-5 text-center font-mono text-sm text-purple-600">+{item.total_in || 0}</td>
                              <td className="px-6 py-5 text-center font-mono text-sm text-rose-600">-{item.total_out || 0}</td>
                              <td className="px-6 py-5 text-center">
                                <div className={cn(
                                  "inline-flex items-center justify-center min-w-[3.5rem] px-3 py-1 rounded-full text-[11px] font-bold shadow-sm",
                                  item.current_stock <= 0 ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                  item.current_stock < 5 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                  "bg-purple-50 text-purple-600 border border-purple-100"
                                )}>
                                  {item.current_stock}
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <button 
                                  onClick={() => setEditingItem(item)}
                                  className="p-2 text-stone-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Edit Item"
                                >
                                  <Edit size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'stock-in' && (
                <div className="space-y-10">
                  <div className="max-w-2xl mx-auto">
                    <div className="card-premium p-10">
                      <div className="flex items-center gap-6 mb-10">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-purple-500 text-white shadow-purple-200">
                          <PlusCircle size={32} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-stone-900 font-display">Record Purchase</h3>
                          <p className="text-sm text-stone-400 font-medium">Update inventory levels for existing items.</p>
                        </div>
                      </div>

                      <form onSubmit={(e) => handleTransaction(e, 'IN')} className="space-y-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Select Item</label>
                          <SearchableSelect 
                            items={items} 
                            value={selectedStockInItem} 
                            onChange={setSelectedStockInItem} 
                            placeholder="Search for an item..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Quantity</label>
                            <input type="number" name="quantity" required step="0.01" min="0.01" className="input-refined" placeholder="0.00" />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Particulars</label>
                            <select name="particulars" required className="input-refined">
                              <option value="PURCHASES">PURCHASES</option>
                              <option value="TRANSFER">TRANSFER</option>
                              <option value="RETURN">RETURN</option>
                              <option value="ADJUSTMENT">ADJUSTMENT</option>
                            </select>
                          </div>
                        </div>

                        {/* Delivery Details for Receipt */}
                        <div className="space-y-4 border-t border-stone-100 pt-4">
                          <h4 className="text-sm font-bold text-stone-900">Delivery Details (Optional for Receipt)</h4>
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Delivered To</label>
                            <input type="text" name="customer_name" className="input-refined" placeholder="Enter supplier/receiver name" />
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Address</label>
                              <input type="text" name="customer_address" className="input-refined" placeholder="Enter address" />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">TIN</label>
                              <input type="text" name="customer_tin" className="input-refined" placeholder="Enter TIN" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Terms</label>
                              <input type="text" name="terms" className="input-refined" placeholder="e.g. Cash, 30 Days" />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Business Style</label>
                              <input type="text" name="business_style" className="input-refined" placeholder="Enter business style" />
                            </div>
                          </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-xl active:scale-[0.98] shadow-purple-200">
                          Confirm Stock In
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                          Stock In History
                        </p>
                      </div>
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-purple-500 transition-colors" size={14} />
                        <input 
                          type="text" 
                          placeholder="Search history..." 
                          className="pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-600 focus:outline-hidden focus:ring-4 focus:ring-purple-500/5 transition-all w-48"
                          value={stockInSearch}
                          onChange={(e) => setStockInSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="card-premium">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-50/50 border-b border-stone-200/60">
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Date</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Item Name</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Particulars</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Cost Price</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Amount</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center">Qty</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center">Ending Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100/60">
                            {transactions
                              .filter(t => t.type === 'IN')
                              .filter(t => 
                                t.item_name?.toLowerCase().includes(stockInSearch.toLowerCase()) ||
                                t.particulars.toLowerCase().includes(stockInSearch.toLowerCase()) ||
                                safeFormat(t.date, 'MMMM d, yyyy').toLowerCase().includes(stockInSearch.toLowerCase())
                              )
                              .length === 0 && (
                              <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-stone-400 text-xs font-medium italic">
                                  No stock in transactions found.
                                </td>
                              </tr>
                            )}
                            {transactions
                              .filter(t => t.type === 'IN')
                              .filter(t => 
                                t.item_name?.toLowerCase().includes(stockInSearch.toLowerCase()) ||
                                t.particulars.toLowerCase().includes(stockInSearch.toLowerCase()) ||
                                safeFormat(t.date, 'MMMM d, yyyy').toLowerCase().includes(stockInSearch.toLowerCase())
                              )
                              .map((t) => {
                              const item = items.find(i => i.id === t.item_id);
                              const cost = t.cost_price || item?.cost_price || 0;
                              const amount = cost * t.quantity;
                              return (
                                <tr key={t.id} className="hover:bg-stone-50/80 transition-colors group">
                                  <td className="px-6 py-5 text-[10px] font-bold text-stone-400">{safeFormat(t.date, 'MMMM d, yyyy')}</td>
                                  <td className="px-6 py-5">
                                    <p className="font-bold text-stone-800 group-hover:text-emerald-600 transition-colors">{t.item_name}</p>
                                  </td>
                                  <td className="px-6 py-5">
                                    <span className="px-2 py-1 bg-stone-100 text-stone-500 rounded text-[10px] font-bold uppercase tracking-wider">
                                      {t.particulars}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-sm text-stone-600">₱{cost.toFixed(2)}</td>
                                  <td className="px-6 py-5 text-right font-mono text-sm font-bold text-stone-900">₱{amount.toFixed(2)}</td>
                                  <td className="px-6 py-5 text-center font-mono text-sm text-purple-600 font-bold">+{t.quantity}</td>
                                  <td className="px-6 py-5 text-center">
                                    <div className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 bg-stone-50 text-stone-600 border border-stone-100 rounded-lg text-[11px] font-bold">
                                      {item?.current_stock}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'stock-out' && (
                <div className="max-w-2xl mx-auto">
                  <div className="card-premium p-10">
                    <div className="flex items-center gap-6 mb-10">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-rose-500 text-white shadow-rose-200">
                        <MinusCircle size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-stone-900 font-display">Record Sale</h3>
                        <p className="text-sm text-stone-400 font-medium">Update inventory levels for existing items.</p>
                      </div>
                    </div>

                    <form onSubmit={(e) => handleTransaction(e, 'OUT')} className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Select Item</label>
                        <SearchableSelect 
                          items={items} 
                          value={selectedStockOutItem} 
                          onChange={setSelectedStockOutItem} 
                          placeholder="Search for an item..."
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Quantity</label>
                          <input type="number" name="quantity" required step="0.01" min="0.01" className="input-refined" placeholder="0.00" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Particulars</label>
                          <select name="particulars" required className="input-refined">
                            <option value="SALES">SALES</option>
                            <option value="RETAIL">RETAIL</option>
                            <option value="TRANSFER">TRANSFER</option>
                            <option value="DAMAGE">DAMAGE</option>
                            <option value="ADJUSTMENT">ADJUSTMENT</option>
                          </select>
                        </div>
                      </div>

                      {/* Customer Details for Receipt */}
                      <div className="space-y-4 border-t border-stone-100 pt-4">
                        <h4 className="text-sm font-bold text-stone-900">Customer Details (Optional for Receipt)</h4>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Customer Name</label>
                          <input type="text" name="customer_name" className="input-refined" placeholder="Enter customer name" />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Address</label>
                            <input type="text" name="customer_address" className="input-refined" placeholder="Enter address" />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">TIN</label>
                            <input type="text" name="customer_tin" className="input-refined" placeholder="Enter TIN" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Authorization Password</label>
                        <div className="relative">
                          <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                          <input 
                            type={showStockOutAuthPassword ? "text" : "password"} 
                            name="password" 
                            required 
                            className={cn(
                              "input-refined pl-12 pr-12",
                              passwordError && "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500"
                            )} 
                            placeholder="Enter password to confirm sale" 
                          />
                          <button
                            type="button"
                            onClick={() => setShowStockOutAuthPassword(!showStockOutAuthPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                          >
                            {showStockOutAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {passwordError && (
                          <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-2 flex items-center gap-1">
                            <AlertTriangle size={12} /> {passwordError}
                          </p>
                        )}
                      </div>

                      <button type="submit" className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold transition-all shadow-xl active:scale-[0.98] shadow-rose-200">
                        Confirm Stock Out
                      </button>
                    </form>
                  </div>

                  <div className="space-y-6 mt-10">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                          Stock Out History
                        </p>
                      </div>
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-rose-500 transition-colors" size={14} />
                        <input 
                          type="text" 
                          placeholder="Search history..." 
                          className="pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-600 focus:outline-hidden focus:ring-4 focus:ring-rose-500/5 transition-all w-48"
                          value={stockOutSearch}
                          onChange={(e) => setStockOutSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="card-premium">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-50/50 border-b border-stone-200/60">
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Date</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Item Name</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Particulars</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Cost Price</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Retail Price</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Amount</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center">Qty</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center">Ending Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100/60">
                            {transactions
                              .filter(t => t.type === 'OUT')
                              .filter(t => 
                                t.item_name?.toLowerCase().includes(stockOutSearch.toLowerCase()) ||
                                t.particulars.toLowerCase().includes(stockOutSearch.toLowerCase()) ||
                                safeFormat(t.date, 'MMMM d, yyyy').toLowerCase().includes(stockOutSearch.toLowerCase())
                              )
                              .length === 0 && (
                              <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-stone-400 text-xs font-medium italic">
                                  No stock out transactions found.
                                </td>
                              </tr>
                            )}
                            {transactions
                              .filter(t => t.type === 'OUT')
                              .filter(t => 
                                t.item_name?.toLowerCase().includes(stockOutSearch.toLowerCase()) ||
                                t.particulars.toLowerCase().includes(stockOutSearch.toLowerCase()) ||
                                safeFormat(t.date, 'MMMM d, yyyy').toLowerCase().includes(stockOutSearch.toLowerCase())
                              )
                              .map((t) => {
                              const item = items.find(i => i.id === t.item_id);
                              const cost = t.cost_price || item?.cost_price || 0;
                              const retail = t.retail_price || item?.retail_price || 0;
                              const amount = retail * t.quantity;
                              return (
                                <tr key={t.id} className="hover:bg-stone-50/80 transition-colors group">
                                  <td className="px-6 py-5 text-[10px] font-bold text-stone-400">{safeFormat(t.date, 'MMMM d, yyyy')}</td>
                                  <td className="px-6 py-5">
                                    <p className="font-bold text-stone-800 group-hover:text-rose-600 transition-colors">{t.item_name}</p>
                                  </td>
                                  <td className="px-6 py-5">
                                    <span className="px-2 py-1 bg-stone-100 text-stone-500 rounded text-[10px] font-bold uppercase tracking-wider">
                                      {t.particulars}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-sm text-stone-600">₱{cost.toFixed(2)}</td>
                                  <td className="px-6 py-5 text-right font-mono text-sm text-stone-600">₱{retail.toFixed(2)}</td>
                                  <td className="px-6 py-5 text-right font-mono text-sm font-bold text-stone-900">₱{amount.toFixed(2)}</td>
                                  <td className="px-6 py-5 text-center font-mono text-sm text-rose-600 font-bold">-{t.quantity}</td>
                                  <td className="px-6 py-5 text-center">
                                    <div className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 bg-stone-50 text-stone-600 border border-stone-100 rounded-lg text-[11px] font-bold">
                                      {item?.current_stock}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

          {activeTab === 'receipts' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 font-display">Receipts History</h3>
                      <p className="text-sm text-stone-500">View and reprint past sales transactions</p>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <select 
                        value={receiptTypeFilter}
                        onChange={(e) => setReceiptTypeFilter(e.target.value as 'ALL' | 'IN' | 'OUT')}
                        className="input-refined min-w-[150px]"
                      >
                        <option value="ALL">All Receipts</option>
                        <option value="OUT">Sales Invoice (Stock Out)</option>
                        <option value="IN">Delivery Receipt (Stock In)</option>
                      </select>
                      <select 
                        value={receiptMonth}
                        onChange={(e) => setReceiptMonth(e.target.value)}
                        className="input-refined min-w-[120px]"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                      <select 
                        value={receiptYear}
                        onChange={(e) => setReceiptYear(e.target.value)}
                        className="input-refined min-w-[100px]"
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="card-premium">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-50/50 border-b border-stone-200/60">
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Date</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Receipt No.</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Customer</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Item</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center">Qty</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Total Amount</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100/60">
                          {transactions
                            .filter(t => receiptTypeFilter === 'ALL' || t.type === receiptTypeFilter)
                            .filter(t => {
                              const tDate = new Date(t.date);
                              return tDate.getMonth().toString() === receiptMonth && 
                                     tDate.getFullYear().toString() === receiptYear;
                            })
                            .map((t) => (
                              <tr key={t.id} className="hover:bg-stone-50/80 transition-colors group">
                                <td className="px-6 py-5 text-sm font-medium text-stone-600">
                                  {safeFormat(t.date, 'MMM dd, yyyy hh:mm a')}
                                </td>
                                <td className="px-6 py-5">
                                  <p className="font-mono text-sm font-bold text-stone-900">#{t.id}</p>
                                  <span className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded-md mt-1 inline-block uppercase",
                                    t.type === 'IN' ? "bg-teal-100 text-teal-700" : "bg-purple-100 text-purple-700"
                                  )}>
                                    {t.type === 'IN' ? 'Delivery' : 'Invoice'}
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-sm text-stone-600">
                                  {t.customer_name || <span className="text-stone-400 italic">Walk-in</span>}
                                </td>
                                <td className="px-6 py-5">
                                  <p className="text-sm font-bold text-stone-800">{t.item_name}</p>
                                  <p className="text-xs text-stone-500">{t.particulars}</p>
                                </td>
                                <td className="px-6 py-5 text-center font-mono text-sm text-stone-600">
                                  {t.quantity}
                                </td>
                                <td className="px-6 py-5 text-right font-mono text-sm font-bold text-purple-600">
                                  ₱{((t.retail_price || 0) * t.quantity).toFixed(2)}
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <button 
                                    onClick={() => handleReprintReceipt(t)}
                                    className="px-3 py-1.5 bg-stone-100 text-stone-600 hover:bg-purple-100 hover:text-purple-600 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2"
                                  >
                                    <ClipboardList size={14} />
                                    Reprint
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {transactions.filter(t => (receiptTypeFilter === 'ALL' || t.type === receiptTypeFilter) && new Date(t.date).getMonth().toString() === receiptMonth && new Date(t.date).getFullYear().toString() === receiptYear).length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-stone-400 text-sm">
                                No receipts found for the selected period and type.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'register' && (
            <div className="max-w-4xl mx-auto">
              <div className="card-premium p-10">
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-600 shadow-inner">
                    <Plus size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-stone-900 font-display">Register New Item</h3>
                    <p className="text-sm text-stone-400 font-medium">Add a new hardware product to the master list.</p>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Item Code</label>
                      <input type="text" name="item_code" required className="input-refined" placeholder="e.g., 10001" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Item Name</label>
                      <input type="text" name="name" required className="input-refined" placeholder="e.g., BOYSEN FLAT LATEX WHITE 1L" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Category</label>
                      <select name="category" required className="input-refined">
                        <option value="AGGREGATES">AGGREGATES</option>
                        <option value="CEMENT">CEMENT</option>
                        <option value="CHEMICAL">CHEMICAL</option>
                        <option value="DOOR">DOOR</option>
                        <option value="ELECTRICAL">ELECTRICAL</option>
                        <option value="LUMBER">LUMBER</option>
                        <option value="NAIL & SCREW">NAIL & SCREW</option>
                        <option value="NAILS">NAILS</option>
                        <option value="PLUMBING">PLUMBING</option>
                        <option value="ROOF">ROOF</option>
                        <option value="SANITARY">SANITARY</option>
                        <option value="SINK & FAUCET">SINK & FAUCET</option>
                        <option value="STEEL">STEEL</option>
                        <option value="TOOLS">TOOLS</option>
                        <option value="OTHERS">OTHERS</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">U.O.M.</label>
                      <select name="uom" required className="input-refined">
                        <option value="BAG">BAG</option>
                        <option value="BOTTLE">BOTTLE</option>
                        <option value="BOX">BOX</option>
                        <option value="CAN">CAN</option>
                        <option value="CUBIC">CUBIC</option>
                        <option value="GALLON">GALLON</option>
                        <option value="KILO">KILO</option>
                        <option value="LITTER">LITTER</option>
                        <option value="M ETER">M ETER</option>
                        <option value="METER">METER</option>
                        <option value="PACK">PACK</option>
                        <option value="PAIR">PAIR</option>
                        <option value="PCS">PCS</option>
                        <option value="ROLL">ROLL</option>
                        <option value="SET">SET</option>
                        <option value="TIN">TIN</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Cost Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">₱</span>
                        <input type="number" name="cost_price" required step="0.01" className="input-refined pl-8" placeholder="0.00" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Retail Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">₱</span>
                        <input type="number" name="retail_price" required step="0.01" className="input-refined pl-8" placeholder="0.00" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Initial Stock Count</label>
                      <input type="number" name="initial_count" required step="0.01" className="input-refined" placeholder="0.00" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Registration Date</label>
                      <input type="date" name="created_at" className="input-refined" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>

                  <button type="submit" className="btn-premium w-full py-4 text-lg">
                    Register Item
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'users' && <UsersPage />}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-1">
                  <h3 className="text-lg font-bold text-stone-900 font-display">Security Settings</h3>
                  <p className="text-xs text-stone-400 mt-1">Manage your authorization credentials and access control.</p>
                </div>
                <div className="md:col-span-2 card-premium p-8">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const oldPass = formData.get('old_password') as string;
                    const newPass = formData.get('new_password') as string;
                    const confirmPass = formData.get('confirm_new_password') as string;
                    
                    if (oldPass !== stockOutPassword) {
                      alert("Incorrect old password. Please try again.");
                      return;
                    }

                    if (newPass !== confirmPass) {
                      alert("New passwords do not match. Please try again.");
                      return;
                    }

                    if (newPass) {
                      setStockOutPassword(newPass);
                      localStorage.setItem('wan_stock_out_password', newPass);
                      alert("Authorization password updated successfully!");
                      e.currentTarget.reset();
                    }
                  }} className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Old Stock Out Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                        <input 
                          type={showOldPassword ? "text" : "password"} 
                          name="old_password" 
                          required 
                          className="input-refined pl-12 pr-12" 
                          placeholder="Enter current password" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                        >
                          {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">New Stock Out Password</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          name="new_password" 
                          required 
                          className="input-refined pl-12 pr-12" 
                          placeholder="Enter new password" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Confirm New Password</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          name="confirm_new_password" 
                          required 
                          className="input-refined pl-12 pr-12" 
                          placeholder="Re-enter new password" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" className="btn-premium px-8 py-3 text-sm">
                      Update Password
                    </button>
                  </form>
                </div>
              </div>

              <div className="h-[1px] w-full bg-stone-200/60" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-1">
                  <h3 className="text-lg font-bold text-stone-900 font-display">System Information</h3>
                  <p className="text-xs text-stone-400 mt-1">Application details and version control.</p>
                </div>
                <div className="md:col-span-2 card-premium p-8 space-y-6">
                  <div className="flex items-center justify-between py-2 border-b border-stone-100">
                    <span className="text-sm font-medium text-stone-500">App Name</span>
                    <span className="text-sm font-bold text-stone-900">CatMoon Inventory System</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-stone-100">
                    <span className="text-sm font-medium text-stone-500">Version</span>
                    <span className="text-sm font-bold text-stone-900">1.0.0-moon</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-stone-100">
                    <span className="text-sm font-medium text-stone-500">Developer</span>
                    <span className="text-sm font-bold text-stone-900">Jencel Sofer</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-stone-500">Environment</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase tracking-wider">Production Ready</span>
                  </div>
                </div>
              </div>

              <div className="h-[1px] w-full bg-stone-200/60" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-1">
                  <h3 className="text-lg font-bold text-rose-600 font-display">Danger Zone</h3>
                  <p className="text-xs text-stone-400 mt-1">Irreversible actions that affect your local data.</p>
                </div>
                <div className="md:col-span-2 card-premium p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">Reset Local Data</h4>
                      <p className="text-xs text-stone-400 mt-1">Clear all items and transactions stored in your browser.</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm("Are you sure you want to clear all local data? This action cannot be undone.")) {
                          localStorage.removeItem('catmoon_items');
                          localStorage.removeItem('catmoon_transactions');
                          localStorage.removeItem('catmoon_stock_out_password');
                          window.location.reload();
                        }
                      }}
                      className="px-6 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
                    >
                      Reset System
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Edit Item Modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditingItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100">
                      <Edit size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-900 font-display">Edit Item</h3>
                    <p className="text-sm text-stone-400 font-medium">Update item details</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingItem(null)} 
                  className="p-2 hover:bg-stone-200/50 rounded-xl transition-colors text-stone-400 hover:text-stone-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleUpdateItem} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Item Code</label>
                      <input 
                        type="text" 
                        value={editingItem.item_code}
                        onChange={(e) => setEditingItem({...editingItem, item_code: e.target.value})}
                        required 
                        className="input-refined" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Item Name</label>
                      <input 
                        type="text" 
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                        required 
                        className="input-refined" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Category</label>
                      <select 
                        value={editingItem.category}
                        onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                        required 
                        className="input-refined"
                      >
                        {['AGGREGATES', 'CEMENT', 'CHEMICAL', 'DOOR', 'ELECTRICAL', 'LUMBER', 'NAIL & SCREW', 'PAINT', 'PLUMBING', 'ROOFING', 'STEEL', 'TOOLS', 'OTHERS'].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">U.O.M.</label>
                      <select 
                        value={editingItem.uom}
                        onChange={(e) => setEditingItem({...editingItem, uom: e.target.value})}
                        required 
                        className="input-refined"
                      >
                        {['BAG', 'BOTTLE', 'BOX', 'CAN', 'CUBIC', 'GALLON', 'KILO', 'LITTER', 'METER', 'PACK', 'PAIR', 'PCS', 'ROLL', 'SET', 'TIN'].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Cost Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">₱</span>
                        <input 
                          type="number" 
                          value={editingItem.cost_price}
                          onChange={(e) => setEditingItem({...editingItem, cost_price: parseFloat(e.target.value)})}
                          required 
                          step="0.01" 
                          className="input-refined pl-8" 
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Retail Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">₱</span>
                        <input 
                          type="number" 
                          value={editingItem.retail_price}
                          onChange={(e) => setEditingItem({...editingItem, retail_price: parseFloat(e.target.value)})}
                          required 
                          step="0.01" 
                          className="input-refined pl-8" 
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Initial Count</label>
                      <input 
                        type="number" 
                        value={editingItem.initial_count}
                        onChange={(e) => setEditingItem({...editingItem, initial_count: parseFloat(e.target.value)})}
                        required 
                        className="input-refined" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-4">
                    <button 
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="px-6 py-3 text-stone-500 hover:text-stone-900 font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                    >
                      <Save size={16} />
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Sales Modal */}
      <AnimatePresence>
        {showDailySalesModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDailySalesModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-sm border border-blue-100">
                      <ArrowDownLeft size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-900 font-display">Daily Sales</h3>
                    <p className="text-sm text-stone-400 font-medium">Transactions for today ({format(new Date(), 'MMM dd, yyyy')})</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDailySalesModal(false)} 
                  className="p-2 hover:bg-stone-200/50 rounded-xl transition-colors text-stone-400 hover:text-stone-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-0 overflow-y-auto custom-scrollbar">
                {transactions.filter(t => t.type === 'OUT' && new Date(t.date).toDateString() === new Date().toDateString()).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 text-stone-300">
                      <ClipboardList size={32} />
                    </div>
                    <p className="text-sm font-medium">No sales recorded today</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-50/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] border-b border-stone-100">Time</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] border-b border-stone-100">Item</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] border-b border-stone-100 text-center">Qty</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] border-b border-stone-100 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {transactions
                        .filter(t => t.type === 'OUT' && new Date(t.date).toDateString() === new Date().toDateString())
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((t, idx) => (
                          <tr key={t.id} className="group hover:bg-blue-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-md">
                                {safeFormat(t.date, 'h:mm a')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-stone-800 group-hover:text-blue-600 transition-colors">{t.item_name}</p>
                              <p className="text-[10px] text-stone-400 font-mono mt-0.5">{t.particulars || 'No particulars'}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">
                                {t.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-sm font-bold text-stone-900">
                                ₱{((t.retail_price || 0) * t.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-stone-50 border-t border-stone-200">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest text-right">Total Sales</td>
                        <td className="px-6 py-4 text-center font-bold text-blue-600">
                          {transactions
                            .filter(t => t.type === 'OUT' && new Date(t.date).toDateString() === new Date().toDateString())
                            .reduce((acc, t) => acc + t.quantity, 0)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-lg font-bold text-stone-900">
                          ₱{transactions
                            .filter(t => t.type === 'OUT' && new Date(t.date).toDateString() === new Date().toDateString())
                            .reduce((acc, t) => acc + ((t.retail_price || 0) * t.quantity), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <ReceiptModal 
        isOpen={!!invoiceData} 
        onClose={() => setInvoiceData(null)} 
        data={invoiceData} 
        type={receiptType} 
      />
    </main>
    </motion.div>
  );
}

function SidebarLink({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "sidebar-item group",
        active 
          ? "sidebar-item-active text-purple-400" 
          : "text-stone-500 hover:text-stone-300 hover:bg-stone-900 transition-colors"
      )}
    >
      <span className={cn(
        "transition-transform duration-300",
        active ? "scale-110" : "group-hover:scale-110"
      )}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-pill"
          className="absolute right-0 w-1 h-6 bg-purple-500 rounded-l-full"
        />
      )}
    </button>
  );
}

function HeaderAction({ icon, onClick, title }: { icon: React.ReactNode, onClick?: () => void, title?: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className="w-10 h-10 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all"
    >
      {icon}
    </button>
  );
}

function StatCard({ label, value, icon, trend, color, onClick }: { label: string, value: string, icon: React.ReactNode, trend: string, color: string, onClick?: () => void }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={cn("card-premium p-8 flex flex-col justify-between relative group", onClick && "cursor-pointer")}
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {React.cloneElement(icon as React.ReactElement, { size: 80 })}
      </div>
      
      <div className="flex items-start justify-between mb-6">
        <div className={cn("p-3 rounded-2xl", color)}>
          {icon}
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-stone-100 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Live</span>
        </div>
      </div>
      
      <div>
        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-2">{label}</p>
        <h4 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-display">{value}</h4>
        <div className="flex items-center gap-2 mt-4">
          <span className="text-[10px] font-bold text-stone-500 font-mono bg-stone-100 px-2 py-0.5 rounded-md">
            {trend}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
