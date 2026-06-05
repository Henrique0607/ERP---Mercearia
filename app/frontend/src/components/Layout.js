import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShieldCheck,
  Truck, 
  ShoppingCart, 
  ShoppingBag,
  Archive,
  DollarSign,
  FileText,
  ClipboardList,
  Store,
  AlertTriangle,
  LogOut,
  AlbumIcon
} from 'lucide-react';
import { canAccessPath, getCurrentUser, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../utils/permissions';

// Adicionamos cores específicas para cada ícone para quebrar totalmente o monocromático!
const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', iconColor: 'text-blue-500' },
  { path: '/produtos', icon: Package, label: 'Produtos', iconColor: 'text-amber-500' },
  { path: '/clientes', icon: Users, label: 'Clientes', iconColor: 'text-indigo-500' },
  { path: '/fornecedores', icon: Truck, label: 'Fornecedores', iconColor: 'text-purple-500' },
  { path: '/usuarios', icon: ShieldCheck, label: 'Usuários', iconColor: 'text-teal-500' },
  { path: '/vendas', icon: ShoppingCart, label: 'Vendas', iconColor: 'text-emerald-500' },
  { path: '/compras', icon: ShoppingBag, label: 'Compras', iconColor: 'text-orange-500' },
  { path: '/necessidade-compra', icon: AlertTriangle, label: 'Necessidade de Compra', iconColor: 'text-rose-500' },
  { path: '/estoque', icon: Archive, label: 'Estoque', iconColor: 'text-cyan-500' },
  { path: '/financeiro', icon: DollarSign, label: 'Financeiro', iconColor: 'text-lime-600' },
  { path: '/contabilidade', icon: FileText, label: 'Contabilidade', iconColor: 'text-fuchsia-500' },
  { path: '/auditoria', icon: ClipboardList, label: 'Auditoria', iconColor: 'text-slate-500' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const visibleMenuItems = menuItems.filter((item) => canAccessPath(user?.role, item.path));

  const handleLogout = () => {
    localStorage.removeItem('softvet_erp_user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-800">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col relative overflow-hidden shadow-sm flex-shrink-0" data-testid="sidebar">
        
        {/* Gráficos de fundo sutis em duas cores para dar profundidade (Laranja e Verde) */}
        <div className="absolute top-[-5%] left-[-10%] w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-[20%] right-[-20%] w-60 h-60 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header da Sidebar */}
        <div className="relative z-10 p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* O ícone da loja agora ganhou o contraste do Laranja/Âmbar sobre o fundo esmeralda */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
              <Store className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              {/* Misturando Esmeralda com Âmbar no gradiente do texto principal */}
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-800 via-emerald-600 to-amber-600 bg-clip-text text-transparent">
                Sabor & Cia
              </h1>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Sistema de Gestão</p>
            </div>
          </div>
        </div>
        
        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 relative z-10" data-testid="sidebar-nav">
          <ul className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 mb-1.5 
                    ${isActive 
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/20 font-semibold scale-[1.01]' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {/* Ícones coloridos quando inativos para quebrar o monocromático, brancos quando ativos */}
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 flex-shrink-0
                      ${isActive ? 'text-white' : `${item.iconColor} opacity-85 group-hover:opacity-100`}`} 
                    />
                    <span className="text-sm font-medium tracking-wide">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
          
        {/* Rodapé / Usuário */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 relative z-10">
          {user && (
            <div className="mb-4 bg-white border border-slate-200/60 p-3 rounded-xl shadow-sm border-l-4 border-l-amber-500">
              <p className="text-sm font-bold text-black">{user.name}</p>
              <p className="text-xs font-semibold text-emerald-600 mt-0.5">{ROLE_LABELS[user.role] || user.role}</p>
              {ROLE_DESCRIPTIONS[user.role] && (
                <p className="text-[11px] text-black mt-1 leading-snug">{ROLE_DESCRIPTIONS[user.role]}</p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 group font-medium"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}