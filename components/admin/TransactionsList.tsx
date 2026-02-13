import React from 'react';
import { CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import { Transaction } from '../../types/admin';

interface TransactionsListProps {
  transactions: Transaction[];
  failedCount?: number;
}

const statusConfig = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: 'Success',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  failed: {
    icon: <XCircle className="w-4 h-4" />,
    label: 'Failed',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  pending: {
    icon: <Clock className="w-4 h-4" />,
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  failedCount = 0,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header with alerts */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Recent Transactions</h3>
          <p className="text-sm text-slate-500">Latest payment activity</p>
        </div>
        {failedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
            <XCircle className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium text-rose-700">
              {failedCount} failed payment{failedCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {transactions.map((transaction) => {
          const status = statusConfig[transaction.status];
          
          return (
            <div
              key={transaction.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${status.className}`}>
                  {status.icon}
                  {status.label}
                </div>
                <div>
                  <p className="font-medium text-slate-800">{transaction.userEmail}</p>
                  <p className="text-sm text-slate-500">{transaction.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800">
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="text-xs text-slate-400">{formatDate(transaction.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
        <button className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          View all transactions
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TransactionsList;
