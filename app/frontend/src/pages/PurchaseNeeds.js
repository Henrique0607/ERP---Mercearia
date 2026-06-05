import React, { useEffect, useState } from 'react';
import { purchasesAPI, suppliersAPI } from '../services/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import ExportActions from '../components/ExportActions';
import {
  AlertTriangle,
  Calendar,
  Package,
  RefreshCw,
  ShoppingCart,
  Trash2,
  TrendingDown,
} from 'lucide-react';

export default function PurchaseNeeds() {
  const [reportData, setReportData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');
  const [orderNumber, setOrderNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadPurchaseNeedsReport(false), loadSuppliers()]);
    setLoading(false);
  };

  const loadPurchaseNeedsReport = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const { data } = await purchasesAPI.getPurchaseNeedsReport();
      setReportData(data);
      if (isRefresh) {
        toast.success('Relatorio atualizado com sucesso');
      }
      return data;
    } catch (error) {
      toast.error('Erro ao carregar relatorio de necessidade de compra');
      console.error('Erro:', error);
      return [];
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
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

  const openPurchaseForm = () => {
    if (reportData.length === 0) {
      toast.info('Nao existem produtos com necessidade de compra no momento');
      return;
    }

    setPurchaseItems(
      reportData.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.suggested_quantity,
        unit_price: '',
      }))
    );
    setSupplierId('');
    setDiscount(0);
    setPaymentMethod('DINHEIRO');
    setOrderNumber('');
    setInvoiceNumber('');
    setPurchaseDialogOpen(true);
  };

  const updatePurchaseItem = (index, field, value) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index][field] = value;
    setPurchaseItems(updatedItems);
  };

  const removePurchaseItem = (index) => {
    setPurchaseItems(purchaseItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const calculateSubtotal = () => {
    return purchaseItems.reduce((sum, item) => {
      const quantity = parseInt(item.quantity, 10) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      return sum + quantity * unitPrice;
    }, 0);
  };

  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() - (parseFloat(discount) || 0));
  };

  const handlePurchaseSubmit = async (event) => {
    event.preventDefault();

    const items = purchaseItems
      .map((item) => ({
        product_id: item.product_id,
        quantity: parseInt(item.quantity, 10),
        unit_price: parseFloat(item.unit_price),
      }))
      .filter((item) => item.quantity > 0 && item.unit_price > 0);

    if (items.length === 0) {
      toast.error('Informe quantidade e preco unitario para pelo menos um produto');
      return;
    }

    const parsedDiscount = parseFloat(discount) || 0;
    if (parsedDiscount > calculateSubtotal()) {
      toast.error('Desconto nao pode ser maior que o subtotal');
      return;
    }

    setSubmittingPurchase(true);
    try {
      await purchasesAPI.create({
        supplier_id: supplierId ? parseInt(supplierId, 10) : null,
        items,
        discount: parsedDiscount,
        payment_method: paymentMethod,
        order_number: orderNumber || null,
        invoice_number: invoiceNumber || null,
      });

      toast.success('Compra registrada e despesa lancada na contabilidade');
      setPurchaseDialogOpen(false);
      await loadPurchaseNeedsReport(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar compra');
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return <AlertTriangle className="w-4 h-4" />;
      case 'HIGH':
        return <TrendingDown className="w-4 h-4" />;
      case 'MEDIUM':
        return <Package className="w-4 h-4" />;
      case 'LOW':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStats = () => {
    const critical = reportData.filter((item) => item.priority === 'CRITICAL').length;
    const high = reportData.filter((item) => item.priority === 'HIGH').length;
    const totalSuggested = reportData.reduce((sum, item) => sum + item.suggested_quantity, 0);

    return { critical, high, totalItems: reportData.length, totalSuggested };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando relatorio...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatorio de Necessidade de Compra</h1>
          <p className="text-muted-foreground">
            Produtos que precisam ser comprados com base no estoque minimo e nas vendas
          </p>
        </div>
        <div className="flex gap-2">
          <ExportActions
            title="Relatorio de Necessidade de Compra"
            filename="necessidade_compra"
            rows={reportData}
            columns={[
              { header: 'SKU', accessor: 'sku' },
              { header: 'Produto', accessor: 'product_name' },
              { header: 'Estoque Atual', accessor: 'current_stock' },
              { header: 'Estoque Minimo', accessor: 'min_stock' },
              { header: 'Sugestao Compra', accessor: 'suggested_quantity' },
              { header: 'Prioridade', accessor: 'priority' },
            ]}
          />
          <Button onClick={() => loadPurchaseNeedsReport(true)} variant="outline" disabled={refreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {refreshing ? 'Atualizando...' : 'Recarregar'}
          </Button>
          <Button onClick={openPurchaseForm} disabled={refreshing || reportData.length === 0}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Atualizar Compra
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Criticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Estoque zerado ou muito baixo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Prioridade</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.high}</div>
            <p className="text-xs text-muted-foreground">Abaixo do minimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Produtos para comprar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantidade Sugerida</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuggested}</div>
            <p className="text-xs text-muted-foreground">Unidades totais</p>
          </CardContent>
        </Card>
      </div>

      <Card className="relative">
        <CardHeader>
          <CardTitle>Produtos que Necessitam Compra</CardTitle>
        </CardHeader>
        <CardContent>
          {refreshing && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
              <div className="text-lg font-medium text-muted-foreground">Atualizando...</div>
            </div>
          )}
          {reportData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum produto precisa de compra no momento.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Estoque Atual</TableHead>
                  <TableHead>Estoque Minimo</TableHead>
                  <TableHead>Vendas Diarias</TableHead>
                  <TableHead>Quantidade Sugerida</TableHead>
                  <TableHead>Ultima Compra</TableHead>
                  <TableHead>Prioridade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>
                      <span className={item.current_stock < item.min_stock ? 'text-red-600 font-semibold' : ''}>
                        {item.current_stock}
                      </span>
                    </TableCell>
                    <TableCell>{item.min_stock}</TableCell>
                    <TableCell>{item.average_daily_sales}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {item.suggested_quantity}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(item.last_purchase_date)}</div>
                        {item.days_since_last_purchase && (
                          <div className="text-muted-foreground">
                            {item.days_since_last_purchase} dias atras
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getPriorityColor(item.priority)} text-white flex items-center gap-1`}>
                        {getPriorityIcon(item.priority)}
                        {item.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Compra por Necessidade</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePurchaseSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Numero do Pedido</Label>
                <Input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="Ex: PC-001" />
              </div>
              <div>
                <Label>NF de Entrada</Label>
                <Input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="Ex: NF-12345" />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Desconto (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </div>
            </div>

            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-28">Qtd.</TableHead>
                    <TableHead className="w-36">Preco Unit.</TableHead>
                    <TableHead className="w-36 text-right">Subtotal</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseItems.map((item, index) => {
                    const itemSubtotal = (parseInt(item.quantity, 10) || 0) * (parseFloat(item.unit_price) || 0);

                    return (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground">{item.sku}</div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(event) => updatePurchaseItem(index, 'quantity', event.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={item.unit_price}
                            onChange={(event) => updatePurchaseItem(index, 'unit_price', event.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {itemSubtotal.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removePurchaseItem(index)}
                            disabled={purchaseItems.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-stone-200 pt-4">
              <p className="text-sm text-muted-foreground">
                Ao finalizar, o estoque sera atualizado e uma despesa de compra sera lancada automaticamente.
              </p>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal: R$ {calculateSubtotal().toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Desconto: R$ {(parseFloat(discount) || 0).toFixed(2)}</p>
                <p className="text-xl font-semibold">Total: R$ {calculateTotal().toFixed(2)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingPurchase || purchaseItems.length === 0}>
                {submittingPurchase ? 'Finalizando...' : 'Finalizar Compra'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
