import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useCart } from './cart-context';

interface OutOfStockWarningProps {
  className?: string;
}

export default function OutOfStockWarning({ className = '' }: OutOfStockWarningProps) {
  const { outOfStockItems, removeFromCart } = useCart();

  if (outOfStockItems.length === 0) {
    return null;
  }

  const handleRemoveItem = (itemId: string, size: string) => {
    removeFromCart(itemId, size);
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 mb-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-2">
            ⚠️ Out of Stock Items in Cart
          </h3>
          <div className="space-y-2">
            {outOfStockItems.map((item, index) => (
              <div key={`${item._id}-${item.size}-${index}`} className="flex items-center justify-between bg-white rounded-md p-3 border border-red-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-600">Size: {item.size}</p>
                  <p className="text-xs text-red-600 mt-1">
                    {item.reason || 'Out of stock'}
                  </p>
                  {item.availableStock !== undefined && (
                    <p className="text-xs text-gray-500">
                      Available: {item.availableStock} units
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveItem(item._id, item.size)}
                  className="ml-3 p-1 text-red-400 hover:text-red-600 transition-colors"
                  title="Remove from cart"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-700 mt-3">
            Please remove out-of-stock items before proceeding to checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
