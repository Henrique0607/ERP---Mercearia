/**
 * Valida um número de CNPJ baseado no algoritmo de dígitos verificadores.
 * @param {string} cnpj - O CNPJ a ser validado (com ou sem máscara).
 * @returns {boolean} - Verdadeiro se o CNPJ for válido.
 */
export const validateCNPJ = (cnpj) => {
  if (!cnpj) return false;

  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/[^\d]+/g, '');

  // Verifica se tem 14 dígitos ou se é uma sequência repetida conhecida
  if (cleanCNPJ.length !== 14 || !!cleanCNPJ.match(/(\d)\1{13}/)) {
    return false;
  }

  // Algoritmo de validação
  const size = cleanCNPJ.length - 2;
  const numbers = cleanCNPJ.substring(0, size);
  const digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  sum = 0;
  const size2 = size + 1;
  const numbers2 = cleanCNPJ.substring(0, size2);
  pos = size2 - 7;

  for (let i = size2; i >= 1; i--) {
    sum += numbers2.charAt(size2 - i) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
};

/**
 * Valida um número de CPF baseado no algoritmo de dígitos verificadores.
 * @param {string} cpf - O CPF a ser validado (com ou sem máscara).
 * @returns {boolean} - Verdadeiro se o CPF for válido.
 */
export const validateCPF = (cpf) => {
  if (!cpf) return false;

  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/[^\d]+/g, '');

  // Verifica se tem 11 dígitos ou se é uma sequência repetida conhecida
  if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) {
    return false;
  }

  // Algoritmo de validação
  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
};
