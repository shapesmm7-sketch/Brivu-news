import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Package,
  Boxes,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  AlertTriangle,
  Tag,
  ArrowRight,
  Filter,
  Scan,
} from 'lucide-react';
import { InventoryProduct, ProductCategory } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/currencies';
import { BarcodeScannerModal } from './BarcodeScannerModal';

export interface SelectedStockItem {
  name: string;
  unitPrice: number;
  quantity: number;
  inventoryProductId?: string;
  itemId?: string;
}

interface StockProductPickerModalProps {
  isOpen: boolean;
  currency: string;
  documentType?: 'receipt' | 'invoice';
  onClose: () => void;
  onSelectProduct: (item: SelectedStockItem) => void;
  onSelectMultipleProducts?: (items: SelectedStockItem[]) => void;
}

export const StockProductPickerModal: React.FC<StockProductPickerModalProps> = ({
  isOpen,
  currency,
  documentType = 'receipt',
  onClose,
  onSelectProduct,
  onSelectMultipleProducts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'lowStock'>('all');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  const products: InventoryProduct[] = useMemo(() => {
    if (!isOpen) return [];
    return StorageService.getInventoryProducts();
  }, [isOpen]);

  const categories: ProductCategory[] = useMemo(() => {
    if (!isOpen) return [];
    return StorageService.getProductCategories();
  }, [isOpen]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, ProductCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filter products by search, category, and stock status
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      // Stock status filter
      if (stockFilter === 'inStock' && p.quantity <= 0) return false;
      if (stockFilter === 'lowStock' && (p.quantity <= 0 || p.quantity >= 5)) return false;

      // Category filter
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
        return false;
      }

      // Search query
      if (!q) return true;
      const nameMatch = p.name.toLowerCase().includes(q);
      const itemIdMatch = p.itemId ? p.itemId.toLowerCase().includes(q) : false;
      const catName = p.categoryId ? categoryMap.get(p.categoryId)?.name.toLowerCase() : '';
      const catMatch = catName ? catName.includes(q) : false;
      const sizesMatch = p.sizes ? p.sizes.some((s) => s.toLowerCase().includes(q)) : false;

      return nameMatch || itemIdMatch || catMatch || sizesMatch;
    });
  }, [products, searchQuery, selectedCategory, stockFilter, categoryMap]);

  if (!isOpen) return null;

  const handleQtyChange = (productId: string, delta: number, maxQty?: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleSingleSelect = (product: InventoryProduct) => {
    const qty = selectedQuantities[product.id] || 1;
    onSelectProduct({
      name: product.name,
      unitPrice: product.sellingPrice || 0,
      quantity: qty,
      inventoryProductId: product.id,
      itemId: product.itemId,
    });
    onClose();
  };

  const selectedCount = Object.keys(selectedQuantities).filter(
    (id) => selectedQuantities[id] > 0
  ).length;

  const handleAddSelectedMultiple = () => {
    if (!onSelectMultipleProducts) return;
    const itemsToAdd: SelectedStockItem[] = [];

    Object.entries(selectedQuantities).forEach(([productId, rawQty]) => {
      const qty = Number(rawQty) || 0;
      if (qty > 0) {
        const product = products.find((p) => p.id === productId);
        if (product) {
          itemsToAdd.push({
            name: product.name,
            unitPrice: product.sellingPrice || 0,
            quantity: qty,
            inventoryProductId: product.id,
            itemId: product.itemId,
          });
        }
      }
    });

    if (itemsToAdd.length > 0) {
      onSelectMultipleProducts(itemsToAdd);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Choose from Stock
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {products.length} Products
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select products from inventory to add to this {documentType}
              </p>
            </div>
          </div>

          <button
            id="btn-close-stock-picker"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-2.5 bg-white dark:bg-slate-900">
          {/* Search Input & Camera Scanner Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-stock-modal"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product name, item code (#001), size..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              id="btn-scan-barcode-stock-picker"
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-2xs"
              title="Scan item barcode with camera"
            >
              <Scan className="w-4 h-4" />
              <span className="hidden sm:inline">Scan</span>
            </button>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setStockFilter('all');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition ${
                selectedCategory === 'all' && stockFilter === 'all'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({products.length})
            </button>

            <button
              type="button"
              onClick={() => setStockFilter((prev) => (prev === 'inStock' ? 'all' : 'inStock'))}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition flex items-center gap-1 ${
                stockFilter === 'inStock'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>In Stock</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setSelectedCategory((prev) => (prev === cat.id ? 'all' : cat.id))
                }
                className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Tag className="w-3 h-3 text-sky-500" />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PRODUCTS LIST */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[55vh]">
          {filteredProducts.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {products.length === 0 ? 'No products in inventory yet' : 'No matching products found'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {products.length === 0
                    ? 'Add products to your Stock Inventory first to pick them instantly when creating receipts or invoices.'
                    : 'Try searching with a different product name or clear your filters.'}
                </p>
              </div>
              {products.length === 0 && (
                <div className="pt-2">
                  <span className="text-xs text-slate-400">
                    You can still type your item details manually on the screen.
                  </span>
                </div>
              )}
            </div>
          ) : (
            filteredProducts.map((product) => {
              const qty = selectedQuantities[product.id] || 1;
              const isOutOfStock = product.quantity <= 0;
              const isLowStock = product.quantity > 0 && product.quantity < 5;
              const category = product.categoryId ? categoryMap.get(product.categoryId) : undefined;

              return (
                <div
                  key={product.id}
                  id={`stock-picker-item-${product.id}`}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60"
                >
                  {/* Left: Image / Avatar + Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail or fallback icon */}
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>

                    {/* Information */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {product.itemId && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            #{product.itemId}
                          </span>
                        )}
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {product.name}
                        </h3>
                        {category && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-medium">
                            {category.name}
                          </span>
                        )}
                      </div>

                      {/* Stock indicator and sizes */}
                      <div className="flex items-center gap-2 text-[11px]">
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            isOutOfStock
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLowStock
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-500'
                                : isLowStock
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {isOutOfStock
                            ? 'Out of stock'
                            : `${product.quantity} in stock`}
                        </span>

                        {product.sizes && product.sizes.length > 0 && (
                          <span className="text-slate-400 text-[10px] truncate">
                            Sizes: {product.sizes.join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(product.sellingPrice || 0, currency)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity Stepper & Add Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Stepper */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(product.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition text-xs font-bold"
                        title="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-900 dark:text-white">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(product.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition text-xs font-bold"
                        title="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Single Add Button */}
                    <button
                      id={`btn-select-product-${product.id}`}
                      type="button"
                      onClick={() => handleSingleSelect(product)}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1"
                    >
                      <span>Add</span>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Selected product will be added directly into line items
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        currency={currency}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={({ scannedCode, matchedProduct }) => {
          if (matchedProduct) {
            handleSingleSelect(matchedProduct);
          } else if (scannedCode) {
            setSearchQuery(scannedCode);
          }
        }}
      />
    </div>
  );
};
