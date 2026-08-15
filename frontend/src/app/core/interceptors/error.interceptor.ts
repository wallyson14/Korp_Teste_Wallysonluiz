import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor funcional (Angular 17+) que centraliza o tratamento de erros HTTP.
 *
 * Ciclo de vida Angular utilizado: nenhum hook de componente — este interceptor
 * age na camada de infraestrutura via injeção de dependência funcional.
 *
 * Por que interceptor e não try/catch em cada serviço?
 * - Evita duplicação de lógica de erro em cada serviço
 * - Garante feedback visual consistente independente de qual serviço falhou
 * - Centraliza o mapeamento de HTTP status → mensagem amigável
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let mensagem = 'Ocorreu um erro inesperado.';

      if (error.status === 0) {
        // Status 0 = sem resposta do servidor (serviço down, CORS, rede)
        mensagem = '⚠️ Serviço indisponível. Verifique se o backend está rodando.';
      } else if (error.error?.error) {
        // Mensagem de erro estruturada vinda do backend Go
        mensagem = error.error.error;
        if (error.error.itens?.length) {
          mensagem += ': ' + error.error.itens.join('; ');
        }
      } else {
        switch (error.status) {
          case 400: mensagem = 'Requisição inválida.'; break;
          case 404: mensagem = 'Recurso não encontrado.'; break;
          case 409: mensagem = 'Conflito: registro duplicado.'; break;
          case 422: mensagem = error.error?.error ?? 'Dados inválidos.'; break;
          case 503: mensagem = 'Serviço temporariamente indisponível.'; break;
          default:  mensagem = `Erro ${error.status}: ${error.statusText}`; break;
        }
      }

      snackBar.open(mensagem, 'Fechar', {
        duration: 6000,
        panelClass: ['snack-error'],
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });

      // Re-lança o erro para que os componentes possam reagir se necessário
      return throwError(() => error);
    })
  );
};