import React, { useEffect, useState } from 'react';
import { auditAPI } from '../services/api';
import { Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entity: 'all',
    action: 'all'
  });

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    try {
      const params = {};
      if (filters.entity && filters.entity !== "all") {
      params.entity = filters.entity;
     }
     if (filters.action && filters.action !== "all") {
       params.action = filters.action;
     }
      
      const { data } = await auditAPI.getLogs(params);
      setLogs(data);
    } catch (error) {
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const formatJson = (jsonString) => {
    if (!jsonString) return '-';
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  };

  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-stone-900">Auditoria</h1>
        <p className="text-sm text-stone-500 mt-1">Registro de todas as operações do sistema</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-stone-500" />
          <h2 className="font-medium text-stone-900">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="entity">Entidade</Label>
            <Select value={filters.entity} onValueChange={(value) => setFilters({ ...filters, entity: value })}>
              <SelectTrigger data-testid="filter-entity">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="product">Produto</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="supplier">Fornecedor</SelectItem>
                <SelectItem value="sale">Venda</SelectItem>
                <SelectItem value="purchase">Compra</SelectItem>
                <SelectItem value="stock_movement">Movimentação de Estoque</SelectItem>
                <SelectItem value="financial_entry">Lançamento Financeiro</SelectItem>
                <SelectItem value="account">Conta Contábil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="action">Ação</Label>
            <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
              <SelectTrigger data-testid="filter-action">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="CREATE">Criação</SelectItem>
                <SelectItem value="UPDATE">Atualização</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="audit-logs-table">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Data/Hora</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Ação</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Entidade</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Dados</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-stone-700">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                      log.action === 'UPDATE' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-700">{log.entity}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">#{log.entity_id || '-'}</td>
                  <td className="py-3 px-4 text-sm text-stone-700">
                    {log.action === 'CREATE' && log.new_data && (
                      <details className="cursor-pointer">
                        <summary className="text-emerald-700 hover:underline">Ver dados</summary>
                        <pre className="mt-2 text-xs bg-stone-50 p-2 rounded overflow-auto max-w-md">
                          {formatJson(log.new_data)}
                        </pre>
                      </details>
                    )}
                    {log.action === 'UPDATE' && (
                      <details className="cursor-pointer">
                        <summary className="text-amber-700 hover:underline">Ver alterações</summary>
                        <div className="mt-2 text-xs space-y-2">
                          {log.old_data && (
                            <div>
                              <p className="font-semibold text-stone-700">Anterior:</p>
                              <pre className="bg-stone-50 p-2 rounded overflow-auto max-w-md">
                                {formatJson(log.old_data)}
                              </pre>
                            </div>
                          )}
                          {log.new_data && (
                            <div>
                              <p className="font-semibold text-stone-700">Novo:</p>
                              <pre className="bg-stone-50 p-2 rounded overflow-auto max-w-md">
                                {formatJson(log.new_data)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                    {log.action === 'DELETE' && log.old_data && (
                      <details className="cursor-pointer">
                        <summary className="text-red-700 hover:underline">Ver dados deletados</summary>
                        <pre className="mt-2 text-xs bg-stone-50 p-2 rounded overflow-auto max-w-md">
                          {formatJson(log.old_data)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {logs.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          Nenhum registro de auditoria encontrado
        </div>
      )}
    </div>
  );
}
