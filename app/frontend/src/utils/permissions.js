export const ROLE_LABELS = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  VENDEDOR: 'Vendedor',
  COMPRADOR: 'Comprador',
  FINANCEIRO: 'Financeiro',
  ATENDENTE: 'Atendente',
  AUDITOR: 'Auditor',
  TI: 'TI',
};

export const ROLE_DESCRIPTIONS = {
  ADMIN:
    'Acesso total: usuarios, cadastros, compras, vendas, financeiro, contabilidade e auditoria.',

  GERENTE:
    'Acesso gerencial: cadastros, compras, vendas, estoque, financeiro e contabilidade. Nao gerencia usuarios.',

  VENDEDOR:
    'Acesso operacional: clientes, produtos, vendas e consulta de estoque.',

  COMPRADOR:
    'Responsavel pelas compras, fornecedores, estoque e necessidade de compra.',

  FINANCEIRO:
    'Controle financeiro, contas, fluxo de caixa e relatorios.',

  ATENDENTE:
    'Responsavel pelo atendimento, clientes e vendas.',

  AUDITOR:
  'Acesso somente leitura para auditoria, relatorios, financeiro, vendas e logs do sistema. Nao pode alterar dados.',

  TI: 
    'Acesso tecnico: Cadastro de usuarios. Nao tem acesso a dados de negocio.',
};

const ROLE_ACCESS = {
  ADMIN: [
    '/',
    '/produtos',
    '/clientes',
    '/fornecedores',
    '/usuarios',
    '/vendas',
    '/compras',
    '/necessidade-compra',
    '/estoque',
    '/financeiro',
    '/contabilidade',
    '/auditoria',
  ],

  GERENTE: [
    '/',
    '/produtos',
    '/clientes',
    '/fornecedores',
    '/vendas',
    '/compras',
    '/necessidade-compra',
    '/estoque',
    '/financeiro',
    '/contabilidade',
  ],

  VENDEDOR: [
    '/',
    '/produtos',
    '/clientes',
    '/vendas',
    '/estoque',
  ],

  COMPRADOR: [
    '/',
    '/fornecedores',
    '/compras',
    '/necessidade-compra',
    '/estoque',
    '/produtos',
  ],

  FINANCEIRO: [
    '/',
    '/financeiro',
    '/contabilidade',
  ],

  ATENDENTE: [
    '/',
    '/clientes',
    '/vendas',
    '/produtos',
  ],

  AUDITOR: [
    '/auditoria',
  ],

  TI: [
    '/usuarios',
  ],
};

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('softvet_erp_user') || 'null');
  } catch {
    localStorage.removeItem('softvet_erp_user');
    return null;
  }
}

export function canAccessPath(role, path) {
  return (ROLE_ACCESS[role] || []).includes(path);
}

export function getAllowedPaths(role) {
  return ROLE_ACCESS[role] || [];
}