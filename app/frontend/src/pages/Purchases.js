import React, { useEffect, useState } from 'react';
import { purchasesAPI, productsAPI, suppliersAPI } from '../services/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import ExportActions from '../components/ExportActions';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_price: 0 }]);
  const [supplierId, setSupplierId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');
  const [orderNumber, setOrderNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    loadPurchases();
    loadProducts();
    loadSuppliers();
  }, []);

  const loadPurchases = async () => {
    try {
      const { data } = await purchasesAPI.getAll();
      setPurchases(data);
    } catch (error) {
      toast.error('Erro ao carregar compras');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await productsAPI.getAll();
      setProducts(data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data } = await suppliersAPI.getAll();
      setSuppliers(data);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const purchaseData = {
        supplier_id: supplierId ? parseInt(supplierId) : null,
        items: items.filter(item => item.product_id).map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price)
        })),
        discount: parseFloat(discount) || 0,
        payment_method: paymentMethod,
        order_number: orderNumber || null,
        invoice_number: invoiceNumber || null
      };
      await purchasesAPI.create(purchaseData);
      toast.success('Compra registrada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      loadPurchases();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar compra');
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const resetForm = () => {
    setItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    setSupplierId('');
    setDiscount(0);
    setPaymentMethod('DINHEIRO');
    setOrderNumber('');
    setInvoiceNumber('');
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    return Math.max(0, subtotal - discount);
  };

  const getSupplierName = (supplierIdValue) => {
    if (!supplierIdValue) return '-';
    const supplier = suppliers.find((item) => item.id === supplierIdValue);
    return supplier ? supplier.name : `Fornecedor #${supplierIdValue}`;
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="purchases-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Compras</h1>
          <p className="text-sm text-stone-500 mt-1">Registre compras e atualize estoque</p>
        </div>
        <div className="flex items-center gap-2">
        <ExportActions
          title="Relatorio de Compras"
          filename="compras"
          rows={purchases}
          columns={[
            { header: 'Compra', accessor: (row) => `#${row.id}` },
            { header: 'Data', accessor: (row) => new Date(row.created_at).toLocaleDateString('pt-BR') },
            { header: 'Fornecedor', accessor: (row) => getSupplierName(row.supplier_id) },
            { header: 'Pedido', accessor: (row) => row.order_number || '-' },
            { header: 'NF Entrada', accessor: (row) => row.invoice_number || '-' },
            { header: 'Pagamento', accessor: (row) => row.payment_method || '-' },
            { header: 'Desconto', accessor: (row) => `R$ ${Number(row.discount || 0).toFixed(2)}` },
            { header: 'Total', accessor: (row) => `R$ ${Number(row.total || 0).toFixed(2)}` },
          ]}
        />
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" data-testid="add-purchase-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nova Compra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Compra</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="purchase-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order_number">Numero do Pedido</Label>
                  <Input
                    id="order_number"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Ex: PC-001"
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_number">NF de Entrada</Label>
                  <Input
                    id="invoice_number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ex: NF-12345"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger data-testid="purchase-supplier">
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>{supplier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment">Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger data-testid="purchase-payment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                      <SelectItem value="BOLETO">Boleto</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border border-stone-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-stone-900">Itens da Compra</h3>
                  <Button type="button" size="sm" onClick={addItem} variant="outline">
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label>Produto</Label>
                        <Select 
                          value={item.product_id.toString()} 
                          onValueChange={(value) => updateItem(index, 'product_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label>Qtd.</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="w-32">
                        <Label>Preço Unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        />
                      </div>
                      <div className="w-32">
                        <Label>Subtotal</Label>
                        <Input
                          value={(item.quantity * item.unit_price).toFixed(2)}
                          disabled
                        />
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeItem(index)}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-stone-200 pt-4">
                <div className="flex gap-4">
                  <div>
                    <Label htmlFor="discount">Desconto (R$)</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-32"
                      data-testid="purchase-discount"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-stone-500">
                    Subtotal: R$ {items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                  </p>
                  {discount > 0 && (
                    <p className="text-sm text-red-600">
                      Desconto: -R$ {Number(discount || 0).toFixed(2)}
                    </p>
                  )}
                  <p className="text-lg font-semibold text-stone-900">
                    Total: R$ {calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800" data-testid="submit-purchase">
                  Finalizar Compra
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="purchases-table">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Data</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Fornecedor</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Pedido/NF</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Total</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Desconto</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Pagamento</th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-stone-700">#{purchase.id}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">
                    {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-700">{purchase.supplier_id || '-'}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">
                    <div>{purchase.order_number || '-'}</div>
                    <div className="text-xs text-stone-500">{purchase.invoice_number || '-'}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-stone-900">
                    R$ {purchase.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-stone-700">
                    {purchase.discount > 0 ? `R$ ${Number(purchase.discount || 0).toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-700">{purchase.payment_method || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      {purchase.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
