import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Stock from './pages/Stock';
import Financial from './pages/Financial';
import Accounting from './pages/Accounting';
import Audit from './pages/Audit';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="produtos" element={<Products />} />
          <Route path="clientes" element={<Customers />} />
          <Route path="fornecedores" element={<Suppliers />} />
          <Route path="vendas" element={<Sales />} />
          <Route path="compras" element={<Purchases />} />
          <Route path="estoque" element={<Stock />} />
          <Route path="financeiro" element={<Financial />} />
          <Route path="contabilidade" element={<Accounting />} />
          <Route path="auditoria" element={<Audit />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
