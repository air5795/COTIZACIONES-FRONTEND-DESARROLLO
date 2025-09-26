// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SessionService } from '../servicios/auth/session.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  // ✅ Lista de URLs externas que NO deben llevar token
  private readonly EXTERNAL_URLS = [
    'maps.googleapis.com',
    'google.com',
    'googleapis.com',
    'gstatic.com',
    // Agrega aquí otras URLs externas si es necesario
  ];

  constructor(
    private sessionService: SessionService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    
    // 1. Verificar si la URL es externa
    const isExternalUrl = this.EXTERNAL_URLS.some(url => request.url.includes(url));
    
    if (isExternalUrl) {
      console.log('🌍 Petición externa detectada (sin token):', request.url);
      // No agregar token a URLs externas
      return next.handle(request).pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        })
      );
    }

    // 2. Obtener token de la sesión (solo para APIs internas)
    const sessionData = this.sessionService.sessionDataSubject.value;
    const token = sessionData?.token;

    // 3. Si hay token, agregarlo al header
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('🔐 Token agregado a la petición:', request.url);
    } else {
      console.warn('⚠️ No hay token disponible para:', request.url);
    }

    // 4. Manejar errores de autenticación
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.error('❌ Error 401: Token inválido o expirado');
          
          // Limpiar sesión y redirigir al login
          this.sessionService.clearSession();
          window.location.href = environment.login;
        }
        
        return throwError(() => error);
      })
    );
  }
}