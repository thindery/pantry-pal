import React, { useEffect } from 'react';

interface CheckoutResultProps {
  status: 'success' | 'cancel';
  onClose: () => void;
}

export const CheckoutResult: React.FC<CheckoutResultProps> = ({ status, onClose }) => {
  useEffect(() => {
    // Auto-close after 5 seconds on success
    if (status === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-emerald-600">
        <div className="text-center text-white p-8">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mx-auto mb-6 animate-in zoom-in duration-500">
            🎉
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to Pro!</h1>
          <p className="text-emerald-100 text-lg mb-2">
            Your subscription is now active.
          </p>
          <p className="text-emerald-200">
            Redirecting you back to PantryPal...
          </p>
          <button
            onClick={onClose}
            className="mt-8 px-6 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900">
      <div className="text-center text-white p-8 max-w-md">
        <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
          😔
        </div>
        <h1 className="text-2xl font-bold mb-4">Checkout Cancelled</h1>
        <p className="text-slate-400 mb-8">
          No worries! You can upgrade anytime from the settings. You're still on the free plan.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
        >
          Return to App
        </button>
      </div>
    </div>
  );
};

export default CheckoutResult;
