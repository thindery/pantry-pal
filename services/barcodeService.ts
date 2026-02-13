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

  // Clean barcode - remove any non-numeric characters
  const cleanBarcode = barcode.replace(/[^0-9]/g, '');

  if (cleanBarcode.length < 8) {
    return { success: false, error: 'Invalid barcode format' };
  }

  // Try Open Food Facts first (free, no API key)
  try {
    const result = await lookupOpenFoodFacts(cleanBarcode);
    if (result.success) {
      return result;
    }
  } catch (err) {
    console.log('Open Food Facts lookup failed, trying fallback...');
  }

  // Fallback to UPC Item Database
  try {
    return await lookupUPCItemDB(cleanBarcode);
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
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${OPEN_FOOD_FACTS_API}/${barcode}.json`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

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

    // Extract nutrition data from Open Food Facts
    const nutriments = product.nutriments || {};
    const nutrition = nutriments['energy-kcal_100g'] !== undefined || nutriments.proteins_100g !== undefined
      ? {
          calories: nutriments['energy-kcal_100g'],
          protein: nutriments.proteins_100g,
          carbs: nutriments.carbohydrates_100g,
          fat: nutriments.fat_100g,
          fiber: nutriments.fiber_100g,
          sodium: nutriments.sodium_100g,
          sugar: nutriments.sugars_100g,
          servingSize: product.serving_size,
          servingUnit: product.serving_quantity,
        }
      : undefined;

    // Extract ingredients
    const ingredients = product.ingredients_text
      ? product.ingredients_text.split(/,|\n/).map((i: string) => i.trim()).filter(Boolean)
      : product.ingredients
      ? product.ingredients.map((i: any) => i.text || i.id || String(i)).filter(Boolean)
      : undefined;

    return {
      success: true,
      product: {
        barcode,
        name: product.product_name || product.generic_name || 'Unknown Product',
        brand: product.brands?.split(',')[0]?.trim(),
        category,
        image: product.image_url,
        source: 'live',
        updatedAt: new Date().toISOString(),
        nutrition,
        ingredients,
      },
    };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw new Error(`Failed to fetch: ${err.message}`);
    }
    throw err;
  }
}

/**
 * UPC Item Database API lookup (fallback)
 * Note: Free tier has rate limits
 */
async function lookupUPCItemDB(barcode: string): Promise<BarcodeLookupResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${UPC_ITEM_DB_API}?upc=${barcode}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

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
        source: 'live',
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
  if (diffMonths > 0) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  return 'Just now';
}

/**
 * Helper function to preload an image before decoding
 */
function preloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Parse barcode from image file
 * Uses ZXing library to decode barcode from image
 */
export async function scanBarcodeFromImage(imageFile: File): Promise<BarcodeLookupResult> {
  let imageUrl: string | null = null;

  try {
    // Validate file
    if (!imageFile.type.startsWith('image/')) {
      return { success: false, error: 'Invalid file type. Please upload an image.' };
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Image is too large. Max size is 10MB.' };
    }

    // Dynamically import ZXing to avoid issues if camera not available
    const { BrowserMultiFormatReader } = await import('@zxing/browser');

    const reader = new BrowserMultiFormatReader();
    imageUrl = URL.createObjectURL(imageFile);

    // Preload the image to ensure it's ready for decoding
    await preloadImage(imageUrl);

    // Try to decode the barcode
    let result;
    try {
      result = await reader.decodeFromImageUrl(imageUrl);
    } catch (decodeErr) {
      // If decodeFromImageUrl fails, try again with a small delay
      // This helps with race conditions where the image isn't fully processed
      await new Promise(resolve => setTimeout(resolve, 100));
      result = await reader.decodeFromImageUrl(imageUrl);
    }

    if (result && result.getText()) {
      const barcode = result.getText();
      console.log('Barcode detected from image:', barcode);
      return await lookupBarcode(barcode);
    }

    return { success: false, error: 'No barcode found in image' };
  } catch (err) {
    console.error('Error scanning barcode from image:', err);

    // Provide more specific error messages
    let errorMessage = 'Failed to scan barcode from image';
    if (err instanceof Error) {
      if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Network error while scanning image. Please check your connection and try again.';
      } else if (err.message.includes('load image')) {
        errorMessage = 'Could not load image. Please try a different image file.';
      } else if (err.message.includes('No MultiFormat Readers')) {
        errorMessage = 'Could not find a barcode in this image. Try a clearer photo with better lighting.';
      } else {
        errorMessage = err.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    // Always clean up the object URL
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  }
}
