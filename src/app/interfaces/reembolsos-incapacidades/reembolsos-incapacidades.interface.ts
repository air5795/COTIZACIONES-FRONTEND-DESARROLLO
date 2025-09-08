// Interface para el DTO de creación de solicitud de reembolso
export interface CreateSolicitudesReembolsoDto {
  cod_patronal: string;
  mes: string;
  gestion: string;
  usuario_creacion?: string;
  nombre_creacion?: string;
}

// Interface para la entidad Solicitud de Reembolso
export interface SolicitudReembolso {
  id_solicitud_reembolso: number;
  cod_patronal: string;
  id_empresa: number;
  mes: string;
  gestion: string;
  tipo_empresa: string;
  estado: number;
  fecha_solicitud: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  usuario_creacion: string;
  nombre_creacion: string;
  total_reembolso: number;
  total_trabajadores: number;
  empresa?: {
    id_empresa: number;
    emp_nom: string;

  };
}

// Interface para la respuesta de creación
export interface CrearSolicitudResponse {
  mensaje: string;
  id_solicitud: number;
}

// Interface para la respuesta paginada de solicitudes
export interface SolicitudesPaginadasResponse {
  mensaje: string;
  solicitudes: SolicitudReembolso[];
  total: number;
  pagina: number;
  limite: number;
}

// Interface para los parámetros de búsqueda
export interface ParametrosBusquedaSolicitudes {
  pagina?: number;
  limite?: number;
  busqueda?: string;
  mes?: string;
  anio?: string;
}


// ===== INTERFACES PARA BAJAS MÉDICAS =====

export interface BajaMedica {
  ASE_MAT: string;
  ESP_NOM: string;
  MEDI_NOM: string;
  COMPROBANTE: number;
  DIAS_IMPEDIMENTO: number;
  DIA_DESDE: string;
  DIA_HASTA: string;
  FECHA_INCORPORACION: string;
  HORA_INCORPORACION: string;
  TIPO_BAJA: string;
  FECHA_REGISTRO: string;
}

export interface ResponseBajasMedicas {
  ok: boolean;
  bajasDB: BajaMedica[];
}

export interface DetalleReembolsoCalculado {
  nro?: number;
  ci: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  matricula: string;
  tipo_incapacidad: string;
  fecha_inicio_baja: string;
  fecha_fin_baja: string;
  dias_incapacidad: number;
  dias_reembolso: number;
  salario: number;
  monto_dia: number;
  porcentaje_reembolso: number;
  monto_reembolso: number;
  observaciones?: string;
  // Campos adicionales para mostrar
  especialidad?: string;
  medico?: string;
  comprobante?: number;
  fecha_incorporacion?: string;
}
