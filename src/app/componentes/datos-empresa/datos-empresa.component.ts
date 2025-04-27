import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { EmpresaService } from '../../servicios/empresa/empresa.service';
import { MessageService } from 'primeng/api';
import { LocalService } from '../../servicios/local/local.service';

@Component({
  selector: 'app-datos-empresa',
  templateUrl: './datos-empresa.component.html',
  styleUrls: ['./datos-empresa.component.css'],
  providers: [MessageService]
})
export class DatosEmpresaComponent implements OnInit {
  empresa: any = null;
  numPatronal: string | null = null;
  listaEmpresas: any[] = [];
  totalTrabajadores: number = 0;
  isAdmin: boolean = false; // Nueva propiedad para determinar si es administrador

  constructor(
    private empresaService: EmpresaService,
    private localService: LocalService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.validarRolUsuario(); // Validar el rol primero
    if (!this.isAdmin) {
      // Solo ejecutar la lógica del empleador si no es administrador
      this.obtenerNumeroPatronal();
      if (this.numPatronal) {
        this.obtenerDatosEmpresa(this.numPatronal);
      } else {
        console.warn('Número patronal no encontrado en localStorage.');
        this.showError('No se encontró el número patronal');
      }
      this.obtenerTodasLasEmpresas();
      setTimeout(() => {
        this.mostrarAlerta();
      }, 500);
    }
  }

  validarRolUsuario() {
    try {
      const usuarioRestriccion = JSON.parse(this.localService.getLocalStorage('usuarioRestriccion') || '{}');
      this.isAdmin = usuarioRestriccion?.idcNivel === 'ADMINISTRADOR_COTIZACIONES';
      console.log('Es administrador:', this.isAdmin);
    } catch (error) {
      console.error('Error al validar el rol del usuario:', error);
      this.isAdmin = false; // Por defecto, no es administrador
    }
  }

  obtenerNumeroPatronal() {
    try {
      const usuarioRestriccion = JSON.parse(this.localService.getLocalStorage('usuarioRestriccion') || '{}');
      this.numPatronal = usuarioRestriccion?.numPatronalEmpresa || null;
      console.log('Número patronal obtenido:', this.numPatronal);
    } catch (error) {
      console.error('Error al obtener número patronal:', error);
    }
  }

  obtenerDatosEmpresa(numPatronal: string) {
    console.log(`Buscando empresa con número patronal: ${numPatronal}`);
    this.empresaService.empresasNroPatronal(numPatronal).subscribe(
      (response) => {
        console.log('Respuesta completa del backend:', response);
        if (response) {
          this.empresa = response;
          console.log('Empresa asignada:', this.empresa);
          this.cdr.detectChanges();
          this.calcularTotalTrabajadores();
        } else {
          console.warn('No se encontró información para este número patronal.');
          this.showError('No se encontró la empresa');
        }
      },
      (error) => {
        console.error('Error al obtener datos de la empresa:', error);
        this.showError('Error al cargar los datos de la empresa');
      }
    );
  }

  obtenerTodasLasEmpresas() {
    this.empresaService.getAllEmpresas().subscribe(
      (response) => {
        console.log('Lista completa de empresas:', response);
        this.listaEmpresas = response || [];
        if (this.empresa) {
          this.calcularTotalTrabajadores();
        }
      },
      (error) => {
        console.error('Error al obtener lista de empresas:', error);
      }
    );
  }

  calcularTotalTrabajadores() {
    if (!this.empresa || !this.listaEmpresas.length) {
      console.warn('No hay datos suficientes para calcular trabajadores');
      return;
    }

    const codigoBase = this.empresa.cod_patronal.slice(3);
    const regionales = this.listaEmpresas.filter(emp => emp.cod_patronal.endsWith(codigoBase));
    this.totalTrabajadores = regionales.reduce((total, emp) => total + (emp.emp_ntrab || 0), 0);
    console.log(`Total trabajadores: ${this.totalTrabajadores}`);
    this.cdr.detectChanges();
  }

  mostrarAlerta() {
    this.messageService.add({
      severity: 'warn',
      summary: 'Aviso Importante',
      detail:
        'Señor empleador, no olvide mantener actualizados sus datos para evitar multas. En caso de no tener actualizados sus datos, favor regularizar en la Unidad de Seguros de la Caja Bancaria Estatal de Salud.',
      life: 10000
    });
  }

  showError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    });
  }
}