import React, { useEffect, useState } from 'react';
import { financialAPI } from '../services/api';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

export default function Financial() {
  const [entries, setEntries] = useState([]);
  const [cashflow, setCashflow] = useState({ receitas: 0, despesas: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    entry_type: 'RECEITA',
    amount: 0,
    category: '',
    description: ''
  });

  useEffect(() => {
    loadEntries();
    loadCashflow();
  }, []);

  const loadEntries = async () => {
    try {
      const { data } = await financialAPI.getEntries();
      setEntries(data);
    } catch (error) {
      toast.error('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  };

  const loadCashflow = async () => {
    try {
      const { data } = await financialAPI.getCashflow();
      setCashflow(data);
    } catch (error) {
      toast.error('Erro ao carregar fluxo de caixa');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await financialAPI.createEntry({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success('Lançamento criado com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      loadEntries();
      loadCashflow();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar lançamento');
    }
  };

  const resetForm = () => {
    setFormData({
      entry_type: 'RECEITA',
      amount: 0,
      category: '',
      description: ''
    });
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="financial-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Financeiro</h1>
          <p className="text-sm text-stone-500 mt-1">Controle financeiro e fluxo de caixa</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" data-testid="add-entry-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="entry-form">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.entry_type} onValueChange={(value) => setFormData({ ...formData, entry_type: value })}>
                  <SelectTrigger data-testid="entry-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEITA">Receita</SelectItem>
                    <SelectItem value="DESPESA">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  data-testid="entry-amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  data-testid="entry-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  data-testid="entry-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800" data-testid="submit-entry">
                  Criar Lançamento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Receitas</p>
              <p className="text-2xl font-heading font-semibold text-emerald-700 mt-2" data-testid="total-receitas">
                R$ {cashflow.receitas.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-700" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Despesas</p>
              <p className="text-2xl font-heading font-semibold text-red-700 mt-2" data-testid="total-despesas">
                R$ {cashflow.despesas.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-700" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Saldo</p>
              <p className={`text-2xl font-heading font-semibold mt-2 ${
                cashflow.saldo >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`} data-testid="saldo">
                R$ {cashflow.saldo.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="entries-table">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Data</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Categoria</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Valor</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-stone-700">
                    {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.entry_type === 'RECEITA' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-700">{entry.category || '-'}</td>
                  <td className={`py-3 px-4 text-sm text-right font-medium ${
                    entry.entry_type === 'RECEITA' ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {entry.entry_type === 'RECEITA' ? '+' : '-'} R$ {entry.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-700">{entry.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
