import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PantryItem } from '../types';

// Inventory Item Row Component (extracted from App.tsx)
interface InventoryItemRowProps {
  item: PantryItem;
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onSetToZero: (id: string) => Promise<void>;
  onEdit: () => void;
  isUpdating: boolean;
}

const InventoryItemRow: React.FC<InventoryItemRowProps> = ({ 
  item, 
  onAdjustQuantity, 
  onSetToZero, 
  onEdit, 
  isUpdating 
}) => {
  const isOutOfStock = item.quantity <= 0;
  const getStep = (unit: string) => {
    if (['lbs', 'kg', 'grams', 'oz'].includes(unit)) return 0.5;
    if (['cups'].includes(unit)) return 0.25;
    return 1;
  };

  const step = getStep(item.unit);

  return (
    <tr className={`border-b border-slate-100 ${isOutOfStock ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
      <td className="px-3 py-3 md:px-6 md:py-4">
        <div className={`font-medium ${isOutOfStock ? 'text-slate-400' : 'text-slate-800'}`}>
          {item.name}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="capitalize">{item.category}</span>
          {item.barcode && (
            <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono" title={`Barcode: ${item.barcode}`}>
              📱 {item.barcode.slice(-6)}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAdjustQuantity(item.id, -step)}
            disabled={isUpdating || item.quantity <= 0}
            className="btn-decrease w-8 h-8 flex items-center justify-center rounded-lg font-bold"
            aria-label={`Decrease ${item.name}`}
          >
            −
          </button>
          <span className={`min-w-[60px] text-center font-semibold ${isOutOfStock ? 'text-slate-400' : 'text-slate-700'}`} data-testid={`quantity-${item.id}`}>
            {item.quantity}
          </span>
          <button
            onClick={() => onAdjustQuantity(item.id, step)}
            disabled={isUpdating}
            className="btn-increase w-8 h-8 flex items-center justify-center rounded-lg font-bold"
            aria-label={`Increase ${item.name}`}
          >
            +
          </button>
          <span className={`text-sm hidden sm:inline ${isOutOfStock ? 'text-slate-400' : 'text-slate-500'}`}>
            {item.unit}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2">
          {isOutOfStock ? (
            <span className="badge-out-of-stock text-xs font-semibold px-2 py-1 rounded">
              Out of Stock
            </span>
          ) : item.quantity < 3 ? (
            <span className="badge-low-stock text-xs font-bold px-2 py-1 rounded">
              Low
            </span>
          ) : (
            <span className="badge-ok text-xs font-bold px-2 py-1 rounded">
              OK
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            disabled={isUpdating}
            className="btn-edit p-2 rounded-lg"
            aria-label={`Edit ${item.name}`}
          >
            ✏️
          </button>
          <button
            onClick={() => onSetToZero(item.id)}
            disabled={isUpdating || item.quantity === 0}
            className="btn-zero p-2 rounded-lg"
            aria-label={`Set ${item.name} to zero`}
          >
            
            −
          </button>
        </div>
      </td>
    </tr>
  );
};

// Inventory List Component
interface InventoryListProps {
  items: PantryItem[];
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onSetToZero: (id: string) => Promise<void>;
  onEdit: (item: PantryItem) => void;
  isLoading: boolean;
  error: string | null;
}

const InventoryList: React.FC<InventoryListProps> = ({
  items,
  onAdjustQuantity,
  onSetToZero,
  onEdit,
  isLoading,
  error,
}) => {
  const [updatingIds, setUpdatingIds] = React.useState<Set<string>>(new Set());

  const handleAdjust = async (id: string, delta: number) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    await onAdjustQuantity(id, delta);
    setUpdatingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleSetToZero = async (id: string) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    await onSetToZero(id);
    setUpdatingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="loading-state p-8 text-center">
        <div className="animate-pulse">⏳</div>
        <p>Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state p-4 bg-rose-50 border border-rose-200 rounded-lg" role="alert">
        <p className="text-rose-600">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state p-8 text-center bg-slate-50 rounded-2xl">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-lg font-semibold text-slate-700">No items yet</h3>
        <p className="text-slate-500 mt-2">Add your first item to get started</p>
      </div>
    );
  }

  return (
    <div className="inventory-list">
      <div className="overflow-x-auto">
        <table className="w-full" role="table" aria-label="Inventory items">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-600">Item</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-600">Quantity</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <InventoryItemRow
                key={item.id}
                item={item}
                onAdjustQuantity={handleAdjust}
                onSetToZero={handleSetToZero}
                onEdit={() => onEdit(item)}
                isUpdating={updatingIds.has(item.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

describe('InventoryList', () => {
  const mockItems: PantryItem[] = [
    {
      id: 'item-1',
      name: 'Milk',
      quantity: 2,
      unit: 'bottles',
      category: 'dairy',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'item-2',
      name: 'Eggs',
      quantity: 12,
      unit: 'units',
      category: 'dairy',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'item-3',
      name: 'Bread',
      quantity: 1,
      unit: 'loaf',
      category: 'pantry',
      lastUpdated: new Date().toISOString(),
    },
  ];

  const mockAdjustQuantity = vi.fn();
  const mockSetToZero = vi.fn();
  const mockEdit = vi.fn();

  beforeEach(() => {
    mockAdjustQuantity.mockClear().mockResolvedValue(undefined);
    mockSetToZero.mockClear().mockResolvedValue(undefined);
    mockEdit.mockClear();
  });

  describe('Rendering', () => {
    it('renders empty state when no items', () => {
      render(
        <InventoryList
          items={[]}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('No items yet')).toBeInTheDocument();
      expect(screen.getByText('Add your first item to get started')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(
        <InventoryList
          items={[]}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={true}
          error={null}
        />
      );

      expect(screen.getByText('Loading inventory...')).toBeInTheDocument();
    });

    it('renders error state', () => {
      render(
        <InventoryList
          items={[]}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error="Failed to load inventory"
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load inventory');
    });

    it('renders items list correctly', () => {
      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Milk')).toBeInTheDocument();
      expect(screen.getByText('Eggs')).toBeInTheDocument();
      expect(screen.getByText('Bread')).toBeInTheDocument();
    });

    it('displays correct column headers', () => {
      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('displays item details correctly', () => {
      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      // Check Milk item
      expect(screen.getByText('Milk')).toBeInTheDocument();
      // Get all dairy text elements and verify at least one exists
      const dairyElements = screen.getAllByText('dairy');
      expect(dairyElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('quantity-item-1')).toHaveTextContent('2');
    });
  });

  describe('Stock Status Display', () => {
    it('shows OK status for items with quantity >= 3', () => {
      const items: PantryItem[] = [
        { ...mockItems[1], quantity: 12 }, // Eggs - OK
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('shows Low status for items with quantity < 3 but > 0', () => {
      const items: PantryItem[] = [
        { ...mockItems[0], quantity: 2 }, // Milk - Low
        { ...mockItems[2], quantity: 1 }, // Bread - Low
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getAllByText('Low')).toHaveLength(2);
    });

    it('shows Out of Stock status for items with quantity = 0', () => {
      const items: PantryItem[] = [
        { ...mockItems[0], quantity: 0 }, // Milk - Out of Stock
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('applies correct styling for out of stock items', () => {
      const items: PantryItem[] = [
        { ...mockItems[0], quantity: 0, name: 'Empty Milk' },
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      const itemName = screen.getByText('Empty Milk');
      // Out of stock items should have muted styling
      expect(itemName).toHaveClass('text-slate-400');
    });
  });

  describe('Item Actions', () => {
    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      const editButton = screen.getByLabelText('Edit Milk');
      await user.click(editButton);

      expect(mockEdit).toHaveBeenCalledWith(expect.objectContaining({
        id: 'item-1',
        name: 'Milk',
      }));
    });

    it('calls onAdjustQuantity when increase button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      const increaseButton = screen.getByLabelText('Increase Milk');
      await user.click(increaseButton);

      await waitFor(() => {
        expect(mockAdjustQuantity).toHaveBeenCalledWith('item-1', 1);
      });
    });

    it('calls onAdjustQuantity when decrease button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      const decreaseButton = screen.getByLabelText('Decrease Milk');
      await user.click(decreaseButton);

      await waitFor(() => {
        expect(mockAdjustQuantity).toHaveBeenCalledWith('item-1', -1);
      });
    });

    it('calls onSetToZero when set to zero button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      const zeroButton = screen.getByLabelText('Set Milk to zero');
      await user.click(zeroButton);

      await waitFor(() => {
        expect(mockSetToZero).toHaveBeenCalledWith('item-1');
      });
    });

    it('disables decrease button when quantity is 0', () => {
      const items: PantryItem[] = [
        { ...mockItems[0], quantity: 0 },
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      const decreaseButton = screen.getByLabelText('Decrease Milk');
      expect(decreaseButton).toBeDisabled();
    });

    it('disables set to zero button when already at zero', () => {
      const items: PantryItem[] = [
        { ...mockItems[0], quantity: 0 },
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      const zeroButton = screen.getByLabelText('Set Milk to zero');
      expect(zeroButton).toBeDisabled();
    });
  });

  describe('Unit Step Adjustment', () => {
    it('uses step 1 for standard units', async () => {
      const user = userEvent.setup();

      const items: PantryItem[] = [
        { ...mockItems[0], unit: 'units' },
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      await user.click(screen.getByLabelText('Increase Milk'));

      await waitFor(() => {
        expect(mockAdjustQuantity).toHaveBeenCalledWith('item-1', 1);
      });
    });

    it('uses step 0.5 for weight units (lbs, kg, etc.)', async () => {
      const user = userEvent.setup();

      const items: PantryItem[] = [
        { ...mockItems[0], unit: 'lbs' },
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      await user.click(screen.getByLabelText('Increase Milk'));

      await waitFor(() => {
        expect(mockAdjustQuantity).toHaveBeenCalledWith('item-1', 0.5);
      });
    });

    it('uses step 0.25 for cup measurements', async () => {
      const user = userEvent.setup();

      const items: PantryItem[] = [
        { ...mockItems[0], unit: 'cups' },
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      await user.click(screen.getByLabelText('Increase Milk'));

      await waitFor(() => {
        expect(mockAdjustQuantity).toHaveBeenCalledWith('item-1', 0.25);
      });
    });
  });

  describe('Barcode Display', () => {
    it('shows barcode when present on item', () => {
      const items: PantryItem[] = [
        { ...mockItems[0], barcode: '1234567890123' },
      ];

      render(
        <InventoryList
          items={items}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTitle('Barcode: 1234567890123')).toBeInTheDocument();
    });

    it('hides barcode section when not present', () => {
      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.queryByTitle(/Barcode:/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA labels for table', () => {
      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Inventory items');
    });

    it('has accessible action buttons', () => {
      render(
        <InventoryList
          items={mockItems}
          onAdjustQuantity={mockAdjustQuantity}
          onSetToZero={mockSetToZero}
          onEdit={mockEdit}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByLabelText('Increase Milk')).toBeInTheDocument();
      expect(screen.getByLabelText('Decrease Milk')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit Milk')).toBeInTheDocument();
      expect(screen.getByLabelText('Set Milk to zero')).toBeInTheDocument();
    });
  });
});
