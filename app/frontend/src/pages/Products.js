import React, { useEffect, useState } from 'react';
import { productsAPI } from '../services/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import ExportActions from '../components/ExportActions';
import { getCurrentUser } from '../utils/permissions';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    cost_price: 0,
    sale_price: 0,
    stock: 0,
    min_stock: 10,
    category: '',
    unit: 'UN',
  });
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const user = getCurrentUser();
  const canManageProducts = ['ADMIN', 'GERENTE'].includes(user?.role);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const { data } = await productsAPI.getAll();
      setProducts(data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {

      const response =
        await productsAPI.getCategories();

      setCategories(response.data);

    } catch (error) {

      console.error(error);

    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await productsAPI.create(formData);
        toast.success('Produto criado com sucesso!');
      }
      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar produto');
    }
  };

  const handleDelete = (product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await productsAPI.delete(productToDelete.id);
        toast.success('Produto excluído com sucesso!');
        loadProducts();
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Erro ao excluir produto');
      } finally {
        setIsDeleteDialogOpen(false);
        setProductToDelete(null);
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      stock: product.stock,
      min_stock: product.min_stock,
      category: product.category || '',
      unit: product.unit,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      cost_price: 0,
      sale_price: 0,
      stock: 0,
      min_stock: 10,
      category: '',
      unit: 'UN',
    });
  };

  const getMarginBadge = (margin) => {
    let colorClass, label;
    if (margin >= 30) {
      colorClass = 'bg-emerald-100 text-emerald-800';
      label = 'Ótima';
    } else if (margin >= 10) {
      colorClass = 'bg-amber-100 text-amber-800';
      label = 'Boa';
    } else {
      colorClass = 'bg-red-100 text-red-800';
      label = 'Ruim';
    }
    return { colorClass, label };
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="products-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Produtos</h1>
          <p className="text-sm text-stone-500 mt-1">Gerencie o catálogo de produtos</p>
        </div>
        <div className="flex items-center gap-2">
        <ExportActions
          title="Relatorio de Produtos"
          filename="produtos"
          rows={products}
          columns={[
            { header: 'SKU', accessor: 'sku' },
            { header: 'Nome', accessor: 'name' },
            { header: 'Categoria', accessor: (row) => row.category || '-' },
            { header: 'Estoque', accessor: (row) => `${row.stock} ${row.unit || ''}` },
            { header: 'Estoque Minimo', accessor: 'min_stock' },
            { header: 'Preco Custo', accessor: (row) => `R$ ${Number(row.cost_price || 0).toFixed(2)}` },
            { header: 'Preco Venda', accessor: (row) => `R$ ${Number(row.sale_price || 0).toFixed(2)}` },
            { header: 'Margem (%)', accessor: (row) => `${Number(row.profit_margin || 0).toFixed(1)}%` },
          ]}
        />
        {canManageProducts && <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" data-testid="add-product-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="product-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    data-testid="product-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    data-testid="product-sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                    disabled={!!editingProduct}
                  />
                </div>
                <div>
                  <Label htmlFor="cost_price">Preço de Custo</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    data-testid="product-cost-price"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sale_price">Preço de Venda</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    data-testid="product-sale-price"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Estoque</Label>
                  <Input
                    id="stock"
                    type="number"
                    data-testid="product-stock"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="min_stock">Estoque Mínimo</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    data-testid="product-min-stock"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                      
                  <Label htmlFor="category">
                    Categoria
                  </Label>
                      
                  <Input
                    id="category"
                    data-testid="product-category"
                    list="categories-list"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value
                      })
                    }
                  />
                
                  <datalist id="categories-list">
                  
                    {categories.map((category) => (
                    
                      <option
                        key={category}
                        value={category}
                      />
                    
                    ))}
                
                  </datalist>
                  
                </div>
                <div>
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    data-testid="product-unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Margem de Lucro</Label>
                <div className="mt-1 p-3 bg-stone-50 border border-stone-200 rounded-lg text-sm">
                  <strong>{((formData.sale_price - formData.cost_price) / (formData.sale_price || 1) * 100).toFixed(1)}%</strong>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    ((formData.sale_price - formData.cost_price) / (formData.sale_price || 1) * 100) >= 30 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : ((formData.sale_price - formData.cost_price) / (formData.sale_price || 1) * 100) >= 10 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {((formData.sale_price - formData.cost_price) / (formData.sale_price || 1) * 100) >= 30 ? 'Ótima' : ((formData.sale_price - formData.cost_price) / (formData.sale_price || 1) * 100) >= 10 ? 'Boa' : 'Ruim'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Atualiza automaticamente conforme você altera os preços
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800" data-testid="submit-product">
                  {editingProduct ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>}
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p>Tem certeza que deseja excluir o produto "{productToDelete?.name}"?</p>
          <p className="text-sm text-stone-500 mt-2">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="products-table">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">SKU</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Nome</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Categoria</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Estoque</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Preço Custo</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Preço Venda</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Margem (%)</th>
                {canManageProducts && <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const margin = product.profit_margin || 0;
                const { colorClass, label } = getMarginBadge(margin);
                return (
                  <tr key={product.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-stone-700">{product.sku}</td>
                    <td className="py-3 px-4 text-sm font-medium text-stone-900">{product.name}</td>
                    <td className="py-3 px-4 text-sm text-stone-700">{product.category || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={product.stock <= product.min_stock ? 'text-red-600 font-semibold' : 'text-stone-700'}>
                        {product.stock} {product.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-stone-700">R$ {product.cost_price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-stone-900">R$ {product.sale_price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                        {margin.toFixed(1)}% {label}
                      </span>
                    </td>
                    {canManageProducts && <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(product)}
                          data-testid={`edit-product-${product.id}`}
                        >
                          <Pencil className="w-4 h-4 text-stone-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(product)}
                          data-testid={`delete-product-${product.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

