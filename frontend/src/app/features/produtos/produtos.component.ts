import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ProdutoService } from '../../core/services/produto.service';
import { Produto } from '../../core/models/models';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * ProdutosComponent — tela de cadastro e listagem de produtos.
 *
 * Ciclos de vida Angular:
 * - ngOnInit: assina o BehaviorSubject do serviço e dispara o carregamento
 *   inicial. A subscription é protegida por takeUntil(destroy$).
 * - ngOnDestroy: emite no destroy$ para cancelar todas as subscriptions
 *   ativas, prevenindo memory leaks ao navegar para outra rota.
 *
 */
@Component({
  selector: 'app-produtos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Produtos</h1>
          <p class="page-subtitle">Gerencie o catálogo e os saldos de estoque</p>
        </div>
        <button
          mat-flat-button
          color="primary"
          (click)="abrirFormulario()"
          *ngIf="!mostrarFormulario"
        >
          <mat-icon>add</mat-icon>
          Novo Produto
        </button>
      </div>

      <!-- Formulário de cadastro / edição -->
      <div class="card form-card" *ngIf="mostrarFormulario">
        <h2 class="card-title">
          {{ produtoEditando ? 'Editar Produto' : 'Novo Produto' }}
        </h2>
        <form [formGroup]="form" (ngSubmit)="salvar()" class="form-grid">
          <mat-form-field appearance="outline" *ngIf="!produtoEditando">
            <mat-label>Código</mat-label>
            <input
              matInput
              formControlName="codigo"
              placeholder="Ex: PROD-001"
              (input)="normalizarCodigo($event)"
            />
            <mat-hint>Será convertido para maiúsculas automaticamente</mat-hint>
            <mat-error *ngIf="form.get('codigo')?.hasError('required')">
              Código é obrigatório
            </mat-error>
            <mat-error *ngIf="form.get('codigo')?.hasError('maxlength')">
              Máximo 50 caracteres
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Descrição</mat-label>
            <input matInput formControlName="descricao" placeholder="Nome do produto" />
            <mat-error *ngIf="form.get('descricao')?.hasError('required')">
              Descrição é obrigatória
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Saldo em Estoque</mat-label>
            <input matInput type="number" formControlName="saldo" min="0" />
            <mat-error *ngIf="form.get('saldo')?.hasError('min')">
              Saldo não pode ser negativo
            </mat-error>
          </mat-form-field>

          <div class="form-actions">
            <button mat-button type="button" (click)="cancelar()">Cancelar</button>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || salvando"
            >
              <mat-spinner
                *ngIf="salvando"
                diameter="18"
                class="inline-spinner"
              ></mat-spinner>
              {{ salvando ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Loading state -->
      <div class="loading-container" *ngIf="carregando">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Carregando produtos...</p>
      </div>

      <!-- Tabela -->
      <div class="card table-card" *ngIf="!carregando">
        <table mat-table [dataSource]="produtos" class="korp-table">
          <ng-container matColumnDef="codigo">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let p">
              <span class="codigo-badge">{{ p.codigo }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="descricao">
            <th mat-header-cell *matHeaderCellDef>Descrição</th>
            <td mat-cell *matCellDef="let p">{{ p.descricao }}</td>
          </ng-container>

          <ng-container matColumnDef="saldo">
            <th mat-header-cell *matHeaderCellDef>Saldo</th>
            <td mat-cell *matCellDef="let p">
              <span
                class="saldo-badge"
                [class.saldo-ok]="p.saldo > 5"
                [class.saldo-baixo]="p.saldo > 0 && p.saldo <= 5"
                [class.saldo-zero]="p.saldo === 0"
              >
                {{ p.saldo }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p" class="acoes-cell">
              <button mat-icon-button matTooltip="Editar" (click)="editar(p)">
                <mat-icon>edit</mat-icon>
              </button>
              <button
                mat-icon-button
                color="warn"
                matTooltip="Excluir"
                (click)="confirmarDelecao(p)"
              >
                <mat-icon>delete_outline</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas" class="table-row"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="no-data-cell" [attr.colspan]="colunas.length">
              <mat-icon>inventory_2</mat-icon>
              <p>Nenhum produto cadastrado ainda</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 32px;
        max-width: 1100px;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 28px;
      }

      .page-title {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
        color: #0f172a;
        font-family: 'DM Sans', sans-serif;
      }

      .page-subtitle {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 0.9rem;
      }

      .card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        margin-bottom: 20px;
      }

      .form-card {
        padding: 24px;
        border-left: 3px solid var(--korp-brand);
      }

      .card-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 20px;
        color: #0f172a;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0 16px;
      }

      .form-actions {
        grid-column: 1 / -1;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        padding-top: 8px;
      }

      .korp-table {
        width: 100%;
      }

      .table-row:hover {
        background: #f8fafc;
      }

      th.mat-header-cell {
        font-size: 0.72rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 12px 16px;
      }

      td.mat-cell {
        padding: 12px 16px;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
      }

      .codigo-badge {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.8rem;
        background: #f1f5f9;
        padding: 3px 8px;
        border-radius: 4px;
        color: #475569;
      }

      .saldo-badge {
        font-weight: 600;
        padding: 2px 12px;
        border-radius: 20px;
        font-size: 0.875rem;
      }

      .saldo-ok {
        background: #dcfce7;
        color: #16a34a;
      }

      .saldo-baixo {
        background: #fef9c3;
        color: #ca8a04;
      }

      .saldo-zero {
        background: #fee2e2;
        color: #dc2626;
      }

      .acoes-cell {
        text-align: right;
        white-space: nowrap;
        padding-right: 8px;
      }

      .no-data-cell {
        text-align: center;
        padding: 56px;
        color: #94a3b8;
      }

      .no-data-cell mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        display: block;
        margin: 0 auto 8px;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 60px;
        color: #94a3b8;
      }

      .inline-spinner {
        display: inline-block;
        margin-right: 8px;
        vertical-align: middle;
      }
    `,
  ],
})
export class ProdutosComponent implements OnInit, OnDestroy {
  private readonly service = inject(ProdutoService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();

  produtos: Produto[] = [];
  colunas = ['codigo', 'descricao', 'saldo', 'acoes'];

  // carregando=false antes dos dados chegarem
  carregando = true;
  salvando = false;
  mostrarFormulario = false;
  produtoEditando: Produto | null = null;

  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(50)]],
    descricao: ['', [Validators.required, Validators.maxLength(200)]],
    saldo: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.service.produtos$.pipe(takeUntil(this.destroy$)).subscribe((lista) => {
      this.produtos = lista;
      this.carregando = false;
      this.cdr.markForCheck();
    });

    this.service.listar().pipe(takeUntil(this.destroy$)).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  normalizarCodigo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const pos = input.selectionStart ?? 0;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(pos, pos);
    this.form.get('codigo')?.setValue(input.value, { emitEvent: false });
  }

  abrirFormulario(): void {
    this.produtoEditando = null;
    this.form.reset({ saldo: 0 });
    this.form.get('codigo')?.enable();
    this.mostrarFormulario = true;
  }

  editar(produto: Produto): void {
    this.produtoEditando = produto;
    this.form.patchValue({ descricao: produto.descricao, saldo: produto.saldo });
    // Código é imutável após criação — desabilitamos para deixar claro na UI
    this.form.get('codigo')?.disable();
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.produtoEditando = null;
    this.form.reset({ saldo: 0 });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.salvando = true;

    const obs$ = this.produtoEditando
      ? this.service.atualizar(this.produtoEditando.id, {
          descricao: this.form.value.descricao,
          saldo: this.form.value.saldo,
        })
      : this.service.criar(this.form.getRawValue());

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.salvando = false;
        this.cancelar();
        this.snackBar.open('Produto salvo com sucesso!', 'OK', {
          duration: 3000,
          panelClass: ['snack-success'],
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.salvando = false;
        this.cdr.markForCheck();
      },
    });
  }

  confirmarDelecao(produto: Produto): void {
    const data: ConfirmDialogData = {
      title: 'Excluir Produto',
      message: `Deseja excluir "${produto.descricao}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '420px' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmado: boolean) => {
        if (!confirmado) return;
        this.service
          .deletar(produto.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () =>
              this.snackBar.open('Produto excluído.', 'OK', {
                duration: 3000,
              }),
          });
      });
  }
}
