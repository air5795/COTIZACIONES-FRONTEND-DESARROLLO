import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificacionesService } from '../../servicios/notificaciones/notificaciones.service';
import { Notificacion } from '../../models/notificacion.model';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { LocalService } from '../../servicios/local/local.service';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.css'],
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  notificaciones: Notificacion[] = [];
  notificacionesNoLeidas: number = 0;
  private subscription!: Subscription;
  usuarioRestriccion: any;
  idcNivel: any;
  empresaUsuario: string | null = null; // Almacena la empresa del usuario
  isDropdownVisible: boolean = false;

  constructor(
    private notificacionesService: NotificacionesService,
    private router: Router,
    private localService: LocalService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.subscription = interval(30000).subscribe(() => {
      this.cargarNotificaciones();
    });

    this.usuarioRestriccion = JSON.parse(this.localService.getLocalStorage('usuarioRestriccion')!);
    this.idcNivel = this.usuarioRestriccion.idcNivel;
    this.empresaUsuario = this.usuarioRestriccion.empresa || null; // Obtenemos la empresa del usuario

    await this.cargarNotificaciones();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async cargarNotificaciones(): Promise<void> {
    try {
      const responseNoLeidas = await this.notificacionesService
        .getNotificaciones(this.idcNivel, false)
        .toPromise();

      // Filtramos las notificaciones según la empresa si el usuario es COTIZACIONES_EMPRESA
      let notificacionesFiltradas = responseNoLeidas?.notificaciones || [];
      if (this.idcNivel === 'COTIZACIONES_EMPRESA' && this.empresaUsuario) {
        notificacionesFiltradas = notificacionesFiltradas.filter(
          (notificacion: Notificacion) => notificacion.empresa === this.empresaUsuario
        );
      }

      this.notificaciones = notificacionesFiltradas;
      this.notificacionesNoLeidas = notificacionesFiltradas.length; // Actualizamos el conteo basado en las notificaciones filtradas
    } catch (error) {
      // Manejo de errores vacío
    }
  }

  onNotificacionClick(notificacion: Notificacion): void {
    console.log('Notificación cliqueada:', notificacion);
    if (!notificacion.leido) {
      this.notificacionesService.marcarNotificacionComoLeida(notificacion.id_notificacion).subscribe({
        next: () => {
          notificacion.leido = true;
          this.cargarNotificaciones(); 
          this.isDropdownVisible = false; 
        },
        error: (error) => {
          // Manejo de errores vacío
        },
      });
    } else {
      this.isDropdownVisible = false; 
    }

    // Redirigir según el tipo de usuario
    if (this.idcNivel === 'ADMINISTRADOR_COTIZACIONES') {
      this.router.navigate(['/cotizaciones/historial-aportes']);
    } else if (this.idcNivel === 'COTIZACIONES_EMPRESA') {
      this.router.navigate([`/cotizaciones/planillas-aportes/${notificacion.id_recurso}`]);
    } else {
      this.router.navigate(['/cotizaciones/planillas-aportes']);
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownVisible = !this.isDropdownVisible;
  }

  closeDropdown(): void {
    this.isDropdownVisible = false;
  }
}