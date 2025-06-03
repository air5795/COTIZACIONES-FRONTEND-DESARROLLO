// src/app/components/liquidaciones-aportes/liquidaciones-aportes.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { PlanillasAportesService } from '../../../servicios/planillas-aportes/planillas-aportes.service';
import { MessageService, Message } from 'primeng/api';

@Component({
  selector: 'app-liquidaciones-aportes',
  templateUrl: './liquidaciones-aportes.component.html',
  styleUrls: ['./liquidaciones-aportes.component.css'],
  providers: [MessageService],
})
export class LiquidacionesAportesComponent implements OnInit {
  @Input() idPlanilla!: number;
  planilla: any = null;
  loading: boolean = false;
  errorMessage: string | undefined = undefined;
  messages: Message[] = [];
  displayDialog: boolean = false; // Controla la visibilidad del modal
  showFechaPagoInput: boolean = false; // Controla si se muestra el input de fecha
  fechaPago: Date | null = null; // Almacena la fecha de pago seleccionada
  today: Date = new Date(); // Para limitar el calendario a fechas no futuras
  

  constructor(
    private planillasService: PlanillasAportesService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadAportes();
  }

  // Cargar aportes automáticamente
  loadAportes() {
    if (!this.idPlanilla) {
      this.errorMessage = 'Por favor, asegúrate de que el ID de la planilla esté definido.';
      this.messages = [{ severity: 'error', summary: 'Error', detail: this.errorMessage }];
      return;
    }

    this.loading = true;
    this.errorMessage = undefined;
    this.messages = [];
    this.planillasService.calcularAportes(this.idPlanilla).subscribe({
      next: (response: any) => {
        this.planilla = response.planilla;
        this.messages = [{ severity: 'success', summary: 'Éxito', detail: response.mensaje }];
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al calcular los aportes';
        this.messages = [{ severity: 'error', summary: 'Error', detail: this.errorMessage }];
        this.loading = false;
      },
    });
  }

  showDialog() {
    this.fechaPago = null; // Reiniciar la fecha
    this.showFechaPagoInput = false; // Mostrar la pregunta inicial
    this.displayDialog = true;
  }

  // Cancelar la selección de fecha y volver a la pregunta inicial
  cancelarSeleccionFecha() {
    this.fechaPago = null;
    this.showFechaPagoInput = false;
  }

  confirmarLiquidacion(actualizarFechaPago: boolean) {
    // Si se actualiza la fecha de pago, validar que se haya seleccionado una
    if (actualizarFechaPago && !this.fechaPago) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, seleccione una fecha de pago.',
      });
      return;
    }

    // Preparar el payload
    const payload = actualizarFechaPago
      ? { fecha_pago: this.fechaPago!.toISOString() }
      : {};

    this.planillasService.validarLiquidacion(this.idPlanilla, payload).subscribe({
      next: (response: any) => {
        this.planilla = response.planilla; 
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Liquidación validada correctamente.',
        });
        this.displayDialog = false;
        this.loadAportes();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Error al validar la liquidación.',
          
        });
      },
    });
  }
}