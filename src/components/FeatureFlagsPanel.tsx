import React from 'react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

/**
 * Feature Flags Panel - Admin UI for toggling features
 * Accessible via Settings or Admin page
 */
export const FeatureFlagsPanel: React.FC = () => {
  const { flags, isLoaded, enable, disable, reset } = useFeatureFlags();

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Feature Flags</h2>
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800">Feature Flags</h2>
        <button
          onClick={reset}
          className="text-xs text-slate-500 hover:text-rose-600 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="space-y-4">
        {/* Floating Action Button */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <h3 className="font-medium text-slate-800">Floating Action Button</h3>
            <p className="text-sm text-slate-500">Enable the FAB on mobile for quick actions</p>
          </div>
          <button
            onClick={() => flags.fabEnabled ? disable('fabEnabled') : enable('fabEnabled')}
            className={`relative w-14 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              flags.fabEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
            aria-label={flags.fabEnabled ? 'Disable FAB' : 'Enable FAB'}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                flags.fabEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Feature flags are stored in localStorage and will persist across sessions.
          Changes take effect immediately.
        </p>
      </div>
    </div>
  );
};

export default FeatureFlagsPanel;
