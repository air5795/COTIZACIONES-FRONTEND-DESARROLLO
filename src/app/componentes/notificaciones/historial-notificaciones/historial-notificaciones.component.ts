import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificacionesService } from '../../../servicios/notificaciones/notificaciones.service';
import { SessionService } from '../../../servicios/auth/session.service';
import { Subscription } from 'rxjs';
import { TableLazyLoadEvent } from 'primeng/table';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TokenService } from '../../../servicios/token/token.service';

interface Notificacion {
  id_notificacion: number;
  id_usuario_receptor: string;
  tipo_notificacion: string;
  mensaje: string;
  id_recurso: number;
  tipo_recurso: string;
  leido: boolean;
  fecha_creacion: string;
  usuario_creacion: string;
  empresa: string;
  nom_usuario: string;
}

@Component({
  selector: 'app-historial-notificaciones',
  templateUrl: './historial-notificaciones.component.html',
  styleUrls: ['./historial-notificaciones.component.css']
})
export class HistorialNotificacionesComponent implements OnInit, OnDestroy {
  notificaciones: Notificacion[] = [];
  idUsuario: string = '';
  empresaUsuario: string | null = null;
  limite: number = 10;
  totalRecords: number = 0;
  loading: boolean = false;
  first: number = 0;
  pagina: number = 0;
  
  // Filtros
  filtroLeido: boolean | undefined = undefined;
  filtroTipo: string = '';
  busqueda: string = '';
  
  // Opciones para filtros
  tiposNotificacion: any[] = [
    { label: 'Todas', value: '' },
    { label: 'Planilla Presentada', value: 'PLANILLA_PRESENTADA' },
    { label: 'Planilla Aprobada', value: 'PLANILLA_APROBADA' }
  ];
  
  estadosLeido: any[] = [
    { label: 'Todas', value: undefined },
    { label: 'Leídas', value: true },
    { label: 'No Leídas', value: false }
  ];
  
  private subscription: Subscription = new Subscription();

  constructor(
    private notificacionesService: NotificacionesService,
    private sessionService: SessionService,
    private router: Router,
    private messageService: MessageService,
    private tokenService: TokenService
  ) {}

  async ngOnInit(): Promise<void> {
    // Obtener el identificador del usuario usando los métodos helper del SessionService
    const sessionData = await this.sessionService.sessionDataSubject.value;
    
    // Obtener información de la empresa del usuario
    this.empresaUsuario = sessionData?.persona?.empresa?.nombre || null;
    
    // Usar los métodos helper del SessionService para determinar el tipo de usuario
    if (this.sessionService.esAdministrador()) {
      this.idUsuario = 'ADMINISTRADOR_COTIZACIONES';
    } else if (this.sessionService.esEmpleador()) {
      this.idUsuario = 'COTIZACIONES_EMPRESA';
    } else {
      // Fallback por si no se puede determinar el rol
      this.idUsuario = sessionData?.persona?.usuario || 'ADMINISTRADOR_COTIZACIONES';
    }
    
    console.log('ID Usuario para notificaciones:', this.idUsuario);
    console.log('Empresa del usuario:', this.empresaUsuario);
    console.log('Es Administrador:', this.sessionService.esAdministrador());
    console.log('Es Empleador:', this.sessionService.esEmpleador());
    
    // Cargar las notificaciones automáticamente al inicializar
    this.obtenerNotificaciones();
  }

  // Método para cargar notificaciones inicialmente (sin lazy loading)
  obtenerNotificaciones(): void {
    this.loading = true;
    this.subscription.add(
      this.notificacionesService.getNotificaciones(
        this.idUsuario, 
        this.filtroLeido, 
        1, 
        this.limite
      ).subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          
          // Mapear la respuesta del backend
          let notificacionesBruto = response.notificaciones?.map((notif: any) => ({
            id_notificacion: notif.id_notificacion,
            id_usuario_receptor: notif.id_usuario_receptor,
            tipo_notificacion: notif.tipo_notificacion,
            mensaje: notif.mensaje,
            id_recurso: notif.id_recurso,
            tipo_recurso: notif.tipo_recurso,
            leido: notif.leido,
            fecha_creacion: notif.fecha_creacion,
            usuario_creacion: notif.usuario_creacion,
            empresa: notif.empresa,
            nom_usuario: notif.nom_usuario
          })) || [];
          
          // Filtrar por empresa si el usuario es empleador (COTIZACIONES_EMPRESA)
          if (this.sessionService.esEmpleador() && this.empresaUsuario) {
            this.notificaciones = notificacionesBruto.filter(
              (notificacion: Notificacion) => notificacion.empresa === this.empresaUsuario
            );
            this.totalRecords = this.notificaciones.length;
          } else {
            // Para administradores mostrar todas
            this.notificaciones = notificacionesBruto;
            this.totalRecords = response.total || 0;
          }
          
          this.loading = false;
          console.log('Notificaciones cargadas:', this.notificaciones.length);
        },
        error: (error) => {
          console.error('Error al cargar notificaciones:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las notificaciones'
          });
          this.loading = false;
        }
      })
    );
  }

  loadNotificaciones(event: TableLazyLoadEvent): void {
    this.loading = true;
    const pagina = event.first && event.rows ? Math.floor(event.first / event.rows) + 1 : 1;
    const limite = event.rows ?? this.limite;

    this.subscription.add(
      this.notificacionesService.getNotificaciones(
        this.idUsuario, 
        this.filtroLeido, 
        pagina, 
        limite
      ).subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          
          // Mapear la respuesta del backend
          let notificacionesBruto = response.notificaciones?.map((notif: any) => ({
            id_notificacion: notif.id_notificacion,
            id_usuario_receptor: notif.id_usuario_receptor,
            tipo_notificacion: notif.tipo_notificacion,
            mensaje: notif.mensaje,
            id_recurso: notif.id_recurso,
            tipo_recurso: notif.tipo_recurso,
            leido: notif.leido,
            fecha_creacion: notif.fecha_creacion,
            usuario_creacion: notif.usuario_creacion,
            empresa: notif.empresa,
            nom_usuario: notif.nom_usuario
          })) || [];
          
          // Filtrar por empresa si el usuario es COTIZACIONES_EMPRESA
          if (this.idUsuario === 'COTIZACIONES_EMPRESA' && this.empresaUsuario) {
            this.notificaciones = notificacionesBruto.filter(
              (notificacion: Notificacion) => notificacion.empresa === this.empresaUsuario
            );
            // Ajustar el total después del filtrado
            this.totalRecords = this.notificaciones.length;
          } else {
            // Para ADMINISTRADOR_COTIZACIONES mostrar todas
            this.notificaciones = notificacionesBruto;
            this.totalRecords = response.total || 0;
          }
          
          this.limite = limite;
          this.first = event.first || 0;
          this.loading = false;
          
          console.log('Notificaciones filtradas:', this.notificaciones.length);
        },
        error: (error) => {

        }
      })
    );
  }

  marcarComoLeida(idNotificacion: number): void {
    this.subscription.add(
      this.notificacionesService.marcarNotificacionComoLeida(idNotificacion)
        .subscribe({
          next: () => {
            const notificacion = this.notificaciones.find(n => n.id_notificacion === idNotificacion);
            if (notificacion) {
              notificacion.leido = true;
            }
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Notificación marcada como leída'
            });
          },
          error: (error) => {
            console.error('Error al marcar como leída:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo marcar la notificación como leída'
            });
          }
        })
    );
  }

  aplicarFiltros(): void {
    // Recargar las notificaciones con los filtros aplicados
    this.pagina = 0;
    this.first = 0;
    this.obtenerNotificaciones();
  }

  // Método igual que en planillas-aportes-list
  recargar(): void {
    this.busqueda = '';
    this.filtroLeido = undefined;
    this.filtroTipo = '';
    this.pagina = 0;
    this.first = 0;
    this.obtenerNotificaciones();
  }

  limpiarFiltros(): void {
    this.filtroLeido = undefined;
    this.filtroTipo = '';
    this.busqueda = '';
    this.pagina = 0;
    this.first = 0;
    this.obtenerNotificaciones();
  }

  // Método para buscar (igual que en planillas-aportes-list)
  buscar(event: any): void {
    const value = event.target.value;
    this.busqueda = value.trim();
    this.pagina = 0;
    this.first = 0;
    this.obtenerNotificaciones();
  }

  // Método para el cambio de página
  onPageChange(event: any): void {
    this.pagina = Math.floor(event.first / event.rows);
    this.limite = event.rows;
    this.first = event.first;
    this.obtenerNotificaciones();
  }



verDetalle(notificacion: Notificacion): void {
  // Marcar como leída si no lo está
  if (!notificacion.leido) {
    this.marcarComoLeida(notificacion.id_notificacion);
  }

  // Navegar según el tipo de recurso y usuario usando los métodos helper
  if (notificacion.tipo_recurso === 'PLANILLA_APORTES') {
    if (this.sessionService.esAdministrador()) {
      this.router.navigate(['/cotizaciones/historial-aportes']);
    } else if (this.sessionService.esEmpleador()) {
      // ✅ NUEVA LÓGICA: Encriptar el ID antes de navegar
      const idEncriptado = this.tokenService.encriptarId(notificacion.id_recurso);
      
      console.log('🔒 Navegando desde historial con ID encriptado:', {
        idReal: notificacion.id_recurso,
        idEncriptado: idEncriptado,
        notificacion: notificacion.tipo_notificacion
      });
      
      this.router.navigate([`/cotizaciones/planillas-aportes/${idEncriptado}`]);
    }
  }
}



  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-BO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}