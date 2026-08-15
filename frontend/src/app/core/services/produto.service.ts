import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Produto, CriarProdutoDTO, AtualizarProdutoDTO } from '../models/models';

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
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/${id}`)
      .pipe(switchMap((res) => this.listar().pipe(switchMap(() => of(res)))));
  }
}
