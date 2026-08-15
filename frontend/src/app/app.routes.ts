import { Routes } from '@angular/router';

/**
 * Rotas com lazy loading: cada feature é carregada apenas quando acessada.
 * O Angular compila cada rota em um chunk separado, reduzindo o bundle inicial.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'produtos',
    pathMatch: 'full',
  },
  {
    path: 'produtos',
    loadComponent: () =>
      import('./features/produtos/produtos.component').then(
        (m) => m.ProdutosComponent
      ),
    title: 'Produtos — Korp ERP',
  },
  {
    path: 'notas',
    loadComponent: () =>
      import('./features/notas/notas.component').then(
        (m) => m.NotasComponent
      ),
    title: 'Notas Fiscais — Korp ERP',
  },
  {
    path: '**',
    redirectTo: 'produtos',
  },
];