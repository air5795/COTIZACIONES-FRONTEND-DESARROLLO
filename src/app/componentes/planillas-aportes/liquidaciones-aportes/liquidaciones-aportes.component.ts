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
      this.messages = [{ severity: 'error', summary: 'Error', detail: this.errorMessage }];
      return;
    }

    this.loading = true;
    this.errorMessage = undefined;
    this.messages = [];
    
    // CAMBIO: Usar el nuevo método obtenerLiquidacion en lugar de calcularAportes
    this.planillasService.obtenerLiquidacion(this.idPlanilla).subscribe({
      next: (response: any) => {
        this.planilla = response;
        
        // Verificar si los datos vienen de BD (ya calculados) o se acaban de calcular
        this.datosDesdeDB = response.fecha_liquidacion ? true : false;
        
        // Verificar si es empresa pública con liquidación preliminar
        this.esEmpresaPublicaConLiquidacionPreliminar = 
          response.tipo_empresa === 'AP' && 
          this.datosDesdeDB && 
          response.observaciones?.includes('LIQUIDACIÓN PRELIMINAR');
        
        // Mensajes según el contexto y rol
        if (this.esEmpresaPublicaConLiquidacionPreliminar && this.esAdministrador) {
          this.messages = [{ 
            severity: 'warn', 
            summary: 'Liquidación Preliminar - Empresa Pública', 
            detail: 'Esta liquidación fue calculada automáticamente. Actualice la fecha de pago cuando la empresa realice el pago.' 
          }];
        } else if (this.esEmpresaPublicaConLiquidacionPreliminar && !this.esAdministrador) {
          this.messages = [{ 
            severity: 'info', 
            summary: 'Liquidación Preliminar', 
            detail: 'Esta es una liquidación preliminar. El administrador actualizará la fecha cuando se realice el pago.' 
          }];
        } else if (this.datosDesdeDB) {
          this.messages = [{ 
            severity: 'info', 
            summary: 'Liquidación Cargada', 
            detail: 'Se cargaron los datos de liquidación previamente calculados.' 
          }];
        } else {
          this.messages = [{ 
            severity: 'success', 
            summary: 'Liquidación Calculada', 
            detail: 'Se calculó la liquidación exitosamente.' 
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
    // Verificar permisos antes de abrir el diálogo
    if (!this.esAdministrador) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo el administrador puede validar o actualizar liquidaciones.',
      });
      return;
    }
    
    this.fechaPago = null;
    this.showFechaPagoInput = false;
    this.displayDialog = true;
  }

  // Cancelar la selección de fecha y volver a la pregunta inicial
  cancelarSeleccionFecha() {
    this.fechaPago = null;
    this.showFechaPagoInput = false;
  }

  // MÉTODO ACTUALIZADO: Para recalcular liquidación con nueva fecha
  confirmarLiquidacion(actualizarFechaPago: boolean) {
    // Doble verificación de permisos
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

    this.loading = true;
    
    if (actualizarFechaPago) {
      // Mensaje diferente según el contexto
      const accion = this.esEmpresaPublicaConLiquidacionPreliminar 
        ? 'Actualizando fecha de pago real para empresa pública...' 
        : 'Recalculando liquidación con nueva fecha...';
      
      this.messages = [{ 
        severity: 'info', 
        summary: 'Procesando', 
        detail: accion 
      }];
      
      // Recalcular con la nueva fecha
      this.planillasService.recalcularLiquidacionConFecha(this.idPlanilla, this.fechaPago!).subscribe({
        next: (response: any) => {
          this.planilla = response;
          this.datosDesdeDB = true;
          this.esEmpresaPublicaConLiquidacionPreliminar = false; // Ya no es preliminar
          
          const mensaje = response.tipo_empresa === 'AP' 
            ? 'Fecha de pago actualizada correctamente para la empresa pública.'
            : 'Liquidación recalculada correctamente con la nueva fecha.';
          
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
            detail: error.error?.message || 'Error al actualizar la liquidación.',
          });
        },
      });
    } else {
      // Si no se actualiza la fecha, solo validar/confirmar la liquidación actual
      this.planillasService.validarLiquidacion(this.idPlanilla, {}).subscribe({
        next: (response: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Liquidación validada correctamente.',
          });
          
          this.displayDialog = false;
          this.loading = false;
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
}