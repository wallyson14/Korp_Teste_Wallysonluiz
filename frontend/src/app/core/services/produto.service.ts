import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Produto, CriarProdutoDTO, AtualizarProdutoDTO } from '../models/models';

/**
 * ProdutoService — camada de acesso à API do estoque-service.
 *
 * Uso de RxJS:
 * - BehaviorSubject<Produto[]>: mantém o estado reativo da lista em memória.
 *   Subscribers recebem o último valor emitido imediatamente ao assinar,
 *   o que elimina a necessidade de re-fetch em cada navegação de rota.
 *
 * - tap(): efeito colateral puro após operações de escrita — atualiza o
 *   BehaviorSubject via listar() sem quebrar a cadeia de operadores.
 *
 * - switchMap(): nas operações de escrita (criar/atualizar/deletar),
 *   encadeia a re-listagem de forma controlada. switchMap cancela
 *   chamadas anteriores em voo se uma nova chegar antes — seguro para
 *   operações que modificam estado.
 *
 * F-Q-01 CORRIGIDO: a versão anterior fazia tap(() => this.listar().subscribe())
 * criando uma subscription aninhada e anônima sem cleanup — se o componente
 * fosse destruído antes do tap completar, a subscription órfã permanecia viva.
 * Agora usamos switchMap() para encadear a re-listagem na própria cadeia
 * Observable, sujeita ao mesmo takeUntil() do componente subscriber.
 */
@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.estoqueApiUrl}/produtos`;

  // BehaviorSubject privado — somente o serviço pode emitir novos valores.
  // Componentes acessam apenas o Observable público (produtos$).
  private readonly _produtos$ = new BehaviorSubject<Produto[]>([]);
  readonly produtos$ = this._produtos$.asObservable();

  listar(): Observable<Produto[]> {
    return this.http.get<Produto[]>(this.baseUrl).pipe(
      tap((produtos) => this._produtos$.next(produtos))
    );
  }

  buscarPorId(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${this.baseUrl}/${id}`);
  }

  criar(dto: CriarProdutoDTO): Observable<Produto> {
    return this.http.post<Produto>(this.baseUrl, dto).pipe(
      // switchMap encadeia o listar() na mesma cadeia — sem subscription órfã
      switchMap((criado) => this.listar().pipe(switchMap(() => of(criado))))
    );
  }

  atualizar(id: number, dto: AtualizarProdutoDTO): Observable<Produto> {
    return this.http.put<Produto>(`${this.baseUrl}/${id}`, dto).pipe(
      switchMap((atualizado) =>
        this.listar().pipe(switchMap(() => of(atualizado)))
      )
    );
  }

  deletar(id: number): Observable<{ message: string }> {
    // F-BUG-08 CORRIGIDO: tipado com o formato real de resposta do backend Go
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/${id}`)
      .pipe(switchMap((res) => this.listar().pipe(switchMap(() => of(res)))));
  }
}