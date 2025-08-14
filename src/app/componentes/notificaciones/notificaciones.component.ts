import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificacionesService } from '../../servicios/notificaciones/notificaciones.service';
import { Notificacion } from '../../models/notificacion.model';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { SessionService } from '../../servicios/auth/session.service';
import { TokenService } from '../../servicios/token/token.service';

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
  empresaUsuario: string | null = null;
  isDropdownVisible: boolean = false;

  constructor(
    private notificacionesService: NotificacionesService,
    private router: Router,
    private sessionService: SessionService,
    private tokenService: TokenService
  ) {}

  async ngOnInit(): Promise<void> {
    // 🔧 CORRECCIÓN: Inicializar idcNivel con el rol del usuario
    const sessionData = this.sessionService.sessionDataSubject.value;
    
    if (sessionData?.rol?.rol) {
      // Mapear el rol completo a los valores esperados por el backend
      const rolCompleto = sessionData.rol.rol;
      
      if (rolCompleto.includes('ADMIN_COTIZACIONES')) {
        this.idcNivel = 'ADMINISTRADOR_COTIZACIONES';
      } else if (rolCompleto.includes('EMPRESA_COTIZACIONES')) {
        this.idcNivel = 'COTIZACIONES_EMPRESA';
      } else {
        // Si no coincide con ninguno, usar el rol completo
        this.idcNivel = rolCompleto;
      }
      
      console.log('🔍 Rol detectado:', rolCompleto);
      console.log('🔍 idcNivel asignado:', this.idcNivel);
    } else {
      console.error('❌ No se pudo obtener el rol del usuario desde la sesión');
      return;
    }

    this.empresaUsuario = sessionData?.persona?.empresa?.nombre || null;
    console.log('🏢 Empresa del usuario:', this.empresaUsuario);

    // Cargar notificaciones inicialmente
    await this.cargarNotificaciones();

    // Configurar el intervalo de actualización cada 30 segundos
    this.subscription = interval(30000).subscribe(() => {
      this.cargarNotificaciones();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async cargarNotificaciones(): Promise<void> {
    try {
      console.log('🔄 Cargando notificaciones para:', this.idcNivel);
      
      const responseNoLeidas = await this.notificacionesService
        .getNotificaciones(this.idcNivel, false)
        .toPromise();

      console.log('📨 Respuesta del servidor:', responseNoLeidas);

      // Filtramos las notificaciones según la empresa si el usuario es COTIZACIONES_EMPRESA
      let notificacionesFiltradas = responseNoLeidas?.notificaciones || [];
      
      if (this.idcNivel === 'COTIZACIONES_EMPRESA' && this.empresaUsuario) {
        notificacionesFiltradas = notificacionesFiltradas.filter(
          (notificacion: Notificacion) => notificacion.empresa === this.empresaUsuario
        );
        console.log('🔍 Notificaciones filtradas por empresa:', notificacionesFiltradas.length);
      }

      this.notificaciones = notificacionesFiltradas;
      this.notificacionesNoLeidas = notificacionesFiltradas.length;
      
      console.log('✅ Total notificaciones no leídas:', this.notificacionesNoLeidas);
    } catch (error) {
      console.error('❌ Error al cargar notificaciones:', error);
    }
  }

  onNotificacionClick(notificacion: Notificacion): void {
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

  // ✅ NUEVA LÓGICA DE NAVEGACIÓN CON IDS ENCRIPTADOS
  if (this.idcNivel === 'ADMINISTRADOR_COTIZACIONES') {
    this.router.navigate(['/cotizaciones/historial-aportes']);
  } else if (this.idcNivel === 'COTIZACIONES_EMPRESA') {
    // Encriptar el ID antes de navegar
    const idEncriptado = this.tokenService.encriptarId(notificacion.id_recurso);
    console.log('🔒 Navegando desde notificación con ID encriptado:', {
      idReal: notificacion.id_recurso,
      idEncriptado: idEncriptado
    });
    this.router.navigate([`/cotizaciones/planillas-aportes/${idEncriptado}`]);
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

  get badgeText(): string {
  if (this.notificacionesNoLeidas > 999) return '999+';
  if (this.notificacionesNoLeidas > 99) return '99+';
  return String(this.notificacionesNoLeidas);
}

}