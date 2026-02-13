import React, { useState, useEffect } from 'react';
import { PantryItem, BarcodeProduct } from '../types';
import { getProductByBarcode } from '../services/apiService';

interface ProductInfoModalProps {
  item: PantryItem;
  isOpen: boolean;
  onClose: () => void;
}

const ProductInfoModal: React.FC<ProductInfoModalProps> = ({ item, isOpen, onClose }) => {
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'overview' | 'nutrition' | 'ingredients'>('overview');

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && item.barcode) {
      fetchProductInfo();
    }
  }, [isOpen, item.barcode]);

  const fetchProductInfo = async () => {
    if (!item.barcode) return;
    
    setLoading(true);
    try {
      const result = await getProductByBarcode(item.barcode);
      if (result.product) {
        setProduct(result.product);
        setFromCache(result.fromCache || false);
        setCachedAt(result.cachedAt);
      } else {
        // Fallback to pantry item data if no barcode product found
        setProduct({
          barcode: item.barcode,
          name: item.name,
          category: item.category,
        });
      }
    } catch (err) {
      console.error('Failed to fetch product info:', err);
      // Fallback to pantry item data
      setProduct({
        barcode: item.barcode,
        name: item.name,
        category: item.category,
      });
    } finally {
      setLoading(false);
    }
  };

  // Get cache status display
  const getCacheStatus = () => {
    if (product?.source === 'live') {
      return { 
        label: '🟢 Live', 
        description: 'From OpenFoodFacts',
        className: 'bg-emerald-100 text-emerald-700' 
      };
    } else if (product?.source === 'stale') {
      return { 
        label: '🟠 Stale', 
        description: 'Cache expired',
        className: 'bg-orange-100 text-orange-700' 
      };
    } else if (fromCache || product?.source === 'cache') {
      return { 
        label: '🟡 Cached', 
        description: 'Local cache',
        className: 'bg-blue-100 text-blue-700' 
      };
    }
    return { label: '—', description: '', className: 'bg-slate-100 text-slate-600' };
  };

  const cacheStatus = getCacheStatus();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-slate-800">Product Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="animate-spin text-4xl mb-3">⏳</div>
            <p className="text-slate-600">Loading product info...</p>
          </div>
        ) : (
          <>
            {/* Product Image & Core Info */}
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                {product?.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-24 h-24 object-contain bg-slate-50 rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center text-4xl flex-shrink-0">
                    📦
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-800 leading-tight">{product?.name || item.name}</h3>
                  {product?.brand && (
                    <p className="text-slate-500 text-sm mt-1">{product.brand}</p>
                  )}
                  <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full uppercase">
                    {product?.category || item.category}
                  </span>
                </div>
              </div>

              {/* Data Source Badge */}
              <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Data Source</span>
                  <div className="flex items-center gap-2">
                    {cacheStatus.description && (
                      <span className="text-xs text-slate-500">{cacheStatus.description}</span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${cacheStatus.className}`}>
                      {cacheStatus.label}
                    </span>
                  </div>
                </div>
                {(cachedAt || product?.updatedAt) && (
                  <p className="text-xs text-slate-500 mt-2">
                    Updated {formatDate(cachedAt || product?.updatedAt)}
                  </p>
                )}
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
                {(['overview', 'nutrition', 'ingredients'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[200px]">
                {activeTab === 'overview' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Barcode</span>
                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded text-sm">
                        {item.barcode}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Brand</span>
                      <span className="text-slate-700">{product?.brand || '—'}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Category</span>
                      <span className="text-slate-700 capitalize">{item.category}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Quantity in Stock</span>
                      <span className="font-semibold text-emerald-600">
                        {item.quantity} {item.unit}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Last Updated</span>
                      <span className="text-slate-700 text-sm">
                        {formatDate(item.lastUpdated)}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'nutrition' && (
                  <div className="space-y-4">
                    {product?.nutrition ? (
                      <>
                        {/* Serving Info */}
                        {(product.nutrition.servingSize || product.nutrition.servingUnit) && (
                          <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-200">
                            <p className="text-sm text-slate-500">Serving Size</p>
                            <p className="font-medium text-slate-700">
                              {product.nutrition.servingSize || product.nutrition.servingUnit}
                            </p>
                          </div>
                        )}
                        {/* Nutrition Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-3 rounded-lg text-center ${product.nutrition.calories !== undefined ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                            <p className={`text-2xl font-bold ${product.nutrition.calories !== undefined ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {product.nutrition.calories !== undefined ? Math.round(product.nutrition.calories) : '—'}
                            </p>
                            <p className="text-xs text-slate-500">Calories</p>
                          </div>
                          <div className={`p-3 rounded-lg text-center ${product.nutrition.protein !== undefined ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                            <p className={`text-2xl font-bold ${product.nutrition.protein !== undefined ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {product.nutrition.protein !== undefined ? Math.round(product.nutrition.protein * 10) / 10 : '—'}
                            </p>
                            <p className="text-xs text-slate-500">Protein (g)</p>
                          </div>
                          <div className={`p-3 rounded-lg text-center ${product.nutrition.carbs !== undefined ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                            <p className={`text-2xl font-bold ${product.nutrition.carbs !== undefined ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {product.nutrition.carbs !== undefined ? Math.round(product.nutrition.carbs * 10) / 10 : '—'}
                            </p>
                            <p className="text-xs text-slate-500">Carbs (g)</p>
                          </div>
                          <div className={`p-3 rounded-lg text-center ${product.nutrition.fat !== undefined ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                            <p className={`text-2xl font-bold ${product.nutrition.fat !== undefined ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {product.nutrition.fat !== undefined ? Math.round(product.nutrition.fat * 10) / 10 : '—'}
                            </p>
                            <p className="text-xs text-slate-500">Fat (g)</p>
                          </div>
                          <div className={`p-3 rounded-lg text-center ${product.nutrition.fiber !== undefined ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                            <p className={`text-2xl font-bold ${product.nutrition.fiber !== undefined ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {product.nutrition.fiber !== undefined ? Math.round(product.nutrition.fiber * 10) / 10 : '—'}
                            </p>
                            <p className="text-xs text-slate-500">Fiber (g)</p>
                          </div>
                          <div className={`p-3 rounded-lg text-center ${product.nutrition.sodium !== undefined ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                            <p className={`text-2xl font-bold ${product.nutrition.sodium !== undefined ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {product.nutrition.sodium !== undefined ? Math.round(product.nutrition.sodium * 10) / 10 : '—'}
                            </p>
                            <p className="text-xs text-slate-500">Sodium (mg)</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 text-center">Values per 100g</p>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-500 text-sm">
                          🍎 No nutrition information available for this product.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'ingredients' && (
                  <div className="space-y-4">
                    {product?.ingredients && product.ingredients.length > 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Ingredients</p>
                        <ul className="space-y-2">
                          {product.ingredients.map((ingredient: string, index: number) => (
                            <li
                              key={index}
                              className="text-sm text-slate-700 border-b border-slate-200 pb-2 last:border-0 last:pb-0 leading-relaxed"
                            >
                              {ingredient}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-500 text-sm">
                          📝 No ingredient information available for this product.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
};

export default ProductInfoModal;
