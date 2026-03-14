import React from 'react';
import { format } from 'date-fns';

interface DeliveryReceiptProps {
  transaction: {
    id: number;
    date: string;
    items: Array<{
      quantity: number;
      unit: string;
      description: string;
    }>;
    deliveredTo?: string;
    address?: string;
    tin?: string;
    terms?: string;
    businessStyle?: string;
  };
}

export const DeliveryReceiptTemplate = React.forwardRef<HTMLDivElement, DeliveryReceiptProps>(({ transaction }, ref) => {
  return (
    <div ref={ref} className="bg-white p-8 max-w-[800px] mx-auto text-black font-serif text-sm">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-teal-800 font-serif tracking-wide uppercase">WAN HARDWARE TRADING</h1>
        <p className="font-bold text-xs uppercase">RICARDA P. OBDIANELA - PROPRIETOR</p>
        <p className="text-[10px]">NON-VAT REG. TIN: 265-300-646-00000</p>
        <p className="text-[10px]">General Luna St. cor. Lopez Jaena St., Angeles Zone IV, City of Tayabas Quezon, Philippines, 4327</p>
      </div>

      <div className="flex justify-between items-end mb-4">
        <h2 className="text-2xl font-bold font-serif uppercase tracking-wide">DELIVERY RECEIPT</h2>
        <div className="flex items-center gap-2">
          <span className="font-bold text-red-600 text-xl">No</span>
          <span className="font-bold text-red-600 text-2xl">{transaction.id}</span>
        </div>
      </div>

      {/* Delivered To Section */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex-1 space-y-2">
          <div className="flex items-end">
            <span className="w-24">DELIVERED TO:</span>
            <div className="border-b border-black flex-1 font-bold pl-2">{transaction.deliveredTo || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="w-24">TIN:</span>
            <div className="border-b border-black flex-1 pl-2">{transaction.tin || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="w-24">Address:</span>
            <div className="border-b border-black flex-1 pl-2">{transaction.address || ''}</div>
          </div>
        </div>
        <div className="w-48 space-y-2">
          <div className="flex items-end">
            <span className="w-12">Date:</span>
            <div className="border-b border-black flex-1 pl-2">{format(new Date(transaction.date), 'MMMM dd, yyyy')}</div>
          </div>
          <div className="flex items-end">
            <span className="w-12">Terms:</span>
            <div className="border-b border-black flex-1 pl-2">{transaction.terms || ''}</div>
          </div>
        </div>
      </div>

      <div className="flex items-end mb-4 text-xs">
        <span className="w-24">Business Style:</span>
        <div className="border-b border-black flex-1 pl-2">{transaction.businessStyle || ''}</div>
      </div>

      {/* Main Table */}
      <div className="border-2 border-black mb-4 min-h-[400px] flex flex-col">
        {/* Table Header */}
        <div className="flex border-b-2 border-black text-center text-xs font-bold bg-gray-100">
          <div className="w-[12%] border-r border-black py-1">Qty.</div>
          <div className="w-[15%] border-r border-black py-1">Unit</div>
          <div className="w-[73%] py-1 tracking-[0.3em]">ARTICLES</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 relative">
          {/* Background Lines */}
          <div className="absolute inset-0 flex flex-col pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="flex-1 border-b border-gray-400">
                <div className="flex h-full">
                  <div className="w-[12%] border-r border-black"></div>
                  <div className="w-[15%] border-r border-black"></div>
                  <div className="w-[73%]"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Items */}
          {transaction.items.map((item, idx) => (
            <div key={idx} className="flex text-xs relative z-10 font-bold h-[20px] items-center">
              <div className="w-[12%] text-center px-1">{item.quantity}</div>
              <div className="w-[15%] text-center px-1">{item.unit}</div>
              <div className="w-[73%] px-4">{item.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex justify-between items-start text-xs mt-6">
        <div className="w-1/2">
          <p className="italic font-bold mb-4">Received the above goods and services in good order and condition.</p>
          <div className="text-[9px] text-gray-700 leading-tight">
            <p>100 Bklts (50x3) 10101-15100</p>
            <p>BIR ATP No: 060AU20250000003130</p>
            <p>Date Issued: April 24, 2025</p>
            <p className="font-bold text-black text-[10px]">SOUTHERN PRINTING PRESS</p>
            <p>VAT Reg TIN: 168-184-970-00000</p>
            <p>Brgy. Calumpang, Tayabas, Quezon</p>
          </div>
        </div>

        <div className="w-1/3">
          <div className="flex gap-2 items-center mb-6">
            <span className="w-20">Received by:</span>
            <div className="border-b border-black flex-1"></div>
          </div>
          <div className="flex gap-2 items-end">
            <span className="w-8">By:</span>
            <div className="flex-1 flex flex-col items-center">
              <div className="border-b border-black w-full mb-1"></div>
              <span className="text-[10px]">Cashier/Authorized Representative</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end mt-4">
        <p className="text-[10px] font-bold italic">THIS DOCUMENT IS NOT VALID FOR CLAIMING INPUT TAXES.</p>
        <div className="text-[8px] text-right">
          <p>Printer's Accreditation No. 060MP2023000000002</p>
          <p>Date Issued: 08-11-2023 • Valid Until: 08-10-2028</p>
        </div>
      </div>
    </div>
  );
});
