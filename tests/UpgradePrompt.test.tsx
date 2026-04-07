import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpgradePrompt, {
  ItemLimitWarning,
  ReceiptScanLimit,
  ProBadge,
  VoiceAssistantLock,
} from '../components/UpgradePrompt';

describe('UpgradePrompt Modal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpgrade = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Items Feature', () => {
    it('renders items upgrade prompt correctly', () => {
      render(
        <UpgradePrompt
          title="Item Limit Reached"
          message="You've reached the limit of 50 items on the free plan."
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      expect(screen.getByText('Item Limit Reached')).toBeInTheDocument();
      expect(screen.getByText("You've reached the limit of 50 items on the free plan.")).toBeInTheDocument();
      expect(screen.getByText('📦')).toBeInTheDocument();
    });

    it('displays correct feature name for items', () => {
      render(
        <UpgradePrompt
          title="Item Limit Reached"
          message="You've reached your limit."
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      expect(screen.getByText(/Unlimited Items/)).toBeInTheDocument();
    });
  });

  describe('Receipts Feature', () => {
    it('renders receipts upgrade prompt correctly', () => {
      render(
        <UpgradePrompt
          title="Receipt Scan Limit"
          message="You've used all 5 receipt scans this month."
          feature="receipts"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      expect(screen.getByText('Receipt Scan Limit')).toBeInTheDocument();
      expect(screen.getByText('📄')).toBeInTheDocument();
    });

    it('displays correct feature name for receipts', () => {
      render(
        <UpgradePrompt
          title="Receipt Scan Limit"
          message="You've used all your scans."
          feature="receipts"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      expect(screen.getByText(/AI Receipt Scanning/)).toBeInTheDocument();
    });
  });

  describe('Voice Feature (default case)', () => {
    it('renders voice upgrade prompt correctly', () => {
      render(
        <UpgradePrompt
          title="Voice Assistant"
          message="Voice control requires a Pro subscription."
          feature="voice"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      expect(screen.getByText('Voice Assistant')).toBeInTheDocument();
      expect(screen.getByText('🎙️')).toBeInTheDocument();
    });

    it('displays correct feature name for voice', () => {
      render(
        <UpgradePrompt
          title="Voice Assistant"
          message="Voice control requires Pro."
          feature="voice"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      expect(screen.getByText(/Voice Assistant/)).toBeInTheDocument();
    });
  });

  describe('Modal Structure', () => {
    it('displays trust signals at bottom', () => {
      render(
        <UpgradePrompt
          title="Test Title"
          message="Test message"
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      expect(screen.getByText(/Secure checkout/)).toBeInTheDocument();
      expect(screen.getByText(/Cancel anytime/)).toBeInTheDocument();
      expect(screen.getByText(/30-day guarantee/)).toBeInTheDocument();
    });

    it('has correct modal backdrop styling', () => {
      const { container } = render(
        <UpgradePrompt
          title="Test"
          message="Test message"
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      const backdrop = container.firstChild;
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'z-[200]', 'bg-slate-900/60');
    });

    it('displays PantryPal Pro branding', () => {
      render(
        <UpgradePrompt
          title="Test Title"
          message="Test message"
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      expect(screen.getByText(/PantryPal Pro/)).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('calls onUpgrade when Upgrade button is clicked', async () => {
      render(
        <UpgradePrompt
          title="Test"
          message="Test message"
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade to pro/i });
      await userEvent.click(upgradeButton);

      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Maybe Later button is clicked', async () => {
      render(
        <UpgradePrompt
          title="Test"
          message="Test message"
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      const laterButton = screen.getByRole('button', { name: /maybe later/i });
      await userEvent.click(laterButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('has correct styling for upgrade button', () => {
      render(
        <UpgradePrompt
          title="Test"
          message="Test message"
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade to pro/i });
      expect(upgradeButton).toHaveClass('bg-emerald-600', 'rounded-xl');
    });

    it('has correct styling for close button', () => {
      render(
        <UpgradePrompt
          title="Test"
          message="Test message"
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      const closeButton = screen.getByRole('button', { name: /maybe later/i });
      expect(closeButton).toHaveClass('border', 'border-slate-300', 'rounded-xl');
    });
  });

  describe('Animation Classes', () => {
    it('has animation classes on modal', () => {
      const { container } = render(
        <UpgradePrompt
          title="Test"
          message="Test message"
          feature="items"
          onClose={mockOnClose}
          onUpgrade={mockOnUpgrade}
        />
      );

      const modal = container.querySelector('.bg-white');
      expect(modal).toHaveClass('animate-in', 'zoom-in-95');
    });
  });
});

describe('ItemLimitWarning', () => {
  const mockOnUpgrade = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not near limit', () => {
    const { container } = render(
      <ItemLimitWarning currentItems={30} maxItems={50} onUpgrade={mockOnUpgrade} />
    );

    expect(container.firstChild).toHaveClass('hidden');
  });

  it('renders warning when near limit (5 or fewer remaining)', () => {
    render(
      <ItemLimitWarning currentItems={45} maxItems={50} onUpgrade={mockOnUpgrade} />
    );

    expect(screen.getByText(/approaching your item limit/i)).toBeInTheDocument();
    expect(screen.getByText(/⚠️/)).toBeInTheDocument();
  });

  it('renders warning when at last few items', () => {
    render(
      <ItemLimitWarning currentItems={48} maxItems={50} onUpgrade={mockOnUpgrade} />
    );

    expect(screen.getByText('You have')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/items remaining/)).toBeInTheDocument();
  });

  it('displays correct percentage in progress bar', () => {
    const { container } = render(
      <ItemLimitWarning currentItems={45} maxItems={50} onUpgrade={mockOnUpgrade} />
    );

    const progressBar = container.querySelector('.bg-amber-500');
    expect(progressBar).toHaveStyle({ width: '90%' });
  });

  it('calls onUpgrade when upgrade link is clicked', async () => {
    render(
      <ItemLimitWarning currentItems={46} maxItems={50} onUpgrade={mockOnUpgrade} />
    );

    const upgradeLink = screen.getByText(/upgrade to pro for unlimited items/i);
    await userEvent.click(upgradeLink);

    expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
  });

  it('shows correct usage numbers', () => {
    render(
      <ItemLimitWarning currentItems={47} maxItems={50} onUpgrade={mockOnUpgrade} />
    );

    expect(screen.getByText('3')).toBeInTheDocument(); // remaining
    expect(screen.getByText('47/50')).toBeInTheDocument(); // used/total
  });

  it('has correct styling for warning state', () => {
    const { container } = render(
      <ItemLimitWarning currentItems={46} maxItems={50} onUpgrade={mockOnUpgrade} />
    );

    const warningBox = container.firstChild;
    expect(warningBox).toHaveClass('bg-amber-50', 'border-amber-200');
  });
});

describe('ReceiptScanLimit', () => {
  const mockOnUpgrade = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when plenty of scans remaining', () => {
    const { container } = render(
      <ReceiptScanLimit used={2} limit={10} onUpgrade={mockOnUpgrade} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows amber warning when 2 or fewer scans remaining', () => {
    render(
      <ReceiptScanLimit used={8} limit={10} onUpgrade={mockOnUpgrade} />
    );

    expect(screen.getByText(/only 2 receipt scans left/i)).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('shows amber warning when 1 scan remaining', () => {
    render(
      <ReceiptScanLimit used={9} limit={10} onUpgrade={mockOnUpgrade} />
    );

    expect(screen.getByText(/only 1 receipt scan left/i)).toBeInTheDocument();
  });

  it('handles pluralization correctly for 1 scan', () => {
    render(
      <ReceiptScanLimit used={9} limit={10} onUpgrade={mockOnUpgrade} />
    );

    expect(screen.getByText(/1 receipt scan left this month/i)).toBeInTheDocument();
  });

  it('handles pluralization correctly for multiple scans', () => {
    render(
      <ReceiptScanLimit used={8} limit={10} onUpgrade={mockOnUpgrade} />
    );

    expect(screen.getByText(/2 receipt scans left/i)).toBeInTheDocument();
  });

  it('shows red alert when limit reached', () => {
    render(
      <ReceiptScanLimit used={10} limit={10} onUpgrade={mockOnUpgrade} />
    );

    expect(screen.getByText(/monthly receipt scan limit reached/i)).toBeInTheDocument();
    expect(screen.getByText('🚫')).toBeInTheDocument();
  });

  it('has correct styling for warning state', () => {
    const { container } = render(
      <ReceiptScanLimit used={9} limit={10} onUpgrade={mockOnUpgrade} />
    );

    const warningBox = container.firstChild;
    expect(warningBox).toHaveClass('bg-amber-50', 'border-amber-200');
  });

  it('has correct styling for limit reached state', () => {
    const { container } = render(
      <ReceiptScanLimit used={10} limit={10} onUpgrade={mockOnUpgrade} />
    );

    const alertBox = container.firstChild;
    expect(alertBox).toHaveClass('bg-rose-50', 'border-rose-200');
  });

  it('calls onUpgrade from warning state', async () => {
    render(
      <ReceiptScanLimit used={9} limit={10} onUpgrade={mockOnUpgrade} />
    );

    const upgradeLink = screen.getByText(/upgrade to pro/i);
    await userEvent.click(upgradeLink);

    expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
  });

  it('calls onUpgrade from limit reached state', async () => {
    render(
      <ReceiptScanLimit used={10} limit={10} onUpgrade={mockOnUpgrade} />
    );

    const upgradeButton = screen.getByRole('button', { name: /upgrade to pro/i });
    await userEvent.click(upgradeButton);

    expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
  });

  it('displays correct usage numbers in warning', () => {
    render(
      <ReceiptScanLimit used={8} limit={10} onUpgrade={mockOnUpgrade} />
    );

    expect(screen.getByText(/you've used 8 of 10 scans/i)).toBeInTheDocument();
  });
});

describe('ProBadge', () => {
  it('renders PRO badge', () => {
    render(<ProBadge />);

    expect(screen.getByText('PRO')).toBeInTheDocument();
  });

  it('renders star icon', () => {
    const { container } = render(<ProBadge />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('has correct styling', () => {
    const { container } = render(<ProBadge />);

    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-gradient-to-r', 'from-amber-400', 'to-amber-500');
    expect(badge).toHaveClass('rounded-full', 'text-white', 'font-bold');
  });

  it('accepts custom className', () => {
    const { container } = render(<ProBadge className="custom-class" />);

    const badge = container.firstChild;
    expect(badge).toHaveClass('custom-class');
  });
});

describe('VoiceAssistantLock', () => {
  const mockOnUpgrade = vi.fn();
  const mockGoBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.history.back
    Object.defineProperty(window, 'history', {
      writable: true,
      value: { back: mockGoBack },
    });
  });

  it('renders voice assistant lock screen', () => {
    render(<VoiceAssistantLock onUpgrade={mockOnUpgrade} />);

    expect(screen.getByText('Voice Assistant')).toBeInTheDocument();
    expect(screen.getByText('🎙️')).toBeInTheDocument();
  });

  it('displays upgrade CTA', () => {
    render(<VoiceAssistantLock onUpgrade={mockOnUpgrade} />);

    expect(screen.getByText(/upgrade to.*pro.*to control your pantry with your voice/i)).toBeInTheDocument();
  });

  it('shows example voice commands', () => {
    render(<VoiceAssistantLock onUpgrade={mockOnUpgrade} />);

    expect(screen.getByText(/i used 3 eggs/i)).toBeInTheDocument();
    expect(screen.getByText(/add milk to my list/i)).toBeInTheDocument();
  });

  it('calls onUpgrade when upgrade button is clicked', async () => {
    render(<VoiceAssistantLock onUpgrade={mockOnUpgrade} />);

    const upgradeButton = screen.getByRole('button', { name: /upgrade to pro/i });
    await userEvent.click(upgradeButton);

    expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
  });

  it('calls window.history.back when go back is clicked', async () => {
    render(<VoiceAssistantLock onUpgrade={mockOnUpgrade} />);

    const goBackButton = screen.getByText(/go back/i);
    await userEvent.click(goBackButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('has correct backdrop styling', () => {
    const { container } = render(<VoiceAssistantLock onUpgrade={mockOnUpgrade} />);

    const backdrop = container.firstChild;
    expect(backdrop).toHaveClass('fixed', 'inset-0', 'z-[100]', 'bg-slate-900/80');
  });

  it('has animation classes', () => {
    const { container } = render(<VoiceAssistantLock onUpgrade={mockOnUpgrade} />);

    const backdrop = container.firstChild;
    expect(backdrop).toHaveClass('animate-in', 'fade-in');
  });
});
