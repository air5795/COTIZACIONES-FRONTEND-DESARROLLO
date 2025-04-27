import {Component} from '@angular/core';
import {AppMainComponent} from './app.main.component';
import { Router } from '@angular/router';
import { LocalService } from './servicios/local/local.service';
@Component({
    selector: 'app-topbar',
    template: `
        <div class="topbar clearfix">
    <div class="logo">
        <a href="#">
            <img src="assets/layout/images/logo.png" alt="Logo">
        </a>
    </div>

    <a href="#">
        <img src="assets/layout/images/logo-text.png" class="app-name" alt="App Name"/>
    </a>

    <a id="topbar-menu-button" href="#" (click)="appMain.onTopbarMenuButtonClick($event)">
        <i class="pi pi-bars"></i>
    </a>


   
    
    <ul class="topbar-menu fadeInDown" [ngClass]="{'topbar-menu-visible': appMain.topbarMenuActive}">
        <li #profile class="profile-item" [ngClass]="{'active-topmenuitem': appMain.activeTopbarItem === profile}">
            
            <a class="p-2" 
                style="background-color: #f3f3f3; padding: 4px !important; color: #14625b; margin: inherit; bottom: 1px; border-left: 8px solid #b0c9bb; border-bottom: 1px solid #b0c9bb;" 
                 >
                
                 <div class="profile-image pr-1" style="position: relative; display: inline-flex; align-items: center;">
                <div class="notification-wrapper">
                    <app-notificaciones></app-notificaciones>
                </div>
                <img src="assets/layout/images/user.png" alt="User Image" style="margin-left: 10px; margin-right: 10px;">
                </div>
                
                <div class="profile-info" style="margin-right: 10px; width: max-content;text-align:left" (click)="appMain.onTopbarItemClick($event, profile)">
                    <!-- Mostrar "Administrador" si no hay empresa -->
                    <span class="topbar-item-name profile-name" style="margin-left: 10px; display: inline-flex; flex-wrap: nowrap; width: auto; white-space: nowrap">
                        <strong style="padding: 2px;">
                            {{persona.nombres }} {{persona.primerApellido }} {{persona.segundoApellido }} 
                        </strong>  &nbsp;
                       
                    </span>

                    <!-- Solo mostrar esta información si hay una empresa -->
                    <div *ngIf="usuarioRestriccion.empresa">
                        <hr style="margin: 3px;">
                        <span class="topbar-item-name profile-role" style="color:#686868; width:max-content;" >
                            
                            
                            <span style="font-size:11px; margin:8px;"> {{ usuarioRestriccion.empresa }} </span>
                        </span>
                    </div>
                     <!-- Solo mostrar esta información si es de tesoreria -->
                    <div *ngIf="usuarioRestriccion.idcNivel == 'ADMINISTRADOR_TESORERIA'">
                        <hr style="margin: 3px;">
                        <span class="topbar-item-name profile-role" style="color:#686868; width:max-content;" >
                            <span style="font-size:11px; margin:8px;"><strong> <span> Usuario: </span></strong> {{usuario}} </span>
                            <span style="font-size:11px; margin:8px;"><strong> <span> Perfil: </span></strong>{{usuarioRestriccion.idcNivel}} </span>
                        </span>
                    </div>
                    <!-- Solo mostrar esta información si es de COTIZACIONES -->
                    <div *ngIf="usuarioRestriccion.idcNivel == 'ADMINISTRADOR_COTIZACIONES'">
                        <hr style="margin: 3px;">
                        <span class="topbar-item-name profile-role" style="color:#686868; width:max-content;" >
                            <span style="font-size:11px; margin:8px;"><strong> <span> Usuario: </span></strong> {{usuario}} </span>
                            <span style="font-size:11px; margin:8px;"><strong> <span> Perfil: </span></strong>{{usuarioRestriccion.idcNivel}} </span>
                        </span>
                    </div>
                    <!-- Solo mostrar esta información si es de SUPER ADMINISTRADOR -->
                    <div *ngIf="usuarioRestriccion.idcNivel == 'SUPER-ADMINISTRADOR'">
                        <hr style="margin: 3px;">
                        <span class="topbar-item-name profile-role" style="color:#686868; width:max-content;" >
                            <span style="font-size:11px; margin:8px;"><strong> <span> Usuario: </span></strong> {{usuario}} </span>
                            <span style="font-size:11px; margin:8px;"><span style="color:red"><strong>  Perfil: </strong>{{usuarioRestriccion.idcNivel}} </span> </span>
                        </span>
                    </div>
                </div>  
            </a>

            <ul class="fadeInDown">
                <li role="menuitem">
                    <a href="#" (click)="appMain.onTopbarSubItemClick($event)">
                        <i class="pi pi-user"></i>
                        <span>Perfil</span>
                    </a>
                </li>
                <li role="menuitem">
                    <a href="#" (click)="CerrarSession()">
                        <i class="pi pi-sign-out"></i>
                        <span>Cerrar Sesión</span>
                    </a>
                </li>
            </ul>
        </li>
    </ul>
    
</div>



    `
})
export class AppTopbarComponent {

    constructor(public appMain: AppMainComponent, public router: Router, private localService:LocalService) {}
  persona:any;
  usuario:any;
  usuarioRestriccion:any;
  
    ngOnInit() {
      this.persona=JSON.parse(this.localService.getLocalStorage("persona")!);
      this.usuario=this.localService.getLocalStorage("usuario")!;
      this.usuarioRestriccion=JSON.parse(this.localService.getLocalStorage("usuarioRestriccion")!);
    }
    CerrarSession(){
        this.localService.deleteStorage();  
        this.router.navigate(['']).then(() => {
          window.location.reload();  
        });
      }
      
}
