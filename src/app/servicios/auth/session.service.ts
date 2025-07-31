// session.service.ts - Versión completa con los métodos helper

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  readonly sessionDataSubject = new BehaviorSubject<any | null>(null);
  sessionData$ = this.sessionDataSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  initSession(): Observable<any> {
    const currentData = this.sessionDataSubject.value;
    if (currentData?.usuario) {
      return of(currentData);
    }

    return this.route.queryParams.pipe(
      switchMap((params) => {
        const sessionIdFromParams = params['sessionId'];
        if (sessionIdFromParams) {
          return this.fetchSessionData(sessionIdFromParams);
        }
        const sessionIdFromStorage = sessionStorage.getItem('sessionId');
        if (sessionIdFromStorage) {
          return this.fetchSessionData(sessionIdFromStorage);
        }
        this.sessionDataSubject.next(null);
        return of(null);
      })
    );
  }

  public fetchSessionData(sessionId: string): Observable<any> {
    return this.http.get(`${environment.urlMSAuth}?sessionId=${sessionId}`).pipe(
      tap((data: any) => {
        console.log('Datos recibidos del servidor:', data);
        if (data && data.usuario) {
          const transformedData = this.transformSessionData(data);
          this.saveSessionData(transformedData, sessionId);
          this.sessionDataSubject.next(transformedData);
        } else {
          console.warn('Datos de sesión no válidos:', data);
          this.sessionDataSubject.next(null);
          window.location.href = environment.login;
        }
      }),
      catchError((error) => {
        console.error('Error al obtener datos de sesión:', error);
        this.sessionDataSubject.next(null);
        window.location.href = environment.login;
        return of(null);
      })
    );
  }

  public transformSessionData(data: any): any {
    return {
      usuario: data.usuario,
      rol: data.rol,
      persona: data.persona,
      system: data.system,
      menus: data.rol?.menus,
    };
  }

  public saveSessionData(data: any, sessionId: string): void {
    if (data && data.usuario) {
      try {
        sessionStorage.setItem('sessionId', sessionId);
      } catch (error) {
        console.error('Error al guardar sessionId:', error);
      }
    }
  }

  getSessionData(): Observable<any> {
    return this.sessionData$;
  }

  clearSession(): void {
    this.sessionDataSubject.next(null);
    try {
      sessionStorage.removeItem('sessionId');
    } catch (error) {
      console.error('Error al limpiar sesión:', error);
    }
  }

  getCurrentSession(): any {
    return this.sessionData$;
  }

  // ========== MÉTODOS HELPER PARA ROLES Y PERMISOS ==========

  // Verificar si el usuario es administrador (desarrollo o producción)
  esAdministrador(): boolean {
    const sessionData = this.sessionDataSubject.value;
    const rol = sessionData?.rol?.rol || '';
    return rol === 'ADMIN_COTIZACIONES_DESARROLLO' || rol === 'ADMIN_COTIZACIONES_PRODUCCION';
  }

  // Verificar si el usuario es empleador (desarrollo o producción)
  esEmpleador(): boolean {
    const sessionData = this.sessionDataSubject.value;
    const rol = sessionData?.rol?.rol || '';
    return rol === 'EMPRESA_COTIZACIONES_DESARROLLO' || rol === 'EMPRESA_COTIZACIONES_PRODUCCION';
  }

  // Verificar si es un rol específico de desarrollo
  esDesarrollo(): boolean {
    const sessionData = this.sessionDataSubject.value;
    const rol = sessionData?.rol?.rol || '';
    return rol.includes('_DESARROLLO');
  }

  // Verificar si es un rol específico de producción
  esProduccion(): boolean {
    const sessionData = this.sessionDataSubject.value;
    const rol = sessionData?.rol?.rol || '';
    return rol.includes('_PRODUCCION');
  }

  // Obtener el tipo de empresa del usuario actual
  getTipoEmpresa(): string {
    const sessionData = this.sessionDataSubject.value;
    return sessionData?.persona?.empresa?.tipo || '';
  }

  // Verificar si la empresa es pública
  esEmpresaPublica(): boolean {
    return this.getTipoEmpresa() === 'AP' || this.getTipoEmpresa() === 'Pública';
  }

  // Verificar si la empresa es privada
  esEmpresaPrivada(): boolean {
    const tipo = this.getTipoEmpresa();
    return tipo === 'AV' || tipo === 'Privada';
  }

  // Obtener información de la empresa
  getEmpresaInfo(): any {
    const sessionData = this.sessionDataSubject.value;
    return sessionData?.persona?.empresa || null;
  }

  // Verificar si el usuario tiene un permiso específico
  tienePermiso(permiso: string): boolean {
    const sessionData = this.sessionDataSubject.value;
    const permisos = sessionData?.rol?.permisos || [];
    return permisos.includes(permiso);
  }

  // Obtener el rol actual completo
  getRolActual(): string {
    const sessionData = this.sessionDataSubject.value;
    return sessionData?.rol?.rol || '';
  }

  // Obtener información completa del usuario
  getUsuarioInfo(): any {
    const sessionData = this.sessionDataSubject.value;
    return sessionData?.persona || null;
  }

  // Obtener el nombre completo del usuario
  getNombreCompleto(): string {
    const persona = this.getUsuarioInfo();
    if (!persona) return '';
    
    const nombres = persona.nombres || '';
    const primerApellido = persona.primerApellido || '';
    const segundoApellido = persona.segundoApellido || '';
    
    return `${nombres} ${primerApellido} ${segundoApellido}`.trim();
  }

  // Obtener el código patronal de la empresa
  getCodigoPatronal(): string {
    const empresa = this.getEmpresaInfo();
    return empresa?.codPatronal || '';
  }
}