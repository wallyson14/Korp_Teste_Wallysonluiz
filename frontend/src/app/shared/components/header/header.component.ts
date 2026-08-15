import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * HeaderComponent — sidebar de navegação.
 *
 * F-Q-02/03 CORRIGIDO: a versão anterior usava mat-list-item como atributo
 * de diretiva em elementos <a>. No Angular Material 17 MDC isso é deprecado
 * e gera warnings. Substituído por navegação com estilos próprios — mais
 * controle visual e sem dependência de MatListModule.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-korp">KORP</span>
        <span class="brand-erp">ERP</span>
      </div>

      <nav class="nav">
        <a routerLink="/produtos" routerLinkActive="active" class="nav-item">
          <mat-icon aria-hidden="true">inventory_2</mat-icon>
          <span>Produtos</span>
        </a>
        <a routerLink="/notas" routerLinkActive="active" class="nav-item">
          <mat-icon aria-hidden="true">receipt_long</mat-icon>
          <span>Notas Fiscais</span>
        </a>
      </nav>

      <footer class="sidebar-footer">Sistema de Emissão NF</footer>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        width: 220px;
        min-height: 100vh;
        background: #0f172a;
        display: flex;
        flex-direction: column;
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 100;
      }

      .brand {
        padding: 28px 24px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .brand-korp {
        font-size: 1.5rem;
        font-weight: 800;
        color: #fff;
        font-family: 'DM Sans', sans-serif;
        letter-spacing: 0.04em;
      }

      .brand-erp {
        font-size: 0.7rem;
        color: var(--korp-brand);
        font-weight: 600;
        margin-left: 4px;
        vertical-align: super;
      }

      .nav {
        flex: 1;
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.5);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        font-family: 'DM Sans', sans-serif;
        transition: background 0.15s ease, color 0.15s ease;
      }

      .nav-item:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
      }

      .nav-item.active {
        background: rgba(var(--korp-brand-rgb), 0.15);
        color: var(--korp-brand);
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: inherit;
        flex-shrink: 0;
      }

      .sidebar-footer {
        padding: 16px 24px;
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.18);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
    `,
  ],
})
export class HeaderComponent {}