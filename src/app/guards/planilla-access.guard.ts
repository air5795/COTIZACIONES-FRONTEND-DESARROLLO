// src/app/guards/planilla-access.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SessionService } from '../servicios/auth/session.service';
import { PlanillasAportesService } from '../servicios/planillas-aportes/planillas-aportes.service';
import { TokenService } from '../servicios/token/token.service';

@Injectable({
  providedIn: 'root'
})
export class PlanillaAccessGuard implements CanActivate {

  constructor(
    private router: Router,
    private sessionService: SessionService,
    private planillasService: PlanillasAportesService,
    private tokenService: TokenService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const planillaId = route.params['id'];
    
    // Si no hay ID, redirige al listado
    if (!planillaId) {
      console.warn('⚠️ No se proporcionó ID de planilla');
      this.router.navigate(['/cotizaciones/planillas-aportes']);
      return of(false);
    }

    // Verificar si el usuario tiene acceso a esta planilla
    return this.verificarAccesoPlanilla(planillaId);
  }

private verificarAccesoPlanilla(planillaId: string): Observable<boolean> {
  console.log('🔍 Guard verificando acceso para:', planillaId);
  
  // Verificar si es administrador (puede ver todas las planillas)
  if (this.sessionService.esAdministrador()) {
    console.log('✅ Acceso permitido: Usuario administrador');
    return of(true);
  }

  // Desencriptar el ID
  const idReal = this.tokenService.desencriptarId(planillaId);
  
  if (!idReal) {
    // Si no se puede desencriptar, intentar como número directo (compatibilidad)
    const idNumerico = parseInt(planillaId);
    if (!isNaN(idNumerico) && idNumerico > 0) {
      console.log('⚠️ Guard usando ID numérico directo:', idNumerico);
      return this.verificarPlanillaPorId(idNumerico);
    } else {
      console.error('❌ Guard: ID inválido:', planillaId);
      this.router.navigate(['/cotizaciones/planillas-aportes']);
      return of(false);
    }
  }

  console.log('🔓 Guard ID desencriptado:', {
    idEncriptado: planillaId,
    idReal: idReal
  });

  return this.verificarPlanillaPorId(idReal);
}

private verificarPlanillaPorId(planillaId: number): Observable<boolean> {
  // Para usuarios no administradores, verificar si la planilla pertenece a su empresa
  return this.planillasService.getPlanillaId(planillaId).pipe(
    map((response: any) => {
      if (!response || !response.planilla) {
        console.warn('⚠️ Guard: Planilla no encontrada');
        this.router.navigate(['/cotizaciones/planillas-aportes']);
        return false;
      }

      const planilla = response.planilla;
      
      // Obtener el código patronal de la empresa del usuario
      const codigoPatronalUsuario = this.sessionService.getCodigoPatronal();
      const codigoPatronalPlanilla = planilla.cod_patronal;

      console.log('🔍 Guard verificando empresa:', {
        usuarioEmpresa: codigoPatronalUsuario,
        planillaEmpresa: codigoPatronalPlanilla,
        planillaId: planillaId
      });

      // Verificar si la planilla pertenece a la empresa del usuario
      if (codigoPatronalUsuario !== codigoPatronalPlanilla) {
        console.warn('⚠️ Guard: Acceso denegado - La planilla no pertenece a tu empresa');
        this.router.navigate(['/denegado']);
        return false;
      }

      console.log('✅ Guard: Acceso permitido - Planilla pertenece a la empresa del usuario');
      return true;
    }),
    catchError((error) => {
      console.error('❌ Guard: Error al verificar acceso a planilla:', error);
      this.router.navigate(['/cotizaciones/planillas-aportes']);
      return of(false);
    })
  );
}
}