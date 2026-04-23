import React, { useEffect, useState } from 'react';
import { stockAPI, productsAPI } from '../services/api';
import { AlertTriangle, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function Stock() {
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'ENTRADA',
    quantity: 1,
    reason: ''
  });

  useEffect(() => {
    loadStock();
    loadMovements();
    loadProducts();
  }, []);

  const loadStock = async () => {
    try {
      const { data } = await stockAPI.getAll();
      setStock(data);
    } catch (error) {
      toast.error('Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const { data } = await stockAPI.getMovements();
      setMovements(data);
    } catch (error) {
      toast.error('Erro ao carregar movimentações');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await stockAPI.createMovement({
        ...formData,
        product_id: parseInt(formData.product_id),
        quantity: parseInt(formData.quantity)
      });
      toast.success('Movimentação registrada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      loadStock();
      loadMovements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar movimentação');
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      movement_type: 'ENTRADA',
      quantity: 1,
      reason: ''
    });
  };

  const lowStockItems = stock.filter(item => item.stock <= item.min_stock);

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="stock-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Estoque</h1>
          <p className="text-sm text-stone-500 mt-1">Controle de estoque e movimentações</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" data-testid="add-movement-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="movement-form">
              <div>
                <Label htmlFor="product">Produto</Label>
                <Select value={formData.product_id.toString()} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                  <SelectTrigger data-testid="movement-product">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} (Estoque: {product.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Tipo de Movimentação</Label>
                <Select value={formData.movement_type} onValueChange={(value) => setFormData({ ...formData, movement_type: value })}>
                  <SelectTrigger data-testid="movement-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada</SelectItem>
                    <SelectItem value="SAIDA">Saída</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  data-testid="movement-quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="reason">Motivo</Label>
                <Textarea
                  id="reason"
                  data-testid="movement-reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800" data-testid="submit-movement">
                  Registrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="low-stock-alert">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Atenção: Produtos com estoque baixo</h3>
              <p className="text-sm text-red-700 mt-1">
                {lowStockItems.length} produto(s) estão abaixo do estoque mínimo
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stock" data-testid="tab-stock">Estoque Atual</TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="stock-table">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Produto</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">SKU</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Categoria</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Estoque</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Mínimo</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Margem (%)</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item) => {
                    const margin = item.profit_margin || 0;
                    let marginColorClass, marginLabel;
                    if (margin >= 30) {
                      marginColorClass = 'bg-emerald-100 text-emerald-800';
                      marginLabel = 'Ótima';
                    } else if (margin >= 10) {
                      marginColorClass = 'bg-amber-100 text-amber-800';
                      marginLabel = 'Boa';
                    } else {
                      marginColorClass = 'bg-red-100 text-red-800';
                      marginLabel = 'Ruim';
                    }
                    return (
                      <tr key={item.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-stone-900">{item.name}</td>
                        <td className="py-3 px-4 text-sm text-stone-700">{item.sku}</td>
                        <td className="py-3 px-4 text-sm text-stone-700">{item.category || '-'}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          <span className={item.stock <= item.min_stock ? 'text-red-600' : 'text-stone-900'}>
                            {item.stock} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-stone-700">{item.min_stock} {item.unit}</td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${marginColorClass}`}>
                            {margin.toFixed(1)}% {marginLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.stock <= item.min_stock ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Baixo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="movements">
          <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="movements-table">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Data</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Produto</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Tipo</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Quantidade</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-stone-700">
                        {new Date(movement.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-stone-700">ID: {movement.product_id}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          movement.movement_type === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' :
                          movement.movement_type === 'SAIDA' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {movement.movement_type === 'ENTRADA' && <TrendingUp className="w-3 h-3" />}
                          {movement.movement_type === 'SAIDA' && <TrendingDown className="w-3 h-3" />}
                          {movement.movement_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-stone-900">
                        {movement.quantity}
                      </td>
                      <td className="py-3 px-4 text-sm text-stone-700">{movement.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
