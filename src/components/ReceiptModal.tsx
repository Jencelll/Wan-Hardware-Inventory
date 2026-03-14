import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer } from 'lucide-react';
import { InvoiceTemplate } from './InvoiceTemplate';
import { DeliveryReceiptTemplate } from './DeliveryReceiptTemplate';
import { motion, AnimatePresence } from 'motion/react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type: 'INVOICE' | 'DELIVERY';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, data, type }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${type}-${data?.id || 'New'}`,
  });

  return (
    <AnimatePresence>
      {isOpen && data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {type === 'INVOICE' ? 'Sales Invoice Preview' : 'Delivery Receipt Preview'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8 bg-gray-50 flex justify-center">
              <div className="shadow-lg bg-white origin-top scale-90 sm:scale-100">
                 {type === 'INVOICE' ? (
                   <InvoiceTemplate ref={componentRef} transaction={data} />
                 ) : (
                   <DeliveryReceiptTemplate ref={componentRef} transaction={data} />
                 )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
