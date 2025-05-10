import { Component } from '@angular/core';
import { PlanillasAportesService } from '../../../servicios/planillas-aportes/planillas-aportes.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LocalService } from '../../../servicios/local/local.service';
import { EmpresaService } from '../../../servicios/empresa/empresa.service';

import * as XLSX from 'xlsx';
import { LazyLoadEvent } from 'primeng/api';
import { SessionService } from '../../../servicios/auth/session.service';

@Component({
  selector: 'app-planillas-aportes-list',
  templateUrl: './planillas-aportes-list.component.html',
  styleUrl: './planillas-aportes-list.component.css',
})
export class PlanillasAportesListComponent {
  planillas: any[] = [];
  loading = true;
  empresa: any = null;
  mostrarModal = false;
  activeIndex: number = 0; 
  archivoSeleccionado: File | null = null;
  mesSeleccionado: string = '';
  gestiones: { label: string; value: number }[] = []; 
  gestionSeleccionada: number | null = null;
  planillaDatos: any[] = []; 
  numPatronal: string | null = null;
  nomEmpresa: string | null = null;
  tipoEmpresa: string | null = null;
  validationErrors: string[] = [];
  totalRegistros: number = 0;
  pagina: number = 0;
  limite: number = 12;
  busqueda: string = '';
  mesFiltro: string = '';
  anioFiltro: string = '';
  tipoPlanilla: string = '';

  meses = [
    { label: 'ENERO', value: '01' },
    { label: 'FEBRERO', value: '02' },
    { label: 'MARZO', value: '03' },
    { label: 'ABRIL', value: '04' },
    { label: 'MAYO', value: '05' },
    { label: 'JUNIO', value: '06' },
    { label: 'JULIO', value: '07' },
    { label: 'AGOSTO', value: '08' },
    { label: 'SEPTIEMBRE', value: '09' },
    { label: 'OCTUBRE', value: '10' },
    { label: 'NOVIEMBRE', value: '11' },
    { label: 'DICIEMBRE', value: '12' },
  ];

  anios: { label: string; value: string }[] = [];

  tiposPlanilla = [
    { label: 'Mensual', value: 'Mensual' },
    { label: 'Reintegro', value: 'Reintegro' },
    { label: 'Beneficio Social', value: 'Beneficio Social' },
    { label: 'Planilla Adicional', value: 'Planilla Adicional' },
  ];

  steps = [
    { label: 'Elegir Mes y Gestión' },
    { label: 'Importar Planilla' },
    { label: 'Verificar Datos' },
  ];

  persona : any = null; 



  constructor(
    private planillasService: PlanillasAportesService,
    private localService: LocalService,
    private empresaService: EmpresaService,
    private sessionService: SessionService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.generarGestiones();
    /* this.persona=JSON.parse(this.localService.getLocalStorage("persona")!); */
    const sessionData = this.sessionService.sessionDataSubject.value;
    console.log('Datos de sesión:', sessionData); 
    this.persona = sessionData?.persona || null;

    this.obtenerNumeroPatronal();
    if (this.numPatronal) {
      this.obtenerDatosEmpresa(this.numPatronal);
    } else {
      console.warn('Número patronal no encontrado en localStorage.');
    }

    if (this.numPatronal) {
      this.obtenerPlanillas(this.numPatronal);
      console.log('🔍 Buscando planillas de aportes para:', this.numPatronal);
    } else {
      console.error('⚠️ El número patronal no es válido.');
    }
    this.generarAnios();
  }


  // Generar el arreglo de gestiones
  generarGestiones() {
    const currentYear = new Date().getFullYear();
    // Crear los tres años: el actual, el anterior y el siguiente
    this.gestiones = [
      { label: (currentYear - 1).toString(), value: currentYear - 1 },
      { label: currentYear.toString(), value: currentYear },
      { label: (currentYear + 1).toString(), value: currentYear + 1 },
    ];
  }

  obtenerNumeroPatronal() {
    try {
      
      const sessionData = this.sessionService.sessionDataSubject.value;
      this.numPatronal = sessionData?.persona.empresa.codPatronal || null;
      this.nomEmpresa = sessionData?.persona.empresa.nombre || null;
      if (this.numPatronal) {
        console.log('COD patronal:', this.numPatronal);
        console.log('Nombre empresa:', this.nomEmpresa);
      }

      if (!this.numPatronal) {
        console.error('⚠️ No se encontró el número patronal en localStorage.');
      } else {
        console.log(`✅ Número patronal obtenido: ${this.numPatronal}`);
      }
    } catch (error) {
      console.error('❌ Error al obtener número patronal:', error);
    }
  }


  procesarFecha(fechaPlanilla: string) {
    const fecha = new Date(fechaPlanilla);
    const meses = [
      'ENERO',
      'FEBRERO',
      'MARZO',
      'ABRIL',
      'MAYO',
      'JUNIO',
      'JULIO',
      'AGOSTO',
      'SEPTIEMBRE',
      'OCTUBRE',
      'NOVIEMBRE',
      'DICIEMBRE',
    ];
    return {
      mes: meses[fecha.getUTCMonth()], 
      gestion: fecha.getUTCFullYear(), 
    };
  }

  obtenerPlanillas(cod_patronal: string) {
    if (this.pagina >= 0 && this.limite > 0) {
      this.loading = true;
      this.planillasService
        .getPlanillas(
          cod_patronal,
          this.pagina + 1,
          this.limite,
          this.busqueda,
          this.mesFiltro,
          this.anioFiltro
        )
        .subscribe(
          (response) => {
            this.planillas = response.planillas.map((planilla: any) => ({
              ...planilla,
              mes: this.procesarFecha(planilla.fecha_planilla).mes,
              gestion: this.procesarFecha(planilla.fecha_planilla).gestion,
            }));
            this.totalRegistros = response.total;
            this.loading = false;
            console.log('📡 Planillas de aportes:', this.planillas);
          },
          (error) => {
            console.error('❌ Error al cargar las planillas:', error);
            this.loading = false;
          }
        );
    } else {
      console.error(
        '❌ Número de página o límite inválido:',
        this.pagina,
        this.limite
      );
    }
  }

  onLazyLoad(event: LazyLoadEvent) {
    // Si `event.first` o `event.rows` están undefined, usa valores por defecto
    const first = event.first ?? 0;
    const rows = event.rows ?? this.limite;

    // Actualiza los parámetros de paginación
    this.pagina = Math.floor(first / rows) + 1;
    this.limite = rows;

    // Recarga los pacientes con los nuevos parámetros
    this.obtenerPlanillas(this.numPatronal ? this.numPatronal : '');
  }

  onPageChange(event: any) {
    this.pagina = Math.floor(event.first / event.rows);
    this.limite = event.rows;
    this.obtenerPlanillas(this.numPatronal ? this.numPatronal : '');
  }

  buscar(value: string): void {
    this.busqueda = value.trim();
    this.obtenerPlanillas(this.numPatronal ? this.numPatronal : '');
  }

  // Recargar todo
  recargar() {
    this.busqueda = '';
    this.mesFiltro = '';
    this.anioFiltro = '';
    this.pagina = 0;
    this.obtenerPlanillas(this.numPatronal ? this.numPatronal : '');
  }

  // Generar lista de años (puedes ajustarla según tus necesidades)
  generarAnios() {
    const currentYear = new Date().getFullYear();
    this.anios = [
      {
        label: (currentYear - 1).toString(),
        value: (currentYear - 1).toString(),
      },
      { label: currentYear.toString(), value: currentYear.toString() },
      {
        label: (currentYear + 1).toString(),
        value: (currentYear + 1).toString(),
      },
    ];
  }

  // Aplicar filtros cuando cambian mes o año
  aplicarFiltros() {
    this.pagina = 0; // Resetear a la primera página
    this.obtenerPlanillas(this.numPatronal ? this.numPatronal : '');
  }

  obtenerDatosEmpresa(numPatronal: string) {
    console.log(`🔍 Buscando empresa con número patronal: ${numPatronal}`);

    this.empresaService.getEmpresaByNroPatronal(numPatronal).subscribe(
      (response) => {
        console.log('📡 Respuesta de la API:', response);

        if (response && response.length > 0) {
          this.empresa = response[0];
          console.log('🏢 Empresa asignada:', this.empresa);
        } else {
          console.warn(
            '⚠️ No se encontró información para este número patronal.'
          );
        }
      },
      (error) => {
        console.error('❌ Error al obtener datos de la empresa:', error);
      }
    );
  }

  verDetalle(id_planilla: number) {
    this.router.navigate(['/cotizaciones/planillas-aportes', id_planilla]);
  }

  // 1️⃣ Ir al siguiente paso en el Stepper
  nextStep() {
    if (this.activeIndex === 1 && this.validationErrors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Errores en la planilla',
        html: this.validationErrors.join('<br>'),
        confirmButtonText: 'Ok',
        customClass: {
          container: 'swal2-container',
        },
        willOpen: () => {
          document
            .querySelector('.swal2-container')
            ?.setAttribute('style', 'z-index: 9999 !important;');
        },
      });
      return;
    }
    this.activeIndex++;
  }

  // 2️⃣ Ir al paso anterior en el Stepper
  prevStep() {
    this.activeIndex--;
  }

  // 3️⃣ Guardar el archivo seleccionado
  seleccionarArchivo(event: any) {
    this.archivoSeleccionado = event.target.files[0];
    if (this.archivoSeleccionado) {
      this.procesarArchivo();
    }
  }

  /// 4️⃣ Procesar el archivo Excel y extraer los datos
  procesarArchivo() {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const binaryString = e.target.result;
      // Configurar XLSX para manejar fechas correctamente
      const workbook = XLSX.read(binaryString, { 
        type: 'binary', 
        raw: false, // Usar valores formateados
        dateNF: 'dd/mm/yyyy' // Formato de fecha esperado
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convertir la hoja a JSON con encabezados
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = data[0] as string[];
      const requiredColumns = [
        'Número documento de identidad',
        'Nombres',
        'Apellido Paterno',
        'Apellido Materno',
        'Fecha de ingreso',
        'regional',
      ];

      // Validar que las columnas requeridas existan en el archivo
      this.validationErrors = [];
      requiredColumns.forEach((col) => {
        if (!headers.includes(col)) {
          this.validationErrors.push(`Falta la columna requerida: ${col}`);
        }
      });

      if (this.validationErrors.length > 0) {
        this.planillaDatos = [];
        Swal.fire({
          icon: 'error',
          title: 'Errores en la planilla',
          html: this.validationErrors.join('<br>'),
          confirmButtonText: 'Ok',
          customClass: { container: 'swal2-container' },
          willOpen: () => {
            document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
          },
        });
        return;
      }

      // Procesar los datos y filtrar filas vacías o sin "Nro."
      this.planillaDatos = data.slice(1)
        .map((row: any) => {
          let rowData: any = {};
          headers.forEach((header: string, index: number) => {
            let value = row[index];
            // Convertir fechas de Excel si son números
            if ((header === 'Fecha de ingreso' || header === 'Fecha de retiro') && typeof value === 'number') {
              value = this.convertExcelDate(value);
            }
            rowData[header] = value;
          });
          return rowData;
        })
        .filter((rowData) => {
          const nro = rowData['Nro.'];
          return nro !== undefined && nro !== null && nro.toString().trim() !== '';
        });

      // Si no hay datos válidos después del filtro, mostrar advertencia
      if (this.planillaDatos.length === 0) {
        this.validationErrors.push('No se encontraron filas válidas con "Nro." en la planilla.');
        Swal.fire({
          icon: 'warning',
          title: 'Planilla vacía',
          html: this.validationErrors.join('<br>'),
          confirmButtonText: 'Ok',
          customClass: { container: 'swal2-container' },
          willOpen: () => {
            document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
          },
        });
        return;
      }

      // Validar los datos de las filas filtradas
      this.validatePlanillaDatos();
    };

    if (this.archivoSeleccionado) {
      reader.readAsBinaryString(this.archivoSeleccionado);
    }
  }

  // Método para convertir fechas seriales de Excel a objetos Date
  convertExcelDate(excelSerial: number): Date {
    const excelEpoch = new Date(1899, 11, 30); // Excel empieza en 1900-01-01, pero ajustamos por el bug del año bisiesto
    const daysOffset = Math.floor(excelSerial); // Parte entera para los días
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + daysOffset * millisecondsPerDay);
    return date;
  }

  validatePlanillaDatos() {
    this.validationErrors = [];

    this.planillaDatos.forEach((trabajador, index) => {
      const requiredFields = [
        'Número documento de identidad',
        'Nombres',
        'Fecha de ingreso',
        'regional',
      ];

      // Validar campos obligatorios
      requiredFields.forEach((field) => {
        if (
          !trabajador[field] ||
          (typeof trabajador[field] === 'string' && trabajador[field].trim() === '')
        ) {
          this.validationErrors.push(
            `Fila ${index + 2}: El campo "${field}" es obligatorio y no puede estar vacío.`
          );
        }
      });

      // Validar formato de fechas
      const fechaIngreso = trabajador['Fecha de ingreso'];
      if (fechaIngreso && !(fechaIngreso instanceof Date)) {
        const isValidDate = this.isValidDate(fechaIngreso);
        if (!isValidDate) {
          this.validationErrors.push(
            `Fila ${index + 2}: "Fecha de ingreso" no tiene un formato de fecha válido.`
          );
        }
      }

      const fechaRetiro = trabajador['Fecha de retiro'];
      if (fechaRetiro && !(fechaRetiro instanceof Date)) {
        const isValidDate = this.isValidDate(fechaRetiro);
        if (!isValidDate) {
          this.validationErrors.push(
            `Fila ${index + 2}: "Fecha de retiro" no tiene un formato de fecha válido.`
          );
        }
      }
    });

    if (this.validationErrors.length > 0) {
      this.planillaDatos = [];
      Swal.fire({
        icon: 'error',
        title: 'Errores en la planilla',
        html: this.validationErrors.join('<br>'),
        confirmButtonText: 'Ok',
        customClass: { container: 'swal2-container' },
        willOpen: () => {
          document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
        },
      });
    }
  }

  isValidDate(dateString: any): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  // Función para obtener el total del importe
obtenerTotalImporte(): number {
  return this.planillaDatos.reduce((total, trabajador) => {
    
    const sumaFila = 
      parseFloat(trabajador['Haber Básico'] || '0') +
      parseFloat(trabajador['Bono de antigüedad'] || '0') +
      parseFloat(trabajador['Monto horas extra'] || '0') +
      parseFloat(trabajador['Monto horas extra nocturnas'] || '0') +
      parseFloat(trabajador['Otros bonos y pagos'] || '0');
    

    return total + sumaFila;
  }, 0);
}

  // Función para contar los trabajadores basados en la columna 'Nro.'
  contarTrabajadores(): number {
    // Contamos las filas que contienen un valor válido en la columna 'Nro.'
    return this.planillaDatos.filter(
      (trabajador) =>
        trabajador['Nro.'] !== undefined && trabajador['Nro.'] !== ''
    ).length;
  }

  // 5️⃣ Declarar la planilla y enviar al servidor
  declararPlanilla() {
    if (
      !this.archivoSeleccionado ||
      !this.mesSeleccionado ||
      !this.gestionSeleccionada ||
      !this.tipoPlanilla
    ) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Datos incompletos',
        text: 'Debe seleccionar un archivo, mes, gestión y tipo de planilla antes de subir la planilla.',
        confirmButtonText: 'Ok',
        customClass: { container: 'swal2-container' },
        willOpen: () => {
          document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
        },
      });
      return;
    }

    this.mostrarModal = false;

    Swal.fire({
      title: '¿Usted desea subir esta planilla?',
      text: `${this.archivoSeleccionado.name} - ${this.mesSeleccionado} ${this.gestionSeleccionada} (${this.tipoPlanilla})`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Subir',
      cancelButtonText: 'Cancelar',
      customClass: { container: 'swal2-container' },
      willOpen: () => {
        document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.planillasService
          .subirPlanilla(
            this.archivoSeleccionado!,
            this.numPatronal ? this.numPatronal : '',
            this.mesSeleccionado,
            this.gestionSeleccionada!.toString(),
            this.tipoPlanilla
          )
          .subscribe({
            next: (response) => {
              Swal.fire({
                icon: 'success',
                title: '✅ Planilla subida',
                text: 'La planilla ha sido subida y procesada correctamente.',
                confirmButtonText: 'Ok',
                customClass: { container: 'swal2-container' },
                willOpen: () => {
                  document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
                },
              });
              console.log('✅ Respuesta del servidor:', response);
              this.obtenerPlanillas(this.numPatronal!);
              this.cancelarSubida();
            },
            error: (err) => {
              console.error('❌ Error al subir planilla:', err);
              if (err.error.message.includes('Ya existe una planilla')) {
                Swal.fire({
                  icon: 'error',
                  title: '❌ Planilla Duplicada',
                  text: 'Ya existe una planilla para este mes y gestión.',
                  confirmButtonText: 'Ok',
                  customClass: { container: 'swal2-container' },
                  willOpen: () => {
                    document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
                  },
                });
              } else {
                Swal.fire({
                  icon: 'error',
                  title: '❌ Error',
                  text: 'Hubo un problema al subir la planilla. Inténtalo nuevamente.',
                  confirmButtonText: 'Ok',
                  customClass: { container: 'swal2-container' },
                  willOpen: () => {
                    document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
                  },
                });
              }
              this.cancelarSubida();
            },
          });
      }
    });
  }

  cancelarSubida() {
    this.mostrarModal = false;
    this.archivoSeleccionado = null;
    this.mesSeleccionado = '';
    this.gestionSeleccionada = null;
    this.tipoPlanilla = '';
    this.planillaDatos = [];
    this.validationErrors = [];
    this.activeIndex = 0;
  }
}
