import React from 'react';
import { LayoutDashboard, Users, Package, CreditCard, Settings, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

type AdminView = 'dashboard' | 'errors' | 'users' | 'products' | 'stripe';

interface SidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: AdminView;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'errors', label: 'Errors', icon: <AlertTriangle className="w-5 h-5" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
  { id: 'products', label: 'Products', icon: <Package className="w-5 h-5" /> },
  { id: 'stripe', label: 'Stripe', icon: <CreditCard className="w-5 h-5" /> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-lg">Admin</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">P</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${
            isCollapsed ? 'hidden' : 'block'
          }`}
        >
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Collapse toggle for collapsed state */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute left-14 top-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
              activeView === item.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            {item.icon}
            {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-slate-800">
        <button
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Settings className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium text-sm">Settings</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
