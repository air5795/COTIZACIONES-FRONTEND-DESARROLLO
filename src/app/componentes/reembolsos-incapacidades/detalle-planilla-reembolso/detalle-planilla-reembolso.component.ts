import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReembolsosIncapacidadesService } from '../../../servicios/reembolsos-incapacidades/reembolsos-incapacidades.service';
import { 
  SolicitudReembolso,
  DetalleReembolsoCalculado 
} from '../../../interfaces/reembolsos-incapacidades/reembolsos-incapacidades.interface';
import Swal from 'sweetalert2';

interface DetalleReembolso {
  id_detalle_reembolso?: number;
  id_solicitud_reembolso: number;
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
  cotizaciones_previas_verificadas?: number;
  observaciones_afiliacion?: string;
  observaciones?: string;
}

@Component({
  selector: 'app-detalle-planilla-reembolso',
  templateUrl: './detalle-planilla-reembolso.component.html',
  styleUrls: ['./detalle-planilla-reembolso.component.css']
})
export class DetallePlanillaReembolsoComponent implements OnInit {
  
  idSolicitud: number | null = null;
  solicitudReembolso: SolicitudReembolso | null = null;
  detallesReembolso: DetalleReembolso[] = [];
  
  // Control de UI
  cargandoSolicitud = false;
  cargandoDetalles = false;
  mostrarBuscarTrabajador = false;

  // Control de paginación
  pagina: number = 1;
  limite: number = 20;
  total: number = 0;
  
  // Totales calculados
  totalReembolso = 0;
  totalTrabajadores = 0;
  
  // Resumen por tipo de incapacidad
  resumenTipos = {
    ENFERMEDAD: { count: 0, monto: 0 },
    MATERNIDAD: { count: 0, monto: 0 },
    PROFESIONAL: { count: 0, monto: 0 }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reembolsosService: ReembolsosIncapacidadesService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.idSolicitud = +params['id'];
      if (this.idSolicitud) {
        this.cargarSolicitudReembolso();
        this.cargarDetallesReembolso();
      }
    });
  }

  cargarSolicitudReembolso() {
    if (!this.idSolicitud) return;
    
    this.cargandoSolicitud = true;
    this.reembolsosService.obtenerSolicitudPorId(this.idSolicitud).subscribe({
      next: (solicitud) => {
        this.cargandoSolicitud = false;
        this.solicitudReembolso = solicitud;
        console.log('📄 Solicitud cargada:', solicitud);
      },
      error: (error) => {
        this.cargandoSolicitud = false;
        console.error('Error al cargar solicitud:', error);

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar la información de la solicitud'
        });
      }
    });
  }

  cargarDetallesReembolso() {
    if (!this.idSolicitud) return;

    this.cargandoDetalles = true;

    this.reembolsosService.obtenerDetallesPorSolicitud(this.idSolicitud).subscribe({
      next: (response) => {
        this.cargandoDetalles = false;
        // Convertir valores string a números para evitar errores del pipe de moneda
        this.detallesReembolso = (response.detalles || []).map((detalle: any) => this.convertirValoresNumericos(detalle));
        this.total = this.detallesReembolso.length;
        this.calcularTotales();
        console.log('📋 Detalles cargados:', this.detallesReembolso);
      },
      error: (error) => {
        this.cargandoDetalles = false;
        console.error('Error al cargar detalles:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los detalles de reembolso'
        });
      }
    });
  }

  onDetalleSeleccionado(detalle: DetalleReembolsoCalculado) {
    // Asignar número correlativo
    const siguienteNro = this.detallesReembolso.length + 1;
    const nuevoDetalle: DetalleReembolso = {
      id_solicitud_reembolso: this.idSolicitud!,
      nro: siguienteNro,
      ci: detalle.ci,
      apellido_paterno: detalle.apellido_paterno,
      apellido_materno: detalle.apellido_materno,
      nombres: detalle.nombres,
      matricula: detalle.matricula,
      tipo_incapacidad: detalle.tipo_incapacidad,
      fecha_inicio_baja: detalle.fecha_inicio_baja,
      fecha_fin_baja: detalle.fecha_fin_baja,
      dias_incapacidad: this.parseNumber(detalle.dias_incapacidad),
      dias_reembolso: this.parseNumber(detalle.dias_reembolso),
      salario: this.parseNumber(detalle.salario),
      monto_dia: this.parseNumber(detalle.monto_dia),
      porcentaje_reembolso: this.parseNumber(detalle.porcentaje_reembolso),
      monto_reembolso: this.parseNumber(detalle.monto_reembolso),
      cotizaciones_previas_verificadas: 0,
      observaciones: detalle.observaciones || ''
    };
  
    // Guardar en el backend
    this.reembolsosService.crearDetalle(nuevoDetalle).subscribe({
      next: (response) => {
        // Agregar a la lista con el ID del backend
        nuevoDetalle.id_detalle_reembolso = response.id_detalle;
        this.detallesReembolso.push(nuevoDetalle);
        this.calcularTotales();
        this.mostrarBuscarTrabajador = false;
        
        console.log('✅ Trabajador guardado en BD:', response);
        
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Trabajador agregado a la planilla de reembolsos',
          timer: 2000
        });
      },
      error: (error) => {
        console.error('Error al guardar detalle:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar el trabajador en la planilla'
        });
      }
    });
  }

  eliminarDetalle(index: number) {
    const detalle = this.detallesReembolso[index];
    
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar a ${detalle.nombres} ${detalle.apellido_paterno} de la planilla?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        if (detalle.id_detalle_reembolso) {
          // Eliminar del backend
          this.reembolsosService.eliminarDetalle(detalle.id_detalle_reembolso).subscribe({
            next: () => {
              this.detallesReembolso.splice(index, 1);
              this.calcularTotales();
              
              Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'Trabajador eliminado de la planilla',
                timer: 2000
              });
            },
            error: (error) => {
              console.error('Error al eliminar detalle:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar el trabajador'
              });
            }
          });
        } else {
          // Si solo está en memoria, eliminarlo directamente
          this.detallesReembolso.splice(index, 1);
          this.calcularTotales();
          
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'Trabajador eliminado de la planilla',
            timer: 2000
          });
        }
      }
    });
  }

  recalcularNumeros() {
    this.detallesReembolso.forEach((detalle, index) => {
      detalle.nro = index + 1;
    });
  }

  calcularTotales() {
    this.totalReembolso = this.detallesReembolso.reduce((sum, detalle) => sum + detalle.monto_reembolso, 0);
    this.totalTrabajadores = this.detallesReembolso.length;
    
    // Resetear resumen
    this.resumenTipos = {
      ENFERMEDAD: { count: 0, monto: 0 },
      MATERNIDAD: { count: 0, monto: 0 },
      PROFESIONAL: { count: 0, monto: 0 }
    };
    
    // Calcular resumen por tipo
    this.detallesReembolso.forEach(detalle => {
      const tipo = detalle.tipo_incapacidad as keyof typeof this.resumenTipos;
      if (this.resumenTipos[tipo]) {
        this.resumenTipos[tipo].count++;
        this.resumenTipos[tipo].monto += detalle.monto_reembolso;
      }
    });
  }

  presentarSolicitud() {
    if (this.detallesReembolso.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debe agregar al menos un trabajador antes de presentar la solicitud'
      });
      return;
    }

    Swal.fire({
      title: '¿Presentar solicitud?',
      text: 'Una vez presentada no podrá realizar modificaciones',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, presentar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // TODO: Implementar presentación en backend
        // this.reembolsosService.cambiarEstado(this.idSolicitud, 2).subscribe(...)
        
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Solicitud presentada correctamente'
        });
        
        if (this.solicitudReembolso) {
          this.solicitudReembolso.estado = 2;
        }
      }
    });
  }

  exportarExcel() {
    Swal.fire({
      icon: 'info',
      title: 'Función pendiente',
      text: 'La exportación a Excel se implementará próximamente'
    });
  }

  volver() {
    this.router.navigate(['/cotizaciones/planillas-incapacidades']);
  }

  getTipoIncapacidadClass(tipo: string): string {
    switch (tipo) {
      case 'ENFERMEDAD': return 'tipo-enfermedad';
      case 'MATERNIDAD': return 'tipo-maternidad';
      case 'PROFESIONAL': return 'tipo-profesional';
      default: return 'tipo-default';
    }
  }

  getEstadoClass(estado: number): string {
    switch (estado) {
      case 0: return 'estado-borrador';
      case 1: return 'estado-presentado';
      case 2: return 'estado-aprobado';
      default: return 'estado-default';
    }
  }

  getEstadoLabel(estado: number): string {
    switch (estado) {
      case 0: return 'BORRADOR';
      case 1: return 'PRESENTADO';
      case 2: return 'APROBADO';     
      default: return 'DESCONOCIDO';
    }
  }

  abrirBuscarTrabajador() {
    if (this.solicitudReembolso?.estado !== 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No disponible',
        text: 'Solo se pueden agregar trabajadores a solicitudes en estado BORRADOR'
      });
      return;
      
    }
    
    this.mostrarBuscarTrabajador = true;
  }

  getColspanTabla(): number {
    return (this.solicitudReembolso?.estado === 0) ? 13 : 12;
  }

  // Funciones para colores de estado (tomadas de planillas-aportes-detalle)
  getColorEstado(estado: number): string {
    switch (estado) {
      case 3:
        return '#ff4545';
      case 0:
        return '#b769fb';
      case 2:
        return '#059b89';
      default:
        return '#558fbb';
    }
  }

  getFondoEstado(fondo: number): string {
    switch (fondo) {
      case 0:
        return '#ebe6ff';
      case 3:
        return '#ffdfdf';
      case 2:
        return '#edfff6';
      default:
        return '#e5edf9';
    }
  }

  // Método para convertir valores string a números (evita errores del pipe currency)
  private convertirValoresNumericos(detalle: any): DetalleReembolso {
    return {
      ...detalle,
      dias_incapacidad: this.parseNumber(detalle.dias_incapacidad),
      dias_reembolso: this.parseNumber(detalle.dias_reembolso),
      salario: this.parseNumber(detalle.salario),
      monto_dia: this.parseNumber(detalle.monto_dia),
      porcentaje_reembolso: this.parseNumber(detalle.porcentaje_reembolso),
      monto_reembolso: this.parseNumber(detalle.monto_reembolso),
      cotizaciones_previas_verificadas: this.parseNumber(detalle.cotizaciones_previas_verificadas) || 0
    };
  }

  // Método auxiliar para parsear valores numéricos de manera segura
  private parseNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;

    // Si es string, limpiar caracteres no numéricos y convertir
    if (typeof value === 'string') {
      const cleanedValue = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleanedValue);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  // Método para confirmar eliminación de detalles
  confirmarEliminacionDetalles() {
    Swal.fire({
      title: '¿Eliminar todos los detalles?',
      text: 'Esta acción eliminará todos los trabajadores de la planilla. ¿Desea continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Limpiar todos los detalles
        this.detallesReembolso = [];
        this.calcularTotales();
        Swal.fire({
          icon: 'success',
          title: 'Detalles eliminados',
          text: 'Todos los trabajadores han sido eliminados de la planilla',
          timer: 2000
        });
      }
    });
  }

  // Método para editar trabajador
  editarTrabajador(detalle: any) {
    // Implementar lógica de edición si es necesario
    console.log('Editar trabajador:', detalle);
  }
}