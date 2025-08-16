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
  datosDesdeDB: boolean = false;
  esEmpresaPublicaConLiquidacionPreliminar: boolean = false;
  esAdministrador: boolean = false;
  rolUsuario: string = '';
  tipoEmpresa: string = '';
  nombreEmpresa: string = '';
  nuevoMontoTGN: number | null = null;
  mostrarInputMontoTGN: boolean = false;
  validadoPor: string = '';
  liquidacionValidada: boolean = false;
  cotizacionReal: number | null = null;
  showCotizacionRealInput: boolean = false;
  
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
  // REEMPLAZAR COMPLETAMENTE el método loadAportes()
  loadAportes() {
    if (!this.idPlanilla) {
      this.errorMessage = 'Por favor, asegúrate de que el ID de la planilla esté definido.';
      this.messages = [{ severity: 'error', summary: 'Error', detail: this.errorMessage }];
      return;
    }

    this.loading = true;
    this.errorMessage = undefined;
    this.messages = [];
    
    console.log('🔄 Cargando liquidación para planilla:', this.idPlanilla);
    
    // El dispatcher del backend maneja automáticamente el tipo de empresa
    this.planillasService.obtenerLiquidacion(this.idPlanilla).subscribe({
      next: (response: any) => {
        console.log('📊 Respuesta obtenerLiquidacion:', response);
        console.log('🏢 Tipo empresa:', response.tipo_empresa);
        
        this.planilla = response;
        this.datosDesdeDB = response.fecha_liquidacion ? true : false;
        
        // Verificar si es empresa pública con liquidación preliminar
        this.esEmpresaPublicaConLiquidacionPreliminar = 
          response.tipo_empresa === 'AP' && 
          (response.es_liquidacion_preliminar || 
          response.observaciones?.includes('LIQUIDACIÓN PRELIMINAR'));
        
        console.log('📋 Es liquidación preliminar:', this.esEmpresaPublicaConLiquidacionPreliminar);
        
        this.mostrarMensajesSegunContexto(response);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error en obtenerLiquidacion:', error);
        this.manejarErrorCarga(error);
      },
    });
  }
  // REEMPLAZAR COMPLETAMENTE el método confirmarLiquidacion()
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

    this.loading = true;
    
    if (actualizarFechaPago) {
      this.ejecutarRecalculoSegunTipoEmpresa();
    } else {
      this.validarLiquidacionActual();
    }
  }
  // REEMPLAZAR COMPLETAMENTE el método ejecutarRecalculo() con ejecutarRecalculoSegunTipoEmpresa()
  private ejecutarRecalculoSegunTipoEmpresa() {
    const tipoEmpresa = this.planilla?.tipo_empresa?.toUpperCase();
    console.log('🔄 Ejecutando recálculo para tipo empresa:', tipoEmpresa);
    
    if (tipoEmpresa === 'AP') {
      this.ejecutarRecalculoEmpresaPublica();
    } else {
      this.ejecutarRecalculoEmpresaPrivada();
    }
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

    this.resetearVariablesModal();
    this.displayDialog = true;
    
    // Resetear valores
    this.fechaPago = null;
    this.cotizacionReal = null;
    this.showFechaPagoInput = false;
    this.showCotizacionRealInput = false;
    this.displayDialog = true;
  }
  cancelarSeleccionFecha() {
    this.fechaPago = null;
    this.showFechaPagoInput = false;
    this.nuevoMontoTGN = null;
    this.mostrarInputMontoTGN = false;
  }
  confirmarLiquidacionConNuevoMonto() {
    if (!this.fechaPago || !this.nuevoMontoTGN) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Faltan datos requeridos (fecha de pago y nuevo monto TGN).',
      });
      return;
    }

    this.loading = true;
    this.ejecutarRecalculo();
  }
  private resetearVariablesModal() {
    this.nuevoMontoTGN = null;
    this.mostrarInputMontoTGN = false;
    this.fechaPago = null;
    this.showFechaPagoInput = false;
  }
  recargarDatosSinRecalcular() {
    console.log('🔄 Recargando datos sin recalcular para planilla:', this.idPlanilla);
    
    this.loading = true;
    this.errorMessage = undefined;
    this.messages = [{ 
      severity: 'info', 
      summary: 'Cargando', 
      detail: 'Obteniendo datos de liquidación...' 
    }];
    
    // Solo obtener liquidación existente sin recalcular
    this.planillasService.obtenerLiquidacion(this.idPlanilla).subscribe({
      next: (response: any) => {
        console.log('📋 Datos recargados desde BD:', response);
        console.log('🔢 Aporte porcentaje cargado:', response.aporte_porcentaje);
        console.log('📅 Fecha liquidación:', response.fecha_liquidacion);
        
        this.planilla = response;
        this.datosDesdeDB = true;
        
        // Verificar si es empresa pública con liquidación preliminar
        this.esEmpresaPublicaConLiquidacionPreliminar = 
          response.tipo_empresa === 'AP' && 
          this.datosDesdeDB && 
          response.observaciones?.includes('LIQUIDACIÓN PRELIMINAR');
        
        // Mensaje informativo según el estado
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
            severity: 'success', 
            summary: 'Liquidación Cargada', 
            detail: `Datos de liquidación cargados correctamente. TGN: ${response.aporte_porcentaje}` 
          }];
        }
        
        this.loading = false;
        console.log('✅ Datos recargados exitosamente sin recalcular');
      },
      error: (error) => {
        console.error('❌ Error al recargar datos:', error);
        this.errorMessage = error.error?.message || 'Error al obtener la liquidación';
        this.messages = [{ 
          severity: 'error', 
          summary: 'Error', 
          detail: this.errorMessage 
        }];
        this.loading = false;
      }
    });
  }
  cancelarNuevoMonto() {
    this.nuevoMontoTGN = null;
    this.mostrarInputMontoTGN = false;
    console.log('❌ Cancelado ingreso de nuevo monto TGN');
  }
  validarNuevoMonto() {
    if (!this.nuevoMontoTGN || this.nuevoMontoTGN <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, ingrese un monto TGN válido mayor a 0.',
      });
      return;
    }
    
    console.log('✅ Nuevo monto TGN validado:', this.nuevoMontoTGN);
    console.log('📅 Fecha de pago seleccionada:', this.fechaPago);
    
    // Ocultar el input del monto
    this.mostrarInputMontoTGN = false;
    
    // Continuar con el proceso de recálculo usando el nuevo monto
    this.confirmarLiquidacionConNuevoMonto();
  }
  /* =========================================================================== */
/* MÉTODOS ESPECÍFICOS POR TIPO DE EMPRESA                                    */
/* =========================================================================== */

// 🏢 EMPRESAS PRIVADAS: Ejecutar recálculo
private ejecutarRecalculoEmpresaPrivada() {
  console.log('🏢 Ejecutando recálculo EMPRESA PRIVADA');
  
  this.messages = [{ 
    severity: 'info', 
    summary: 'Procesando', 
    detail: 'Recalculando liquidación de empresa privada...' 
  }];
  
  this.planillasService.recalcularLiquidacionPrivada(this.idPlanilla, this.fechaPago!).subscribe({
    next: (response: any) => {
      this.manejarRespuestaExitosa(response, 'Liquidación de empresa privada recalculada correctamente');
    },
    error: (error) => {
      this.manejarError(error);
    }
  });
}

// 🏛️ EMPRESAS PÚBLICAS: Ejecutar recálculo
private ejecutarRecalculoEmpresaPublica() {
  console.log('🏛️ Ejecutando recálculo EMPRESA PÚBLICA');
  
  if (this.esEmpresaPublicaConLiquidacionPreliminar && this.nuevoMontoTGN) {
    // Actualizar con nuevo monto TGN real
    this.actualizarConNuevoTGN();
  } else {
    // Recalcular sin nuevo TGN
    this.recalcularSinNuevoTGN();
  }
}

// 🏛️ EMPRESAS PÚBLICAS: Actualizar con nuevo TGN
private actualizarConNuevoTGN() {
  console.log('🏛️ Actualizando empresa pública con nuevo TGN:', this.nuevoMontoTGN);
  
  this.messages = [{ 
    severity: 'info', 
    summary: 'Procesando', 
    detail: 'Actualizando fecha de pago real y nuevo monto TGN...' 
  }];
  
  this.planillasService.actualizarEmpresaPublicaConTGN(this.idPlanilla, this.fechaPago!, this.nuevoMontoTGN!).subscribe({
    next: (response: any) => {
      const mensaje = `Empresa pública actualizada: Nuevo TGN ${response.aporte_porcentaje}, Descuento 5%: ${response.descuento_min_salud}`;
      this.manejarRespuestaExitosa(response, mensaje);
    },
    error: (error) => {
      this.manejarError(error);
    }
  });
}

// 🏛️ EMPRESAS PÚBLICAS: Recalcular sin nuevo TGN
private recalcularSinNuevoTGN() {
  console.log('🏛️ Recalculando empresa pública sin nuevo TGN');
  
  this.messages = [{ 
    severity: 'info', 
    summary: 'Procesando', 
    detail: 'Recalculando liquidación de empresa pública...' 
  }];
  
  this.planillasService.recalcularLiquidacionPublica(this.idPlanilla, this.fechaPago!).subscribe({
    next: (response: any) => {
      this.manejarRespuestaExitosa(response, 'Liquidación de empresa pública recalculada correctamente');
    },
    error: (error) => {
      this.manejarError(error);
    }
  });
}

// 📝 Validar liquidación actual (sin cambios)
private validarLiquidacionActual() {
  this.planillasService.validarLiquidacion(this.idPlanilla, {}).subscribe({
    next: (response: any) => {
      console.log('✅ Liquidación validada sin cambios:', response);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Liquidación validada correctamente.',
      });
      
      this.displayDialog = false;
      this.loading = false;
      this.recargarDatosSinRecalcular();
    },
    error: (error) => {
      this.manejarError(error);
    },
  });
}

/* =========================================================================== */
/* MÉTODOS AUXILIARES PARA MANEJO DE RESPUESTAS                              */
/* =========================================================================== */

// 📊 Mostrar mensajes según el contexto
private mostrarMensajesSegunContexto(response: any) {
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
    const fechaLiq = response.fecha_liquidacion ? new Date(response.fecha_liquidacion).toLocaleDateString() : '';
    this.messages = [{ 
      severity: 'success', 
      summary: 'Liquidación Cargada', 
      detail: `Liquidación calculada el ${fechaLiq}` 
    }];
  } else {
    this.messages = [{ 
      severity: 'success', 
      summary: 'Liquidación Calculada', 
      detail: 'Se calculó la liquidación exitosamente.' 
    }];
  }
}

// ✅ Manejar respuesta exitosa
private manejarRespuestaExitosa(response: any, mensajeBase: string) {
  console.log('📊 RESPUESTA EXITOSA:', response);
  console.log('🔢 Aporte porcentaje:', response.aporte_porcentaje);
  console.log('📉 Total deducciones:', response.total_deducciones);
  
  this.planilla = response;
  this.datosDesdeDB = true;
  this.esEmpresaPublicaConLiquidacionPreliminar = false;
  
  this.messageService.add({
    severity: 'success',
    summary: 'Éxito',
    detail: mensajeBase,
  });
  
  this.displayDialog = false;
  this.loading = false;
  this.resetearVariablesModal();
  
  console.log('✅ Proceso completado exitosamente');
}

// ❌ Manejar errores
private manejarError(error: any) {
  console.error('❌ Error en proceso:', error);
  this.loading = false;
  this.messageService.add({
    severity: 'error',
    summary: 'Error',
    detail: error.error?.message || 'Error al procesar la solicitud.',
  });
}

// ❌ Manejar errores de carga
private manejarErrorCarga(error: any) {
  this.errorMessage = error.error?.message || 'Error al obtener la liquidación';
  this.planilla = null;
  this.datosDesdeDB = false;
  this.esEmpresaPublicaConLiquidacionPreliminar = false;
  
  if (this.errorMessage && this.errorMessage.includes('no tiene fecha de pago')) {
    this.messages = [{ 
      severity: 'warn', 
      summary: 'Sin Fecha de Pago', 
      detail: 'Esta planilla no tiene fecha de pago asignada. No se puede calcular la liquidación.' 
    }];
  } else {
    this.messages = [{ 
      severity: 'error', 
      summary: 'Error', 
      detail: this.errorMessage 
    }];
  }
  
  this.loading = false;
}

// botones

obtenerTextoBoton() {
  if (this.esEmpresaPublicaConLiquidacionPreliminar && this.esAdministrador) {
    return 'Actualizar Fecha de Pago';
  } else if (this.esEmpresaPublicaConLiquidacionPreliminar && !this.esAdministrador) {
    return 'Esperando Actualización del Administrador';
  } else if (this.datosDesdeDB) {
    return 'Recalcular Liquidación';
  } else {
    return 'Calcular Liquidación';
  }
  
  
}

obtenerIconoBoton() {
  if (this.esEmpresaPublicaConLiquidacionPreliminar && this.esAdministrador) {
    return 'pi pi-refresh';
  } else if (this.esEmpresaPublicaConLiquidacionPreliminar && !this.esAdministrador) {
    return 'pi pi-info-circle';
  } else if (this.datosDesdeDB) {
    return 'pi pi-check';
  } else {
    return 'pi pi-plus';
  } 
}

obtenerClaseBoton() {
  if (this.esEmpresaPublicaConLiquidacionPreliminar && this.esAdministrador) {
    return 'p-button-warning';
  } else if (this.esEmpresaPublicaConLiquidacionPreliminar && !this.esAdministrador) {
    return 'p-button-secondary';
  } else if (this.datosDesdeDB) {
    return 'p-button-success';
  } else {
    return 'p-button-primary';
  } 
}

//-------------------------------

private ejecutarRecalculo() {
  console.log('🔄 Método legacy ejecutarRecalculo() llamado - redirigiendo a método específico');
  this.ejecutarRecalculoSegunTipoEmpresa();
}
}