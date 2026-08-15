import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error.interceptor';

/**
 * Configuração da aplicação no modelo standalone do Angular 17.
 *
 * Não há mais AppModule — toda a configuração de providers é feita aqui
 * e passada para o bootstrapApplication() no main.ts.
 *
 * provideHttpClient(withInterceptors([errorInterceptor])):
 *   Registra o interceptor funcional de erros globalmente.
 *   Qualquer erro HTTP em qualquer serviço da app passa por ele.
 *
 * provideRouter(routes, withComponentInputBinding()):
 *   Habilita o binding automático de parâmetros de rota como @Input()
 *   nos componentes, sem precisar injetar ActivatedRoute manualmente.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideAnimations(),
  ],
};