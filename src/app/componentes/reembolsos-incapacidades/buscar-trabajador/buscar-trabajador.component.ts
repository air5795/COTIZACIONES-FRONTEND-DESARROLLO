import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Input() codPatronal: string = '';  
  @Input() mes: string = '';          
  @Input() gestion: string = '';      

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
          this.mostrarDialogBajas = true; // Sigue siendo útil para saber si mostrar la lista
          
          // El Swal de éxito es bueno, lo mantenemos.
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
    // Ya no cerramos un diálogo de bajas, el usuario puede querer ver la lista.
    // this.mostrarDialogBajas = false; 
    
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
    if (!this.bajaSeleccionada) return; // Esta línea ya está
    
    // Agregar verificación adicional para TypeScript
    const bajaSeleccionada = this.bajaSeleccionada; // Crear variable local
  
    // Llamar al backend para el cálculo
    this.reembolsosService.calcularReembolso(
      bajaSeleccionada, // Usar la variable local
      this.datosWorker,
      this.codPatronal,
      this.mes,
      this.gestion
    ).subscribe({
      next: (response) => {
        console.log('Respuesta del cálculo:', response);
        
        // Usar los datos del backend
        this.detalleCalculado = {
          ci: response.datos_trabajador.ci,
          apellido_paterno: response.datos_trabajador.apellido_paterno,
          apellido_materno: response.datos_trabajador.apellido_materno,
          nombres: response.datos_trabajador.nombres,
          matricula: response.datos_trabajador.matricula,
          tipo_incapacidad: response.calculo.tipo_incapacidad,
          fecha_inicio_baja: response.calculo.fecha_inicio_baja,
          fecha_fin_baja: response.calculo.fecha_fin_baja,
          dias_incapacidad: response.calculo.dias_incapacidad,
          dias_reembolso: response.calculo.dias_reembolso,
          salario: response.calculo.salario,
          monto_dia: response.calculo.monto_dia,
          porcentaje_reembolso: response.calculo.porcentaje_reembolso,
          monto_reembolso: response.calculo.monto_reembolso,
          especialidad: bajaSeleccionada.ESP_NOM, 
          medico: bajaSeleccionada.MEDI_NOM,     
          comprobante: bajaSeleccionada.COMPROBANTE, 
          fecha_incorporacion: this.formatDate(bajaSeleccionada.FECHA_INCORPORACION) 
        };
  
        // Actualizar los datos del trabajador con la información real del backend
        this.datosWorker = {
          ci: response.datos_trabajador.ci,
          apellido_paterno: response.datos_trabajador.apellido_paterno,
          apellido_materno: response.datos_trabajador.apellido_materno,
          nombres: response.datos_trabajador.nombres,
          salario: response.datos_trabajador.salario_total
        };
      },
      error: (error) => {
        console.error('Error al calcular reembolso:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo calcular el reembolso. Verifique que el trabajador esté en la planilla del período correspondiente.'
        });
      }
    });
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

  limpiarResultados() {
    this.bajasEncontradas = [];
    this.mostrarDialogBajas = false;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getTipoIncapacidadClass(tipo: string): string {
    switch (tipo?.trim().toUpperCase()) {
      case 'ENFERMEDAD': return 'enfermedad';
      case 'MATERNIDAD': return 'maternidad';
      case 'ACCIDENTE DE TRABAJO':
      case 'ENFERMEDAD PROFESIONAL':
        return 'profesional';
      default: return 'default';
    }
  }

  cerrarDialogCalculo() {
    this.mostrarDialogCalculo = false;
    this.bajaSeleccionada = null;
    this.detalleCalculado = null;
  }
}