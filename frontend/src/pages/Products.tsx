import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, Upload, Loader2, Clock, Settings } from 'lucide-react';
import { productService, Product, getStockStatus, CategoryGst } from '@/services/productService';
import { ProductModal } from '@/components/ProductModal';
import { BulkImportModal } from '@/components/BulkImportModal';
import { toast } from 'sonner';

const isExpired = (expiryDate?: string | null): boolean => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
};

const isExpiringSoon = (expiryDate?: string | null): boolean => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
};

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesGst, setCategoriesGst] = useState<CategoryGst[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [gstModalOpen, setGstModalOpen] = useState(false);
  const [gstLoading, setGstLoading] = useState(false);
  const [editingGst, setEditingGst] = useState<{ name: string; gstRate: number } | null>(null);
  const [gstSaving, setGstSaving] = useState(false);
  
  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      searchRef.current?.focus();
      return;
    }

    if (document.activeElement === searchRef.current) {
      if (e.key === 'Escape') {
        searchRef.current?.blur();
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < filteredProducts.length) {
          handleEditProduct(filteredProducts[focusedIndex]);
        }
        break;
      case 'Delete':
        if (focusedIndex >= 0 && focusedIndex < filteredProducts.length) {
          handleDeleteProduct(filteredProducts[focusedIndex].id);
        }
        break;
      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSelectAll();
        }
        break;
    }
  }, [focusedIndex, filteredProducts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  const fetchProducts = async () => {
    try {
      const [productsData, categoriesGstData] = await Promise.all([
        productService.getAll(),
        productService.getCategoriesGst(),
      ]);
      setProducts(productsData);
      setCategories(categoriesGstData.map(c => c.name));
      setCategoriesGst(categoriesGstData);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    setFilteredProducts(filtered);
    setSelectedIds(new Set());
  };

  const openGstModal = async () => {
    setGstModalOpen(true);
    setGstLoading(true);
    try {
      const data = await productService.getCategoriesGst();
      setCategoriesGst(data);
    } catch (error) {
      toast.error('Failed to load GST data');
    } finally {
      setGstLoading(false);
    }
  };

  const handleSaveGst = async () => {
    if (!editingGst) return;
    setGstSaving(true);
    try {
      await productService.updateCategoryGst(editingGst.name, editingGst.gstRate);
      const refreshed = await productService.getCategoriesGst();
      setCategoriesGst(refreshed);
      setCategories(refreshed.map(c => c.name));
      toast.success('GST updated');
      setEditingGst(null);
    } catch (error) {
      toast.error('Failed to update GST');
    } finally {
      setGstSaving(false);
    }
  };

  const getCategoryGstRate = (category: string) => {
    const match = categoriesGst.find(c => c.name === category);
    return match ? match.gstRate : 0;
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productService.delete(id);
      setProducts(products.filter(p => p.id !== id));
      toast.success('Product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'isActive'>) => {
    try {
      if (editingProduct) {
        const updated = await productService.update(editingProduct.id, productData);
        if (updated) {
          setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
          toast.success('Product updated successfully');
        }
      } else {
        const newProduct = await productService.add(productData);
        setProducts([newProduct, ...products]);
        toast.success('Product added successfully');
      }
      setModalOpen(false);
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const promises = Array.from(selectedIds).map(id => productService.delete(id));
      await Promise.all(promises);
      
      setProducts(products.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      toast.success(`${selectedIds.size} products deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete some products');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStockBadge = (stock: number) => {
    const status = getStockStatus(stock);
    if (status === 'out-of-stock') {
      return <span className="badge-danger text-xs">Out</span>;
    }
    if (status === 'low-stock') {
      return <span className="badge-warning text-xs">Low</span>;
    }
    return <span className="badge-success text-xs">OK</span>;
  };

  const getExpiryBadge = (expiryDate?: string | null) => {
    if (!expiryDate) return null;
    if (isExpired(expiryDate)) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-danger/20 text-danger">
          <Clock className="w-3 h-3" /> Expired
        </span>
      );
    }
    if (isExpiringSoon(expiryDate)) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-warning/20 text-warning">
          <Clock className="w-3 h-3" /> Expiring
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground">{products.length} products • Press / to search</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="btn-danger text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setBulkImportOpen(true)} className="btn-secondary text-sm">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={handleAddProduct} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-card p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or SKU..."
              className="form-input pl-10 text-sm"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-input text-sm w-auto"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={openGstModal}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            GST Setup
          </button>
        </div>
      </div>

      {/* Products Table - Desktop */}
      <div className="dashboard-card overflow-hidden p-0">
        <div className="hidden md:block overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th>Product</th>
                <th className="hidden lg:table-cell">Category</th>
                <th className="hidden lg:table-cell">GST</th>
                <th>Price</th>
                <th>Stock</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr 
                  key={product.id}
                  className={`${focusedIndex === index ? 'bg-primary/5' : ''} ${selectedIds.has(product.id) ? 'bg-primary/10' : ''}`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => handleSelectOne(product.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          {getExpiryBadge(product.expiryDate)}
                        </div>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell text-sm">{product.category}</td>
                  <td className="hidden lg:table-cell text-sm">{getCategoryGstRate(product.category)}%</td>
                  <td className="text-sm">₹{product.sellingPrice.toLocaleString()}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {product.stock <= 10 && product.stock > 0 && (
                        <AlertTriangle className="w-3 h-3 text-warning" />
                      )}
                      <span className="text-sm">{product.stock}</span>
                      {getStockBadge(product.stock)}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 hover:bg-danger/10 rounded-lg text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile bulk actions */}
        <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="Select all products"
              checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
              onChange={handleSelectAll}
              className="rounded border-border"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="btn-danger text-xs"
            >
              Delete
            </button>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {filteredProducts.map((product, index) => (
            <div 
              key={product.id}
              className={`p-3 ${selectedIds.has(product.id) ? 'bg-primary/10' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={() => handleSelectOne(product.id)}
                  className="rounded border-border mt-1 flex-shrink-0"
                  aria-label="Select product"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{product.name}</span>
                    {getStockBadge(product.stock)}
                    {getExpiryBadge(product.expiryDate)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{product.sku}</span>
                    <span>•</span>
                    <span>{product.category}</span>
                    <span>•</span>
                    <span>GST {getCategoryGstRate(product.category)}%</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-primary">₹{product.sellingPrice}</span>
                      <span className="text-muted-foreground">Stock: {product.stock}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-1.5 bg-muted rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 bg-danger/10 text-danger rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No products found
          </div>
        )}
      </div>

      {/* GST Setup Modal */}
      {gstModalOpen && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">GST Setup</h3>
                <p className="text-sm text-muted-foreground">Edit GST % per category</p>
              </div>
              <button
                onClick={() => {
                  setGstModalOpen(false);
                  setEditingGst(null);
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              {gstLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
                </div>
              ) : categoriesGst.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No categories found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>GST %</th>
                        <th>Products</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoriesGst.map((cat) => {
                        const isEditing = editingGst?.name === cat.name;
                        return (
                          <tr key={cat.name}>
                            <td className="text-sm font-medium">{cat.name}</td>
                            <td className="text-sm">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={28}
                                  step={0.1}
                                  value={editingGst?.gstRate ?? cat.gstRate}
                                  onChange={(e) => setEditingGst({ name: cat.name, gstRate: Number(e.target.value) })}
                                  className="form-input w-24"
                                />
                              ) : (
                                <span>{cat.gstRate}%</span>
                              )}
                            </td>
                            <td className="text-sm text-muted-foreground">{cat.productCount}</td>
                            <td className="text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingGst(null)}
                                    className="btn-secondary text-xs"
                                    disabled={gstSaving}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveGst}
                                    className="btn-primary text-xs"
                                    disabled={gstSaving}
                                  >
                                    {gstSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingGst({ name: cat.name, gstRate: cat.gstRate })}
                                  className="btn-secondary text-xs"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Products</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete {selectedIds.size} product(s)? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn-danger"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
        categories={categories}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={fetchProducts}
        categories={categories}
      />
    </div>
  );
};

export default Products;
