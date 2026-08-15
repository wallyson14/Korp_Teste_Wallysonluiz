import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  NotaFiscal,
  AdicionarItemDTO,
  ItemNota,
  ImprimirNotaResponse,
} from '../models/models';

/**
 * NotaService — camada de acesso à API do faturamento-service.
 *
 * Mesmo padrão de BehaviorSubject + switchMap do ProdutoService.
 * F-BUG-06 CORRIGIDO: adicionarItem e removerItem agora têm tipagem
 * forte (ItemNota e { message: string }) em vez de Observable<unknown>.
 */
@Injectable({ providedIn: 'root' })
export class NotaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.faturamentoApiUrl}/notas`;

  private readonly _notas$ = new BehaviorSubject<NotaFiscal[]>([]);
  readonly notas$ = this._notas$.asObservable();

  listar(): Observable<NotaFiscal[]> {
    return this.http
      .get<NotaFiscal[]>(this.baseUrl)
      .pipe(tap((notas) => this._notas$.next(notas)));
  }

  buscarPorId(id: number): Observable<NotaFiscal> {
    return this.http.get<NotaFiscal>(`${this.baseUrl}/${id}`);
  }

  criar(): Observable<NotaFiscal> {
    // F-BUG-07: backend Go não exige body no POST /notas, mas alguns
    // proxies rejeitam POST sem Content-Type. Enviamos {} por segurança.
    return this.http.post<NotaFiscal>(this.baseUrl, {}).pipe(
      switchMap((nota) => this.listar().pipe(switchMap(() => of(nota))))
    );
  }

  adicionarItem(notaId: number, dto: AdicionarItemDTO): Observable<ItemNota> {
    return this.http
      .post<ItemNota>(`${this.baseUrl}/${notaId}/itens`, dto)
      .pipe(
        switchMap((item) => this.listar().pipe(switchMap(() => of(item))))
      );
  }

  removerItem(
    notaId: number,
    itemId: number
  ): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(
        `${this.baseUrl}/${notaId}/itens/${itemId}`
      )
      .pipe(
        switchMap((res) => this.listar().pipe(switchMap(() => of(res))))
      );
  }

  imprimir(notaId: number): Observable<ImprimirNotaResponse> {
    return this.http
      .post<ImprimirNotaResponse>(`${this.baseUrl}/${notaId}/imprimir`, {})
      .pipe(
        switchMap((res) => this.listar().pipe(switchMap(() => of(res))))
      );
  }

  deletar(notaId: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/${notaId}`)
      .pipe(
        switchMap((res) => this.listar().pipe(switchMap(() => of(res))))
      );
  }
}