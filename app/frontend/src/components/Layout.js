import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  ShoppingCart, 
  ShoppingBag,
  Archive,
  DollarSign,
  FileText,
  ClipboardList,
  Store
} from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/produtos', icon: Package, label: 'Produtos' },
  { path: '/clientes', icon: Users, label: 'Clientes' },
  { path: '/fornecedores', icon: Truck, label: 'Fornecedores' },
  { path: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { path: '/compras', icon: ShoppingBag, label: 'Compras' },
  { path: '/estoque', icon: Archive, label: 'Estoque' },
  { path: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { path: '/contabilidade', icon: FileText, label: 'Contabilidade' },
  { path: '/auditoria', icon: ClipboardList, label: 'Auditoria' },
];

export default function Layout() {
  const location = useLocation();

  return (
<div className="flex h-screen bg-white">
<aside className="w-64 bg-moss-900 text-creme flex flex-col" data-testid="sidebar">
<div className="p-6 border-b border-moss-800">
          <div className="flex items-center gap-3">
<Store className="w-8 h-8 text-soft-orange" />
            <div>
<h1 className="text-xl font-heading font-semibold text-creme">Sabor & Cia</h1>
<p className="text-xs text-moss-200 opacity-80">Sistema de Gestão</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-3" data-testid="sidebar-nav">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase()}`}
className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    isActive
                      ? 'bg-soft-orange text-earth-brown'
                      : 'text-creme hover:bg-moss-800 hover:text-creme'
                  }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}