export const environment = {
  production: true,
  // Em produção as chamadas passam pelo nginx que faz proxy reverso
  estoqueApiUrl: '/api/estoque/v1',
  faturamentoApiUrl: '/api/faturamento/v1',
};