import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

interface RevenueCardProps {
  lifetime: number;
  momGrowth: number;
  trendData: number[];
}

export const RevenueCard: React.FC<RevenueCardProps> = ({
  lifetime,
  momGrowth,
  trendData,
}) => {
  const chartData = trendData.map((v, i) => ({ value: v, index: i }));
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Lifetime Revenue</p>
          <h3 className="text-3xl font-bold text-slate-900">
            {formatCurrency(lifetime)}
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
          <TrendingUp className="w-4 h-4" />
          +{momGrowth}%
        </div>
        <span className="text-sm text-slate-500">vs last month</span>
      </div>

      {/* Mini trend chart */}
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueCard;
