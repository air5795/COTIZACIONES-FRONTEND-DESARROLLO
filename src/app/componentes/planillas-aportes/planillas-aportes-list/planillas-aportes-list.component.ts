import { Component } from '@angular/core';
import { PlanillasAportesService } from '../../../servicios/planillas-aportes/planillas-aportes.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EmpresaService } from '../../../servicios/empresa/empresa.service';
import * as XLSX from 'xlsx';
import { LazyLoadEvent } from 'primeng/api';
import { SessionService } from '../../../servicios/auth/session.service';
import { TokenService } from '../../../servicios/token/token.service';

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
  usuario_creacion: string = '';
  nombre_creacion: string = '';

  isLoading: boolean = false;
  loadingProgress: number = 0;
  loadingMessage: string = 'Cargando...';

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
    { label: 'Reintegro', value: 'Reintegro' , disabled: true }, // Deshabilitado
    { label: 'Beneficio Social', value: 'Beneficio Social', disabled: true }, // Deshabilitado  
    { label: 'Planilla Adicional', value: 'Planilla Adicional' },
    { label: 'Retroactivo', value: 'Retroactivo' },
  ];

  steps = [
    { label: 'Elegir Mes y Gestión' },
    { label: 'Importar Planilla' },
    { label: 'Verificar Datos' },
  ];

  persona : any = null; 



  constructor(
    private planillasService: PlanillasAportesService,
    private empresaService: EmpresaService,
    private sessionService: SessionService,
    private router: Router,
    private http: HttpClient,
    private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    this.generarGestiones();
    const sessionData = this.sessionService.sessionDataSubject.value;
    console.log('Datos de sesión:', sessionData); 
    this.persona = sessionData?.persona;
    this.usuario_creacion = sessionData?.usuario; 
    const nombreCompleto = `${sessionData?.persona?.nombres || ''} ${sessionData?.persona?.primerApellido || ''} ${sessionData?.persona?.segundoApellido || ''}`.replace(/\s+/g, ' ').trim();
    this.nombre_creacion = nombreCompleto;
    console.log('Persona:', this.persona);
    console.log('Usuario de creación:', this.usuario_creacion); 
    console.log('Nombre del usuario:', this.nombre_creacion);
    this.obtenerNumeroPatronal();


    if (this.numPatronal) {
      this.obtenerPlanillas(this.numPatronal);
      console.log('🔍 Buscando planillas de aportes para:', this.numPatronal);
    } else {
      console.error('⚠️ El número patronal no es válido.');
    }
    this.generarAnios();
  }

  descargarPlantilla() {
    this.planillasService.descargarPlantilla().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url); 
      },
      error: (error) => {
        console.error('Error al descargar la plantilla:', error);
        alert('Error al descargar la plantilla. Por favor, intenta de nuevo.');
      }
    });
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



verDetalle(idPlanilla: number) {
  // ✅ LOG PARA DEBUG
  console.log('🔍 ID recibido en verDetalle:', idPlanilla);
  
  // Verificar que el ID existe y es válido
  if (!idPlanilla || idPlanilla <= 0) {
    console.error('❌ Error: ID de planilla no válido', idPlanilla);
    return;
  }
  
  // Encriptar el ID antes de navegar
  const idEncriptado = this.tokenService.encriptarId(idPlanilla);
  
  console.log('🔒 Navegando con ID encriptado:', {
    idReal: idPlanilla,
    idEncriptado: idEncriptado
  });
  
  this.router.navigate(['/cotizaciones/planillas-aportes', idEncriptado]);
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
  this.isLoading = true;
  this.loadingProgress = 0;
  this.loadingMessage = 'Iniciando procesamiento...';
  
  // Fase 1: Inicialización (0-10%)
  const progressSteps = [
    { progress: 5, message: 'Preparando archivo...', duration: 300 },
    { progress: 10, message: 'Leyendo archivo Excel...', duration: 500 },
  ];
  
  let currentStep = 0;
  
  const updateProgress = () => {
    if (currentStep < progressSteps.length) {
      const step = progressSteps[currentStep];
      this.loadingProgress = step.progress;
      this.loadingMessage = step.message;
      currentStep++;
      setTimeout(updateProgress, step.duration);
    } else {
      // Iniciar lectura del archivo
      this.readFileContent();
    }
  };
  
  updateProgress();
}

private readFileContent() {
  const reader = new FileReader();
  
  reader.onload = (e: any) => {
    this.loadingProgress = 20;
    this.loadingMessage = 'Analizando estructura del archivo...';
    
    // Simular tiempo de procesamiento
    setTimeout(() => {
      this.processWorkbook(e.target.result);
    }, 400);
  };
  
  reader.onerror = () => {
    this.handleError('Error al leer el archivo');
  };
  
  if (this.archivoSeleccionado) {
    reader.readAsBinaryString(this.archivoSeleccionado);
  }
}

private processWorkbook(binaryString: string) {
  try {
    this.loadingProgress = 30;
    this.loadingMessage = 'Procesando libro de Excel...';
    
    const workbook = XLSX.read(binaryString, {
      type: 'binary',
      raw: false,
      dateNF: 'dd/mm/yyyy',
    });
    
    setTimeout(() => {
      this.loadingProgress = 40;
      this.loadingMessage = 'Extrayendo datos de la hoja...';
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      setTimeout(() => {
        this.validateHeaders(data);
      }, 300);
    }, 400);
    
  } catch (error) {
    this.handleError('Error al procesar el archivo Excel');
  }
}

private validateHeaders(data: any[]) {
  this.loadingProgress = 50;
  this.loadingMessage = 'Validando estructura de columnas...';
  
  const headers = data[0] as string[];
  const requiredColumns = [
    'Número documento de identidad',
    'Nombres',
    'Apellido Paterno',
    'Apellido Materno',
    'Fecha de ingreso',
    'regional',
  ];
  
  this.validationErrors = [];
  requiredColumns.forEach((col) => {
    if (!headers.includes(col)) {
      this.validationErrors.push(`Falta la columna requerida: ${col}`);
    }
  });
  
  setTimeout(() => {
    if (this.validationErrors.length > 0) {
      this.handleValidationErrors();
      return;
    }
    
    this.processDataRows(data, headers);
  }, 300);
}

private processDataRows(data: any[], headers: string[]) {
  this.loadingProgress = 60;
  this.loadingMessage = 'Procesando filas de datos...';
  
  const numericColumns = [
    'Haber Básico',
    'Bono de antigüedad',
    'Monto horas extra',
    'Monto horas extra nocturnas',
    'Otros bonos y pagos',
  ];
  
  const totalRows = data.length - 1; // Excluir header
  let processedRows = 0;
  
  const processRowsBatch = (startIndex: number, batchSize: number = 500) => {
    const endIndex = Math.min(startIndex + batchSize, data.length);
    const batch = data.slice(startIndex, endIndex);
    
    // Procesar el lote actual
    const batchResults = batch.map((row: any, index: number) => {
      if (startIndex + index === 0) return null; // Skip header
      
      let rowData: any = {};
      headers.forEach((header: string, i: number) => {
        let value = row[i];
        if (header === 'Fecha de ingreso' || header === 'Fecha de retiro') {
          if (typeof value === 'number') {
            value = this.convertExcelDate(value);
          } else if (typeof value === 'string' && value.trim()) {
            value = this.parseStringDate(value, header, startIndex + index + 1);
          } else {
            value = undefined;
          }
        } else if (numericColumns.includes(header)) {
          if (typeof value === 'string') {
            value = value.replace(/\./g, '').replace(',', '.');
            value = parseFloat(value) || 0;
          } else if (typeof value === 'number') {
            value = parseFloat(value.toFixed(6));
          } else {
            value = 0;
          }
        }
        rowData[header] = value;
      });
      return rowData;
    }).filter(row => row !== null);
    
    // Agregar resultados del lote al array principal
    if (!this.planillaDatos) this.planillaDatos = [];
    this.planillaDatos.push(...batchResults);
    
    processedRows += batchSize;
    
    // Actualizar progreso (60% - 80%)
    const processingProgress = Math.min(80, 60 + (processedRows / totalRows) * 20);
    this.loadingProgress = Math.floor(processingProgress);
    this.loadingMessage = `Procesando fila ${Math.min(processedRows, totalRows)} de ${totalRows}...`;
    
    // Continuar con el siguiente lote o finalizar
    if (endIndex < data.length) {
      setTimeout(() => processRowsBatch(endIndex), 50);
    } else {
      this.finalizeProcessing();
    }
  };
  
  // Iniciar procesamiento por lotes
  setTimeout(() => {
    processRowsBatch(1); // Empezar desde la fila 1 (después del header)
  }, 300);
}

private finalizeProcessing() {
  this.loadingProgress = 85;
  this.loadingMessage = 'Filtrando datos válidos...';
  
  setTimeout(() => {
    // Filtrar filas válidas
    this.planillaDatos = this.planillaDatos.filter((rowData) => {
      const nro = rowData['Nro.'];
      return nro !== undefined && nro !== null && nro.toString().trim() !== '';
    });
    
    this.loadingProgress = 95;
    this.loadingMessage = 'Validando datos procesados...';
    
    setTimeout(() => {
      if (this.planillaDatos.length === 0) {
        this.validationErrors.push('No se encontraron filas válidas con "Nro." en la planilla.');
        this.handleValidationErrors();
        return;
      }
      
      this.loadingProgress = 100;
      this.loadingMessage = 'Procesamiento completado';
      
      setTimeout(() => {
        this.isLoading = false;
        this.validatePlanillaDatos();
      }, 500);
    }, 300);
  }, 300);
}

private handleValidationErrors() {
  this.planillaDatos = [];
  this.loadingProgress = 100;
  this.loadingMessage = 'Error en validación';
  
  setTimeout(() => {
    this.isLoading = false;
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
  }, 500);
}

private handleError(message: string) {
  this.loadingProgress = 100;
  this.loadingMessage = 'Error en procesamiento';
  
  setTimeout(() => {
    this.isLoading = false;
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonText: 'Ok',
      customClass: { container: 'swal2-container' },
      willOpen: () => {
        document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
      },
    });
  }, 500);
}

  parseStringDate(dateString: string, column: string, row: number): Date | undefined {
    if (!dateString) return undefined;
  
    // Limpiar la cadena de espacios o caracteres no deseados
    const cleanedDate = dateString.trim();
  
    // Intentar parsear con diferentes formatos
    const formats = ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD-MM-YYYY'];
    for (const format of formats) {
      const parsed = new Date(cleanedDate.replace(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/, '$3-$2-$1'));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  
    // Si no se puede parsear, agregar error
    this.validationErrors.push(`Fila ${row}: "${column}" no tiene un formato de fecha válido (${cleanedDate}).`);
    return undefined;
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
  
    const numericColumns = [
      'Haber Básico',
      'Bono de antigüedad',
      'Monto horas extra',
      'Monto horas extra nocturnas',
      'Otros bonos y pagos',
    ];
  
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
      if (fechaIngreso) {
        if (!(fechaIngreso instanceof Date) || isNaN(fechaIngreso.getTime())) {
          this.validationErrors.push(
            `Fila ${index + 2}: "Fecha de ingreso" no tiene un formato de fecha válido.`
          );
        }
      }
  
      const fechaRetiro = trabajador['Fecha de retiro'];
      if (fechaRetiro) {
        if (!(fechaRetiro instanceof Date) || isNaN(fechaRetiro.getTime())) {
          this.validationErrors.push(
            `Fila ${index + 2}: "Fecha de retiro" no tiene un formato de fecha válido.`
          );
        }
      }
  
      // Validar valores numéricos
      numericColumns.forEach((field) => {
        const value = trabajador[field];
        if (value !== undefined && value !== null) {
          if (isNaN(value) || value < 0) {
            this.validationErrors.push(
              `Fila ${index + 2}: "${field}" debe ser un número válido y no negativo (valor: ${value}).`
            );
          }
        }
      });
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
      // Activar el loading solo después de confirmar
      this.isLoading = true;
      this.loadingProgress = 0;
      this.loadingMessage = 'Subiendo planilla al servidor...';
      const progressInterval = setInterval(() => {
        this.loadingProgress = Math.min(this.loadingProgress + 10, 90);
      }, 200);

      this.planillasService
        .subirPlanilla(
          this.archivoSeleccionado!,
          this.numPatronal ? this.numPatronal : '',
          this.mesSeleccionado,
          this.gestionSeleccionada!.toString(),
          this.tipoPlanilla,
          this.usuario_creacion,
          this.nombre_creacion
        )
        .subscribe({
          next: (response) => {
            clearInterval(progressInterval);
            this.loadingProgress = 100;
            setTimeout(() => {
              this.isLoading = false;
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
              this.obtenerPlanillas(this.numPatronal!);
              this.cancelarSubida();
            }, 500);
          },
          error: (err) => {
            clearInterval(progressInterval);
            this.loadingProgress = 100;
            this.isLoading = false;
            console.error('Error al subir planilla:', err);
            if (err.error.message.includes('Ya existe una planilla')) {
            Swal.fire({
              icon: 'error',
              title: 'Planilla Duplicada',
              text: 'Ya existe una planilla para este mes y gestión.',
              confirmButtonText: 'Ok',
              customClass: { container: 'swal2-container' },
              willOpen: () => {
                document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
              },
            });
          } else if (err.error.message.includes('Debe existir una planilla Mensual activa')) {
            Swal.fire({
              icon: 'error',
              title: 'No valido ',
              text: 'Para declarar una planilla adicional, primero debe existir una planilla mensual presentada.',
              confirmButtonText: 'Ok',
              customClass: { container: 'swal2-container' },
              willOpen: () => {
                document.querySelector('.swal2-container')?.setAttribute('style', 'z-index: 9999 !important;');
              },
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
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
    } else {
      this.cancelarSubida();
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
    this.isLoading = false;
    this.loadingProgress = 0;
  }
}
