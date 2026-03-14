import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SearchableSelectProps {
  items: Item[];
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  resetOnSelect?: boolean;
}

export default function SearchableSelect({ 
  items, 
  value, 
  onChange, 
  placeholder = "Select an item...", 
  className,
  required = false,
  resetOnSelect = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update selected item when value prop changes
  useEffect(() => {
    const item = items.find(i => i.id === Number(value));
    setSelectedItem(item || null);
  }, [value, items]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (item: Item) => {
    onChange(item.id);
    if (resetOnSelect) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(0); // Assuming 0 or empty string means no selection
    setSelectedItem(null);
    setSearchTerm('');
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Hidden select for form submission if needed, though we usually handle via state */}
      <select 
        name="item_id" 
        value={value || ""} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="sr-only"
        required={required}
        tabIndex={-1}
      >
        <option value="">Select an item</option>
        {items.map(item => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>

      {/* Trigger Button */}
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        className={cn(
          "input-refined flex items-center justify-between cursor-pointer pr-10 relative select-none",
          isOpen && "ring-4 ring-emerald-500/10 border-emerald-500/50"
        )}
      >
        <span className={cn("truncate block", !selectedItem && "text-stone-400")}>
          {selectedItem ? (
            <span className="flex items-center gap-2">
              <span className="font-medium text-stone-900">{selectedItem.name}</span>
              <span className="text-xs text-stone-400 font-mono">({selectedItem.item_code})</span>
            </span>
          ) : placeholder}
        </span>
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedItem && (
            <button 
              type="button"
              onClick={handleClear}
              className="p-1 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown 
            size={16} 
            className={cn("text-stone-400 transition-transform duration-200", isOpen && "rotate-180")} 
          />
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden max-h-[300px] flex flex-col"
          >
            <div className="p-2 border-b border-stone-100 bg-stone-50/50 sticky top-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 focus:outline-hidden focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:font-medium"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs font-medium italic">
                  No items found.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredItems.map(item => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left rounded-lg flex items-center justify-between group transition-colors",
                        selectedItem?.id === item.id 
                          ? "bg-emerald-50 text-emerald-900" 
                          : "hover:bg-stone-50 text-stone-600"
                      )}
                    >
                      <div>
                        <p className={cn(
                          "text-sm font-bold group-hover:text-emerald-700 transition-colors",
                          selectedItem?.id === item.id && "text-emerald-700"
                        )}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                          {item.item_code} • Stock: {item.current_stock}
                        </p>
                      </div>
                      {selectedItem?.id === item.id && (
                        <Check size={14} className="text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
