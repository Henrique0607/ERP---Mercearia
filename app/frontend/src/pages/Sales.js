import React, { useEffect, useState } from 'react';
import { salesAPI, productsAPI, customersAPI } from '../services/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_price: 0 }]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    loadSales();
    loadProducts();
    loadCustomers();
  }, []);

  const loadSales = async () => {
    try {
      const { data } = await salesAPI.getAll();
      setSales(data);
    } catch (error) {
      toast.error('Erro ao carregar vendas');
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

  const loadCustomers = async () => {
    try {
      const { data } = await customersAPI.getAll();
      setCustomers(data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const saleData = {
        customer_id: customerId ? parseInt(customerId) : null,
        items: items.filter(item => item.product_id).map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price)
        })),
        payment_method: paymentMethod,
        discount: parseFloat(discount)
      };
      await salesAPI.create(saleData);
      toast.success('Venda registrada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      loadSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar venda');
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
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        newItems[index].unit_price = product.sale_price;
      }
    }
    
    setItems(newItems);
  };

  const resetForm = () => {
    setItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    setCustomerId('');
    setPaymentMethod('DINHEIRO');
    setDiscount(0);
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    return subtotal - discount;
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="sales-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Vendas</h1>
          <p className="text-sm text-stone-500 mt-1">Registre e acompanhe vendas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" data-testid="add-sale-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Venda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="sale-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Cliente (Opcional)</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger data-testid="sale-customer">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
<SelectItem value="none">Sem cliente</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment">Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger data-testid="sale-payment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                      <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                      <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border border-stone-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-stone-900">Itens da Venda</h3>
                  <Button type="button" size="sm" onClick={addItem} variant="outline" data-testid="add-item-btn">
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
                          <SelectTrigger data-testid={`item-product-${index}`}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - R$ {product.sale_price.toFixed(2)}
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
                          data-testid={`item-quantity-${index}`}
                        />
                      </div>
                      <div className="w-32">
                        <Label>Preço Unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          data-testid={`item-price-${index}`}
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
                          data-testid={`remove-item-${index}`}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-stone-200 pt-4">
                <div className="w-48">
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value))}
                    data-testid="sale-discount"
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm text-stone-500">Total da Venda</p>
                  <p className="text-2xl font-heading font-semibold text-emerald-700" data-testid="sale-total">
                    R$ {calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800" data-testid="submit-sale">
                  Finalizar Venda
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="sales-table">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Data</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Cliente</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Total</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Pagamento</th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-stone-700">#{sale.id}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">
                    {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-700">{sale.customer_id || '-'}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-stone-900">
                    R$ {sale.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-700">{sale.payment_method || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      {sale.status}
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
