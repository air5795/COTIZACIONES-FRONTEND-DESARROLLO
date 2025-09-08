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
  ParametrosBusquedaSolicitudes, 
  ResponseBajasMedicas,
  DetalleReembolsoCalculado,
  BajaMedica
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
    return this.http.get<any>(`${environment.url}reembolsos-incapacidades/${id}`).pipe(
      map((response) => {
        console.log('🔍 Respuesta del backend para obtener solicitud:', response);
        
        // Si la respuesta tiene la estructura IApiResponse
        if (response.status !== undefined && response.data) {
          return response.data;
        }
        
        // Si la respuesta viene directamente (como tu backend está devolviendo)
        if (response.id_solicitud_reembolso !== undefined) {
          return response;
        }
        
        console.log('⚠️ Estructura de respuesta inesperada:', response);
        throw new Error('No se pudo obtener la solicitud: Estructura de respuesta inesperada');
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



  // Buscar bajas médicas por matrícula
  buscarBajasMedicasPorMatricula(matricula: string): Observable<ResponseBajasMedicas> {
    return this.http.get<ResponseBajasMedicas>(`${environment.url}servicios-externos/GetCertificadoIncapacidadByParamMat/${matricula}`);
  }

  // Método para calcular el reembolso basado en una baja médica seleccionada
  calcularReembolso(bajaMedica: BajaMedica, datosWorker: any, codPatronal: string, mes: string, gestion: string): Observable<any> {
    const calcularDto = {
      matricula: bajaMedica.ASE_MAT,
      cod_patronal: codPatronal,
      mes: mes,
      gestion: gestion,
      baja_medica: bajaMedica,
      usuario_calculo: 'SYSTEM'
    };

    return this.http.post<any>(`${environment.url}reembolsos-incapacidades/calcular-reembolso`, calcularDto);
  }

  // Método auxiliar para formatear fechas
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Método para validar si un trabajador cumple con las cotizaciones mínimas
  validarCotizacionesPrevias(tipoIncapacidad: string, cotizacionesPrevias: number): boolean {
    switch (tipoIncapacidad) {
      case 'ENFERMEDAD':
      case 'PROFESIONAL':
        return cotizacionesPrevias >= 2;
      case 'MATERNIDAD':
        return cotizacionesPrevias >= 4;
      default:
        return cotizacionesPrevias >= 2;
    }
  }

  // Crear detalle de reembolso
crearDetalle(detalle: any): Observable<any> {
  return this.http.post<any>(`${environment.url}reembolsos-incapacidades/detalles`, detalle);
}

// Obtener detalles por solicitud
obtenerDetallesPorSolicitud(idSolicitud: number): Observable<any> {
  return this.http.get<any>(`${environment.url}reembolsos-incapacidades/${idSolicitud}/detalles`);
}

// Eliminar detalle
eliminarDetalle(idDetalle: number): Observable<any> {
  return this.http.delete<any>(`${environment.url}reembolsos-incapacidades/detalles/${idDetalle}`);
}

// Actualizar totales de solicitud
actualizarTotales(idSolicitud: number, totales: { total_reembolso: number; total_trabajadores: number }): Observable<any> {
  return this.http.patch<any>(`${environment.url}reembolsos-incapacidades/${idSolicitud}/totales`, totales);
}






}
