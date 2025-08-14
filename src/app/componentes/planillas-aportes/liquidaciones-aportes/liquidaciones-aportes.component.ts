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
  
  // PROPIEDADES PARA COTIZACIÓN REAL
  showCotizacionRealInput: boolean = false;
  cotizacionReal: number | null = null;
  cotizacionTeorica: number = 0;
  
  // PROPIEDADES PARA TIPO DE EMPRESA Y VALIDACIÓN
  esEmpresaPublica: boolean = false;
  liquidacionValidada: boolean = false;
  fechaValidacion: Date | null = null;
  validadoPor: string = '';
  
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

  // MÉTODO OPTIMIZADO: Cargar datos de liquidación
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
          
          // LÓGICA: Identificar tipo de empresa
          this.esEmpresaPublica = this.planilla.tipo_empresa === 'AP';
          
          // LÓGICA: Verificar estado de validación
          this.liquidacionValidada = response.esta_validada || false;
          this.validadoPor = response.valido_cotizacion || '';
          this.fechaValidacion = response.fecha_liquidacion ? new Date(response.fecha_liquidacion) : null;
          
          // LÓGICA: Establecer cotización teórica para empresas públicas
          if (this.esEmpresaPublica) {
            this.cotizacionTeorica = this.planilla.total_importe * 0.1; // 10% teórico
            this.cotizacionReal = this.planilla.cotizacion_tasa_real || null;
          }

          // LÓGICA: Determinar mensajes según el estado
          if (this.liquidacionValidada) {
            this.messages = [{
              severity: 'success',
              summary: 'Liquidación Validada',
              detail: `Liquidación validada por ${this.validadoPor} el ${this.fechaValidacion?.toLocaleDateString('es-BO')}`
            }];
          } else if (this.esEmpresaPublica && !this.planilla.fecha_liquidacion) {
            this.esEmpresaPublicaConLiquidacionPreliminar = true;
            this.messages = [{
              severity: 'info',
              summary: 'Liquidación Preliminar',
              detail: 'Esta es una liquidación preliminar para empresa pública. Se requiere actualizar con los datos reales.'
            }];
          } else {
            this.esEmpresaPublicaConLiquidacionPreliminar = false;
            this.messages = [{
              severity: 'info',
              summary: 'Liquidación Pendiente',
              detail: 'Liquidación calculada y pendiente de validación.'
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

    // VALIDACIÓN: No permitir cambios en liquidaciones ya validadas
    if (this.liquidacionValidada) {
      this.messageService.add({
        severity: 'info',
        summary: 'Liquidación ya validada',
        detail: `Esta liquidación ya fue validada por ${this.validadoPor} y no puede modificarse.`,
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

  // MÉTODO: Para empresas privadas - aprobar directamente
  aprobarLiquidacionPrivada() {
    if (!this.esAdministrador) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail: 'No tiene permisos para realizar esta acción.',
      });
      return;
    }

    this.loading = true;
    
    // Obtener nombre del usuario actual
    const nombreValidador = this.sessionService.getRolActual() || 'Administrador';
    
    const payload = {
      valido_cotizacion: nombreValidador
    };

    this.planillasService.validarLiquidacion(this.idPlanilla, payload).subscribe({
      next: (response: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Liquidación Aprobada',
          detail: `Liquidación aprobada correctamente por ${nombreValidador}.`,
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

  // MÉTODO: Para manejar el flujo del modal de empresas públicas
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

  // MÉTODO: Para recalcular liquidación (empresas públicas)
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

      // Recalcular con nuevos datos (empresas públicas)
      this.recalcularConNuevosDatos();
    } else {
      // Validar sin cambios (empresas públicas)
      this.validarLiquidacionEmpresaPublica();
    }
  }

  // MÉTODO PRIVADO: Para recalcular con nuevos datos (empresas públicas)
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

  // MÉTODO PRIVADO: Para validar liquidación de empresa pública sin cambios
  private validarLiquidacionEmpresaPublica() {
    const nombreValidador = this.sessionService.getRolActual() || 'Administrador';
    
    const payload = {
      valido_cotizacion: nombreValidador
    };

    this.planillasService.validarLiquidacion(this.idPlanilla, payload).subscribe({
      next: (response: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Liquidación Validada',
          detail: `Liquidación validada correctamente por ${nombreValidador}.`,
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
          detail: error.error?.message || 'Error al validar la liquidación.',
        });
      },
    });
  }

  // MÉTODO: Texto del botón según el tipo de empresa y estado
  obtenerTextoBoton(): string {
    if (this.liquidacionValidada) {
      return 'Liquidación Validada';
    }
    
    if (this.esEmpresaPublica) {
      return this.esEmpresaPublicaConLiquidacionPreliminar ? 'Actualizar Datos Reales' : 'Validar Liquidación';
    } else {
      return 'Validar Liquidación';
    }
  }

  // MÉTODO: Icono del botón según el estado
  obtenerIconoBoton(): string {
    if (this.liquidacionValidada) {
      return 'pi pi-check-circle';
    }
    
    if (this.esEmpresaPublica) {
      return this.esEmpresaPublicaConLiquidacionPreliminar ? 'pi pi-refresh' : 'pi pi-check';
    } else {
      return 'pi pi-check';
    }
  }

  // MÉTODO: Clase del botón según el estado
  obtenerClaseBoton(): string {
    if (this.liquidacionValidada) {
      return 'p-button-success p-button-outlined';
    }
    
    if (this.esEmpresaPublica) {
      return this.esEmpresaPublicaConLiquidacionPreliminar ? 'p-button-warning' : 'p-button-success';
    } else {
      return 'p-button-success';
    }
  }

  // MÉTODO: Verificar si el botón debe estar deshabilitado
  esBotonDeshabilitado(): boolean {
    return this.liquidacionValidada;
  }

  // Método para forzar recálculo (mantener compatibilidad)
  recalcularLiquidacion() {
    if (!this.esAdministrador) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail: 'Solo el administrador puede recalcular liquidaciones.',
      });
      return;
    }

    if (this.liquidacionValidada) {
      this.messageService.add({
        severity: 'info',
        summary: 'Liquidación ya validada',
        detail: 'Esta liquidación ya está validada y no puede modificarse.',
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
  }

  // Métodos auxiliares
  calcularDiferencia(): number {
    if (this.cotizacionReal !== null && this.cotizacionTeorica > 0) {
      return this.cotizacionReal - this.cotizacionTeorica;
    }
    return 0;
  }

  validarCotizacionReal() {
    if (this.cotizacionReal !== null && this.cotizacionReal < 0) {
      this.cotizacionReal = 0;
    }
  }
}