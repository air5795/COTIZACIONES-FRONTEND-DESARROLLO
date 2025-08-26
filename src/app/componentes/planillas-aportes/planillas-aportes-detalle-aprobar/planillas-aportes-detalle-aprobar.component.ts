import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanillasAportesService } from '../../../servicios/planillas-aportes/planillas-aportes.service';
import { EmpresaService } from '../../../servicios/empresa/empresa.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { MenuItem } from 'primeng/api';
import { SessionService } from '../../../servicios/auth/session.service';

@Component({
  selector: 'app-planillas-aportes-detalle-aprobar',
  templateUrl: './planillas-aportes-detalle-aprobar.component.html',
  styleUrl: './planillas-aportes-detalle-aprobar.component.css'
})
export class PlanillasAportesDetalleAprobarComponent {

    idPlanilla!: number;
    trabajadores: any[] = [];
    loading = true;
    displayModal = false;
    trabajadorSeleccionado: any = {};
    planillaInfo: any = {};
    estadoSeleccionado: number | null = null;
    observaciones!: string;
    resumenData: any = null;
    resumenLoading = false;
    tipoEmpresa: string | null = null;

    
  
    regionales = [
      { label: 'LA PAZ', value: 'LA PAZ' },
      { label: 'COCHABAMBA', value: 'COCHABAMBA' },
      { label: 'SANTA CRUZ', value: 'SANTA CRUZ' },
      { label: 'POTOSÍ', value: 'POTOSI' },
      { label: 'ORURO', value: 'ORURO' },
      { label: 'TARIJA', value: 'TARIJA' },
      { label: 'PANDO', value: 'PANDO' },
      { label: 'BENI', value: 'BENI' },
      { label: 'CHUQUISACA', value: 'CHUQUISACA' },
    ];

    estados = [
      { label: 'APROBAR PLANILLA', value: 2 } ,
      { label: 'OBSERVAR PLANILLA', value: 3 } 
    ];

    altas: any[] = [];
    bajasNoEncontradas: any[] = [];
    bajasPorRetiro: any[] = []; 

    displayPdfModal: boolean = false;
    pdfSrc: string = '';


    pagina: number = 1;
    limite: number = 15;
    total: number = 0;
    busqueda: string = '';

    // Variable para almacenar el conteo de estados del backend
    conteoEstadosAsegurados: any = {
      VIGENTE: 0,
      BAJA: 0,
      'DER HABIENTE': 0,
      FALLECIDO: 0,
      CESANTIA: 0
    };

      // cruce afiliaciones
  casosAnalisis: any = null;
  resumenCompleto: any = null;
  estadisticasCompletas: any = null;
  mostrarAnalisisCompletoDialog: boolean = false;
  fechaUltimaVerificacion: Date | null = null;

  trabajadoresFaltantes: any[] = [];

    
    
  
    constructor(
      private route: ActivatedRoute, 
      private planillasService: PlanillasAportesService,
      private empresaService: EmpresaService,
      private sessionService: SessionService,
      private router: Router
    ) {
    }
  
    ngOnInit(): void {
      this.idPlanilla = Number(this.route.snapshot.paramMap.get('id'));
      this.obtenerDetalles();
      this.obtenerInformacionPlanilla().then(() => {
        this.obtenerComparacionPlanillas();
        this.obtenerResumenPlanilla(); 
        this.obtenerTipoEmpresa();
      });
    }

    obtenerInformacionPlanilla(): Promise<void> {
      return new Promise((resolve, reject) => {
        this.planillasService.getPlanillaId(this.idPlanilla).subscribe({
          next: (data) => {
            this.planillaInfo = data;
            if (this.planillaInfo.planilla && this.planillaInfo.planilla.fecha_planilla) {
              const fecha = new Date(this.planillaInfo.planilla.fecha_planilla);
              const meses = [
                'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
              ];
              this.planillaInfo.planilla.mes = meses[fecha.getUTCMonth()];
              this.planillaInfo.planilla.gestion = fecha.getUTCFullYear();
            }
            console.log('Información de la planilla:', this.planillaInfo);
            resolve(); 
          },
          error: (err) => {
            console.error('Error al obtener información de la planilla:', err);
            reject(err);
          }
        });
      });
    }

/* OBTENER DETALLES BUSQUEDA Y PAGINACION *************************************************************************************************** */

  obtenerDetalles() {
    this.loading = true;
    this.planillasService
      .getPlanillaDetalle(
        this.idPlanilla,
        this.pagina,
        this.limite,
        this.busqueda
      )
      .subscribe({
        next: (data) => {
          this.trabajadores = data.trabajadores || [];
          this.total = data.total || 0;
          
          // Capturar el conteo de estados del backend
          if (data.conteo_estados_asegurados) {
            this.conteoEstadosAsegurados = data.conteo_estados_asegurados;
          }
          
          this.loading = false;
          console.log('Datos recibidos:', data);
          console.log('Conteo estados asegurados:', this.conteoEstadosAsegurados);
          console.log('Página actual:', this.pagina);
          console.log('Límite actual:', this.limite);
          console.log('Total de registros:', this.total);
        },
        error: (err) => {
          console.error('Error al obtener detalles:', err);
          this.loading = false;
        },
      });
  }

  onPageChange(event: any) {
    this.pagina = Math.floor(event.first / event.rows) + 1;
    this.limite = event.rows;
    this.obtenerDetalles();
  }

  buscar(value: string): void {
    this.busqueda = value.trim();
    this.pagina = 1; 
    this.obtenerDetalles();
  }

  recargar() {
    this.busqueda = ''; 
    this.pagina = 1; 
    console.log('Búsqueda después de recargar:', this.busqueda);  
    this.obtenerDetalles(); 
  }

/************************************************************************************************************************************************ */
/* colores de estado *********************************************************************************************************************** */
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

/**********************************************************************************************************************************************/ 
/* BAJAS Y ALTAS ******************************************************************************************************************************/


obtenerMesAnterior(fechaActual: string): { mesAnterior: string, gestion: string } | null {
  const [year, month] = fechaActual.split('T')[0].split('-'); 
  const añoActual = parseInt(year); 
  const mesActual = parseInt(month) - 1; 

  let añoAnterior = añoActual;
  let mesAnterior = mesActual - 1; 

  if (mesAnterior < 0) {
    mesAnterior = 11; 
    añoAnterior = añoActual - 1;
  }

  const mesAnteriorStr = String(mesAnterior + 1).padStart(2, '0'); 
  const gestionAnterior = añoAnterior.toString();

  console.log(`Entrada: ${fechaActual}, Mes actual (0-based): ${mesActual}, Mes anterior: ${mesAnteriorStr}, Gestión anterior: ${gestionAnterior}`);

  return { mesAnterior: mesAnteriorStr, gestion: gestionAnterior };
}


obtenerComparacionPlanillas() {
  if (!this.planillaInfo.planilla) return;

  const { cod_patronal, fecha_planilla } = this.planillaInfo.planilla;
  console.log(`Datos obtenidos: cod_patronal=${cod_patronal}, fecha_planilla=${fecha_planilla}`);

  // Extraer gestión y mes actual directamente de fecha_planilla
  const [year, month] = fecha_planilla.split('T')[0].split('-'); 
  const gestion = year; 
  const mesActual = month; 

  // Calcular mes anterior
  const mesAnteriorData = this.obtenerMesAnterior(fecha_planilla);

  if (!mesAnteriorData) {
    console.warn("El mes anterior no fue calculado correctamente.");
    return;
  }

  const { mesAnterior } = mesAnteriorData;

  console.log(`Llamando a compararPlanillas con: 
    cod_patronal=${cod_patronal}, 
    gestion=${gestion}, 
    mesAnterior=${mesAnterior}, 
    mesActual=${mesActual}`);

  this.planillasService.compararPlanillas(cod_patronal, gestion, mesAnterior, mesActual).subscribe({
    next: (data) => {
      console.log("Respuesta del backend:", data);
      this.altas = data.altas;
      this.bajasNoEncontradas = data.bajas.noEncontradas; // Bajas por trabajador no encontrado
      this.bajasPorRetiro = data.bajas.porRetiro; // Bajas por fecha de retiro
    },
    error: (err) => {
      console.error("Error al comparar planillas:", err);
    }
  });
}

   
    

    mostrarModal() {
      this.displayModal = true;
    }


guardarEstado() {
  if (this.planillaInfo.planilla.estado === 1 && !this.displayModal) {
    // Si el estado es 1 y el modal no está visible, mostramos el modal
    this.displayModal = true;
    return;
  }

  // Validaciones
  if (this.estadoSeleccionado === 3 && !this.observaciones) {
    Swal.fire({
      icon: 'warning',
      title: 'Observaciones requeridas',
      text: 'Debe ingresar las observaciones cuando selecciona "Observar Planilla"',
      confirmButtonText: 'Ok'
    });
    return;
  }

  const confirmText = this.estadoSeleccionado === 2 
    ? '¿Estás seguro de aprobar esta planilla? Este proceso es irreversible.' 
    : '¿Estás seguro de observar esta planilla? Este proceso es irreversible.';

  Swal.fire({
    title: '¿Estás seguro?',
    text: confirmText,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: this.estadoSeleccionado === 2 ? 'Sí, aprobar' : 'Sí, observar',
    cancelButtonText: 'Cancelar',
    didOpen: () => {
      // Aplicar estilo en línea al contenedor de SweetAlert
      const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
      if (swalContainer) {
        swalContainer.style.zIndex = '2000';
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // 🔧 OBTENER DATOS DEL USUARIO DE LA SESIÓN
      const sessionData = this.sessionService.sessionDataSubject.value;
      const usuarioProcesador = sessionData?.usuario || 'ADMIN';
      const nombreProcesador = sessionData?.persona 
        ? `${sessionData.persona.nombres || ''} ${sessionData.persona.primerApellido || ''} ${sessionData.persona.segundoApellido || ''}`.trim()
        : 'Administrador';

      console.log('🔧 Datos del usuario procesador:', {
        usuario: usuarioProcesador,
        nombre: nombreProcesador
      });

      // 🔧 LLAMADA ACTUALIZADA CON DATOS DEL USUARIO - NOMBRE CORRECTO
      this.planillasService.actualizarEstadoPlanilla(
        this.idPlanilla, 
        this.estadoSeleccionado!, 
        this.observaciones,
        usuarioProcesador,
        nombreProcesador      
      ).subscribe({
        next: (response) => {
          Swal.fire({
            icon: 'success',
            title: this.estadoSeleccionado === 2 ? 'Planilla aprobada' : 'Planilla observada',
            text: response.mensaje,
            confirmButtonText: 'Ok',
            didOpen: () => {
              // Aplicar estilo en línea al contenedor de SweetAlert
              const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
              if (swalContainer) {
                swalContainer.style.zIndex = '2000';
              }
            }
          }).then(() => {
            this.displayModal = false;
            this.router.navigate(['cotizaciones/historial-aportes']);
          });
        },
        error: (err) => {
          console.error('❌ Error al actualizar estado:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar el estado de la planilla',
            confirmButtonText: 'Ok',
            didOpen: () => {
              // Aplicar estilo en línea al contenedor de SweetAlert
              const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
              if (swalContainer) {
                swalContainer.style.zIndex = '2000';
              }
            }
          });
        }
      });
    }
  });
}

  
    exportarExcel() {
      if (!this.trabajadores || this.trabajadores.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No hay datos',
          text: 'No hay trabajadores en la planilla para exportar.',
          confirmButtonText: 'Ok'
        });
        return;
      }
  
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.trabajadores);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Planilla');
      const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, `Planilla_${this.idPlanilla}.xlsx`);
  
      Swal.fire({
        icon: 'success',
        title: 'Exportación Exitosa',
        text: 'La planilla ha sido exportada a Excel.',
        confirmButtonText: 'Ok'
      });
    }

    exportarPdf() {
      if (!this.planillaInfo.planilla) {
        Swal.fire({
          icon: 'warning',
          title: 'No hay datos',
          text: 'No se ha cargado la información de la planilla.',
          confirmButtonText: 'Ok'
        });
        return;
      }
    
      const { cod_patronal, gestion, mes } = this.planillaInfo.planilla;
    
      // Obtener mes anterior (esperamos que mes sea una fecha como "2025-02-01")
      const mesAnteriorData = this.obtenerMesAnterior(mes);
    
      if (!mesAnteriorData) {
        Swal.fire({
          icon: 'warning',
          title: 'No hay mes anterior',
          text: 'No se puede generar el reporte de bajas sin un mes anterior.',
          confirmButtonText: 'Ok'
        });
        return;
      }
    
      const { mesAnterior } = mesAnteriorData; // Extraemos solo el mesAnterior como string
    
      this.planillasService.generarReporteBajas(this.idPlanilla, cod_patronal, mesAnterior, mes, gestion).subscribe({
        next: (data: Blob) => {
          // Crear una URL con el Blob del PDF
          const fileURL = URL.createObjectURL(data);
    
          // Configurar la ventana emergente
          const ventanaEmergente = window.open("", "VistaPreviaPDF", "width=900,height=600,scrollbars=no,resizable=no");
    
          if (ventanaEmergente) {
            // Escribir el contenido HTML dentro de la ventana emergente
            ventanaEmergente.document.write(`
              <html>
                <head>
                  <title>Vista Previa del PDF</title>
                  <style>
                    body { margin: 0; text-align: center; }
                    iframe { width: 100%; height: 100vh; border: none; }
                  </style>
                </head>
                <body>
                  <iframe src="${fileURL}"></iframe>
                </body>
              </html>
            `);
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo abrir la vista previa del PDF. Es posible que el navegador haya bloqueado la ventana emergente.',
              confirmButtonText: 'Ok'
            });
          }
        },
        error: (err) => {
          console.error('Error al generar el reporte de bajas:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte de bajas.',
            confirmButtonText: 'Ok'
          });
        }
      });
    }
    
    exportarPdfrResumen() {
      if (!this.idPlanilla) {
        Swal.fire({
          icon: 'warning',
          title: 'No hay datos',
          text: 'No se ha cargado el ID de la planilla.',
          confirmButtonText: 'Ok'
        });
        return;
      }
    
      this.planillasService.generarReporteResumen(this.idPlanilla).subscribe({
        next: (data: Blob) => {
          const fileURL = URL.createObjectURL(data);
          const ventanaEmergente = window.open("", "VistaPreviaPDF", "width=900,height=600,scrollbars=no,resizable=no");
    
          if (ventanaEmergente) {
            ventanaEmergente.document.write(`
              <html>
                <head>
                  <title>Vista Previa del PDF</title>
                  <style>
                    body { margin: 0; text-align: center; }
                    iframe { width: 100%; height: 100vh; border: none; }
                  </style>
                </head>
                <body>
                  <iframe src="${fileURL}"></iframe>
                </body>
              </html>
            `);
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo abrir la vista previa del PDF. Es posible que el navegador haya bloqueado la ventana emergente.',
              confirmButtonText: 'Ok'
            });
          }
        },
        error: (err) => {
          console.error('Error al generar el reporte resumen:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte resumen.',
            confirmButtonText: 'Ok'
          });
        }
      });
    }

      // resumen por regionales ----------------------------------------------------------------------------------------------------
    
      obtenerResumenPlanilla() {
        this.resumenLoading = true;
        this.planillasService.obtenerDatosPlanillaPorRegional(this.idPlanilla).subscribe({
          next: (response) => {
            if (response.success) {
              this.resumenData = response.data;
              console.log('Datos del resumen:', this.resumenData);
            } else {
              Swal.fire({
                icon: 'warning',
                title: 'Advertencia',
                text: 'No se pudieron obtener los datos del resumen.',
              });
            }
            this.resumenLoading = false;
          }
          });
        }


        // para modal de validaciones 

        // Agrega estos métodos a tu componente existente:

getEstadoIcon(value: number): string {
  return value === 2 ? 'pi pi-check-circle text-green-500' : 'pi pi-exclamation-triangle text-orange-500';
}

getEstadoClass(): string {
  if (!this.estadoSeleccionado) return '';
  return this.estadoSeleccionado === 2 ? 'border-green-500' : 'border-orange-500';
}

getConfirmButtonClass(): string {
  if (!this.estadoSeleccionado) return '';
  return this.estadoSeleccionado === 2 ? 'p-button-success' : 'p-button-warning';
}

getEstadoHelpText(): string {
  return this.estadoSeleccionado === 2 
    ? 'La planilla será aprobada y marcada como válida' 
    : 'La planilla será observada y devuelta para correcciones';
}

onEstadoChange(event: any): void {
  if (event.value !== 3) {
    this.observaciones = '';
  }
}

cerrarModal(): void {
  this.displayModal = false;
  this.estadoSeleccionado = null;
  this.observaciones = '';
}


obtenerTipoEmpresa(): void {
  if (this.planillaInfo.planilla?.cod_patronal) {
    this.empresaService
      .getTipoByCodPatronal(this.planillaInfo.planilla.cod_patronal)
      .subscribe({
        next: (tipo) => {
          this.tipoEmpresa = tipo;
          console.log('Tipo de empresa:', this.tipoEmpresa);
        },
        error: (err) => {
          console.error('Error al obtener el tipo de empresa:', err);
          this.tipoEmpresa = null; 
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo obtener el tipo de empresa.',
            confirmButtonText: 'Ok',
          });
        },
      });
  }
}


/* verificarAfiliaciones() {
  Swal.fire({
    title: '¿Estás seguro?',
    text: 'Se verificará el estado de afiliación de todos los trabajadores en la planilla.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, verificar',
    cancelButtonText: 'Cancelar',
    didOpen: () => {
      const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
      if (swalContainer) {
        swalContainer.style.zIndex = '2000';
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      this.loading = true; // Mostrar indicador de carga
      this.planillasService.verificarAfiliacionDetalles(this.idPlanilla).subscribe({
        next: (response) => {
          this.loading = false;
          Swal.fire({
            icon: 'success',
            title: 'Verificación Completada',
            text: response.mensaje,
            confirmButtonText: 'Ok',
            didOpen: () => {
              const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
              if (swalContainer) {
                swalContainer.style.zIndex = '2000';
              }
            }
          }).then(() => {
            // Recargar los detalles de la planilla para reflejar los cambios en es_afiliado
            this.obtenerDetalles();
          });
        },
        error: (err) => {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `No se pudo verificar las afiliaciones: ${err.error.message || 'Error desconocido'}`,
            confirmButtonText: 'Ok',
            didOpen: () => {
              const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
              if (swalContainer) {
                swalContainer.style.zIndex = '2000';
              }
            }
          });
        }
      });
    }
  });
} */

/* descargarReporteAfiliaciones() {
  if (!this.idPlanilla) {
    Swal.fire({
      icon: 'warning',
      title: 'No hay datos',
      text: 'No se ha cargado el ID de la planilla.',
      confirmButtonText: 'Ok',
      didOpen: () => {
        const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
        if (swalContainer) {
          swalContainer.style.zIndex = '2000';
        }
      }
    });
    return;
  }
  this.planillasService.generarReporteAfiliacion(this.idPlanilla).subscribe({
    next: (data: Blob) => {
      const fileURL = URL.createObjectURL(data);
      const ventanaEmergente = window.open("", "VistaPreviaPDF", "width=900,height=600,scrollbars=no,resizable=no");
      if (ventanaEmergente) {
        ventanaEmergente.document.write(`
          <html>
            <head>
              <title>Vista Previa del Reporte de Afiliaciones</title>
              <style>
                body { margin: 0; text-align: center; }
                iframe { width: 100%; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${fileURL}"></iframe>
            </body>
          </html>
        `);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo abrir la vista previa del PDF. Es posible que el navegador haya bloqueado la ventana emergente.',
          confirmButtonText: 'Ok',
          didOpen: () => {
            const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
            if (swalContainer) {
              swalContainer.style.zIndex = '2000';
            }
          }
        });
      }
    },
    error: (err) => {
      console.error('Error al generar el reporte de afiliaciones:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar el reporte de afiliaciones.',
        confirmButtonText: 'Ok',
        didOpen: () => {
          const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
          if (swalContainer) {
            swalContainer.style.zIndex = '2000';
          }
        }
      });
    }
  });
} */

parseNumber(value: string): number {
    return parseFloat(value.replace(/,/g, ''));
  }
    
  
  tieneObservacionesEnAlgunTrabajador(): boolean {
  // Asumiendo que tienes una lista de trabajadores llamada 'trabajadores'
  return this.trabajadores.some(trabajador => 
    trabajador.observaciones_afiliacion && 
    trabajador.observaciones_afiliacion.trim() !== ''
  );
}







verificarAfiliaciones() {
  Swal.fire({
    title: '¿Verificación con Afiliaciones?',
    html: `
      <ul style="text-align: left; margin: 10px 0;">
        <li>Verificará todos los trabajadores de la planilla</li>
        <li>Detectará trabajadores faltantes en la planilla</li>
      </ul>
      <p><small>Este proceso puede tomar varios minutos.</small></p>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, verificar',
    cancelButtonText: 'Cancelar',
    width: '500px'
  }).then((result) => {
    if (result.isConfirmed) {
      this.loading = true;
      const inicioTiempo = Date.now();
      
      this.planillasService.verificarAfiliacionDetalles(this.idPlanilla).subscribe({
        next: (response) => {
          this.loading = false;
          const tiempoTranscurrido = Math.round((Date.now() - inicioTiempo) / 1000);
          
          // Guardar datos del análisis completo
          this.casosAnalisis = response.casos;
          this.resumenCompleto = response.resumen;
          this.estadisticasCompletas = response.estadisticas;
          this.trabajadoresFaltantes = response.casos.faltantes || [];
          this.fechaUltimaVerificacion = response.fecha_verificacion;
          // Mostrar resultado
          this.mostrarResultadoVerificacionCompleta(response, tiempoTranscurrido);
          
          // Recargar detalles
          this.obtenerDetalles();
        },
        error: (err) => {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `No se pudo verificar las afiliaciones: ${err.error.message || 'Error desconocido'}`,
            confirmButtonText: 'Ok'
          });
        }
      });
    }
  });
}

// AGREGAR estas nuevas funciones después de verificarAfiliaciones():

mostrarResultadoVerificacionCompleta(response: any, tiempoSegundos: number) {
  const resumen = response.resumen;
  const tiempoFormateado = this.formatearTiempo(tiempoSegundos);
  
  Swal.fire({
    icon: 'success',
    title: 'Análisis Completo Finalizado',
    html: `
      <div style="text-align: left;">
        <p><strong>${response.mensaje}</strong></p>
        <hr>
        
        <h6>Resumen de ${resumen.total_planilla} trabajadores:</h6>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr style="background-color: #d4edda;">
            <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-weight: bold;">Vigentes</td>
            <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-size: 18px;">${resumen.vigentes}</td>
          </tr>
          <tr style="background-color: #fff3cd;">
            <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-weight: bold;">No Vigentes</td>
            <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-size: 18px;">${resumen.no_vigentes}</td>
          </tr>
          <tr style="background-color: #f8d7da;">
            <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-weight: bold;">No Encontrados</td>
            <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-size: 18px;">${resumen.no_encontrados}</td>
          </tr>
          <tr style="background-color: #cce5ff;">
            <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-weight: bold;">Faltantes</td>
            <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-size: 18px;">${resumen.faltantes}</td>
          </tr>
        </table>
        
        
        <hr>
        <p><small><strong>Tiempo transcurrido:</strong> ${tiempoFormateado}</small></p>
      </div>
    `,
    width: '600px',
    confirmButtonText: 'Ver Detalles',
    showDenyButton: true,
    denyButtonText: 'Cerrar',
    denyButtonColor: '#6c757d'
  }).then((result) => {
    if (result.isConfirmed) {
      this.mostrarAnalisisCompletoDialog = true;
    }
  });
}

formatearTiempo(segundos: number): string {
  if (segundos < 60) {
    return `${segundos} segundos`;
  } else if (segundos < 3600) {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}m ${segs}s`;
  } else {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    return `${horas}h ${minutos}m`;
  }
}

verTrabajadoresFaltantes() {
  if (!this.casosAnalisis || !this.resumenCompleto) {
    Swal.fire({
      icon: 'info',
      title: 'Sin análisis',
      text: 'Primero debe ejecutar la verificación de afiliaciones.',
      confirmButtonText: 'Ok'
    });
    return;
  }
  
  this.mostrarAnalisisCompletoDialog = true;
}

exportarTrabajadoresFaltantes() {
  if (!this.casosAnalisis || !this.resumenCompleto) {
    Swal.fire({
      icon: 'info',
      title: 'Sin datos',
      text: 'No hay datos de análisis para exportar.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  // Crear datos para exportar
  const datosExportacion = [];
  
  // Resumen
  datosExportacion.push(['RESUMEN GENERAL']);
  datosExportacion.push(['Total Trabajadores', this.resumenCompleto.total_planilla]);
  datosExportacion.push(['Vigentes', this.resumenCompleto.vigentes]);
  datosExportacion.push(['No Vigentes', this.resumenCompleto.no_vigentes]);
  datosExportacion.push(['No Encontrados', this.resumenCompleto.no_encontrados]);
  datosExportacion.push(['Faltantes', this.resumenCompleto.faltantes]);
  datosExportacion.push(['']);

  // Caso 1: Vigentes
  if (this.casosAnalisis.vigentes?.length > 0) {
    datosExportacion.push(['TRABAJADORES VIGENTES']);
    datosExportacion.push(['CI', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'Cargo', 'Matrícula', 'Estado', 'Salario']);
    this.casosAnalisis.vigentes.forEach((t: any) => {
      datosExportacion.push([t.ci, t.nombres, t.apellido_paterno, t.apellido_materno, t.cargo, t.matricula, t.estado, t.salario]);
    });
    datosExportacion.push(['']);
  }

  // Caso 2: No Vigentes
  if (this.casosAnalisis.no_vigentes?.length > 0) {
    datosExportacion.push(['TRABAJADORES NO VIGENTES']);
    datosExportacion.push(['CI', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'Cargo', 'Estado', 'Motivo', 'Salario']);
    this.casosAnalisis.no_vigentes.forEach((t: any) => {
      datosExportacion.push([t.ci, t.nombres, t.apellido_paterno, t.apellido_materno, t.cargo, t.estado, t.motivo, t.salario]);
    });
    datosExportacion.push(['']);
  }

  // Caso 3: No Encontrados
  if (this.casosAnalisis.no_encontrados?.length > 0) {
    datosExportacion.push(['TRABAJADORES NO ENCONTRADOS']);
    datosExportacion.push(['CI', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'Cargo', 'Fecha Ingreso', 'Motivo', 'Salario']);
    this.casosAnalisis.no_encontrados.forEach((t: any) => {
      datosExportacion.push([t.ci, t.nombres, t.apellido_paterno, t.apellido_materno, t.cargo, t.fecha_ingreso, t.motivo, t.salario]);
    });
    datosExportacion.push(['']);
  }

  // Caso 4: Faltantes
  if (this.casosAnalisis.faltantes?.length > 0) {
    datosExportacion.push(['TRABAJADORES FALTANTES EN PLANILLA']);
    datosExportacion.push(['CI', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'Cargo', 'Matrícula', 'Estado', 'Haber']);
    this.casosAnalisis.faltantes.forEach((t: any) => {
      datosExportacion.push([t.ci, t.nombres, t.apellido_paterno, t.apellido_materno, t.cargo, t.matricula, t.estado, t.haber]);
    });
  }

  // Crear CSV
  const csvContent = datosExportacion.map(row => 
    row.map(cell => `"${cell || ''}"`).join(',')
  ).join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `analisis_completo_planilla_${this.idPlanilla}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  Swal.fire({
    icon: 'success',
    title: 'Archivo descargado',
    text: `Se descargó un archivo CSV con el análisis completo de ${this.resumenCompleto.total_planilla} trabajadores.`,
    confirmButtonText: 'Ok'
  });
}






























// Función para obtener la clase CSS según el estado de afiliación
getClaseEstadoAfiliacion(estadoAfiliacion: string): string {
  if (!estadoAfiliacion) {
    return 'fila-estado-sin-estado';
  }

  const estado = estadoAfiliacion.trim().toUpperCase();
  
  switch (estado) {
    case 'VIGENTE':
      return 'fila-estado-vigente';
    case 'BAJA':
      return 'fila-estado-baja';
    case 'FALLECIDO':
      return 'fila-estado-fallecido';
    case 'CESANTIA':
    case 'CESANTÍA':
      return 'fila-estado-cesantia';
    case 'DER HABIENTE':
    case 'DERHABIENTE':
    case 'DER_HABIENTE':
      return 'fila-estado-der-habiente';
    default:
      return 'fila-estado-sin-estado';
  }
}

// Función para obtener totales por estado de afiliación desde el backend
obtenerTotalesEstadosAfiliacion() {
  return {
    vigentes: this.conteoEstadosAsegurados?.VIGENTE || 0,
    bajas: this.conteoEstadosAsegurados?.BAJA || 0,
    fallecidos: this.conteoEstadosAsegurados?.FALLECIDO || 0,
    cesantias: this.conteoEstadosAsegurados?.CESANTIA || 0,
    derHabientes: this.conteoEstadosAsegurados?.['DER HABIENTE'] || 0,
    sinEstado: 0 // Esto se puede calcular si el backend no lo incluye
  };
}














}
