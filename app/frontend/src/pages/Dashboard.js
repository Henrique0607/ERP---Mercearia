import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../services/api';
import { TrendingUp, Users, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

const loadStats = async () => {
    try {
      const { data } = await dashboardAPI.getStats();
      setStats(data);
    } catch (error) {
      // Adicione isso para ver o erro real no console do navegador
      console.error("Erro detalhado da API:", error.response?.data || error.message);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
};

http://googleusercontent.com/immersive_entry_chip/0
  if (loading) {
    return <div className="text-stone-500">Carregando...</div>;
  }

  return (
    <div className="space-y-8" data-testid="dashboard">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500 mt-1">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm hover:-translate-y-0.5 transition-all duration-200" data-testid="card-sales-today">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Vendas Hoje</p>
              <p className="text-2xl font-heading font-semibold text-stone-900 mt-2">
                R$ {stats?.total_sales_today?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-700" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm hover:-translate-y-0.5 transition-all duration-200" data-testid="card-sales-month">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Vendas Mês</p>
              <p className="text-2xl font-heading font-semibold text-stone-900 mt-2">
                R$ {stats?.total_sales_month?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm hover:-translate-y-0.5 transition-all duration-200" data-testid="card-customers">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Clientes</p>
              <p className="text-2xl font-heading font-semibold text-stone-900 mt-2">
                {stats?.total_customers || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm hover:-translate-y-0.5 transition-all duration-200" data-testid="card-low-stock">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Estoque Baixo</p>
              <p className="text-2xl font-heading font-semibold text-stone-900 mt-2">
                {stats?.low_stock_products || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-heading font-medium text-stone-900 mb-4">Vendas Recentes</h2>
        {stats?.recent_sales?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="recent-sales-table">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Data</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Total</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-stone-700">#{sale.id}</td>
                    <td className="py-3 px-4 text-sm text-stone-700">
                      {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-stone-900">
                      R$ {sale.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-500">Nenhuma venda recente</p>
        )}
      </div>
    </div>
  );
}
