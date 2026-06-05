import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Store } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
  
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem('softvet_erp_user', JSON.stringify(data.user));
      toast.success('Login realizado com sucesso');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Fundo agora mescla um azul/cinza suave com um toque quente no canto superior (via amber-50)
    <div className="min-h-screen bg-gradient-to-tr from-slate-100 via-slate-50 to-amber-50/50 flex items-center justify-center px-4 relative overflow-hidden">
      
      {/* Detalhes de luz de fundo ampliados com duas cores fortes para criar profundidade de estúdio */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Card principal com uma discreta borda colorida no topo (de esmeralda para âmbar) */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.08)] p-8 relative z-10 before:absolute before:top-0 before:left-0 before:right-0 before:h-1.5 before:bg-gradient-to-r before:from-emerald-500 before:to-amber-500 before:rounded-t-3xl overflow-hidden">
        
        {/* Header do Login com contraste multicolorido */}
        <div className="flex items-center gap-3 mb-8 mt-2">
          {/* O ícone da loja agora ganhou o contraste do texto laranja/amber sobre o gradiente esmeralda */}
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <Store className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            {/* Título unindo as duas cores da marca: Esmeralda e Âmbar */}
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-800 via-emerald-600 to-amber-600 bg-clip-text text-transparent">
              Sabor & Cia
            </h1>
            <p className="text-xs font-bold text-slate-400 tracking-wide uppercase mt-0.5">Acesso ao sistema ERP</p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-700 font-semibold text-sm">E-mail</Label>
            <Input
              className="bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/10 h-11 rounded-xl transition-all"
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-700 font-semibold text-sm">Senha</Label>
            </div>
            <Input
              className="bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/10 h-11 rounded-xl transition-all"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {/* Botão de ação principal com o gradiente energético que puxa para o Âmbar no final */}
          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-emerald-600 via-emerald-600 to-amber-500 hover:brightness-105 active:scale-[0.98] transition-all duration-200 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 mt-3"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Entrando...
              </span>
            ) : 'Entrar no Sistema'}
          </Button>
        </form>
      </div>
    </div>
  );
}