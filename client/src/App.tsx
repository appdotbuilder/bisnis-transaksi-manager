
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Minus, ShoppingCart, FileText, Users, Building, Calculator, Trash2, Edit3, Search } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  StoreProfile, 
  CreateStoreProfileInput, 
  UpdateStoreProfileInput,
  Product, 
  CreateProductInput, 
  UpdateProductInput,
  Customer, 
  CreateCustomerInput,
  CreateTransactionInput,
  TransactionWithItems
} from '../../server/src/schema';
import type { TaxCalculation, TaxCalculationInput } from '../../server/src/handlers/calculate_taxes';

interface TransactionItem {
  product_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

function App() {
  // State for different entities
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('store');
  
  // Store Profile Form
  const [storeForm, setStoreForm] = useState<CreateStoreProfileInput>({
    store_name: '',
    address: '',
    phone: '',
    email: '',
    npwp: '',
    logo_url: null
  });

  // Product Form
  const [productForm, setProductForm] = useState<CreateProductInput>({
    product_code: '',
    product_name: '',
    product_type: 'BARANG',
    price: 0
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Customer Form
  const [customerForm, setCustomerForm] = useState<CreateCustomerInput>({
    institution_name: '',
    address: '',
    contact_person: '',
    phone: '',
    npwp: null
  });

  // Transaction Form
  const [transactionForm, setTransactionForm] = useState<{
    customer_id: number | null;
    transaction_date: string;
    total_discount: number;
    ppn_enabled: boolean;
    pph22_enabled: boolean;
    pph23_enabled: boolean;
    service_value: number | null;
    service_type: string | null;
    regional_tax_enabled: boolean;
    payment_method: 'TUNAI' | 'NON_TUNAI';
    items: TransactionItem[];
  }>({
    customer_id: null,
    transaction_date: new Date().toISOString().split('T')[0],
    total_discount: 0,
    ppn_enabled: true,
    pph22_enabled: false,
    pph23_enabled: false,
    service_value: null,
    service_type: null,
    regional_tax_enabled: false,
    payment_method: 'TUNAI',
    items: []
  });

  // Search and filter states
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');

  // Load data functions
  const loadStoreProfile = useCallback(async () => {
    try {
      const profile = await trpc.getStoreProfile.query();
      setStoreProfile(profile);
      if (profile) {
        setStoreForm({
          store_name: profile.store_name,
          address: profile.address,
          phone: profile.phone,
          email: profile.email,
          npwp: profile.npwp,
          logo_url: profile.logo_url
        });
      }
    } catch (error) {
      console.error('Failed to load store profile:', error);
      toast.error('Gagal memuat profil toko');
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Gagal memuat produk');
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await trpc.getCustomers.query();
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Gagal memuat pelanggan');
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const result = await trpc.getTransactions.query({ limit: 50 });
      setTransactions(result.transactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Gagal memuat transaksi');
    }
  }, []);

  const calculateTaxes = useCallback(async () => {
    if (transactionForm.items.length === 0) {
      setTaxCalculation(null);
      return;
    }

    const taxInput: TaxCalculationInput = {
      items: transactionForm.items.map(item => ({
        quantity: item.quantity,
        unitPrice: item.unit_price,
        discount: item.discount
      })),
      totalDiscount: transactionForm.total_discount,
      ppnEnabled: transactionForm.ppn_enabled,
      pph22Enabled: transactionForm.pph22_enabled,
      pph23Enabled: transactionForm.pph23_enabled,
      serviceValue: transactionForm.service_value || undefined,
      regionalTaxEnabled: transactionForm.regional_tax_enabled
    };

    try {
      const result = await trpc.calculateTaxes.query(taxInput);
      setTaxCalculation(result);
    } catch (error) {
      console.error('Failed to calculate taxes:', error);
      toast.error('Gagal menghitung pajak');
    }
  }, [transactionForm]);

  // Load data on mount
  useEffect(() => {
    loadStoreProfile();
    loadProducts();
    loadCustomers();
    loadTransactions();
  }, [loadStoreProfile, loadProducts, loadCustomers, loadTransactions]);

  // Recalculate taxes when transaction form changes
  useEffect(() => {
    calculateTaxes();
  }, [calculateTaxes]);

  // Handler functions
  const handleStoreProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (storeProfile) {
        const updateData: UpdateStoreProfileInput = {
          id: storeProfile.id,
          ...storeForm
        };
        await trpc.updateStoreProfile.mutate(updateData);
        toast.success('Profil toko berhasil diperbarui');
      } else {
        await trpc.createStoreProfile.mutate(storeForm);
        toast.success('Profil toko berhasil dibuat');
      }
      await loadStoreProfile();
    } catch (error) {
      console.error('Store profile error:', error);
      toast.error('Gagal menyimpan profil toko');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingProduct) {
        const updateData: UpdateProductInput = {
          id: editingProduct.id,
          ...productForm
        };
        await trpc.updateProduct.mutate(updateData);
        toast.success('Produk berhasil diperbarui');
        setEditingProduct(null);
      } else {
        await trpc.createProduct.mutate(productForm);
        toast.success('Produk berhasil ditambahkan');
      }
      setProductForm({
        product_code: '',
        product_name: '',
        product_type: 'BARANG',
        price: 0
      });
      await loadProducts();
    } catch (error) {
      console.error('Product error:', error);
      toast.error('Gagal menyimpan produk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createCustomer.mutate(customerForm);
      toast.success('Pelanggan berhasil ditambahkan');
      setCustomerForm({
        institution_name: '',
        address: '',
        contact_person: '',
        phone: '',
        npwp: null
      });
      await loadCustomers();
    } catch (error) {
      console.error('Customer error:', error);
      toast.error('Gagal menyimpan pelanggan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.customer_id || transactionForm.items.length === 0) {
      toast.error('Pilih pelanggan dan tambahkan minimal satu item');
      return;
    }

    setIsLoading(true);
    try {
      const transactionData: CreateTransactionInput = {
        customer_id: transactionForm.customer_id,
        transaction_date: new Date(transactionForm.transaction_date),
        total_discount: transactionForm.total_discount,
        ppn_enabled: transactionForm.ppn_enabled,
        pph22_enabled: transactionForm.pph22_enabled,
        pph23_enabled: transactionForm.pph23_enabled,
        service_value: transactionForm.service_value,
        service_type: transactionForm.service_type,
        regional_tax_enabled: transactionForm.regional_tax_enabled,
        payment_method: transactionForm.payment_method,
        items: transactionForm.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount
        }))
      };

      await trpc.createTransaction.mutate(transactionData);
      toast.success('Transaksi berhasil disimpan');
      
      // Reset form
      setTransactionForm({
        customer_id: null,
        transaction_date: new Date().toISOString().split('T')[0],
        total_discount: 0,
        ppn_enabled: true,
        pph22_enabled: false,
        pph23_enabled: false,
        service_value: null,
        service_type: null,
        regional_tax_enabled: false,
        payment_method: 'TUNAI',
        items: []
      });
      
      await loadTransactions();
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error('Gagal menyimpan transaksi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await trpc.deleteProduct.mutate({ id });
      toast.success('Produk berhasil dihapus');
      await loadProducts();
    } catch (error) {
      console.error('Delete product error:', error);
      toast.error('Gagal menghapus produk');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      product_code: product.product_code,
      product_name: product.product_name,
      product_type: product.product_type,
      price: product.price
    });
  };

  const addTransactionItem = () => {
    const newItem: TransactionItem = {
      product_id: 0,
      product_code: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
      subtotal: 0
    };
    setTransactionForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeTransactionItem = (index: number) => {
    setTransactionForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateTransactionItem = (index: number, field: keyof TransactionItem, value: string | number) => {
    setTransactionForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-fill product details when code is entered
          if (field === 'product_code' && typeof value === 'string') {
            const product = products.find(p => p.product_code === value);
            if (product) {
              updatedItem.product_id = product.id;
              updatedItem.product_name = product.product_name;
              updatedItem.unit_price = product.price;
            }
          }
          
          // Calculate subtotal
          updatedItem.subtotal = (updatedItem.quantity * updatedItem.unit_price) - updatedItem.discount;
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const handleGenerateDocument = async (transactionId: number, documentType: 'SURAT_PEMESANAN' | 'INVOICE' | 'KWITANSI' | 'NOTA_PEMBELIAN' | 'BAST' | 'FAKTUR_PAJAK') => {
    try {
      await trpc.generateDocument.mutate({ 
        transactionId, 
        documentType 
      });
      toast.success(`Dokumen ${documentType} berhasil dibuat`);
    } catch (error) {
      console.error('Generate document error:', error);
      toast.error('Gagal membuat dokumen');
    }
  };

  // Filter functions
  const filteredProducts = products.filter(product =>
    product.product_code.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.product_name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer =>
    customer.institution_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.contact_person.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredTransactions = transactions.filter(transaction =>
    transaction.transaction_id.toLowerCase().includes(transactionSearch.toLowerCase()) ||
    transaction.customer.institution_name.toLowerCase().includes(transactionSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3">
            <Building className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Sistem Manajemen Transaksi Bisnis</h1>
              <p className="text-gray-600">Kelola toko, produk, pelanggan, dan transaksi dengan mudah</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm">
            <TabsTrigger value="store" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>🏪 Profil Toko</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span>📦 Produk</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>👥 Pelanggan</span>
            </TabsTrigger>
            <TabsTrigger value="transaction" className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>💰 Transaksi</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>📋 Riwayat</span>
            </TabsTrigger>
          </TabsList>

          {/* Store Profile Tab */}
          <TabsContent value="store" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Profil Toko</span>
                </CardTitle>
                <CardDescription>
                  Kelola informasi toko yang akan digunakan pada setiap dokumen transaksi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStoreProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="store_name">Nama Toko *</Label>
                      <Input
                        id="store_name"
                        value={storeForm.store_name}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, store_name: e.target.value }))}
                        placeholder="Masukkan nama toko"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={storeForm.email}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@toko.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Alamat *</Label>
                    <Textarea
                      id="address"
                      value={storeForm.address}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Masukkan alamat lengkap toko"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Nomor Telepon *</Label>
                      <Input
                        id="phone"
                        value={storeForm.phone}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="npwp">NPWP *</Label>
                      <Input
                        id="npwp"
                        value={storeForm.npwp}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, npwp: e.target.value }))}
                        placeholder="xx.xxx.xxx.x-xxx.xxx"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_url">URL Logo (Opsional)</Label>
                    <Input
                      id="logo_url"
                      value={storeForm.logo_url || ''}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, logo_url: e.target.value || null }))}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                    {isLoading ? 'Menyimpan...' : storeProfile ? 'Perbarui Profil' : 'Simpan Profil'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProductSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="product_code">Kode Barang *</Label>
                      <Input
                        id="product_code"
                        value={productForm.product_code}
                        onChange={(e) => setProductForm(prev => ({ ...prev, product_code: e.target.value }))}
                        placeholder="BRG001"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="product_name">Nama Barang *</Label>
                      <Input
                        id="product_name"
                        value={productForm.product_name}
                        onChange={(e) => setProductForm(prev => ({ ...prev, product_name: e.target.value }))}
                        placeholder="Masukkan nama produk"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product_type">Jenis *</Label>
                      <Select 
                        value={productForm.product_type} 
                        onValueChange={(value: 'BARANG' | 'JASA') => setProductForm(prev => ({ ...prev, product_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis produk" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BARANG">🏷️ Barang</SelectItem>
                          <SelectItem value="JASA">⚙️ Jasa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Harga *</Label>
                      <Input
                        id="price"
                        type="number"
                        value={productForm.price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit" disabled={isLoading} className="flex-1">
                        {isLoading ? 'Menyimpan...' : editingProduct ? 'Perbarui' : 'Tambah Produk'}
                      </Button>
                      {editingProduct && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setEditingProduct(null);
                            setProductForm({
                              product_code: '',
                              product_name: '',
                              product_type: 'BARANG',
                              price: 0
                            });
                          }}
                        >
                          Batal
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Product List */}
              <Card>
                <CardHeader>
                  <CardTitle>Daftar Produk</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cari produk..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Belum ada produk</p>
                    ) : (
                      filteredProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">{product.product_code}</Badge>
                              <Badge variant={product.product_type === 'BARANG' ? 'default' : 'outline'}>
                                {product.product_type === 'BARANG' ? '🏷️' : '⚙️'} {product.product_type}
                              </Badge>
                            </div>
                            <p className="font-medium">{product.product_name}</p>
                            <p className="text-sm text-green-600 font-semibold">
                              Rp {product.price.toLocaleString('id-ID')}
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Yakin ingin menghapus produk "{product.product_name}"? Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Tambah Pelanggan</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCustomerSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="institution_name">Nama Satuan Pendidikan *</Label>
                      <Input
                        id="institution_name"
                        value={customerForm.institution_name}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, institution_name: e.target.value }))}
                        placeholder="SD Negeri 1 Jakarta"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="customer_address">Alamat Sekolah *</Label>
                      <Textarea
                        id="customer_address"
                        value={customerForm.address}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Masukkan alamat lengkap sekolah"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Kepala Sekolah/Bendahara *</Label>
                      <Input
                        id="contact_person"
                        value={customerForm.contact_person}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, contact_person: e.target.value }))}
                        placeholder="Nama lengkap"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer_phone">Nomor Tele pon *</Label>
                      <Input
                        id="customer_phone"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer_npwp">NPWP Sekolah (Opsional)</Label>
                      <Input
                        id="customer_npwp"
                        value={customerForm.npwp || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, npwp: e.target.value || null }))}
                        placeholder="xx.xxx.xxx.x-xxx.xxx"
                      />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Menyimpan...' : 'Tambah Pelanggan'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Customer List */}
              <Card>
                <CardHeader>
                  <CardTitle>Daftar Pelanggan</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cari pelanggan..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Belum ada pelanggan</p>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <div key={customer.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{customer.institution_name}</h4>
                              <p className="text-xs text-gray-600 mt-1">{customer.address}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className="text-xs">👤 {customer.contact_person}</span>
                                <span className="text-xs">📱 {customer.phone}</span>
                              </div>
                              {customer.npwp && (
                                <p className="text-xs text-green-600 mt-1">NPWP: {customer.npwp}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transaction Tab */}
          <TabsContent value="transaction" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5" />
                  <span>Buat Transaksi Baru</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTransactionSubmit} className="space-y-6">
                  {/* Transaction Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Pelanggan *</Label>
                      <Select 
                        value={transactionForm.customer_id?.toString() || ''} 
                        onValueChange={(value) => setTransactionForm(prev => ({ ...prev, customer_id: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih pelanggan" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.institution_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="transaction_date">Tanggal Transaksi *</Label>
                      <Input
                        id="transaction_date"
                        type="date"
                        value={transactionForm.transaction_date}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Metode Pembayaran *</Label>
                      <Select 
                        value={transactionForm.payment_method} 
                        onValueChange={(value: 'TUNAI' | 'NON_TUNAI') => setTransactionForm(prev => ({ ...prev, payment_method: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih metode pembayaran" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TUNAI">💵 Tunai</SelectItem>
                          <SelectItem value="NON_TUNAI">💳 Non-Tunai</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Transaction Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg">Daftar Barang</Label>
                      <Button type="button" onClick={addTransactionItem} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Item
                      </Button>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kode</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Harga</TableHead>
                            <TableHead>Diskon</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactionForm.items.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-gray-500 py-4">
                                Belum ada item. Klik "Tambah Item" untuk memulai.
                              </TableCell>
                            </TableRow>
                          ) : (
                            transactionForm.items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Input
                                    value={item.product_code}
                                    onChange={(e) => updateTransactionItem(index, 'product_code', e.target.value)}
                                    placeholder="Kode"
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.product_name}
                                    onChange={(e) => updateTransactionItem(index, 'product_name', e.target.value)}
                                    placeholder="Nama barang"
                                    className="min-w-40"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateTransactionItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                    min="1"
                                    className="w-16"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => updateTransactionItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="0.01"
                                    className="w-24"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.discount}
                                    onChange={(e) => updateTransactionItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="0.01"
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">
                                    Rp {item.subtotal.toLocaleString('id-ID')}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeTransactionItem(index)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Tax Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Pengaturan Pajak</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="ppn_enabled"
                            checked={transactionForm.ppn_enabled}
                            onCheckedChange={(checked) => setTransactionForm(prev => ({ ...prev, ppn_enabled: !!checked }))}
                          />
                          <Label htmlFor="ppn_enabled">PPN 11%</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="pph22_enabled"
                            checked={transactionForm.pph22_enabled}
                            onCheckedChange={(checked) => setTransactionForm(prev => ({ ...prev, pph22_enabled: !!checked }))}
                          />
                          <Label htmlFor="pph22_enabled">PPh Pasal 22 (1.5%)</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="pph23_enabled"
                            checked={transactionForm.pph23_enabled}
                            onCheckedChange={(checked) => setTransactionForm(prev => ({ ...prev, pph23_enabled: !!checked }))}
                          />
                          <Label htmlFor="pph23_enabled">PPh Pasal 23 (2% untuk Jasa)</Label>
                        </div>

                        {transactionForm.pph23_enabled && (
                          <div className="space-y-2 ml-6">
                            <Label htmlFor="service_value">Nilai Jasa</Label>
                            <Input
                              id="service_value"
                              type="number"
                              value={transactionForm.service_value || ''}
                              onChange={(e) => setTransactionForm(prev => ({ ...prev, service_value: parseFloat(e.target.value) || null }))}
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                            <Label htmlFor="service_type">Jenis Jasa</Label>
                            <Input
                              id="service_type"
                              value={transactionForm.service_type || ''}
                              onChange={(e) => setTransactionForm(prev => ({ ...prev, service_type: e.target.value || null }))}
                              placeholder="Jenis jasa yang diberikan"
                            />
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="regional_tax_enabled"
                            checked={transactionForm.regional_tax_enabled}
                            onCheckedChange={(checked) => setTransactionForm(prev => ({ ...prev, regional_tax_enabled: !!checked }))}
                          />
                          <Label htmlFor="regional_tax_enabled">Pajak Daerah 10%</Label>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="total_discount">Total Diskon</Label>
                          <Input
                            id="total_discount"
                            type="number"
                            value={transactionForm.total_discount}
                            onChange={(e) => setTransactionForm(prev => ({ ...prev, total_discount: parseFloat(e.target.value) || 0 }))}
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tax Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Ringkasan Pembayaran</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {taxCalculation ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>Rp {taxCalculation.subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            
                            {transactionForm.total_discount > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>Total Diskon:</span>
                                <span>-Rp {taxCalculation.totalDiscount.toLocaleString('id-ID')}</span>
                              </div>
                            )}

                            {transactionForm.ppn_enabled && (
                              <div className="flex justify-between">
                                <span>PPN (11%):</span>
                                <span>Rp {taxCalculation.ppnAmount.toLocaleString('id-ID')}</span>
                              </div>
                            )}

                            {transactionForm.pph22_enabled && (
                              <div className="flex justify-between">
                                <span>PPh 22 (1.5%):</span>
                                <span>Rp {taxCalculation.pph22Amount.toLocaleString('id-ID')}</span>
                              </div>
                            )}

                            {transactionForm.pph23_enabled && (
                              <div className="flex justify-between">
                                <span>PPh 23 (2%):</span>
                                <span>Rp {taxCalculation.pph23Amount.toLocaleString('id-ID')}</span>
                              </div>
                            )}

                            {transactionForm.regional_tax_enabled && (
                              <div className="flex justify-between">
                                <span>Pajak Daerah (10%):</span>
                                <span>Rp {taxCalculation.regionalTaxAmount.toLocaleString('id-ID')}</span>
                              </div>
                            )}

                            {taxCalculation.stampRequired && (
                              <div className="flex justify-between items-center">
                                <span>Materai:</span>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary">⚠️ Diperlukan</Badge>
                                  <span>Rp {taxCalculation.stampAmount.toLocaleString('id-ID')}</span>
                                </div>
                              </div>
                            )}

                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                              <span>Total:</span>
                              <span className="text-green-600">
                                Rp {taxCalculation.totalAmount.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">
                            Tambahkan item untuk melihat kalkulasi
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Menyimpan...' : '💾 Simpan Transaksi'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Riwayat Transaksi</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cari transaksi..."
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                      className="w-64"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredTransactions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Belum ada transaksi</p>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <Card key={transaction.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="secondary">{transaction.transaction_id}</Badge>
                                <Badge variant={transaction.payment_method === 'TUNAI' ? 'default' : 'outline'}>
                                  {transaction.payment_method === 'TUNAI' ? '💵' : '💳'} {transaction.payment_method}
                                </Badge>
                              </div>
                              <h4 className="font-semibold">{transaction.customer.institution_name}</h4>
                              <p className="text-sm text-gray-600">
                                📅 {transaction.transaction_date.toLocaleDateString('id-ID', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">
                                Rp {transaction.total_amount.toLocaleString('id-ID')}
                              </p>
                              {transaction.stamp_required && (
                                <Badge variant="secondary" className="mt-1">
                                  ⚠️ Materai Diperlukan
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Transaction Items */}
                          <div className="border-t pt-4">
                            <h5 className="font-medium mb-2">Item Transaksi:</h5>
                            <div className="space-y-1">
                              {transaction.items.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span>{item.product.product_name} (x{item.quantity})</span>
                                  <span>Rp {item.subtotal.toLocaleString('id-ID')}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tax Details */}
                          <div className="border-t pt-4 mt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {transaction.ppn_enabled && (
                                <div>
                                  <span className="text-gray-500">PPN:</span>
                                  <span className="ml-1">Rp {transaction.ppn_amount.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                              {transaction.pph22_enabled && (
                                <div>
                                  <span className="text-gray-500">PPh 22:</span>
                                  <span className="ml-1">Rp {transaction.pph22_amount.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                              {transaction.pph23_enabled && (
                                <div>
                                  <span className="text-gray-500">PPh 23:</span>
                                  <span className="ml-1">Rp {transaction.pph23_amount.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                              {transaction.regional_tax_enabled && (
                                <div>
                                  <span className="text-gray-500">Pajak Daerah:</span>
                                  <span className="ml-1">Rp {transaction.regional_tax_amount.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Document Generation */}
                          <div className="border-t pt-4 mt-4">
                            <div className="flex flex-wrap gap-2">
                              <h6 className="text-sm font-medium w-full mb-2">Cetak Dokumen:</h6>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleGenerateDocument(transaction.id, 'SURAT_PEMESANAN')}
                              >
                                📄 Surat Pemesanan
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleGenerateDocument(transaction.id, 'INVOICE')}
                              >
                                📋 Invoice
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleGenerateDocument(transaction.id, 'KWITANSI')}
                              >
                                🧾 Kwitansi
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleGenerateDocument(transaction.id, 'NOTA_PEMBELIAN')}
                              >
                                🛒 Nota Pembelian
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleGenerateDocument(transaction.id, 'BAST')}
                              >
                                📦 BAST
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleGenerateDocument(transaction.id, 'FAKTUR_PAJAK')}
                              >
                                💰 Faktur Pajak
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
