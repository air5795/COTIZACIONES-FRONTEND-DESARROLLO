import { Component, OnInit } from '@angular/core';
import { LocalService } from './servicios/local/local.service';
import { Recurso } from './dominio/Recurso';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-menu',
  template: `
    <div class="menu-scroll-content" style="padding: 10px;">
      <ul class="navigation-menu">
        <li
          app-menuitem
          *ngFor="let item of model; let i = index"
          [item]="item"
          [index]="i"
          [root]="true"
          style="background-color: #ededed; color: white; border-bottom: 2px solid #ffffff; border-radius: 8px; padding: 5px;"
        ></li>
      </ul>
    </div>
  `,
  styles: [`
    /* Estilo base para la lista principal */
    .navigation-menu {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    /* Forzar el padding en los submenús específicos */
    ::ng-deep .layout-wrapper .layout-sidebar .layout-tabmenu .layout-tabmenu-contents .layout-tabmenu-content .layout-submenu-content .navigation-menu li ul li a {
      padding: 15px !important; /* Cambia el valor según necesites */
    }
  `]
})
export class AppMenuComponent implements OnInit {
  public model: any[] | undefined;

  constructor(private localService: LocalService, private router: Router) {}

  ngOnInit() {
    this.model = this.mapear(JSON.parse(this.localService.getLocalStorage("recursos")!));

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveState(this.model!);
    });
  }

  mapear(recurso: Recurso[]): any {
    if (recurso.length == 0) {
      return null;
    } else {
      return recurso.map((r: Recurso) => {
        return {
          label: r.nombreRecurso,
          icon: 'pi pi-' + r.icono,
          routerLink: r.uri === 'null' ? null : r.uri,
          badgeStyleClass: 'teal-badge',
          items: this.mapear(r.listaDeRecurso),
          active: false
        };
      });
    }
  }

  updateActiveState(items: any[]) {
    items.forEach(item => {
      item.active = this.router.isActive(item.routerLink, true);
      if (item.items) {
        this.updateActiveState(item.items);
        item.active = item.items.some((child: any) => child.active);
      }
    });
  }
}