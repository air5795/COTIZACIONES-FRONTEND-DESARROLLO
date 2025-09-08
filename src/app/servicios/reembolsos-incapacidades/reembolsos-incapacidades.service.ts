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
  calcularReembolso(bajaMedica: BajaMedica, datosWorker: any, salario: number): DetalleReembolsoCalculado {
    const fechaInicio = new Date(bajaMedica.DIA_DESDE);
    const fechaFin = new Date(bajaMedica.DIA_HASTA);
    const diasIncapacidad = bajaMedica.DIAS_IMPEDIMENTO;
    
    // Determinar tipo de incapacidad y porcentaje
    let tipoIncapacidad = bajaMedica.TIPO_BAJA.trim();
    let porcentajeReembolso = 0;
    let diasReembolso = 0;
    
    switch (tipoIncapacidad) {
      case 'ENFERMEDAD':
        porcentajeReembolso = 75;
        // Para enfermedad común, se descuentan los primeros 3 días
        diasReembolso = Math.max(0, diasIncapacidad - 3);
        break;
      case 'MATERNIDAD':
        porcentajeReembolso = 90;
        // Para maternidad se cuentan todos los días (máximo 90)
        diasReembolso = Math.min(diasIncapacidad, 90);
        break;
      case 'PROFESIONAL':
        porcentajeReembolso = 90;
        // Para riesgo profesional se cuentan todos los días desde el primer día
        diasReembolso = diasIncapacidad;
        break;
      default:
        porcentajeReembolso = 75;
        diasReembolso = Math.max(0, diasIncapacidad - 3);
    }
    
    // Calcular montos
    const montoDia = salario / 30; // Mes comercial de 30 días
    const montoReembolso = (montoDia * diasReembolso * porcentajeReembolso) / 100;
    
    return {
      ci: datosWorker?.ci || bajaMedica.ASE_MAT.split(' ')[0], // Extraer CI de la matrícula
      apellido_paterno: datosWorker?.apellido_paterno || '',
      apellido_materno: datosWorker?.apellido_materno || '',
      nombres: datosWorker?.nombres || '',
      matricula: bajaMedica.ASE_MAT,
      tipo_incapacidad: tipoIncapacidad,
      fecha_inicio_baja: this.formatDate(fechaInicio),
      fecha_fin_baja: this.formatDate(fechaFin),
      dias_incapacidad: diasIncapacidad,
      dias_reembolso: diasReembolso,
      salario: salario,
      monto_dia: parseFloat(montoDia.toFixed(6)),
      porcentaje_reembolso: porcentajeReembolso,
      monto_reembolso: parseFloat(montoReembolso.toFixed(6)),
      // Campos adicionales para mostrar
      especialidad: bajaMedica.ESP_NOM,
      medico: bajaMedica.MEDI_NOM,
      comprobante: bajaMedica.COMPROBANTE,
      fecha_incorporacion: this.formatDate(new Date(bajaMedica.FECHA_INCORPORACION))
    };
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
