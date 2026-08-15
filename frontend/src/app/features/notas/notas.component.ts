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
import { Subject, takeUntil, finalize } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { NotaService } from '../../core/services/nota.service';
import { ProdutoService } from '../../core/services/produto.service';
import { NotaFiscal, Produto, ItemNota } from '../../core/models/models';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * NotasComponent — tela de gestão de notas fiscais.
 *
 * Ciclos de vida Angular:
 * - ngOnInit: assina os dois BehaviorSubjects (notas$ e produtos$) e
 *   dispara os carregamentos iniciais em paralelo — sem Promise.all
 *   porque RxJS subscribers são independentes.
 * - ngOnDestroy: emite no destroy$ e limpa o Map de formulários para
 *   liberar todos os FormGroup criados dinamicamente.
 *
 * RxJS utilizado:
 * - takeUntil(destroy$): protege todas as subscriptions contra memory leak.
 * - finalize(): garante reset de estado (spinners de impressão/criação)
 *   tanto em caso de sucesso quanto de erro — comportamento equivalente
 *   ao bloco finally em try/catch.
 * - BehaviorSubject (nos serviços): estado reativo sem polling HTTP.
 *
 * F-BUG-02 CORRIGIDO: MatChipsModule removido — não é usado no template.
 * F-BUG-03 CORRIGIDO: formsItem migrado de Record<number, FormGroup>
 *   para Map<number, FormGroup>. O método getFormItem() agora é puro —
 *   não cria efeito colateral no template. No template, os bindings que
 *   chamam getFormItem() são seguros porque Map.get() é idempotente.
 * F-BUG-04 CORRIGIDO: ngOnDestroy limpa o Map inteiro, e deletarNota()
 *   remove a entrada específica do formulário ao deletar a nota.
 * F-BUG-13 CORRIGIDO: carregando = true no campo (não no método).
 */
@Component({
  selector: 'app-notas',
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
    MatExpansionModule,
    MatSelectModule,
    MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Notas Fiscais</h1>
          <p class="page-subtitle">
            Emita e gerencie notas com controle automático de estoque
          </p>
        </div>
        <button
          mat-flat-button
          color="primary"
          (click)="criarNota()"
          [disabled]="criando"
        >
          <mat-spinner *ngIf="criando" diameter="16" class="inline-spinner"></mat-spinner>
          <mat-icon *ngIf="!criando">add</mat-icon>
          {{ criando ? 'Criando...' : 'Nova Nota' }}
        </button>
      </div>

      <!-- Loading -->
      <div class="loading-container" *ngIf="carregando">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Carregando notas fiscais...</p>
      </div>

      <!-- Accordion de notas -->
      <mat-accordion *ngIf="!carregando" class="notas-accordion" [multi]="false">
        <mat-expansion-panel
          *ngFor="let nota of notas; trackBy: trackByNota"
          class="nota-panel"
          [class.panel-fechada]="nota.status === 'Fechada'"
        >
          <mat-expansion-panel-header>
            <mat-panel-title class="panel-title">
              <span class="nota-numero">NF #{{ nota.numero | number: '5.0-0' }}</span>
              <span
                class="status-chip"
                [class.status-aberta]="nota.status === 'Aberta'"
                [class.status-fechada]="nota.status === 'Fechada'"
              >
                <mat-icon class="status-icon">
                  {{ nota.status === 'Aberta' ? 'lock_open' : 'lock' }}
                </mat-icon>
                {{ nota.status }}
              </span>
            </mat-panel-title>
            <mat-panel-description>
              {{ (nota.itens?.length ?? 0) }}
              {{ (nota.itens?.length ?? 0) === 1 ? 'item' : 'itens' }}
              &nbsp;·&nbsp;
              {{ nota.created_at | date: 'dd/MM/yyyy HH:mm' }}
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="nota-body">
            <!-- Tabela de itens -->
            <table
              mat-table
              [dataSource]="nota.itens ?? []"
              class="itens-table"
              *ngIf="nota.itens?.length"
            >
              <ng-container matColumnDef="codigo">
                <th mat-header-cell *matHeaderCellDef>Código</th>
                <td mat-cell *matCellDef="let item">
                  <span class="codigo-badge">{{ item.codigo_produto }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="descricao">
                <th mat-header-cell *matHeaderCellDef>Produto</th>
                <td mat-cell *matCellDef="let item">{{ item.descricao }}</td>
              </ng-container>

              <ng-container matColumnDef="quantidade">
                <th mat-header-cell *matHeaderCellDef>Quantidade</th>
                <td mat-cell *matCellDef="let item">
                  <strong>{{ item.quantidade }}</strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="remover">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let item" class="acoes-cell">
                  <button
                    mat-icon-button
                    color="warn"
                    matTooltip="Remover item"
                    *ngIf="nota.status === 'Aberta'"
                    (click)="removerItem(nota, item)"
                  >
                    <mat-icon>remove_circle_outline</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="colunasItens"></tr>
              <tr mat-row *matRowDef="let row; columns: colunasItens"></tr>
            </table>

            <div class="sem-itens" *ngIf="!nota.itens?.length">
              <mat-icon>playlist_add</mat-icon>
              <p>Nenhum item adicionado</p>
            </div>

            <!-- Formulário de item — visível apenas para notas Abertas -->
            <ng-container *ngIf="nota.status === 'Aberta'">
              <mat-divider class="divider"></mat-divider>
              <div class="add-item-section">
                <h3 class="section-title">Adicionar Produto</h3>
                <!--
                  F-BUG-03 CORRIGIDO: getFormItem() é chamado apenas aqui,
                  uma vez por nota no template, e retorna o FormGroup do Map
                  sem criar efeito colateral. O binding [formGroup] recebe
                  o mesmo objeto de referência enquanto a nota existir.
                -->
                <form
                  [formGroup]="getFormItem(nota.id)"
                  (ngSubmit)="adicionarItem(nota)"
                  class="item-form"
                >
                  <mat-form-field appearance="outline" class="field-produto">
                    <mat-label>Produto</mat-label>
                    <mat-select formControlName="produto_id">
                      <mat-option *ngFor="let p of produtos" [value]="p.id">
                        <span class="opt-codigo">{{ p.codigo }}</span>
                        — {{ p.descricao }}
                        <span class="opt-saldo">(saldo: {{ p.saldo }})</span>
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="field-qtd">
                    <mat-label>Quantidade</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="quantidade"
                      min="1"
                    />
                  </mat-form-field>

                  <button
                    mat-flat-button
                    color="accent"
                    type="submit"
                    [disabled]="getFormItem(nota.id).invalid || !!adicionando[nota.id]"
                    class="btn-add"
                  >
                    <mat-spinner
                      *ngIf="adicionando[nota.id]"
                      diameter="16"
                      class="inline-spinner"
                    ></mat-spinner>
                    <mat-icon *ngIf="!adicionando[nota.id]">add</mat-icon>
                    Adicionar
                  </button>
                </form>
              </div>
            </ng-container>

            <!-- Ações da nota -->
            <mat-divider class="divider"></mat-divider>
            <div class="nota-acoes">
              <!--
                Botão de impressão — requisito central do desafio.
                Desabilitado automaticamente para notas Fechadas.
                Exibe spinner individual (imprimindo[nota.id]) enquanto
                o backend processa: valida saldos + baixa estoque + fecha nota.
              -->
              <button
                mat-flat-button
                color="primary"
                (click)="imprimir(nota)"
                [disabled]="nota.status !== 'Aberta' || !!imprimindo[nota.id]"
                [matTooltip]="
                  nota.status === 'Fechada'
                    ? 'Esta nota já foi impressa e fechada'
                    : 'Imprimir nota e baixar estoque'
                "
              >
                <mat-spinner
                  *ngIf="imprimindo[nota.id]"
                  diameter="18"
                  class="inline-spinner"
                ></mat-spinner>
                <mat-icon *ngIf="!imprimindo[nota.id]">print</mat-icon>
                {{ imprimindo[nota.id] ? 'Processando...' : 'Imprimir Nota' }}
              </button>

              <button
                mat-stroked-button
                color="warn"
                *ngIf="nota.status === 'Aberta'"
                (click)="confirmarDeletar(nota)"
              >
                <mat-icon>delete_outline</mat-icon>
                Excluir
              </button>
            </div>
          </div>
        </mat-expansion-panel>

        <!-- Estado vazio -->
        <div class="empty-state" *ngIf="!notas.length">
          <mat-icon>receipt_long</mat-icon>
          <h3>Nenhuma nota fiscal</h3>
          <p>Clique em "Nova Nota" para começar</p>
        </div>
      </mat-accordion>
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

      .notas-accordion {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .nota-panel {
        border-radius: 12px !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06) !important;
        border: 1px solid #e2e8f0;
      }

      .panel-fechada {
        opacity: 0.7;
      }

      .panel-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .nota-numero {
        font-family: 'DM Sans', sans-serif;
        font-weight: 700;
        font-size: 1rem;
        color: #0f172a;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 10px 2px 6px;
        border-radius: 20px;
        font-size: 0.72rem;
        font-weight: 600;
      }

      .status-aberta {
        background: #dcfce7;
        color: #16a34a;
      }

      .status-fechada {
        background: #f1f5f9;
        color: #64748b;
      }

      .status-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      .nota-body {
        padding: 4px 0 8px;
      }

      .itens-table {
        width: 100%;
      }

      th.mat-header-cell {
        font-size: 0.72rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 10px 16px;
      }

      td.mat-cell {
        padding: 10px 16px;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
      }

      .acoes-cell {
        text-align: right;
        padding-right: 8px;
      }

      .codigo-badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        background: #f1f5f9;
        padding: 2px 7px;
        border-radius: 4px;
        color: #475569;
      }

      .sem-itens {
        text-align: center;
        padding: 24px;
        color: #cbd5e1;
      }

      .sem-itens mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        display: block;
        margin: 0 auto 6px;
      }

      .divider {
        margin: 16px 0;
      }

      .add-item-section {
        padding: 0 16px;
      }

      .section-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #475569;
        margin: 0 0 12px;
      }

      .item-form {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }

      .field-produto {
        flex: 2;
        min-width: 200px;
      }

      .field-qtd {
        flex: 0 0 130px;
      }

      .btn-add {
        height: 56px;
        gap: 4px;
      }

      .opt-codigo {
        font-family: monospace;
        font-size: 0.8rem;
        color: #64748b;
      }

      .opt-saldo {
        color: #94a3b8;
        font-size: 0.8rem;
      }

      .nota-acoes {
        display: flex;
        gap: 10px;
        padding: 0 16px;
        flex-wrap: wrap;
      }

      .inline-spinner {
        display: inline-block;
        margin-right: 6px;
        vertical-align: middle;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 60px;
        color: #94a3b8;
      }

      .empty-state {
        text-align: center;
        padding: 64px;
        color: #cbd5e1;
        background: #fff;
        border-radius: 12px;
        border: 1px dashed #e2e8f0;
      }

      .empty-state mat-icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        display: block;
        margin: 0 auto 12px;
      }

      .empty-state h3 {
        margin: 0 0 4px;
        color: #94a3b8;
      }

      .empty-state p {
        margin: 0;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class NotasComponent implements OnInit, OnDestroy {
  private readonly notaService = inject(NotaService);
  private readonly produtoService = inject(ProdutoService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();

  // F-BUG-03/04 CORRIGIDO: Map em vez de Record para armazenar FormGroups.
  // Map.has() e Map.delete() são semântica correta para coleções dinâmicas.
  // Record<number, FormGroup> usa coerção de tipo implícita (chave vira string)
  // e não possui método delete() nativo — Map é a estrutura certa aqui.
  private readonly formsItem = new Map<number, FormGroup>();

  notas: NotaFiscal[] = [];
  produtos: Produto[] = [];
  colunasItens = ['codigo', 'descricao', 'quantidade', 'remover'];

  // F-BUG-13 CORRIGIDO: true desde o início
  carregando = true;
  criando = false;

  // Mapas de estado de loading por nota
  imprimindo: Record<number, boolean> = {};
  adicionando: Record<number, boolean> = {};

  ngOnInit(): void {
    this.notaService.notas$.pipe(takeUntil(this.destroy$)).subscribe((notas) => {
      this.notas = notas.map((n) => ({ ...n, itens: n.itens ?? [] }));
      this.carregando = false;
      this.cdr.markForCheck();
    });

    this.produtoService.produtos$
      .pipe(takeUntil(this.destroy$))
      .subscribe((produtos) => {
        this.produtos = produtos;
        this.cdr.markForCheck();
      });

    // Carregamentos iniciais em paralelo
    this.notaService.listar().pipe(takeUntil(this.destroy$)).subscribe();
    this.produtoService.listar().pipe(takeUntil(this.destroy$)).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // F-BUG-04 CORRIGIDO: limpa todos os FormGroups do Map ao destruir
    this.formsItem.clear();
  }

  // F-BUG-03 CORRIGIDO: getFormItem é idempotente — retorna sempre o mesmo
  // FormGroup para uma nota, sem criar efeito colateral na segunda chamada.
  // Seguro para uso em template binding com OnPush.
  getFormItem(notaId: number): FormGroup {
    if (!this.formsItem.has(notaId)) {
      this.formsItem.set(
        notaId,
        this.fb.group({
          produto_id: [null, Validators.required],
          quantidade: [1, [Validators.required, Validators.min(1)]],
        })
      );
    }
    return this.formsItem.get(notaId)!;
  }

  // trackBy evita que o Angular recrie todos os painéis ao re-renderizar a lista
  trackByNota(_: number, nota: NotaFiscal): number {
    return nota.id;
  }

  criarNota(): void {
    this.criando = true;
    this.notaService
      .criar()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.criando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  adicionarItem(nota: NotaFiscal): void {
    const form = this.getFormItem(nota.id);
    if (form.invalid) return;

    this.adicionando[nota.id] = true;
    this.cdr.markForCheck();

    this.notaService
      .adicionarItem(nota.id, form.value)
      .pipe(
        takeUntil(this.destroy$),
        // finalize: reseta o spinner mesmo se o backend retornar erro
        finalize(() => {
          this.adicionando[nota.id] = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => form.reset({ quantidade: 1 }),
      });
  }

  removerItem(nota: NotaFiscal, item: ItemNota): void {
    this.notaService
      .removerItem(nota.id, item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * imprimir — fluxo principal do desafio:
   *
   * 1. imprimindo[nota.id] = true → spinner visível na UI imediatamente
   * 2. POST /notas/:id/imprimir → backend executa em duas fases:
   *    - FASE 1: valida saldo de todos os itens (sem modificar nada)
   *    - FASE 2: baixa cada saldo via SELECT FOR UPDATE + fecha a nota
   * 3. Em sucesso: snackbar de confirmação, nota aparece como Fechada
   * 4. Em erro: interceptor HTTP exibe mensagem do backend via snackbar
   * 5. finalize(): imprimindo[nota.id] = false independente do resultado
   */
  imprimir(nota: NotaFiscal): void {
    this.imprimindo[nota.id] = true;
    this.cdr.markForCheck();

    this.notaService
      .imprimir(nota.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.imprimindo[nota.id] = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (res) => {
          this.snackBar.open(
            `✅ NF #${res.nota.numero} impressa e fechada com sucesso!`,
            'OK',
            { duration: 5000, panelClass: ['snack-success'] }
          );
        },
      });
  }

  confirmarDeletar(nota: NotaFiscal): void {
    const data: ConfirmDialogData = {
      title: 'Excluir Nota Fiscal',
      message: `Deseja excluir a NF #${nota.numero}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '420px' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmado: boolean) => {
        if (!confirmado) return;
        this.notaService
          .deletar(nota.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // F-BUG-04 CORRIGIDO: remove o FormGroup da nota deletada do Map
              this.formsItem.delete(nota.id);
            },
          });
      });
  }
}