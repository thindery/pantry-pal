import { BarcodeProduct } from '../types';

// Open Food Facts API - free, open source, no API key required
const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v0/product';

// Alternative: UPC Item Database as fallback
const UPC_ITEM_DB_API = 'https://api.upcitemdb.com/prod/trial/lookup';

export interface BarcodeLookupResult {
  success: boolean;
  product?: BarcodeProduct;
  error?: string;
}

/**
 * Look up product information by barcode using Open Food Facts API
 * Falls back to UPC Item Database if OFF fails
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  // Validate barcode
  if (!barcode || barcode.length < 8) {
    return { success: false, error: 'Invalid barcode' };
  }

  // Try Open Food Facts first (free, no API key)
  try {
    const result = await lookupOpenFoodFacts(barcode);
    if (result.success) {
      return result;
    }
  } catch (err) {
    console.log('Open Food Facts lookup failed, trying fallback...');
  }

  // Fallback to UPC Item Database
  try {
    return await lookupUPCItemDB(barcode);
  } catch (err) {
    return {
      success: false,
      error: 'Could not find product information for this barcode',
    };
  }
}

/**
 * Open Food Facts API lookup
 * https://world.openfoodfacts.org/api/v0/product/{barcode}.json
 */
async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult> {
  const response = await fetch(`${OPEN_FOOD_FACTS_API}/${barcode}.json`);

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 1 || !data.product) {
    return { success: false, error: 'Product not found in Open Food Facts' };
  }

  const product = data.product;

  // Map Open Food Facts categories to our categories
  let category = 'other';
  const categories = product.categories?.toLowerCase() || '';
  const pnnsGroups = product.pnns_groups_1?.toLowerCase() || '';

  if (categories.includes('produce') || categories.includes('fruit') || categories.includes('vegetable') || pnnsGroups.includes('fruits') || pnnsGroups.includes('vegetables')) {
    category = 'produce';
  } else if (categories.includes('dairy') || pnnsGroups.includes('milk') || pnnsGroups.includes('dairy')) {
    category = 'dairy';
  } else if (categories.includes('frozen') || pnnsGroups.includes('frozen')) {
    category = 'frozen';
  } else if (categories.includes('meat') || categories.includes('seafood') || pnnsGroups.includes('meat') || pnnsGroups.includes('fish')) {
    category = 'meat';
  } else if (categories.includes('beverage') || pnnsGroups.includes('beverages') || categories.includes('drink')) {
    category = 'beverages';
  } else if (categories.includes('snack') || pnnsGroups.includes('snacks') || categories.includes('sweet')) {
    category = 'snacks';
  } else if (categories.includes('bakery') || categories.includes('bread') || pnnsGroups.includes('bread')) {
    category = 'pantry';
  }

  return {
    success: true,
    product: {
      barcode,
      name: product.product_name || product.generic_name || 'Unknown Product',
      brand: product.brands?.split(',')[0]?.trim(),
      category,
      image: product.image_url,
    },
  };
}

/**
 * UPC Item Database API lookup (fallback)
 * Note: Free tier has rate limits
 */
async function lookupUPCItemDB(barcode: string): Promise<BarcodeLookupResult> {
  const response = await fetch(`${UPC_ITEM_DB_API}?upc=${barcode}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    return { success: false, error: 'Product not found' };
  }

  const item = data.items[0];

  // Try to determine category from description
  let category = 'other';
  const description = (item.description + ' ' + item.category).toLowerCase();

  if (description.includes('produce') || description.includes('fruit') || description.includes('vegetable')) {
    category = 'produce';
  } else if (description.includes('dairy') || description.includes('milk') || description.includes('cheese')) {
    category = 'dairy';
  } else if (description.includes('frozen')) {
    category = 'frozen';
  } else if (description.includes('meat') || description.includes('seafood') || description.includes('beef') || description.includes('chicken')) {
    category = 'meat';
  } else if (description.includes('beverage') || description.includes('drink') || description.includes('soda') || description.includes('juice')) {
    category = 'beverages';
  } else if (description.includes('snack') || description.includes('chip') || description.includes('candy')) {
    category = 'snacks';
  } else if (description.includes('pantry') || description.includes('grains') || description.includes('bread')) {
    category = 'pantry';
  }

  return {
    success: true,
    product: {
      barcode,
      name: item.title || item.brand || 'Unknown Product',
      brand: item.brand,
      category,
      image: item.images?.[0],
    },
  };
}

/**
 * Parse barcode from image file
 * Uses ZXing library to decode barcode from image
 */
export async function scanBarcodeFromImage(imageFile: File): Promise<BarcodeLookupResult> {
  try {
    // Dynamically import ZXing to avoid issues if camera not available
    const { BrowserMultiFormatReader } = await import('@zxing/browser');

    const reader = new BrowserMultiFormatReader();
    const imageUrl = URL.createObjectURL(imageFile);

    try {
      const result = await reader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);

      if (result && result.getText()) {
        return await lookupBarcode(result.getText());
      }
    } catch (err) {
      URL.revokeObjectURL(imageUrl);
      throw err;
    }

    return { success: false, error: 'No barcode found in image' };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to scan barcode from image',
    };
  }
}
