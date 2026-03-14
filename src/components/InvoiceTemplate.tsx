import React from 'react';
import { format } from 'date-fns';

interface InvoiceProps {
  title?: string;
  transaction: {
    id: number;
    date: string;
    items: Array<{
      quantity: number;
      unit: string;
      description: string;
      unitPrice: number;
      amount: number;
    }>;
    customerName?: string;
    customerAddress?: string;
    customerTIN?: string;
    totalAmount: number;
  };
}

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceProps>(({ transaction, title }, ref) => {
  return (
    <div ref={ref} className="bg-white p-8 max-w-[800px] mx-auto text-black font-serif text-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-xl font-bold text-green-900 font-serif tracking-wide">WAN HARDWARE TRADING</h1>
          <p className="font-bold text-xs">RICARDA P. OBDIANELA - PROPRIETOR</p>
          <p className="text-[10px]">NON-VAT REG. TIN: 265-300-646-00000</p>
          <p className="text-[10px] w-64">General Luna St. cor. Lopez Jaena St., Angeles Zone IV, City of Tayabas Quezon, Philippines, 4327</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold font-serif">{title || 'SALES INVOICE'}</h2>
          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="font-bold text-red-600 text-xl">No</span>
            <span className="font-bold text-red-600 text-2xl">{transaction.id}</span>
          </div>
        </div>
      </div>

      {/* Payment Type & Date */}
      <div className="flex justify-between items-end mb-2">
        <div className="flex flex-col gap-1 text-xs font-bold">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-black"></div>
            <span>CASH</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-black"></div>
            <span>CHARGE SALES</span>
          </div>
        </div>
        <div className="border border-black flex">
          <div className="px-2 py-1 border-r border-black text-xs font-bold bg-gray-100">Date</div>
          <div className="px-4 py-1 min-w-[150px]">{format(new Date(transaction.date), 'MMMM dd, yyyy')}</div>
        </div>
      </div>

      {/* Sold To Section */}
      <div className="border border-black p-2 mb-4 text-xs">
        <div className="flex items-center mb-1">
          <span className="font-bold w-24">SOLD TO:</span>
          <div className="border-b border-black flex-1 pl-2">{transaction.customerName || ''}</div>
        </div>
        <div className="flex items-center mb-1">
          <span className="w-24">Registered Name :</span>
          <div className="border-b border-black flex-1 pl-2"></div>
        </div>
        <div className="flex items-center mb-1">
          <span className="w-24">TIN :</span>
          <div className="border-b border-black flex-1 pl-2">{transaction.customerTIN || ''}</div>
        </div>
        <div className="flex items-center">
          <span className="w-24">Business Address :</span>
          <div className="border-b border-black flex-1 pl-2">{transaction.customerAddress || ''}</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-black mb-4 min-h-[300px] flex flex-col">
        {/* Table Header */}
        <div className="flex border-b border-black text-center text-xs font-bold">
          <div className="w-[45%] border-r border-black py-1">Item Description/ Nature of Service</div>
          <div className="w-[15%] border-r border-black py-1">Quantity</div>
          <div className="w-[20%] border-r border-black py-1">Unit Cost/ Price</div>
          <div className="w-[20%] py-1">Amount</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 relative">
          {/* Background Lines */}
          <div className="absolute inset-0 flex flex-col pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="flex-1 border-b border-gray-300"></div>
            ))}
          </div>

          {/* Items */}
          {transaction.items.map((item, idx) => (
            <div key={idx} className="flex text-xs relative z-10">
              <div className="w-[45%] border-r border-black/20 py-1 px-2">{item.description}</div>
              <div className="w-[15%] border-r border-black/20 py-1 px-2 text-center">{item.quantity} {item.unit}</div>
              <div className="w-[20%] border-r border-black/20 py-1 px-2 text-right">P {item.unitPrice.toFixed(2)}</div>
              <div className="w-[20%] py-1 px-2 text-right">P {item.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex gap-4 h-32">
        {/* Left Footer */}
        <div className="w-2/3 flex flex-col justify-between">
          <div className="text-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 border border-black"></div>
              <span>Received the amount of</span>
              <div className="border-b border-black flex-1"></div>
            </div>
            
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p>SC/PWD/NAAC/MOV/</p>
                <div className="flex gap-2">
                  <span>Solo Parent ID No.:</span>
                  <div className="border-b border-black w-24"></div>
                </div>
                <p>SC/PWD/NAAC/MOV/</p>
              </div>
              <div className="text-center">
                <div className="border-b border-black w-40 mb-1"></div>
                <p>Signature</p>
              </div>
            </div>
          </div>

          <div className="mt-2 border border-black rounded-lg p-2 text-center text-[10px] font-bold">
            "THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX."
          </div>
        </div>

        {/* Right Footer (Totals) */}
        <div className="w-1/3 border border-black text-xs">
          <div className="flex justify-between p-1 border-b border-black">
            <span className="font-bold">Total Sales</span>
            <span>P {transaction.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between p-1">
            <span>Less: Discount</span>
            <span></span>
          </div>
          <div className="flex justify-between p-1 text-[10px]">
            <span>[SC/PWD/NAAC/MOV/SPI]</span>
            <span></span>
          </div>
          <div className="flex justify-between p-1 border-b border-black">
            <span>Less: Withholding Tax</span>
            <span></span>
          </div>
          <div className="flex justify-between p-1 font-bold bg-gray-100">
            <span>TOTAL AMOUNT DUE</span>
            <span>P {transaction.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Printer Details */}
      <div className="mt-4 flex justify-between items-end text-[8px] text-gray-600">
        <div>
          <p>50 Bkts., 05-04-231-200</p>
          <p>BIR ATP No.: 00AUA202300000130</p>
          <p>Date Issued: April 21, 2023</p>
          <p className="font-bold">SOUTHERN PRINTING PRESS</p>
          <p>VAT Reg. TIN: 00-186-076-00000</p>
          <p>Brgy. Calumpang, Tayabas, Quezon</p>
        </div>
        <div className="text-right">
          <div className="mb-4">
            <div className="flex items-center justify-end gap-2 text-xs text-black mb-4">
              <span>Received by:</span>
              <div className="border-b border-black w-40"></div>
            </div>
            <p className="text-black text-[10px] text-center w-40 ml-auto border-t border-black pt-1">Cashier/Sales Representative</p>
          </div>
          <p>Printer's Accreditation No. 06QMD202300000020</p>
          <p>Date Issued: 08-11-2023 • Valid Until: 08-10-2028</p>
        </div>
      </div>
    </div>
  );
});
