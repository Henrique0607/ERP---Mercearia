import React, { useEffect, useState } from 'react';
import { usersAPI } from '../services/api';
import { Plus, Pencil, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import ExportActions from '../components/ExportActions';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VENDEDOR',
    active: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await usersAPI.getAll();
      setUsers(data);
    } catch (error) {
      toast.error('Erro ao carregar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'VENDEDOR',
      active: true,
    });
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...formData };
      if (editingUser && !payload.password) {
        delete payload.password;
      }

      if (editingUser) {
        await usersAPI.update(editingUser.id, payload);
        toast.success('Usuario atualizado com sucesso!');
      } else {
        await usersAPI.create(payload);
        toast.success('Usuario criado com sucesso!');
      }

      setIsDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar usuario');
    }
  };

  const handleDeactivate = async (user) => {
    try {
      await usersAPI.delete(user.id);
      toast.success('Usuario desativado');
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao desativar usuario');
    }
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-stone-900">Usuarios</h1>
          <p className="text-sm text-stone-500 mt-1">Gerencie usuarios e perfis de acesso</p>
        </div>
        <div className="flex items-center gap-2">
        <ExportActions
          title="Relatorio de Usuarios"
          filename="usuarios"
          rows={users}
          columns={[
            { header: 'Nome', accessor: 'name' },
            { header: 'E-mail', accessor: 'email' },
            { header: 'Perfil', accessor: 'role' },
            { header: 'Status', accessor: (row) => row.active ? 'Ativo' : 'Inativo' },
          ]}
        />
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Editar Usuario' : 'Novo Usuario'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} required />
              </div>
              <div>
                <Label>Senha {editingUser ? '(preencha apenas para alterar)' : ''}</Label>
                <Input type="password" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} required={!editingUser} />
              </div>
              <div>
                <Label>Perfil</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="GERENTE">Gerente</SelectItem>
                    <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                    <SelectItem value="COMPRADOR">Comprador</SelectItem>
                    <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                    <SelectItem value="ATENDENTE">Atendente</SelectItem>
                    <SelectItem value="AUDITOR">Auditor</SelectItem>
                    <SelectItem value="TI">TI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.active ? 'true' : 'false'} onValueChange={(value) => setFormData({ ...formData, active: value === 'true' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">
                  {editingUser ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Nome</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">E-mail</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Perfil</th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-stone-900">{user.name}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">{user.email}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">{user.role}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                      {user.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(user)}>
                        <Pencil className="w-4 h-4 text-stone-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(user)} disabled={!user.active}>
                        <UserX className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
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
