import React, { useEffect, useState } from 'react';
import { financialAPI } from '../services/api';
import { CheckCircle, DollarSign, Plus, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import ExportActions from '../components/ExportActions';

export default function Financial() {
  const [entries, setEntries] = useState([]);
  const [cashflow, setCashflow] = useState({ receitas: 0, despesas: 0, saldo: 0 });
  const [profitability, setProfitability] = useState({ total_revenue: 0, total_estimated_cost: 0, total_profit: 0, margin_percent: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOperationalDialogOpen, setIsOperationalDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    entry_type: 'RECEITA',
    amount: 0,
    category: '',
    description: '',
    due_date: '',
  });

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      const [{ data: entriesData }, { data: cashflowData }, { data: profitabilityData }] = await Promise.all([
        financialAPI.getEntries(),
        financialAPI.getCashflow(),
        financialAPI.getProfitability(),
      ]);
      setEntries(entriesData);
      setCashflow(cashflowData);
      setProfitability(profitabilityData);
    } catch (error) {
      toast.error('Erro ao carregar financeiro');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entry_type: 'RECEITA',
      amount: 0,
      category: '',
      description: '',
      due_date: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await financialAPI.createEntry({
        ...formData,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date || null,
        status: 'PENDENTE',
      });
      toast.success('Lancamento criado com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      loadFinancialData();
    } catch (error) {
      console.log(error.response?.data);
      
      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || 'Erro ao criar lancamento');
    } else {
      toast.error(detail || 'Erro ao criar lancamento');
    }
  } 
};

  const settleEntry = async (entry) => {
    try {
      await financialAPI.settleEntry(entry.id);
      toast.success(entry.entry_type === 'RECEITA' ? 'Conta recebida' : 'Conta paga');
      loadFinancialData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao baixar titulo');
    }
  };

  const reverseEntry = async (entry) => {
    try {
      await financialAPI.reverseEntry(entry.id);
      toast.success('Baixa estornada');
      loadFinancialData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao estornar baixa');
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  };

  const payables = entries.filter((entry) => entry.entry_type === 'DESPESA');
  const receivables = entries.filter((entry) => entry.entry_type === 'RECEITA');

  const pendingPayables = payables
    .filter((entry) => entry.status === 'PENDENTE')
    .reduce((sum, entry) => sum + Math.abs(Number(entry.amount || 0)), 0);

  const pendingReceivables = receivables
    .filter((entry) => entry.status === 'PENDENTE')
    .reduce((sum, entry) => sum + Math.abs(Number(entry.amount || 0)), 0);


  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="financial-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Financeiro</h1>
          <p className="text-sm text-stone-500 mt-1">Contas a pagar, contas a receber e fluxo de caixa</p>
        </div>
        <div className="flex items-center gap-2">
        <ExportActions
          title="Relatorio Financeiro"
          filename="financeiro"
          rows={entries}
          columns={[
            { header: 'Tipo', accessor: 'entry_type' },
            { header: 'Categoria', accessor: (row) => row.category || '-' },
            { header: 'Descricao', accessor: (row) => row.description || '-' },
            { header: 'Valor', accessor: (row) => `R$ ${Number(row.amount || 0).toFixed(2)}` },
            { header: 'Vencimento', accessor: (row) => formatDate(row.due_date) },
            { header: 'Status', accessor: 'status' },
            { header: 'Liquidado em', accessor: (row) => formatDate(row.settled_at) },
          ]}
        />
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" data-testid="add-entry-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lancamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Lancamento Financeiro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="entry-form">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.entry_type} onValueChange={(value) => setFormData({ ...formData, entry_type: value })}>
                  <SelectTrigger data-testid="entry-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEITA">Receita / Conta a Receber</SelectItem>
                    <SelectItem value="DESPESA">Despesa / Conta a Pagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="datetime" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
              </div>
              <div>
                <Label>Descricao</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">Criar Lancamento</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <SummaryCard title="Receitas" value={cashflow.receitas} icon={TrendingUp} color="emerald" />
        <SummaryCard title="Despesas" value={cashflow.despesas} icon={TrendingDown} color="red" />
        <SummaryCard title="Saldo" value={cashflow.saldo} icon={DollarSign} color="amber" />
        <SummaryCard title="A Receber" value={pendingReceivables} icon={TrendingUp} color="emerald" />
        <SummaryCard title="A Pagar" value={pendingPayables} icon={TrendingDown} color="red" />
      </div>

      <FinancialTable title="Contas a Receber Pendentes" entries={receivables} formatDate={formatDate} onSettle={settleEntry} onReverse={reverseEntry} />
      <FinancialTable title="Contas a Pagar" entries={payables} formatDate={formatDate} onSettle={settleEntry} onReverse={reverseEntry} />
      <ProfitabilityTable profitability={profitability} />
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  const colorClass = {
    emerald: 'text-emerald-700 bg-emerald-100',
    red: 'text-red-700 bg-red-100',
    amber: 'text-amber-700 bg-amber-100',
  }[color];

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">{title}</p>
          <p className={`text-2xl font-heading font-semibold mt-2 ${colorClass.split(' ')[0]}`}>
            R$ {value.toFixed(2)}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass.split(' ')[1]}`}>
          <Icon className={`w-6 h-6 ${colorClass.split(' ')[0]}`} />
        </div>
      </div>
    </div>
  );
}

function ProfitabilityTable({ profitability }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100">
        <h2 className="font-heading font-medium text-stone-900">Relatorio de Lucratividade</h2>
        <p className="text-sm text-stone-500 mt-1">
          Receita: R$ {profitability.total_revenue.toFixed(2)} | Custo estimado: R$ {profitability.total_estimated_cost.toFixed(2)} | Lucro: R$ {profitability.total_profit.toFixed(2)} ({profitability.margin_percent.toFixed(1)}%)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">SKU</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Produto</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Qtd. Vendida</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Receita</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Custo</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Lucro</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Margem</th>
            </tr>
          </thead>
          <tbody>
            {profitability.items.map((item) => (
              <tr key={item.product_id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                <td className="py-3 px-4 text-sm text-stone-700">{item.sku}</td>
                <td className="py-3 px-4 text-sm font-medium text-stone-900">{item.product_name}</td>
                <td className="py-3 px-4 text-sm text-right text-stone-700">{item.quantity_sold}</td>
                <td className="py-3 px-4 text-sm text-right text-stone-700">R$ {item.revenue.toFixed(2)}</td>
                <td className="py-3 px-4 text-sm text-right text-stone-700">R$ {item.estimated_cost.toFixed(2)}</td>
                <td className={`py-3 px-4 text-sm text-right font-medium ${item.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  R$ {item.profit.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-sm text-right text-stone-700">{item.margin_percent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinancialTable({ title, entries, formatDate, onSettle, onReverse }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100">
        <h2 className="font-heading font-medium text-stone-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Vencimento</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Categoria</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Descricao</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Valor</th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                <td className="py-3 px-4 text-sm text-stone-700">{formatDate(entry.due_date || entry.created_at)}</td>
                <td className="py-3 px-4 text-sm text-stone-700">{entry.category || '-'}</td>
                <td className="py-3 px-4 text-sm text-stone-700">{entry.description || '-'}</td>
                <td className={`py-3 px-4 text-sm text-right font-medium ${entry.entry_type === 'RECEITA' ? 'text-emerald-700' : 'text-red-700'}`}>
                  R$ {entry.amount.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.status === 'BAIXADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {entry.status === 'BAIXADO' ? (
                    <Button size="sm" variant="ghost" onClick={() => onReverse(entry)}>
                      <RotateCcw className="w-4 h-4 text-stone-600" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => onSettle(entry)}>
                      <CheckCircle className="w-4 h-4 text-emerald-700" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-stone-500">Nenhum titulo encontrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
