import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { productService, Product } from '@/services/productService';
import { toast } from 'sonner';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: string[];
}

interface ParsedProduct {
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  sku: string;
  description?: string;
  valid: boolean;
  error?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['name', 'category', 'cost_price', 'selling_price', 'stock', 'sku'];
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      const products: ParsedProduct[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length !== headers.length) {
          products.push({
            name: values[headers.indexOf('name')] || `Row ${i}`,
            category: '',
            costPrice: 0,
            sellingPrice: 0,
            stock: 0,
            sku: '',
            valid: false,
            error: 'Invalid number of columns',
          });
          continue;
        }

        const name = values[headers.indexOf('name')]?.trim();
        const category = values[headers.indexOf('category')]?.trim();
        const costPrice = parseFloat(values[headers.indexOf('cost_price')]);
        const sellingPrice = parseFloat(values[headers.indexOf('selling_price')]);
        const stock = parseInt(values[headers.indexOf('stock')]);
        const sku = values[headers.indexOf('sku')]?.trim();
        const descIndex = headers.indexOf('description');
        const description = descIndex >= 0 ? values[descIndex]?.trim() : undefined;

        const errors: string[] = [];
        if (!name) errors.push('Name required');
        if (!category) errors.push('Category required');
        if (isNaN(costPrice) || costPrice < 0) errors.push('Invalid cost price');
        if (isNaN(sellingPrice) || sellingPrice < 0) errors.push('Invalid selling price');
        if (isNaN(stock) || stock < 0) errors.push('Invalid stock');
        if (!sku) errors.push('SKU required');

        products.push({
          name: name || '',
          category: category || '',
          costPrice: isNaN(costPrice) ? 0 : costPrice,
          sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
          stock: isNaN(stock) ? 0 : stock,
          sku: sku || '',
          description,
          valid: errors.length === 0,
          error: errors.length > 0 ? errors.join(', ') : undefined,
        });
      }

      setParsedProducts(products);
    };
    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  };

  const handleImport = async () => {
    const validProducts = parsedProducts.filter(p => p.valid);
    
    if (validProducts.length === 0) {
      toast.error('No valid products to import');
      return;
    }

    setImporting(true);
    try {
      const result = await productService.bulkImport(validProducts);
      setImportResult({ success: result.success, failed: result.failed });
      
      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} products`);
        onSuccess();
      }
      
      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} products`);
      }
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `name,category,cost_price,selling_price,stock,sku,description
"Sample Product","${categories[0] || 'Groceries'}",100,150,50,SKU001,"Optional description"
"Another Product","${categories[1] || 'Dairy'}",80,120,30,SKU002,""`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setParsedProducts([]);
    setImportResult(null);
    onClose();
  };

  if (!isOpen) return null;

  const validCount = parsedProducts.filter(p => p.valid).length;
  const invalidCount = parsedProducts.filter(p => !p.valid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={handleClose} />
      
      <div className="relative bg-card rounded-xl shadow-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Bulk Import Products</h3>
          <button onClick={handleClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {!file ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={handleDownloadTemplate}
                className="btn-secondary w-full"
              >
                <Download className="w-4 h-4" />
                Download CSV Template
              </button>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">CSV Format Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Required columns: name, category, cost_price, selling_price, stock, sku</li>
                  <li>• Optional column: description</li>
                  <li>• First row must be header row</li>
                  <li>• Use quotes for values containing commas</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedProducts.length} products found
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-foreground">{validCount} valid</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-danger" />
                    <span className="text-foreground">{invalidCount} invalid</span>
                  </div>
                )}
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-left font-medium">Category</th>
                        <th className="px-3 py-2 text-left font-medium">SKU</th>
                        <th className="px-3 py-2 text-right font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedProducts.map((product, index) => (
                        <tr key={index} className={product.valid ? '' : 'bg-danger/5'}>
                          <td className="px-3 py-2">
                            {product.valid ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : (
                              <div className="group relative">
                                <AlertCircle className="w-4 h-4 text-danger" />
                                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-foreground text-card text-xs p-2 rounded max-w-xs whitespace-normal z-10">
                                  {product.error}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 truncate max-w-[150px]">{product.name}</td>
                          <td className="px-3 py-2">{product.category}</td>
                          <td className="px-3 py-2">{product.sku}</td>
                          <td className="px-3 py-2 text-right">₹{product.sellingPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {importResult && (
                <div className="p-4 bg-success/10 rounded-lg">
                  <p className="text-success font-medium">
                    Import completed: {importResult.success} succeeded, {importResult.failed} failed
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-3">
          <button onClick={handleClose} className="btn-secondary flex-1">
            {importResult ? 'Close' : 'Cancel'}
          </button>
          {file && !importResult && (
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="btn-primary flex-1"
            >
              {importing ? 'Importing...' : `Import ${validCount} Products`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
