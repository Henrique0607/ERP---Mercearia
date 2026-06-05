import React, { useEffect, useMemo, useState } from 'react';
import { accountingAPI, financialAPI } from '../services/api';
import { ChevronDown, ChevronRight, FileText, Folder, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import ExportActions from '../components/ExportActions';

const ROOT_TYPES = ['ATIVO', 'PASSIVO', 'PATRIMONIO_LIQUIDO', 'RECEITA', 'DESPESA', 'RESULTADO'];

export default function Accounting() {
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [showZeroAccounts, setShowZeroAccounts] = useState(true);
  const [editingValues, setEditingValues] = useState({});
  const [savingAccountId, setSavingAccountId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: 'ATIVO',
    parent_id: 'none',
    active: true,
  });

  useEffect(() => {
    loadAccountingData();
  }, []);

  const loadAccountingData = async () => {
    try {
      const [{ data: accountData }, { data: entriesData }, { data: balanceData }, { data: dreData }] = await Promise.all([
        accountingAPI.getAccounts(),
        financialAPI.getEntries(),
        accountingAPI.getBalanceSheet(),
        accountingAPI.getIncomeStatement(),
      ]);
      setAccounts(accountData);
      setEntries(entriesData);
      setBalanceSheet(balanceData);
      setIncomeStatement(dreData);
    } catch (error) {
      toast.error('Erro ao carregar contabilidade');
    } finally {
      setLoading(false);
    }
  };

  const accountTree = useMemo(() => {
    // Observação: o KPI/DRE do Financeiro calcula impostos por FinancialEntry.category ilike("%imposto%").
    // Para manter consistência sem alterar o Financeiro, o tree do Plano de Contas usa o campo aceita_lancamento
    // e o filtro de conta 3.3 no cálculo do Resultado Liquido (já ajustado). Aqui apenas ajustaremos a
    // sintética "3 - CONTAS DE RESULTADO" para refletir o mesmo resultado do KPI.
    const entradaImpostosPredicate = (node) =>
      node.aceita_lancamento && String(node.code || '').startsWith('3.3') &&
      String(node.name || '').includes('IMPOSTOS SOBRE VENDAS E SERVIÇOS');
    const childrenByParent = new Map();
    const directValues = new Map();

    entries.forEach((entry) => {
      if (!entry.account_id) return;
      directValues.set(entry.account_id, (directValues.get(entry.account_id) || 0) + Number(entry.amount || 0));
    });

    accounts.forEach((account) => {
      const parentKey = account.parent_id || null;
      if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
      childrenByParent.get(parentKey).push(account);
    });

    childrenByParent.forEach((items) => {
      items.sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true }));
    });

    const buildNode = (account, level = 0) => {
      const children = (childrenByParent.get(account.id) || []).map((child) => buildNode(child, level + 1));
      const isSynthetic = children.length > 0;
      const directValue = directValues.get(account.id) || 0;
      const childrenValue = children.reduce((sum, child) => sum + child.valor, 0);
      const valor = isSynthetic ? directValue + childrenValue : directValue;

      return {
        ...account,
        codigo: account.code,
        nome: account.name,
        tipo: isSynthetic ? 'SINTETICA' : 'ANALITICA',
        aceita_lancamento: !isSynthetic,
        valor,
        directValue,
        children,
        level,
      };
    };

    const rootsFromParent = (childrenByParent.get(null) || []).map((account) => buildNode(account));
    const roots = rootsFromParent.length > 0
      ? rootsFromParent
      : ROOT_TYPES.map((type, index) => ({
        id: `root-${type}`,
        code: String(index + 1),
        codigo: String(index + 1),
        name: type,
        nome: type,
        account_type: type,
        parent_id: null,
        active: true,
        tipo: 'SINTETICA',
        aceita_lancamento: false,
        valor: 0,
        directValue: 0,
        children: accounts.filter((account) => account.account_type === type && !account.parent_id).map((account) => buildNode(account, 1)),
        level: 0,
      }));

    return roots.filter((node) => showZeroAccounts || node.valor !== 0);
  }, [accounts, entries, showZeroAccounts]);

  const visibleRows = useMemo(() => {
    const rows = [];
    const visit = (node) => {
      if (!showZeroAccounts && node.valor === 0) return;
      rows.push(node);
      if (expanded.has(node.id)) {
        node.children.forEach(visit);
      }
    };

    accountTree.forEach(visit);
    return rows;
  }, [accountTree, expanded, showZeroAccounts]);

  const exportRows = useMemo(() => {
    const rows = [];
    const visit = (node) => {
      if (!showZeroAccounts && node.valor === 0) return;
      rows.push(node);
      node.children.forEach(visit);
    };
    accountTree.forEach(visit);
    return rows;
  }, [accountTree, showZeroAccounts]);

  const handleSeedAccounts = async () => {
    try {
      const { data } = await accountingAPI.seedDefaultAccounts();
      toast.success(`${data.created} contas do plano padrao adicionadas`);
      loadAccountingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao carregar plano de contas padrao');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await accountingAPI.createAccount({
        ...formData,
        parent_id: formData.parent_id === 'none' ? null : parseInt(formData.parent_id, 10),
      });
      toast.success('Conta criada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      loadAccountingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar conta');
    }
  };

  const handleDelete = async (account) => {
    if (account.children?.length > 0) {
      toast.error('Conta sintetica com filhos nao pode ser removida');
      return;
    }

    try {
      await accountingAPI.deleteAccount(account.id);
      toast.success('Conta removida ou desativada');
      loadAccountingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao remover conta');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      account_type: 'ATIVO',
      parent_id: 'none',
      active: true,
    });
  };

  const toggleExpanded = (accountId) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const expandRoots = () => {
    setExpanded(new Set(accountTree.map((node) => node.id)));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const getEntryTypeForAccount = (account) => {
    return account.account_type === 'RECEITA' ? 'RECEITA' : 'DESPESA';
  };

  const handleAnalyticValueSave = async (account) => {
    const rawValue = editingValues[account.id];
    if (rawValue === undefined || rawValue === '') return;

    const desiredValue = Number(String(rawValue).replace(',', '.'));
    if (!Number.isFinite(desiredValue)) {
      toast.error('Valor invalido');
      return;
    }

    const difference = desiredValue - account.valor;
    if (Math.abs(difference) < 0.01) return;

    setSavingAccountId(account.id);
    try {
      await financialAPI.createEntry({
        entry_type: getEntryTypeForAccount(account),
        amount: difference,
        category: 'Lancamento contabil manual',
        description: `Ajuste manual da conta ${account.code} - ${account.name}`,
        account_id: account.id,
        status: 'PENDENTE',
      });
      toast.success('Lancamento contabil registrado');
      setEditingValues((current) => {
        const next = { ...current };
        delete next[account.id];
        return next;
      });
      await loadAccountingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar lancamento');
    } finally {
      setSavingAccountId(null);
    }
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  const ativosPlanValue = accountTree
    .filter((node) => node.account_type === 'ATIVO')
    .reduce((sum, node) => sum + node.valor, 0);

  const passivoPlanValue = accountTree
    .filter((node) => node.account_type === 'PASSIVO')
    .reduce((sum, node) => sum + node.valor, 0);

  const impostosContaValue = accountTree
    .filter((node) =>
      node.aceita_lancamento &&
      String(node.code || '').startsWith('3.3') &&
      String(node.name || '').includes('IMPOSTOS SOBRE VENDAS E SERVIÇOS')
    )
    .reduce((sum, node) => sum + node.valor, 0);

  const balanceSheetResult = ativosPlanValue - impostosContaValue;

  const dreImpostosValue = incomeStatement?.impostos ?? 0;
  const resultadoLiquidoValue = ativosPlanValue - dreImpostosValue;

  return (
    <div className="space-y-6" data-testid="accounting-page">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Contabilidade</h1>
          <p className="text-sm text-stone-500 mt-1">Plano de contas em arvore, balanco patrimonial e DRE</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ExportActions
            title="Contabilidade - Plano de Contas + Relatórios"
            filename="contabilidade"
            rows={exportRows}
            summaryItems={[
              { label: 'Ativos', value: formatCurrency(ativosPlanValue || 0) },
              { label: 'Passivos', value: formatCurrency(passivoPlanValue * -1 || 0), color: 'red' },
              { label: 'Patrimonio Liquido', value: formatCurrency(ativosPlanValue - passivoPlanValue || 0) },
            ]}
            printExtraContent={(
              <div className="space-y-5 mb-5">
                <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-heading font-medium text-stone-900 mb-4">DRE (valores atuais)</h2>
                  <ReportLine label="Receitas" value={incomeStatement?.receitas || 0} />
                  <ReportLine label="(-) Despesas Operacionais" value={(incomeStatement?.despesas || 0) - (incomeStatement?.impostos || 0) } />
                  <ReportLine label="(-) Impostos" value={incomeStatement?.impostos || 0} />
                  <ReportLine label="(=) Resultado Liquido" value={(incomeStatement?.receitas || 0) - (incomeStatement?.despesas || 0)} strong />
                </div>

                <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-heading font-medium text-stone-900 mb-4">Balanco Patrimonial</h2>
                  <ReportLine label="Ativos" value={ativosPlanValue || 0} />
                  <ReportLine label="Passivos" value={passivoPlanValue || 0} />
                  <ReportLine label="Patrimonio Liquido" value={ativosPlanValue - passivoPlanValue || 0} />
                  <ReportLine label="Resultado Liquido" value={ativosPlanValue - incomeStatement?.impostos || 0} strong />
                </div>
              </div>
            )}
            columns={[
              { header: 'Codigo', accessor: 'code' },
              { header: 'Nome', accessor: (row) => `${'  '.repeat(row.level)}${row.name}` },
              { header: 'Tipo', accessor: 'tipo' },
              { header: 'Aceita Lancamento', accessor: (row) => row.aceita_lancamento ? 'Sim' : 'Nao' },
              { header: 'Valor', accessor: (row) => formatCurrency(row.valor) },
            ]}
          />
          <Button variant="outline" onClick={handleSeedAccounts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Plano Padrao
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" data-testid="add-account-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Conta Contabil</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="account-form">
                <div>
                  <Label>Codigo</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="Ex: 1.1.1" required />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Tipo contabil</Label>
                  <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ATIVO">Ativo</SelectItem>
                      <SelectItem value="PASSIVO">Passivo</SelectItem>
                      <SelectItem value="PATRIMONIO_LIQUIDO">Patrimonio Liquido</SelectItem>
                      <SelectItem value="RECEITA">Receita</SelectItem>
                      <SelectItem value="DESPESA">Despesa</SelectItem>
                      <SelectItem value="RESULTADO">Resultado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Conta Pai</Label>
                  <Select value={formData.parent_id} onValueChange={(value) => setFormData({ ...formData, parent_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma conta pai" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">Criar Conta</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ReportCard title="Ativos" value={ativosPlanValue} />
        <ReportCard title="Passivos" value={passivoPlanValue * -1} color="red" />
        <ReportCard title="Patrimonio Liquido" value={ativosPlanValue - passivoPlanValue} />
        <ReportCard title="Resultado Liquido" value={ativosPlanValue - incomeStatement?.impostos} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-heading font-medium text-stone-900 mb-4">DRE</h2>
          <ReportLine label="Receitas" value={incomeStatement?.receitas || 0} />
          <ReportLine label="(-) Despesas Operacionais" value={incomeStatement?.despesas - incomeStatement?.impostos|| 0} />
          <ReportLine label="(-) Impostos" value={incomeStatement?.impostos|| 0} />
          <ReportLine label="(=) Resultado Liquido" value={incomeStatement?.receitas - incomeStatement?.despesas|| 0} strong />
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-heading font-medium text-stone-900 mb-4">Balanco Patrimonial</h2>
          <ReportLine label="Ativos" value={ativosPlanValue || 0} />
          <ReportLine label="Passivos" value={passivoPlanValue || 0}/>
          <ReportLine label="Patrimonio Liquido" value={ativosPlanValue - passivoPlanValue || 0} />
          <ReportLine label="Resultado Liquido" value={ativosPlanValue - incomeStatement?.impostos || 0} strong />
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-heading font-semibold text-stone-900">Plano de Contas</h2>
            <p className="text-sm text-stone-500">Arvore contabil com contas sinteticas e analiticas</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={showZeroAccounts}
                onChange={(event) => setShowZeroAccounts(event.target.checked)}
                className="h-4 w-4 rounded border-stone-300"
              />
              Mostrar contas sem movimento
            </label>
            <Button type="button" variant="outline" size="sm" onClick={expandRoots}>Expandir raiz</Button>
            <Button type="button" variant="outline" size="sm" onClick={collapseAll}>Recolher tudo</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[1fr_160px_180px_120px] gap-3 border-b border-stone-200 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <div>Conta</div>
              <div>Tipo</div>
              <div className="text-right">Valor</div>
              <div className="text-center">Acoes</div>
            </div>

            {visibleRows.map((account) => (
              <AccountTreeRow
                key={account.id}
                account={account}
                expanded={expanded.has(account.id)}
                onToggle={() => toggleExpanded(account.id)}
                onDelete={() => handleDelete(account)}
                editingValue={editingValues[account.id]}
                onEditingValueChange={(value) => setEditingValues((current) => ({ ...current, [account.id]: value }))}
                onSave={() => handleAnalyticValueSave(account)}
                saving={savingAccountId === account.id}
              />
            ))}

            {visibleRows.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-stone-500">
                Nenhuma conta com movimento para exibir.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountTreeRow({ account, expanded, onToggle, onDelete, editingValue, onEditingValueChange, onSave, saving }) {
  const hasChildren = account.children.length > 0;
  const isZero = Math.abs(account.valor) < 0.01;
  const canEdit = account.aceita_lancamento;
  const displayValue = editingValue !== undefined ? editingValue : account.valor.toFixed(2);

  return (
    <div
      className={`grid grid-cols-[1fr_160px_180px_120px] gap-3 border-b border-stone-100 px-5 py-2.5 transition-colors hover:bg-stone-50 ${isZero ? 'opacity-55' : ''}`}
      style={{ paddingLeft: `${20 + account.level * 28}px` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-stone-200 text-stone-600"
            aria-label={expanded ? 'Recolher conta' : 'Expandir conta'}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="h-6 w-6" />
        )}
        {account.tipo === 'SINTETICA' ? (
          <Folder className="w-4 h-4 text-amber-600 shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-stone-500 shrink-0" />
        )}
        <div className="min-w-0">
          <div className={`truncate text-sm ${account.tipo === 'SINTETICA' ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'}`}>
            <span className="tabular-nums">{account.code}</span> - {account.name}
          </div>
          <div className="text-xs text-stone-500">
            {account.aceita_lancamento ? 'Aceita lancamento manual' : 'Soma automatica dos filhos'}
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${account.tipo === 'SINTETICA' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {account.tipo}
        </span>
      </div>

      <div className="flex items-center justify-end">
        {canEdit ? (
          <Input
            value={displayValue}
            onChange={(event) => onEditingValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSave();
              }
            }}
            onBlur={onSave}
            className="h-9 w-36 text-right tabular-nums"
          />
        ) : (
          <span className={`text-sm tabular-nums ${isZero ? 'text-stone-400' : 'font-semibold text-stone-900'}`}>
            {formatCurrency(account.valor)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-1">
        {canEdit && editingValue !== undefined && (
          <Button size="sm" variant="ghost" onClick={onSave} disabled={saving}>
            <Save className="w-4 h-4 text-emerald-700" />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDelete} disabled={hasChildren}>
          <Trash2 className={`w-4 h-4 ${hasChildren ? 'text-stone-300' : 'text-red-600'}`} />
        </Button>
      </div>
    </div>
  );
}

function ReportCard({ title, value, color }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">{title}</p>
      <p className={`text-2xl font-heading font-semibold mt-2 ${color === 'red' ? 'text-red-700' : 'text-emerald-700'}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function ReportLine({ label, value, strong = false, color }) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-stone-100 ${strong ? 'font-semibold' : ''}`}>
      <span className="text-sm text-stone-700">{label}</span>
      <span className={`text-sm ${color === 'red' ? 'text-red-700' : 'text-stone-900'}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
