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
      }
    } else {
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
     
    }
  }

    getCurrentSession(): any {
      return this.sessionData$;
    }
}