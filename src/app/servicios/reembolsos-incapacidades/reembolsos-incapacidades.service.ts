import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IApiResponse } from '../../interfaces/respuesta.interface';
import { 
  CreateSolicitudesReembolsoDto, 
  SolicitudReembolso, 
  CrearSolicitudResponse,
  SolicitudesPaginadasResponse,
  ParametrosBusquedaSolicitudes 
} from '../../interfaces/reembolsos-incapacidades/reembolsos-incapacidades.interface';

@Injectable({
  providedIn: 'root'
})
export class ReembolsosIncapacidadesService {

  constructor(private http: HttpClient) { }

//1.- CREAR SOLICITUD MENSUAL DE REEMBOLSO -------------------------------------------------------------
  crearSolicitudMensual(createDto: CreateSolicitudesReembolsoDto): Observable<CrearSolicitudResponse> {
    return this.http.post<any>(`${environment.url}reembolsos-incapacidades`, createDto).pipe(
      map((response) => {
        console.log('🔍 Respuesta completa del backend:', response);
        
        // Si la respuesta tiene la estructura IApiResponse
        if (response.status !== undefined && response.data) {
          return response.data;
        }
        
        // Si la respuesta viene directamente (como tu backend actualizado)
        if (response.mensaje && response.id_solicitud !== undefined) {
          return {
            mensaje: response.mensaje,
            id_solicitud: response.id_solicitud
          };
        }
        
        // Si hay mensaje pero no la estructura esperada
        if (response.mensaje) {
          return {
            mensaje: response.mensaje,
            id_solicitud: response.id_solicitud_reembolso || 0
          };
        }
        
        console.log('⚠️ Estructura de respuesta inesperada:', response);
        throw new Error('Estructura de respuesta inesperada del servidor');
      })
    );
  }

// 2.- OBTENER SOLICITUD POR ID -------------------------------------------------------------------------
  obtenerSolicitudPorId(id: number): Observable<SolicitudReembolso> {
    return this.http.get<IApiResponse<SolicitudReembolso>>(`${environment.url}reembolsos-incapacidades/${id}`).pipe(
      map((response) => {
        if (response.status && response.data) {
          return response.data;
        }
        console.log(response.message);
        throw new Error('No se pudo obtener la solicitud: ' + response.message);
      })
    );
  }

// 3.- OBTENER TODAS LAS SOLICITUDES POR CODIGO PATRONAL CON PAGINACIÓN Y FILTROS -------------------------------------------------------------------------
  obtenerSolicitudesPorCodPatronal(
    cod_patronal: string, 
    parametros?: ParametrosBusquedaSolicitudes
  ): Observable<SolicitudesPaginadasResponse> {
    let params = new HttpParams();
    
    if (parametros?.pagina !== undefined) {
      params = params.set('pagina', parametros.pagina.toString());
    }
    if (parametros?.limite !== undefined) {
      params = params.set('limite', parametros.limite.toString());
    }
    if (parametros?.busqueda) {
      params = params.set('busqueda', parametros.busqueda);
    }
    if (parametros?.mes) {
      params = params.set('mes', parametros.mes);
    }
    if (parametros?.anio) {
      params = params.set('anio', parametros.anio);
    }

    return this.http.get<SolicitudesPaginadasResponse>(
      `${environment.url}reembolsos-incapacidades/cod-patronal/${cod_patronal}`,
      { params }
    );
  }
}
