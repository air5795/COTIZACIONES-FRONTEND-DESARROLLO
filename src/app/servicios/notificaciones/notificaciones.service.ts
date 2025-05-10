import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  constructor(private http: HttpClient) {}

  // Obtener las notificaciones de un usuario
  getNotificaciones(
    id_usuario: string,
    leido?: boolean,
    pagina: number = 1,
    limite: number = 10,
  ): Observable<any> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString());

    if (leido !== undefined) {
      params = params.set('leido', leido.toString());
    }

    const url = `${environment.url}notificaciones/${id_usuario}`;
    
    return this.http.get(url, { params });
  }

  marcarNotificacionComoLeida(id_notificacion: number): Observable<any> {
   
    return this.http.post(`${environment.url}notificaciones/marcar-leida/${id_notificacion}`, {
      leido: true,
    });
  }
}