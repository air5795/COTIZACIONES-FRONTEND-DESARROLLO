import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SessionService } from './servicios/auth/session.service';
import { Menu } from './dominio/menu';

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
    .navigation-menu {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    ::ng-deep .layout-wrapper .layout-sidebar .layout-tabmenu .layout-tabmenu-contents .layout-tabmenu-content .layout-submenu-content .navigation-menu li ul li a {
      padding: 15px !important;
    }
  `]
})
export class AppMenuComponent implements OnInit {
  public model: any[] | undefined;

  constructor(
    private readonly sessionService: SessionService,
    private readonly router: Router
  ) {}

  ngOnInit() {
    this.sessionService.getSessionData().subscribe(data => {
      const menus = data?.rol?.menus || [];
      this.model = this.getMenusWithSubMenus(menus);
      
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.model) {
          this.updateActiveState(this.model);
        }
      });
  }

  getMenusWithSubMenus(menus: Menu[]): any[] {
    const map = new Map<number, Menu>();
    const roots: Menu[] = [];

    menus.forEach((menu) => {
      menu.subMenus = [];
      map.set(menu.idMenu, menu);
    });

    menus.forEach((menu) => {
      if (menu.idMenuPadre === null) {
        roots.push(menu);
      } else {
        const parent = map.get(menu.idMenuPadre ?? 0);
        if (parent) {
          parent.subMenus!.push(menu);
        }
      }
    });

    const sortByOrder = (a: Menu, b: Menu) => a.orden - b.orden;

    const sortMenus = (menus: Menu[]) => {
      menus.sort(sortByOrder);
      menus.forEach((menu) => {
        sortMenus(menu.subMenus!);
      });
    };

    sortMenus(roots);

    return this.mapear(roots);
  }

  mapear(recurso: Menu[]): any {
    if (recurso.length === 0) {
      return null;
    } else {
      return recurso.map((r: Menu) => {
        return {
          label: r.nombre,
          icon: r.icono,
          routerLink: r.ruta === 'null' ? null : r.ruta,
          badgeStyleClass: 'teal-badge',
          items: this.mapear(r.subMenus || []),
          active: false,
        };
      });
    }
  }

  updateActiveState(items: any[]) {
    items.forEach((item) => {
      item.active = this.router.isActive(item.routerLink, true);
      if (item.items) {
        this.updateActiveState(item.items);
        item.active = item.items.some((child: any) => child.active);
      }
    });
  }
}