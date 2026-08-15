import { Routes } from '@angular/router';

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
