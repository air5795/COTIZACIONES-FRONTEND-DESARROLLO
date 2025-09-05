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
    nombre_empresa: string;
    // Agregar otros campos de empresa según sea necesario
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
