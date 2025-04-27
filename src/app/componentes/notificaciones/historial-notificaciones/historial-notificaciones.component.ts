import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificacionesService } from '../../../servicios/notificaciones/notificaciones.service';
import { Subscription } from 'rxjs';
import { TableLazyLoadEvent } from 'primeng/table'; // Cambiamos a TableLazyLoadEvent

interface Notificacion {
  id_notificacion: number;
  tipo_notificacion: string;
  mensaje: string;
  id_recurso: number;
  tipo_recurso: string;
  leido: boolean;
  empresa: string | null;
}

@Component({
  selector: 'app-historial-notificaciones',
  templateUrl: './historial-notificaciones.component.html',
  styleUrls: ['./historial-notificaciones.component.css']
})
export class HistorialNotificacionesComponent implements OnInit, OnDestroy {
  notificaciones: Notificacion[] = [];
  idUsuario: string = 'ADMINISTRADOR_COTIZACIONES';
  limite: number = 10;
  totalRecords: number = 0;
  loading: boolean = false;
  first: number = 0;
  idcNivel: any;
  
  private subscription: Subscription = new Subscription();

  constructor(private notificacionesService: NotificacionesService) {}

  ngOnInit(): void {
    // Carga inicial manejada por lazy loading
  }

  loadNotificaciones(event: TableLazyLoadEvent): void {
    this.loading = true;
    const pagina = event.first && event.rows ? Math.floor(event.first / event.rows) + 1 : 1;
    const limite = event.rows ?? this.limite; // Manejo de rows null

    this.subscription.add(
      this.notificacionesService.getNotificaciones(this.idUsuario,undefined, pagina, limite)
        .subscribe({
          next: (response) => {
            this.notificaciones = response.notificaciones || [];
            this.totalRecords = response.totalNotificaciones || response.notificaciones.length;
            this.limite = limite;
            this.first = event.first || 0;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cargar notificaciones:', error);
            this.loading = false;
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
          },
          error: (error) => console.error('Error al marcar como leída:', error)
        })
    );
  }

  getRecursoUrl(tipoRecurso: string, idRecurso: number): string {
    const rutas: { [key: string]: string } = {
      PLANILLAS_APORTES: `/cotizaciones/${idRecurso}`,
      pedido: `/pedidos/${idRecurso}`,
      factura: `/facturas/${idRecurso}`
    };
    return rutas[tipoRecurso.toLowerCase()] ;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}