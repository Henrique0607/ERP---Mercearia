import React, { useEffect, useState } from 'react';
import { customersAPI } from '../services/api';
import { validateCNPJ, validateCPF } from '../utils/validators';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import ExportActions from '../components/ExportActions';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomerAddress, setSelectedCustomerAddress] = useState(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [isCpfCnpjValid, setIsCpfCnpjValid] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    cep: '',
    rua: '',
    numero: '',
    estado: '',
    cidade: '',
    complemento: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data } = await customersAPI.getAll();
      setCustomers(data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const validateCEP = async (cep) => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
      toast.error('CEP deve ter 8 dígitos');
      return false;
    }

    setCepLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/validate-cep?cep=${cleanCEP}`);
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.detail || 'CEP não encontrado');
        return false;
      }
      
      setFormData(prev => ({
        ...prev,
        rua: data.rua || data.address || prev.rua,
        estado: data.estado || prev.estado,
        cidade: data.cidade || prev.cidade,
        complemento: data.complemento || prev.complemento,
      }));
      
      toast.success('CEP validado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao validar CEP:', error);
      toast.error('Erro ao validar CEP');
      return false;
    } finally {
      setCepLoading(false);
    }
  };

  const handleCEPChange = (e) => {
    const value = e.target.value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
    setFormData({ ...formData, cep: value });
  };

  const handleCEPBlur = async () => {
    if (formData.cep && !editingCustomer) {
      await validateCEP(formData.cep);
    }
  };

  const buildAddress = (data) => {
    const street = [data.rua?.trim(), data.numero?.trim()].filter(Boolean).join(', ');
    const cityState = [data.cidade?.trim(), data.estado?.trim()].filter(Boolean).join(' - ');
    const cep = data.cep?.replace(/\D/g, '');

    return [
      street,
      data.complemento?.trim(),
      cityState,
      cep ? `CEP: ${cep}` : '',
    ].filter(Boolean).join(' | ');
  };

  const getAddressText = (customer) => {
    if (!customer) return '';
    if (customer.address) return customer.address;
    return buildAddress(customer);
  };

  const validateCpfCnpjValue = (value) => {
    const clean = value.replace(/\D/g, '');
    
    if (clean.length === 11) {
      if (validateCPF(clean)) {
        setIsCpfCnpjValid(true);
        toast.success('CPF válido');
        return true;
      } else {
        setIsCpfCnpjValid(false);
        toast.error('CPF inválido. Por favor, verifique os números digitados.');
        return false;
      }
    } else if (clean.length === 14) {
      if (validateCNPJ(clean)) {
        setIsCpfCnpjValid(true);
        toast.success('CNPJ validado com sucesso');
        return true;
      } else {
        setIsCpfCnpjValid(false);
        toast.error('CNPJ inválido. Por favor, verifique os números digitados.');
        return false;
      }
    } else {
      setIsCpfCnpjValid(false);
      toast.error('CPF deve ter 11 dígitos ou CNPJ 14 dígitos');
      return false;
    }
  };

  const handleCpfCnpjChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, cpf_cnpj: value });
  };

  const handleCpfCnpjBlur = () => {
    if (formData.cpf_cnpj && !editingCustomer) {
      validateCpfCnpjValue(formData.cpf_cnpj);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        cpf_cnpj: formData.cpf_cnpj.replace(/\D/g, ''),
        address: buildAddress(formData),
      };

      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, dataToSend);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await customersAPI.create(dataToSend);
        toast.success('Cliente criado com sucesso!');
      }
      setIsDialogOpen(false);
      resetForm();
      loadCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar cliente');
    }
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState(null);
  const [deleteCustomerName, setDeleteCustomerName] = useState('');

  const handleDeleteOpen = (id, name) => {
    setDeleteCustomerId(id);
    setDeleteCustomerName(name);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await customersAPI.delete(deleteCustomerId);
      toast.success('Cliente excluído com sucesso!');
      loadCustomers();
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteCustomerId(null);
      setDeleteCustomerName('');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      cpf_cnpj: customer.cpf_cnpj || '',
      cep: customer.cep || '',
      rua: customer.rua || customer.address || '',
      numero: customer.numero || '',
      estado: customer.estado || '',
      cidade: customer.cidade || '',
      complemento: customer.complemento || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf_cnpj: '',
      cep: '',
      rua: '',
      numero: '',
      estado: '',
      cidade: '',
      complemento: '',
    });
  };

  const handleViewAddress = (customer) => {
    setSelectedCustomerAddress(customer);
    setIsAddressDialogOpen(true);
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="customers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Clientes</h1>
          <p className="text-sm text-stone-500 mt-1">Gerencie seus clientes</p>
        </div>
        <div className="flex items-center gap-2">
        <ExportActions
          title="Relatorio de Clientes"
          filename="clientes"
          rows={customers}
          columns={[
            { header: 'Nome', accessor: 'name' },
            { header: 'E-mail', accessor: (row) => row.email || '-' },
            { header: 'Telefone', accessor: (row) => row.phone || '-' },
            { header: 'CPF/CNPJ', accessor: (row) => row.cpf_cnpj || '-' },
            { header: 'Endereco', accessor: (row) => getAddressText(row) || '-' },
          ]}
        />
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" data-testid="add-customer-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="customer-form">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    data-testid="customer-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="customer-email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    data-testid="customer-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpf_cnpj"
                    data-testid="customer-cpf"
                    value={formData.cpf_cnpj}
                    onChange={handleCpfCnpjChange}
                    onBlur={handleCpfCnpjBlur}
                  />
                  {!isCpfCnpjValid && formData.cpf_cnpj && (
                    <p className="text-sm text-red-500 mt-1">CPF ou CNPJ inválido. Corrija antes de salvar.</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    data-testid="customer-cep"
                    value={formData.cep}
                    onChange={handleCEPChange}
                    onBlur={handleCEPBlur}
                    disabled={cepLoading}
                    placeholder="00000-000"
                  />
                  {cepLoading && <p className="text-sm text-stone-500 mt-1">Validando CEP...</p>}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="rua">Rua</Label>
                  <Input
                    id="rua"
                    data-testid="customer-rua"
                    value={formData.rua}
                    onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                    placeholder="Nome da rua"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    data-testid="customer-numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="123"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    data-testid="customer-estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    placeholder="SP"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    data-testid="customer-cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    data-testid="customer-complemento"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    placeholder="Apto 101"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800" data-testid="submit-customer">
                  {editingCustomer ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="customers-table">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Nome</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">E-mail</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Telefone</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">CPF/CNPJ</th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-stone-900">{customer.name}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">{customer.email || '-'}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">{customer.phone || '-'}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">{customer.cpf_cnpj || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewAddress(customer)}
                        data-testid={`view-address-customer-${customer.id}`}
                      >
                        Endereco
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(customer)}
                        data-testid={`edit-customer-${customer.id}`}
                      >
                        <Pencil className="w-4 h-4 text-stone-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteOpen(customer.id, customer.name)}
                        data-testid={`delete-customer-${customer.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>



      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endereco - {selectedCustomerAddress?.name}</DialogTitle>
          </DialogHeader>
          {selectedCustomerAddress && (
            <div className="space-y-4">
              {selectedCustomerAddress.address && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Endereco completo</p>
                  <p className="text-stone-900 whitespace-pre-wrap">{selectedCustomerAddress.address}</p>
                </div>
              )}
              {selectedCustomerAddress.cep && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">CEP</p>
                  <p className="text-stone-900">{selectedCustomerAddress.cep}</p>
                </div>
              )}
              {selectedCustomerAddress.rua && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Rua</p>
                  <p className="text-stone-900">{selectedCustomerAddress.rua}</p>
                </div>
              )}
              {selectedCustomerAddress.numero && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Número</p>
                  <p className="text-stone-900">{selectedCustomerAddress.numero}</p>
                </div>
              )}
              {selectedCustomerAddress.complemento && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Complemento</p>
                  <p className="text-stone-900">{selectedCustomerAddress.complemento}</p>
                </div>
              )}
              {selectedCustomerAddress.cidade && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Cidade</p>
                  <p className="text-stone-900">{selectedCustomerAddress.cidade}</p>
                </div>
              )}
              {selectedCustomerAddress.estado && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Estado</p>
                  <p className="text-stone-900">{selectedCustomerAddress.estado}</p>
                </div>
              )}
              {!selectedCustomerAddress.address && !selectedCustomerAddress.cep && !selectedCustomerAddress.rua && !selectedCustomerAddress.numero && !selectedCustomerAddress.complemento && !selectedCustomerAddress.cidade && !selectedCustomerAddress.estado && (
                <p className="text-stone-500 text-center py-6">Endereço não informado</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddressDialogOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-stone-700">
              Tem certeza que deseja excluir o cliente <strong>"{deleteCustomerName}"</strong>? Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Excluir cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
