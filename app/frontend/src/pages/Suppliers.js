import React, { useEffect, useState } from 'react';
import { suppliersAPI } from '../services/api';
import { validateCNPJ } from '../utils/validators';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import ExportActions from '../components/ExportActions';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplierAddress, setSelectedSupplierAddress] = useState(null);
const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [isCnpjValid, setIsCnpjValid] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSupplierId, setDeleteSupplierId] = useState(null);
  const [deleteSupplierName, setDeleteSupplierName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cnpj: '',
    cep: '',
    rua: '',
    numero: '',
    estado: '',
    cidade: '',
    complemento: '',
  });

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      cnpj: '',
      cep: '',
      rua: '',
      numero: '',
      estado: '',
      cidade: '',
      complemento: '',
    });
    setIsCnpjValid(false);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const { data } = await suppliersAPI.getAll();
      setSuppliers(data);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const validateCNPJValue = (cnpj) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (!validateCNPJ(cleanCNPJ)) {
      toast.error('CNPJ inválido. Por favor, verifique os números digitados.');
      setIsCnpjValid(false);
      return false;
    }
    
    setIsCnpjValid(true);
    toast.success('CNPJ validado com sucesso');
    return true;
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

  const handleCNPJBlur = () => {
    if (formData.cnpj && !editingSupplier) {
      validateCNPJValue(formData.cnpj);
    }
  };

  const handleCEPBlur = async () => {
    if (formData.cep && !editingSupplier) {
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

  const getAddressText = (supplier) => {
    if (!supplier) return '';
    if (supplier.address) return supplier.address;
    return buildAddress(supplier);
  };

  const handleCNPJChange = (e) => {
    const value = e.target.value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
    setFormData({ ...formData, cnpj: value });
    setIsCnpjValid(false); // Reset on change
  };

  const handleCEPChange = (e) => {
    const value = e.target.value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
    setFormData({ ...formData, cep: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        cnpj: formData.cnpj.replace(/\D/g, ''), // Remove formatação, envia apenas 14 dígitos
        address: buildAddress(formData),
      };

      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier.id, dataToSend);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await suppliersAPI.create(dataToSend);
        toast.success('Fornecedor criado com sucesso!');
      }
      setIsDialogOpen(false);
      resetForm();
      loadSuppliers();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar fornecedor');
    }
  };

  const handleDeleteOpen = (id, name) => {
    setDeleteSupplierId(id);
    setDeleteSupplierName(name);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await suppliersAPI.delete(deleteSupplierId);
      toast.success('Fornecedor excluído com sucesso!');
      loadSuppliers();
    } catch (error) {
      toast.error('Erro ao excluir fornecedor');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteSupplierId(null);
      setDeleteSupplierName('');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      cnpj: supplier.cnpj || '',
      cep: supplier.cep || '',
      rua: supplier.rua || supplier.address || '',
      numero: supplier.numero || '',
      estado: supplier.estado || '',
      cidade: supplier.cidade || '',
      complemento: supplier.complemento || '',
    });
    setIsCnpjValid(false);
    setIsDialogOpen(true);
  };

  const handleViewAddress = (supplier) => {
    setSelectedSupplierAddress(supplier);
    setIsAddressDialogOpen(true);
  };

  const formatCNPJ = (cnpj) => {
    if (!cnpj) return '-';
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="suppliers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Fornecedores</h1>
          <p className="text-sm text-stone-500 mt-1">Gerencie seus fornecedores</p>
        </div>
        <div className="flex items-center gap-2">
        <ExportActions
          title="Relatorio de Fornecedores"
          filename="fornecedores"
          rows={suppliers}
          columns={[
            { header: 'Nome', accessor: 'name' },
            { header: 'E-mail', accessor: (row) => row.email || '-' },
            { header: 'Telefone', accessor: (row) => row.phone || '-' },
            { header: 'CNPJ', accessor: (row) => formatCNPJ(row.cnpj) },
            { header: 'Endereco', accessor: (row) => getAddressText(row) || '-' },
          ]}
        />
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" data-testid="add-supplier-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="supplier-form">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    data-testid="supplier-name"
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
                    data-testid="supplier-email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    data-testid="supplier-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    data-testid="supplier-cnpj"
                    value={formData.cnpj}
                    onChange={handleCNPJChange}
                    onBlur={handleCNPJBlur}
                    required
                  />
                  {!isCnpjValid && formData.cnpj && (
                    <p className="text-sm text-red-500 mt-1">CNPJ inválido. Corrija antes de salvar.</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <Input
                    id="cep"
                    data-testid="supplier-cep"
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
                    data-testid="supplier-rua"
                    value={formData.rua}
                    onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                    placeholder="Nome da rua"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    data-testid="supplier-numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="123"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    data-testid="supplier-estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    placeholder="SP"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    data-testid="supplier-cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    data-testid="supplier-complemento"
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
                <Button 
                  type="submit" 
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-400 disabled:cursor-not-allowed" 
                  disabled={!formData.cnpj || !isCnpjValid}
                  data-testid="submit-supplier"
                >
                  {editingSupplier ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="suppliers-table">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Nome</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">E-mail</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Telefone</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">CNPJ</th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-stone-900">{supplier.name}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">{supplier.email || '-'}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">{supplier.phone || '-'}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">{formatCNPJ(supplier.cnpj)}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewAddress(supplier)}
                        data-testid={`view-address-supplier-${supplier.id}`}
                      >
                        Endereco
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(supplier)}
                        data-testid={`edit-supplier-${supplier.id}`}
                      >
                        <Pencil className="w-4 h-4 text-stone-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteOpen(supplier.id, supplier.name)}
                        data-testid={`delete-supplier-${supplier.id}`}
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
            <DialogTitle>Endereco - {selectedSupplierAddress?.name}</DialogTitle>
          </DialogHeader>
          {selectedSupplierAddress && (
            <div className="space-y-4">
              {selectedSupplierAddress.address && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Endereco completo</p>
                  <p className="text-stone-900 whitespace-pre-wrap">{selectedSupplierAddress.address}</p>
                </div>
              )}
              {selectedSupplierAddress.cep && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">CEP</p>
                  <p className="text-stone-900">{selectedSupplierAddress.cep}</p>
                </div>
              )}
              {selectedSupplierAddress.rua && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Rua</p>
                  <p className="text-stone-900">{selectedSupplierAddress.rua}</p>
                </div>
              )}
              {selectedSupplierAddress.numero && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Número</p>
                  <p className="text-stone-900">{selectedSupplierAddress.numero}</p>
                </div>
              )}
              {selectedSupplierAddress.complemento && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Complemento</p>
                  <p className="text-stone-900">{selectedSupplierAddress.complemento}</p>
                </div>
              )}
              {selectedSupplierAddress.cidade && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Cidade</p>
                  <p className="text-stone-900">{selectedSupplierAddress.cidade}</p>
                </div>
              )}
              {selectedSupplierAddress.estado && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Estado</p>
                  <p className="text-stone-900">{selectedSupplierAddress.estado}</p>
                </div>
              )}
              {!selectedSupplierAddress.address && !selectedSupplierAddress.cep && !selectedSupplierAddress.rua && !selectedSupplierAddress.numero && !selectedSupplierAddress.complemento && !selectedSupplierAddress.cidade && !selectedSupplierAddress.estado && (
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
              Tem certeza que deseja excluir o fornecedor <strong>"{deleteSupplierName}"</strong>? Esta ação não pode ser desfeita.
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
              Excluir fornecedor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
