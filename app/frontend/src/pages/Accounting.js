import React, { useEffect, useState } from 'react';
import { accountingAPI } from '../services/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function Accounting() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: 'ATIVO',
    parent_id: ''
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data } = await accountingAPI.getAccounts();
      setAccounts(data);
    } catch (error) {
      toast.error('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await accountingAPI.createAccount({
        ...formData,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null
      });
      toast.success('Conta criada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar conta');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      account_type: 'ATIVO',
      parent_id: ''
    });
  };

  const getAccountsByType = (type) => {
    return accounts.filter(acc => acc.account_type === type);
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="accounting-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Contabilidade</h1>
          <p className="text-sm text-stone-500 mt-1">Plano de contas contábil</p>
        </div>
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
              <DialogTitle>Nova Conta Contábil</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="account-form">
              <div>
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  data-testid="account-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: 1.1.1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  data-testid="account-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                  <SelectTrigger data-testid="account-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="PASSIVO">Passivo</SelectItem>
                    <SelectItem value="RECEITA">Receita</SelectItem>
                    <SelectItem value="DESPESA">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="parent">Conta Pai (Opcional)</Label>
                <Select value={formData.parent_id.toString()} onValueChange={(value) => setFormData({ ...formData, parent_id: value })}>
                  <SelectTrigger data-testid="account-parent">
                    <SelectValue placeholder="Selecione uma conta pai" />
                  </SelectTrigger>
                  <SelectContent>
<SelectItem value="none">Nenhuma</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800" data-testid="submit-account">
                  Criar Conta
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['ATIVO', 'PASSIVO', 'RECEITA', 'DESPESA'].map((type) => (
          <div key={type} className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-heading font-medium text-stone-900 mb-4">{type}</h2>
            <div className="space-y-2">
              {getAccountsByType(type).map((account) => (
                <div key={account.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-stone-50 transition-colors" data-testid={`account-${account.id}`}>
                  <div>
                    <p className="text-sm font-medium text-stone-900">{account.code} - {account.name}</p>
                    {account.parent_id && (
                      <p className="text-xs text-stone-500">Subconta</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    account.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {account.active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              ))}
              {getAccountsByType(type).length === 0 && (
                <p className="text-sm text-stone-500 italic">Nenhuma conta cadastrada</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
