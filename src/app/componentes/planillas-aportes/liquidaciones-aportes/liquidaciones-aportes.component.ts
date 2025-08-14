// src/app/components/liquidaciones-aportes/liquidaciones-aportes.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { PlanillasAportesService } from '../../../servicios/planillas-aportes/planillas-aportes.service';
import { SessionService } from '../../../servicios/auth/session.service';
import { MessageService, Message } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-liquidaciones-aportes',
  templateUrl: './liquidaciones-aportes.component.html',
  styleUrls: ['./liquidaciones-aportes.component.css'],
  providers: [MessageService],
})
export class LiquidacionesAportesComponent implements OnInit, OnDestroy {
  @Input() idPlanilla!: number;
  planilla: any = null;
  loading: boolean = false;
  errorMessage: string | undefined = undefined;
  messages: Message[] = [];
  displayDialog: boolean = false;
  showFechaPagoInput: boolean = false;
  fechaPago: Date | null = null;
  today: Date = new Date();
  
  // NUEVAS PROPIEDADES PARA COTIZACIÓN REAL
  showCotizacionRealInput: boolean = false;
  cotizacionReal: number | null = null;
  cotizacionTeorica: number = 0;
  
  // NUEVA PROPIEDAD: Para distinguir el tipo de validación
  esEmpresaPublica: boolean = false;
  
  // Nueva propiedad para indicar si los datos vienen de BD o fueron calculados
  datosDesdeDB: boolean = false;
  
  // Nueva propiedad para indicar si es empresa pública con liquidación preliminar
  esEmpresaPublicaConLiquidacionPreliminar: boolean = false;
  
  // Propiedades para control de roles
  esAdministrador: boolean = false;
  rolUsuario: string = '';
  tipoEmpresa: string = '';
  nombreEmpresa: string = '';
  
  // Para manejar la suscripción
  private destroy$ = new Subject<void>();

  constructor(
    private planillasService: PlanillasAportesService,
    private sessionService: SessionService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.verificarRolUsuario();
    this.loadAportes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Método para verificar el rol del usuario usando SessionService
  verificarRolUsuario() {
    // Usar los métodos helper del SessionService
    this.esAdministrador = this.sessionService.esAdministrador();
    this.rolUsuario = this.sessionService.getRolActual();
    this.tipoEmpresa = this.sessionService.getTipoEmpresa();
    
    const empresaInfo = this.sessionService.getEmpresaInfo();
    if (empresaInfo) {
      this.nombreEmpresa = empresaInfo.nombre || '';
    }
    
    console.log('Verificación de rol:', {
      esAdministrador: this.esAdministrador,
      rol: this.rolUsuario,
      tipoEmpresa: this.tipoEmpresa,
      nombreEmpresa: this.nombreEmpresa
    });
  }

  // MÉTODO OPTIMIZADO: Cargar datos de liquidación (desde BD o calcular si no existe)
  loadAportes() {
    if (!this.idPlanilla) {
      this.errorMessage = 'Por favor, asegúrate de que el ID de la planilla esté definido.';
      return;
    }

    this.loading = true;
    this.errorMessage = undefined;
    this.messages = [];

    this.planillasService
      .obtenerLiquidacion(this.idPlanilla)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.planilla = response;
          this.datosDesdeDB = true;
          
          // NUEVA LÓGICA: Identificar tipo de empresa
          this.esEmpresaPublica = this.planilla.tipo_empresa === 'AP';
          
          // NUEVA LÓGICA: Establecer cotización teórica para empresas públicas
          if (this.esEmpresaPublica) {
            this.cotizacionTeorica = this.planilla.total_importe * 0.1; // 10% teórico
            this.cotizacionReal = this.planilla.cotizacion_tasa_real || null;
          }

          if (this.esEmpresaPublica && !this.planilla.fecha_liquidacion) {
            this.esEmpresaPublicaConLiquidacionPreliminar = true;
            this.messages = [{
              severity: 'info',
              summary: 'Liquidación Preliminar',
              detail: 'Esta es una liquidación preliminar para empresa pública. Se requiere actualizar con los datos reales.'
            }];
          } else {
            this.esEmpresaPublicaConLiquidacionPreliminar = false;
            this.messages = [{
              severity: 'success',
              summary: 'Datos obtenidos',
              detail: 'Liquidación obtenida correctamente desde la base de datos.'
            }];
          }
          
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Error al obtener la liquidación';
          this.messages = [{ severity: 'error', summary: 'Error', detail: this.errorMessage }];
          this.loading = false;
        },
      });
  }

  showDialog() {
    if (!this.esAdministrador) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo el administrador puede validar o actualizar liquidaciones.',
      });
      return;
    }
    
    // Resetear valores
    this.fechaPago = null;
    this.cotizacionReal = null;
    this.showFechaPagoInput = false;
    this.showCotizacionRealInput = false;
    this.displayDialog = true;
  }

  // NUEVO MÉTODO: Para empresas privadas - aprobar directamente
  aprobarLiquidacionPrivada() {
    this.loading = true;
    
    this.planillasService.validarLiquidacion(this.idPlanilla, {}).subscribe({
      next: (response: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Liquidación aprobada correctamente.',
        });
        
        this.displayDialog = false;
        this.loading = false;
        
        // Recargar datos para refrescar la vista
        this.loadAportes();
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Error al aprobar la liquidación.',
        });
      },
    });
  }

  // Cancelar la selección de fecha y volver a la pregunta inicial
  cancelarSeleccionFecha() {
    this.fechaPago = null;
    this.cotizacionReal = null;
    this.showFechaPagoInput = false;
    this.showCotizacionRealInput = false;
  }

  // MÉTODO ACTUALIZADO: Para manejar el flujo del modal
  mostrarCamposFecha() {
    this.showFechaPagoInput = true;
    
    // Si es empresa pública, también mostrar campo de cotización real
    if (this.esEmpresaPublica) {
      this.showCotizacionRealInput = true;
      // Pre-llenar con el valor actual si existe
      if (this.planilla.cotizacion_tasa_real) {
        this.cotizacionReal = this.planilla.cotizacion_tasa_real;
      }
    }
  }

  // MÉTODO ACTUALIZADO: Para recalcular liquidación
  confirmarLiquidacion(actualizarFechaPago: boolean) {
    if (!this.esAdministrador) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail: 'No tiene permisos para realizar esta acción.',
      });
      this.displayDialog = false;
      return;
    }

    if (actualizarFechaPago && !this.fechaPago) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, seleccione una fecha de pago.',
      });
      return;
    }

    // Validar cotización real para empresas públicas
    if (actualizarFechaPago && this.esEmpresaPublica && this.cotizacionReal !== null) {
      if (this.cotizacionReal <= 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'La cotización real debe ser mayor a 0.',
        });
        return;
      }
    }

    this.loading = true;
    
    if (actualizarFechaPago) {
      const accion = this.esEmpresaPublicaConLiquidacionPreliminar 
        ? 'Actualizando con datos reales de empresa pública...' 
        : 'Recalculando liquidación con nueva fecha...';
      
      this.messages = [{ 
        severity: 'info', 
        summary: 'Procesando', 
        detail: accion 
      }];

      // NUEVA LLAMADA: Usar el método actualizado (solo para empresas públicas)
      this.recalcularConNuevosDatos();
    } else {
      // Si no se actualiza la fecha, solo validar/confirmar la liquidación actual
      this.aprobarLiquidacionPrivada();
    }
  }

  // MÉTODO PRIVADO: Para recalcular con los nuevos datos (solo empresas públicas)
  private recalcularConNuevosDatos() {
    const payload: any = {
      forzar: true,
      nueva_fecha_pago: this.fechaPago?.toISOString()
    };

    // Agregar cotización real si es empresa pública y se proporcionó
    if (this.esEmpresaPublica && this.cotizacionReal !== null) {
      payload.cotizacion_real = this.cotizacionReal;
    }

    this.planillasService.recalcularLiquidacionConDatos(this.idPlanilla, payload).subscribe({
      next: (response: any) => {
        this.planilla = response;
        this.datosDesdeDB = true;
        this.esEmpresaPublicaConLiquidacionPreliminar = false;
        
        let mensaje = 'Liquidación recalculada correctamente.';
        
        if (response.cotizacion_real !== undefined) {
          mensaje += ` Cotización ajustada: ${response.cotizacion_real} BOB (Diferencia: ${response.diferencia || 0} BOB)`;
        }
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: mensaje,
        });
        
        this.displayDialog = false;
        this.loading = false;
        
        // Recargar datos para refrescar la vista
        this.loadAportes();
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Error al recalcular la liquidación.',
        });
      },
    });
  }

  // MÉTODO ACTUALIZADO: Texto del botón según el tipo de empresa
  obtenerTextoBoton(): string {
    if (this.esEmpresaPublica) {
      return this.datosDesdeDB ? 'Recalcular Liquidación' : 'Validar Liquidación';
    } else {
      return 'Validar Liquidación'; // Para empresas privadas siempre "Validar"
    }
  }

  // MÉTODO ACTUALIZADO: Icono del botón según el tipo de empresa
  obtenerIconoBoton(): string {
    if (this.esEmpresaPublica) {
      return this.datosDesdeDB ? 'pi pi-refresh' : 'pi pi-check';
    } else {
      return 'pi pi-check'; // Para empresas privadas siempre check
    }
  }

  // MÉTODO ACTUALIZADO: Clase del botón según el tipo de empresa
  obtenerClaseBoton(): string {
    if (this.esEmpresaPublica) {
      return this.datosDesdeDB ? 'p-button-warning' : 'p-button-success';
    } else {
      return 'p-button-success'; // Para empresas privadas siempre success
    }
  }

  // Método para forzar recálculo (solo administrador)
  recalcularLiquidacion() {
    if (!this.esAdministrador) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail: 'Solo el administrador puede recalcular liquidaciones.',
      });
      return;
    }

    if (confirm('¿Está seguro que desea recalcular la liquidación? Esto sobrescribirá los valores actuales.')) {
      this.loading = true;
      
      this.planillasService.recalcularLiquidacion(this.idPlanilla, true).subscribe({
        next: (response: any) => {
          this.planilla = response;
          this.datosDesdeDB = true;
          
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Liquidación recalculada exitosamente.',
          });
          
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Error al recalcular la liquidación.',
          });
        },
      });
    }
  }

  // NUEVO MÉTODO: Calcular diferencia para mostrar en tiempo real
  calcularDiferencia(): number {
    if (this.cotizacionReal !== null && this.cotizacionTeorica > 0) {
      return this.cotizacionReal - this.cotizacionTeorica;
    }
    return 0;
  }

  // NUEVO MÉTODO: Validar formato de cotización real
  validarCotizacionReal() {
    if (this.cotizacionReal !== null && this.cotizacionReal < 0) {
      this.cotizacionReal = 0;
    }
  }
}