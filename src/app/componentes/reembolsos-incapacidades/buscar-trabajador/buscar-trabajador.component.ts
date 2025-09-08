import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReembolsosIncapacidadesService } from '../../../servicios/reembolsos-incapacidades/reembolsos-incapacidades.service';
import { 
  BajaMedica, 
  DetalleReembolsoCalculado 
} from '../../../interfaces/reembolsos-incapacidades/reembolsos-incapacidades.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-buscar-trabajador',
  templateUrl: './buscar-trabajador.component.html',
  styleUrls: ['./buscar-trabajador.component.css']
})
export class BuscarTrabajadorComponent {
  @Output() detalleSeleccionado = new EventEmitter<DetalleReembolsoCalculado>();

  buscarForm: FormGroup;
  bajasEncontradas: BajaMedica[] = [];
  bajaSeleccionada: BajaMedica | null = null;
  detalleCalculado: DetalleReembolsoCalculado | null = null;
  
  cargandoBusqueda = false;
  mostrarDialogBajas = false;
  mostrarDialogCalculo = false;

  // Datos del trabajador (estos podrían venir de otro servicio)
  datosWorker = {
    ci: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombres: '',
    salario: 0
  };

  constructor(
    private fb: FormBuilder,
    private reembolsosService: ReembolsosIncapacidadesService
  ) {
    this.buscarForm = this.fb.group({
      matricula: ['', [Validators.required, Validators.pattern(/^\d{2}-\d{4}\s[A-Z]{3}$/)]]
    });
  }

  buscarBajasMedicas() {
    if (this.buscarForm.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Por favor ingrese una matrícula válida (formato: XX-XXXX XXX)'
      });
      return;
    }

    const matricula = this.buscarForm.get('matricula')?.value;
    this.cargandoBusqueda = true;

    this.reembolsosService.buscarBajasMedicasPorMatricula(matricula).subscribe({
      next: (response) => {
        this.cargandoBusqueda = false;
        
        if (response.ok && response.bajasDB && response.bajasDB.length > 0) {
          this.bajasEncontradas = response.bajasDB;
          this.mostrarDialogBajas = true;
          
          Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: `Se encontraron ${response.bajasDB.length} baja(s) médica(s)`,
            timer: 2000
          });
        } else {
          Swal.fire({
            icon: 'info',
            title: 'Sin resultados',
            text: 'No se encontraron bajas médicas para esta matrícula'
          });
        }
      },
      error: (error) => {
        this.cargandoBusqueda = false;
        console.error('Error al buscar bajas médicas:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al consultar el servicio de bajas médicas'
        });
      }
    });
  }

  seleccionarBaja(baja: BajaMedica) {
    this.bajaSeleccionada = baja;
    this.mostrarDialogBajas = false;
    
    // Extraer CI de la matrícula (formato: XX-XXXX XXX)
    const ci = baja.ASE_MAT.split(' ')[0];
    
    // Aquí deberías llamar a un servicio para obtener los datos completos del trabajador
    // Por ahora uso datos mock, pero deberías reemplazar esto
    this.datosWorker = {
      ci: ci,
      apellido_paterno: 'APELLIDO_PATERNO', // Obtener del servicio de trabajadores
      apellido_materno: 'APELLIDO_MATERNO', // Obtener del servicio de trabajadores
      nombres: 'NOMBRES_COMPLETOS', // Obtener del servicio de trabajadores
      salario: 5000 // Obtener del servicio de trabajadores o permitir editar
    };
    
    this.mostrarDialogCalculo = true;
  }

  calcularYMostrarReembolso() {
    if (!this.bajaSeleccionada) return;

    this.detalleCalculado = this.reembolsosService.calcularReembolso(
      this.bajaSeleccionada,
      this.datosWorker,
      this.datosWorker.salario
    );

    // Validar cotizaciones previas (esto debería venir de un servicio real)
    const cotizacionesPrevias = 3; // Mock - obtener del servicio real
    const cumpleCotizaciones = this.reembolsosService.validarCotizacionesPrevias(
      this.detalleCalculado.tipo_incapacidad,
      cotizacionesPrevias
    );

    if (!cumpleCotizaciones) {
      const mesesRequeridos = this.detalleCalculado.tipo_incapacidad === 'MATERNIDAD' ? 4 : 2;
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: `El trabajador no cumple con las ${mesesRequeridos} cotizaciones previas requeridas para ${this.detalleCalculado.tipo_incapacidad}`
      });
    }
  }

  confirmarYAgregar() {
    if (this.detalleCalculado) {
      // Actualizar con los datos editados
      this.detalleCalculado.apellido_paterno = this.datosWorker.apellido_paterno;
      this.detalleCalculado.apellido_materno = this.datosWorker.apellido_materno;
      this.detalleCalculado.nombres = this.datosWorker.nombres;
      this.detalleCalculado.salario = this.datosWorker.salario;
      
      // Recalcular con el nuevo salario
      const montoDia = this.datosWorker.salario / 30;
      const montoReembolso = (montoDia * this.detalleCalculado.dias_reembolso * this.detalleCalculado.porcentaje_reembolso) / 100;
      
      this.detalleCalculado.monto_dia = parseFloat(montoDia.toFixed(6));
      this.detalleCalculado.monto_reembolso = parseFloat(montoReembolso.toFixed(6));
      
      // Emitir el detalle calculado al componente padre
      this.detalleSeleccionado.emit(this.detalleCalculado);
      
      // Limpiar y cerrar
      this.limpiarFormulario();
      this.mostrarDialogCalculo = false;
      
      Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: 'Trabajador agregado a la planilla de reembolsos',
        timer: 2000
      });
    }
  }

  limpiarFormulario() {
    this.buscarForm.reset();
    this.bajasEncontradas = [];
    this.bajaSeleccionada = null;
    this.detalleCalculado = null;
    this.mostrarDialogBajas = false;
    this.mostrarDialogCalculo = false;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  getTipoIncapacidadClass(tipo: string): string {
    switch (tipo?.trim()) {
      case 'ENFERMEDAD': return 'enfermedad';
      case 'MATERNIDAD': return 'maternidad';
      case 'PROFESIONAL': return 'profesional';
      default: return 'default';
    }
  }

  cerrarDialogBajas() {
    this.mostrarDialogBajas = false;
  }

  cerrarDialogCalculo() {
    this.mostrarDialogCalculo = false;
    this.bajaSeleccionada = null;
    this.detalleCalculado = null;
  }
}