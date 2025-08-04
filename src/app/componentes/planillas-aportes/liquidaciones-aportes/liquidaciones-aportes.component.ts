import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { PlanillasAportesService } from '../../../servicios/planillas-aportes/planillas-aportes.service';
import { SessionService } from '../../../servicios/auth/session.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-liquidaciones-aportes',
  templateUrl: './liquidaciones-aportes.component.html',
  styleUrls: ['./liquidaciones-aportes.component.css']
})
export class LiquidacionesAportesComponent implements OnInit, OnDestroy {
  @Input() idPlanilla!: number;
  planilla: any = null;
  loading: boolean = false;
  errorMessage: string | undefined = undefined;
  displayDialog: boolean = false;
  showFechaPagoInput: boolean = false;
  fechaPago: Date | null = null;
  today: Date = new Date();

  datosDesdeDB: boolean = false;
  esEmpresaPublicaConLiquidacionPreliminar: boolean = false;

  esAdministrador: boolean = false;
  rolUsuario: string = '';
  tipoEmpresa: string = '';
  nombreEmpresa: string = '';
  
  // NUEVO: Agregar propiedad para el nombre completo del administrador
  nombreCompletoUsuario: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private planillasService: PlanillasAportesService,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    this.verificarRolUsuario();
    this.loadAportes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  verificarRolUsuario() {
    this.esAdministrador = this.sessionService.esAdministrador();
    this.rolUsuario = this.sessionService.getRolActual();
    this.tipoEmpresa = this.sessionService.getTipoEmpresa();
    
    // NUEVO: Obtener el nombre completo del usuario
    this.nombreCompletoUsuario = this.sessionService.getNombreCompleto();

    const empresaInfo = this.sessionService.getEmpresaInfo();
    if (empresaInfo) {
      this.nombreEmpresa = empresaInfo.nombre || '';
    }

    console.log('Verificación de rol:', {
      esAdministrador: this.esAdministrador,
      rol: this.rolUsuario,
      tipoEmpresa: this.tipoEmpresa,
      nombreEmpresa: this.nombreEmpresa,
      nombreCompletoUsuario: this.nombreCompletoUsuario
    });
  }

  loadAportes() {
    if (!this.idPlanilla) {
      this.errorMessage = 'Por favor, asegúrate de que el ID de la planilla esté definido.';
      Swal.fire('Error', this.errorMessage, 'error');
      return;
    }

    this.loading = true;
    this.errorMessage = undefined;

    this.planillasService.obtenerLiquidacion(this.idPlanilla).subscribe({
      next: (response: any) => {
        this.planilla = response;
        this.datosDesdeDB = !!response.fecha_liquidacion;
        this.esEmpresaPublicaConLiquidacionPreliminar =
          response.tipo_empresa === 'AP' &&
          this.datosDesdeDB &&
          response.observaciones?.includes('LIQUIDACIÓN PRELIMINAR');

        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al obtener la liquidación';
        Swal.fire('SIN REGISTRO DE PAGO', this.errorMessage, 'warning');
        this.loading = false;
      },
    });
  }

  showDialog() {
    if (!this.esAdministrador) {
      Swal.fire(
        'Sin permisos',
        'Solo el administrador puede validar o actualizar liquidaciones.',
        'warning'
      );
      return;
    }

    this.fechaPago = null;
    this.showFechaPagoInput = false;
    this.displayDialog = true;
  }

  cancelarSeleccionFecha() {
    this.fechaPago = null;
    this.showFechaPagoInput = false;
    this.displayDialog = false;
  }

  

confirmarLiquidacion(actualizarFechaPago: boolean) {
  if (!this.esAdministrador) {
    Swal.fire('Sin permisos', 'No tiene permisos para realizar esta acción.', 'error');
    this.displayDialog = false;
    return;
  }

  if (actualizarFechaPago && !this.fechaPago) {
    Swal.fire('Advertencia', 'Por favor, seleccione una fecha de pago.', 'warning');
    return;
  }

  this.loading = true;

  if (actualizarFechaPago) {
    // Caso 1: Actualizar fecha de pago (principalmente para empresas públicas)
    const accion = this.esEmpresaPublicaConLiquidacionPreliminar
      ? 'Actualizando fecha de pago real para empresa pública...'
      : 'Recalculando liquidación con nueva fecha...';

    Swal.fire('Procesando', accion, 'info');

    this.planillasService
      .recalcularLiquidacionConFecha(this.idPlanilla, this.fechaPago!, this.nombreCompletoUsuario)
      .subscribe({
        next: (response: any) => {
          this.planilla = response;
          this.datosDesdeDB = true;
          this.esEmpresaPublicaConLiquidacionPreliminar = false;

          const mensaje = response.tipo_empresa === 'AP'
            ? 'Fecha de pago actualizada correctamente para la empresa pública.'
            : 'Liquidación recalculada correctamente con la nueva fecha.';

          Swal.fire('Éxito', mensaje, 'success');
          this.displayDialog = false;
          this.loading = false;
          this.loadAportes();
        },
        error: (error) => {
          this.loading = false;
          Swal.fire('Error', error.error?.message || 'Error al actualizar la liquidación.', 'error');
        },
      });
  } else {
    // Caso 2: Solo validar sin cambiar fecha
    const payload = {
      valido_cotizacion: this.nombreCompletoUsuario  // IMPORTANTE: Aquí se envía el nombre del validador
    };
    
    this.planillasService.validarLiquidacion(this.idPlanilla, payload).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Liquidación validada correctamente.', 'success');
        this.displayDialog = false;
        this.loading = false;
        this.loadAportes(); // Recargar para mostrar quién validó
      },
      error: (error) => {
        this.loading = false;
        Swal.fire('Error', error.error?.message || 'Error al validar la liquidación.', 'error');
      },
    });
  }
}

  recalcularLiquidacion() {
    if (!this.esAdministrador) {
      Swal.fire(
        'Sin permisos',
        'Solo el administrador puede recalcular liquidaciones.',
        'error'
      );
      return;
    }

    Swal.fire({
      title: '¿Está seguro?',
      text: 'Esto sobrescribirá los valores actuales de la liquidación.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, recalcular',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading = true;

        // CAMBIO: Incluir el nombre del validador al recalcular
        this.planillasService.recalcularLiquidacion(this.idPlanilla, true, this.nombreCompletoUsuario).subscribe({
          next: (response: any) => {
            this.planilla = response;
            this.datosDesdeDB = true;
            Swal.fire('Éxito', 'Liquidación recalculada exitosamente.', 'success');
            this.loading = false;
            this.loadAportes();
          },
          error: (error) => {
            this.loading = false;
            Swal.fire(
              'Error',
              error.error?.message || 'Error al recalcular la liquidación.',
              'error'
            );
          },
        });
      }
    });
  }

  get tieneMultas(): boolean {
    return Number(this.planilla?.total_multas) > 0;
  }
}