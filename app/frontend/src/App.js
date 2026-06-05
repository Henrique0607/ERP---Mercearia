import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Users from './pages/Users';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import PurchaseNeeds from './pages/PurchaseNeeds';
import Stock from './pages/Stock';
import Financial from './pages/Financial';
import Accounting from './pages/Accounting';
import Audit from './pages/Audit';
import { Toaster } from './components/ui/sonner';
import { canAccessPath, getAllowedPaths, getCurrentUser } from './utils/permissions';

function RequireAuth({ children }) {
  const user = localStorage.getItem('softvet_erp_user');
  return user ? children : <Navigate to="/login" replace />;
}

function RequireRole({ path, children }) {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessPath(user.role, path)) {
    const fallback = getAllowedPaths(user.role)[0] || '/';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<RequireRole path="/"><Dashboard /></RequireRole>} />
          <Route path="produtos" element={<RequireRole path="/produtos"><Products /></RequireRole>} />
          <Route path="clientes" element={<RequireRole path="/clientes"><Customers /></RequireRole>} />
          <Route path="fornecedores" element={<RequireRole path="/fornecedores"><Suppliers /></RequireRole>} />
          <Route path="usuarios" element={<RequireRole path="/usuarios"><Users /></RequireRole>} />
          <Route path="vendas" element={<RequireRole path="/vendas"><Sales /></RequireRole>} />
          <Route path="compras" element={<RequireRole path="/compras"><Purchases /></RequireRole>} />
          <Route path="necessidade-compra" element={<RequireRole path="/necessidade-compra"><PurchaseNeeds /></RequireRole>} />
          <Route path="estoque" element={<RequireRole path="/estoque"><Stock /></RequireRole>} />
          <Route path="financeiro" element={<RequireRole path="/financeiro"><Financial /></RequireRole>} />
          <Route path="contabilidade" element={<RequireRole path="/contabilidade"><Accounting /></RequireRole>} />
          <Route path="auditoria" element={<RequireRole path="/auditoria"><Audit /></RequireRole>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
