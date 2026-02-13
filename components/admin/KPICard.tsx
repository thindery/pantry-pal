import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  growth: number;
  sparklineData: number[];
  prefix?: string;
  suffix?: string;
  color?: 'emerald' | 'blue' | 'amber' | 'rose';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  growth,
  sparklineData,
  prefix = '',
  suffix = '',
  color = 'emerald',
}) => {
  const isPositive = growth >= 0;
  
  const chartData = sparklineData.map((v, i) => ({ value: v, index: i }));

  const colorClasses = {
    emerald: {
      stroke: '#10b981',
      gradient: 'from-emerald-500/20 to-transparent',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    blue: {
      stroke: '#3b82f6',
      gradient: 'from-blue-500/20 to-transparent',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
    },
    amber: {
      stroke: '#f59e0b',
      gradient: 'from-amber-500/20 to-transparent',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
    rose: {
      stroke: '#f43f5e',
      gradient: 'from-rose-500/20 to-transparent',
      bg: 'bg-rose-50',
      text: 'text-rose-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-4xl font-bold text-slate-900">
            {prefix}{value}{suffix}
          </h3>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
          isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {isPositive ? '+' : ''}{growth}%
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-16 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.stroke}
              strokeWidth={2.5}
              dot={false}
              fillOpacity={1}
              fill={`url(#gradient-${color})`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default KPICard;
