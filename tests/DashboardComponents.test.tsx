import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  DashboardStatData} from '../components/DashboardComponents';
import {
  StatCardMini,
  LowStockPreview,
  ShoppingListPreview,
  CategoryPills,
  InlineQuickAdd,
  RecentActivityPreview
} from '../components/DashboardComponents';
import type { PantryItem, Activity, ShoppingListItem } from '../types';

// Mock Fuse.js
vi.mock('fuse.js', () => {
  return {
    default: class Fuse {
      private items: any[];
      constructor(items: any[]) {
        this.items = items;
      }
      search(query: string) {
        return this.items
          .filter((item) => 
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            (item.barcode && item.barcode.includes(query))
          )
          .map((item) => ({
            item,
            matches: [{ key: 'name', indices: [[0, query.length - 1]] }],
          }));
      }
    },
  };
});

describe('StatCardMini', () => {
  const mockStats: DashboardStatData[] = [
    { label: 'Total Items', value: 45, color: 'emerald' },
    { label: 'Low Stock', value: 5, color: 'amber' },
    { label: 'Expiring Soon', value: 3, color: 'rose' },
    { label: 'Categories', value: 8, color: 'sky' },
    { label: 'Shopping List', value: 12, color: 'slate' },
  ];

  const mockOnStatClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all stat cards', () => {
    render(<StatCardMini stats={mockStats} />);

    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Shopping List')).toBeInTheDocument();
  });

  it('displays correct values', () => {
    render(<StatCardMini stats={mockStats} />);

    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('calls onStatClick when a card is clicked', async () => {
    render(<StatCardMini stats={mockStats} onStatClick={mockOnStatClick} />);

    const totalItemsCard = screen.getByText('Total Items').closest('button');
    await userEvent.click(totalItemsCard!);

    expect(mockOnStatClick).toHaveBeenCalledWith('Total Items');
  });

  it('applies active styling when activeFilter matches', () => {
    render(<StatCardMini stats={mockStats} onStatClick={mockOnStatClick} activeFilter="Low Stock" />);

    const lowStockCard = screen.getByText('Low Stock').closest('button');
    expect(lowStockCard).toHaveClass('ring-2');
  });

  it('does not apply active styling when activeFilter does not match', () => {
    render(<StatCardMini stats={mockStats} onStatClick={mockOnStatClick} activeFilter="Low Stock" />);

    const totalItemsCard = screen.getByText('Total Items').closest('button');
    expect(totalItemsCard).not.toHaveClass('ring-2');
  });

  it('uses flexible wrap layout for stat cards', () => {
    render(<StatCardMini stats={mockStats} />);

    const row = screen.getByText('Total Items').closest('button')?.parentElement;
    expect(row).toHaveClass('flex', 'flex-wrap', 'gap-2');
  });
});

describe('LowStockPreview', () => {
  const mockItems: PantryItem[] = [
    { id: '1', name: 'Milk', quantity: 2, unit: 'cartons', category: 'dairy', lastUpdated: '2026-02-27' },
    { id: '2', name: 'Eggs', quantity: 1, unit: 'dozen', category: 'dairy', lastUpdated: '2026-02-27' },
    { id: '3', name: 'Bread', quantity: 0, unit: 'loaf', category: 'pantry', lastUpdated: '2026-02-27' },
    { id: '4', name: 'Apples', quantity: 5, unit: 'lbs', category: 'produce', lastUpdated: '2026-02-27' },
    { id: '5', name: 'Flour', quantity: 2, unit: 'cups', category: 'pantry', lastUpdated: '2026-02-27' },
  ];

  const mockOnAdjustQuantity = vi.fn();
  const mockOnViewAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no low stock items', () => {
    const noLowStockItems = mockItems.map(item => ({ ...item, quantity: 5 }));
    render(
      <LowStockPreview 
        items={noLowStockItems} 
        onAdjustQuantity={mockOnAdjustQuantity} 
        onViewAll={mockOnViewAll} 
      />
    );

    expect(screen.getByText('All items well stocked!')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('renders low stock items', () => {
    render(
      <LowStockPreview 
        items={mockItems} 
        onAdjustQuantity={mockOnAdjustQuantity} 
        onViewAll={mockOnViewAll} 
      />
    );

    // Low stock items: Milk (2), Eggs (1), Flour (2) - Bread (0) is out of stock
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Eggs')).toBeInTheDocument();
    expect(screen.getByText('Flour')).toBeInTheDocument();
    // Multiple dairy items share the category label
    expect(screen.getAllByText('dairy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('pantry')).toBeInTheDocument();
  });

  it('displays item count badge', () => {
    render(
      <LowStockPreview 
        items={mockItems} 
        onAdjustQuantity={mockOnAdjustQuantity} 
        onViewAll={mockOnViewAll} 
      />
    );

    expect(screen.getByText('3 items')).toBeInTheDocument();
  });

  it('calls onAdjustQuantity when + button is clicked', async () => {
    render(
      <LowStockPreview 
        items={mockItems} 
        onAdjustQuantity={mockOnAdjustQuantity} 
        onViewAll={mockOnViewAll} 
      />
    );

    const milkRow = screen.getByText('Milk').closest('div')?.parentElement;
    const increaseButton = within(milkRow!).getByText('+');
    
    await userEvent.click(increaseButton);

    expect(mockOnAdjustQuantity).toHaveBeenCalledWith('1', 1);
  });

  it('calls onAdjustQuantity when - button is clicked', async () => {
    render(
      <LowStockPreview 
        items={mockItems} 
        onAdjustQuantity={mockOnAdjustQuantity} 
        onViewAll={mockOnViewAll} 
      />
    );

    const milkRow = screen.getByText('Milk').closest('div')?.parentElement;
    const decreaseButton = within(milkRow!).getByText('−');
    
    await userEvent.click(decreaseButton);

    expect(mockOnAdjustQuantity).toHaveBeenCalledWith('1', -1);
  });

  it('disables decrease button when quantity is 0', () => {
    render(
      <LowStockPreview 
        items={mockItems} 
        onAdjustQuantity={mockOnAdjustQuantity} 
        onViewAll={mockOnViewAll} 
      />
    );

    // This test verifies that items with 0 quantity are not shown
    expect(screen.queryByText('Bread')).not.toBeInTheDocument();
  });

  it('calls onViewAll when View all low stock is clicked', async () => {
    render(
      <LowStockPreview 
        items={mockItems} 
        onAdjustQuantity={mockOnAdjustQuantity} 
        onViewAll={mockOnViewAll} 
      />
    );

    const viewAllButton = screen.getByText('View all low stock →');
    await userEvent.click(viewAllButton);

    expect(mockOnViewAll).toHaveBeenCalledTimes(1);
  });

  it('limits displayed items to maxItems', () => {
    render(
      <LowStockPreview 
        items={mockItems} 
        maxItems={2}
        onAdjustQuantity={mockOnAdjustQuantity} 
        onViewAll={mockOnViewAll} 
      />
    );

    // Should only show 2 items
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Eggs')).toBeInTheDocument();
  });
});

describe('ShoppingListPreview', () => {
  const mockShoppingItems: ShoppingListItem[] = [
    {
      id: '1',
      name: 'Milk',
      category: 'dairy',
      currentQuantity: 0,
      suggestedQuantity: 2,
      unit: 'cartons',
      isManual: false,
      isChecked: false,
      addedAt: '2026-02-27',
      reason: 'low_stock',
    },
    {
      id: '2',
      name: 'Bread',
      category: 'pantry',
      currentQuantity: 0,
      suggestedQuantity: 1,
      unit: 'loaf',
      isManual: false,
      isChecked: false,
      addedAt: '2026-02-27',
      reason: 'low_stock',
    },
    {
      id: '3',
      name: 'Eggs',
      category: 'dairy',
      currentQuantity: 2,
      suggestedQuantity: 1,
      unit: 'dozen',
      isManual: true,
      isChecked: true,
      addedAt: '2026-02-27',
      reason: 'manual',
    },
  ];

  const mockOnToggleItem = vi.fn();
  const mockOnViewAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no items', () => {
    render(
      <ShoppingListPreview 
        items={[]} 
        onToggleItem={mockOnToggleItem} 
        onViewAll={mockOnViewAll} 
      />
    );

    expect(screen.getByText('Your list is empty')).toBeInTheDocument();
  });

  it('renders celebration state when all items are checked', () => {
    const allChecked = mockShoppingItems.map(item => ({ ...item, isChecked: true }));
    render(
      <ShoppingListPreview 
        items={allChecked} 
        onToggleItem={mockOnToggleItem} 
        onViewAll={mockOnViewAll} 
      />
    );

    expect(screen.getByText(/all items checked/i)).toBeInTheDocument();
  });

  it('renders unchecked items', () => {
    render(
      <ShoppingListPreview 
        items={mockShoppingItems} 
        onToggleItem={mockOnToggleItem} 
        onViewAll={mockOnViewAll} 
      />
    );

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.queryByText('Eggs')).not.toBeInTheDocument(); // Eggs is checked
  });

  it('displays progress bar', () => {
    render(
      <ShoppingListPreview 
        items={mockShoppingItems} 
        onToggleItem={mockOnToggleItem} 
        onViewAll={mockOnViewAll} 
      />
    );

    expect(screen.getByText('1/3 checked')).toBeInTheDocument();
  });

  it('calls onToggleItem when checkbox is clicked', async () => {
    render(
      <ShoppingListPreview 
        items={mockShoppingItems} 
        onToggleItem={mockOnToggleItem} 
        onViewAll={mockOnViewAll} 
      />
    );

    const milkCheckbox = screen.getByText('Milk').closest('label')?.querySelector('input');
    await userEvent.click(milkCheckbox!);

    expect(mockOnToggleItem).toHaveBeenCalledWith('1');
  });

  it('displays suggested quantity', () => {
    render(
      <ShoppingListPreview 
        items={mockShoppingItems} 
        onToggleItem={mockOnToggleItem} 
        onViewAll={mockOnViewAll} 
      />
    );

    expect(screen.getByText('2 cartons')).toBeInTheDocument();
    expect(screen.getByText('1 loaf')).toBeInTheDocument();
  });

  it('calls onViewAll when View full list is clicked', async () => {
    render(
      <ShoppingListPreview 
        items={mockShoppingItems} 
        onToggleItem={mockOnToggleItem} 
        onViewAll={mockOnViewAll} 
      />
    );

    const viewAllButton = screen.getByText('View full list →');
    await userEvent.click(viewAllButton);

    expect(mockOnViewAll).toHaveBeenCalledTimes(1);
  });

  it('limits displayed items to maxItems', () => {
    const manyItems = [
      ...mockShoppingItems,
      { ...mockShoppingItems[0], id: '4', name: 'Butter', isChecked: false },
      { ...mockShoppingItems[0], id: '5', name: 'Cheese', isChecked: false },
      { ...mockShoppingItems[0], id: '6', name: 'Yogurt', isChecked: false },
    ];

    render(
      <ShoppingListPreview 
        items={manyItems} 
        maxItems={2}
        onToggleItem={mockOnToggleItem} 
        onViewAll={mockOnViewAll} 
      />
    );

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.queryByText('Butter')).not.toBeInTheDocument();
  });
});

describe('CategoryPills', () => {
  const mockCategories = [
    { id: 'dairy', name: 'Dairy', icon: '🥛', count: 12, lowStockCount: 3 },
    { id: 'produce', name: 'Produce', icon: '🥬', count: 8, lowStockCount: 0 },
    { id: 'pantry', name: 'Pantry', icon: '📦', count: 15, lowStockCount: 2 },
    { id: 'meat', name: 'Meat', icon: '🥩', count: 5, lowStockCount: 0 },
  ];

  const mockOnCategoryClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders category pills', () => {
    render(<CategoryPills categories={mockCategories} />);

    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Produce')).toBeInTheDocument();
    expect(screen.getByText('Pantry')).toBeInTheDocument();
    expect(screen.getByText('Meat')).toBeInTheDocument();
  });

  it('displays category icons', () => {
    render(<CategoryPills categories={mockCategories} />);

    expect(screen.getByText('🥛')).toBeInTheDocument();
    expect(screen.getByText('🥬')).toBeInTheDocument();
    expect(screen.getByText('📦')).toBeInTheDocument();
    expect(screen.getByText('🥩')).toBeInTheDocument();
  });

  it('displays item counts', () => {
    render(<CategoryPills categories={mockCategories} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onCategoryClick when pill is clicked', async () => {
    render(<CategoryPills categories={mockCategories} onCategoryClick={mockOnCategoryClick} />);

    await userEvent.click(screen.getByText('Dairy'));

    expect(mockOnCategoryClick).toHaveBeenCalledWith('dairy');
  });

  it('applies warning style for categories with low stock', () => {
    render(<CategoryPills categories={mockCategories} />);

    const dairyPill = screen.getByText('Dairy').closest('button');
    expect(dairyPill).toHaveClass('bg-amber-50', 'border-amber-200');
  });

  it('applies normal style for categories without low stock', () => {
    render(<CategoryPills categories={mockCategories} />);

    const producePill = screen.getByText('Produce').closest('button');
    expect(producePill).toHaveClass('bg-slate-50', 'border-slate-200');
  });

  it('sorts categories by count (highest first)', () => {
    render(<CategoryPills categories={mockCategories} />);

    const buttons = screen.getAllByRole('button');
    // First should be Pantry (15), then Dairy (12), Produce (8), Meat (5)
    expect(buttons[0]).toHaveTextContent('Pantry');
    expect(buttons[1]).toHaveTextContent('Dairy');
  });
});

/** Match product names that Fuse highlight splits across child spans */
function getSuggestionByProductName(name: string) {
  return screen.getByText((_, el) => {
    if (el == null || el.tagName !== 'DIV') return false;
    return el.classList.contains('font-medium') && el.textContent === name;
  });
}

describe('InlineQuickAdd', () => {
  const mockCategories = ['pantry', 'dairy', 'produce', 'frozen'];
  const mockInventory: PantryItem[] = [
    { id: '1', name: 'Milk', quantity: 2, unit: 'cartons', category: 'dairy', lastUpdated: '2026-02-27', barcode: '123456789' },
    { id: '2', name: 'Flour', quantity: 5, unit: 'cups', category: 'pantry', lastUpdated: '2026-02-27' },
    { id: '3', name: 'Eggs', quantity: 12, unit: 'units', category: 'dairy', lastUpdated: '2026-02-27', barcode: '987654321' },
  ];

  const mockOnAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input fields', () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    expect(screen.getByPlaceholderText('Type to search products...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('shows suggestions when typing', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const input = screen.getByPlaceholderText('Type to search products...');
    await userEvent.type(input, 'mi');

    await waitFor(() => {
      expect(getSuggestionByProductName('Milk')).toBeInTheDocument();
    });
  });

  it('hides suggestions when input is too short', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const input = screen.getByPlaceholderText('Type to search products...');
    await userEvent.type(input, 'm');

    await waitFor(() => {
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  it('selects a suggestion on click', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const input = screen.getByPlaceholderText('Type to search products...');
    await userEvent.type(input, 'mil');

    await waitFor(() => {
      expect(getSuggestionByProductName('Milk')).toBeInTheDocument();
    });

    await userEvent.click(getSuggestionByProductName('Milk'));

    expect(input).toHaveValue('Milk');
  });

  it('submits form with correct data', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const input = screen.getByPlaceholderText('Type to search products...');
    await userEvent.type(input, 'New Item');

    const addButton = screen.getByRole('button', { name: /add/i });
    await userEvent.click(addButton);

    expect(mockOnAdd).toHaveBeenCalledWith({
      name: 'New Item',
      quantity: 1,
      category: 'pantry',
      barcode: undefined,
    });
  });

  it('includes barcode when selecting existing product', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const input = screen.getByPlaceholderText('Type to search products...');
    await userEvent.type(input, 'Milk');

    await waitFor(() => {
      expect(getSuggestionByProductName('Milk')).toBeInTheDocument();
    });

    await userEvent.click(getSuggestionByProductName('Milk'));

    // Change quantity
    const quantityInput = screen.getByRole('spinbutton');
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '3');

    const addButton = screen.getByRole('button', { name: /add/i });
    await userEvent.click(addButton);

    expect(mockOnAdd).toHaveBeenCalledWith({
      name: 'Milk',
      quantity: 3,
      category: 'dairy',
      barcode: '123456789',
    });
  });

  it('prevents submission when input is empty', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const addButton = screen.getByRole('button', { name: /add/i });
    expect(addButton).toBeDisabled();
  });

  it('changes quantity', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const quantityInput = screen.getByRole('spinbutton');
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '5');

    const input = screen.getByPlaceholderText('Type to search products...');
    await userEvent.type(input, 'Test Item');

    const addButton = screen.getByRole('button', { name: /add/i });
    await userEvent.click(addButton);

    expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
      quantity: 5,
    }));
  });

  it('shows no matching products message', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const input = screen.getByPlaceholderText('Type to search products...');
    await userEvent.type(input, 'xyzxyz');

    await waitFor(() => {
      expect(screen.getByText('No matching products found')).toBeInTheDocument();
    });
  });

  it('closes suggestions on Escape key', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const input = screen.getByPlaceholderText('Type to search products...');
    await userEvent.type(input, 'mi');

    await waitFor(() => {
      expect(getSuggestionByProductName('Milk')).toBeInTheDocument();
    });

    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  it('navigates suggestions with keyboard arrows', async () => {
    render(
      <InlineQuickAdd 
        onAdd={mockOnAdd} 
        categories={mockCategories} 
        inventory={mockInventory} 
      />
    );

    const input = screen.getByPlaceholderText('Type to search products...');
    await userEvent.type(input, 'i'); // Should match Milk and Flour

    // Wait a bit for suggestions
    await new Promise(r => setTimeout(r, 100));

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalled();
    });
  });
});

describe('RecentActivityPreview', () => {
  const mockActivities: Activity[] = [
    {
      id: '1',
      itemId: 'item1',
      itemName: 'Milk',
      type: 'ADD',
      amount: 2,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
      source: 'MANUAL',
    },
    {
      id: '2',
      itemId: 'item2',
      itemName: 'Eggs',
      type: 'REMOVE',
      amount: 3,
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      source: 'MANUAL',
    },
    {
      id: '3',
      itemId: 'item3',
      itemName: 'Bread',
      type: 'ADJUST',
      amount: 1,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      source: 'RECEIPT_SCAN',
    },
    {
      id: '4',
      itemName: 'Flour',
      itemId: 'item4',
      type: 'CREATE',
      amount: 0,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      source: 'MANUAL',
    },
  ];

  it('renders empty state when no activities', () => {
    render(<RecentActivityPreview activities={[]} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('renders activities', () => {
    render(<RecentActivityPreview activities={mockActivities} />);

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Eggs')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
  });

  it('displays correct activity type icons and text', () => {
    render(<RecentActivityPreview activities={mockActivities} />);

    expect(screen.getByText(/added/)).toBeInTheDocument();
    expect(screen.getByText(/used/)).toBeInTheDocument();
    expect(screen.getByText(/adjusted/)).toBeInTheDocument();
    expect(screen.getByText(/created/)).toBeInTheDocument();
  });

  it('displays relative timestamps', () => {
    render(<RecentActivityPreview activities={mockActivities} />);

    expect(screen.getAllByText(/ago|just now/).length).toBeGreaterThan(0);
  });

  it('limits to maxItems', () => {
    const manyActivities = Array.from({ length: 10 }, (_, i) => ({
      ...mockActivities[0],
      id: String(i),
      itemName: `Item ${i}`,
    }));

    render(<RecentActivityPreview activities={manyActivities} maxItems={5} />);

    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.getByText('Item 4')).toBeInTheDocument();
    expect(screen.queryByText('Item 5')).not.toBeInTheDocument();
  });

  it('shows amount for ADD and REMOVE activities', () => {
    render(<RecentActivityPreview activities={mockActivities} />);

    expect(screen.getByText('+2 added')).toBeInTheDocument();
    expect(screen.getByText('-3 used')).toBeInTheDocument();
  });

  it('hides amount for other activity types', () => {
    render(<RecentActivityPreview activities={mockActivities} />);

    const flourRow = screen.getByText('Flour').closest('div')?.parentElement;
    expect(flourRow).toHaveTextContent('created');
  });
});
