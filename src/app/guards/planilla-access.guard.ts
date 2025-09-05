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
      // Redirección basada en el rol
      const destination = this.sessionService.esAdministrador()
        ? '/cotizaciones/aprobar-planillas-aportes'
        : '/cotizaciones/planillas-aportes';
      this.router.navigate([destination]);
      return of(false);
    }

    // Verificar si el usuario tiene acceso a esta planilla
    return this.verificarAccesoPlanilla(planillaId);
  }

private verificarAccesoPlanilla(planillaId: string): Observable<boolean> {
  console.log('🔍 Guard verificando acceso para:', planillaId);
  console.log('🔍 Guard URL actual:', window.location.href);
  
  // Verificar si es administrador (puede ver todas las planillas)
  if (this.sessionService.esAdministrador()) {
    console.log('✅ Acceso permitido: Usuario administrador');
    return of(true);
  }

  // Verificar que sessionService tiene datos válidos
  const sessionData = this.sessionService.sessionDataSubject.value;
  console.log('🔍 Guard datos de sesión:', sessionData);

  if (!sessionData || !sessionData.persona) {
    console.warn('⚠️ Guard: No hay datos de sesión válidos, esperando...');
    // En lugar de denegar, permitir acceso y dejar que el componente maneje la carga
    return of(true);
  }

  // Desencriptar el ID
  const idReal = this.tokenService.desencriptarId(planillaId);
  console.log('🔓 Guard resultado desencriptación:', {
    idEncriptado: planillaId,
    idReal: idReal,
    esValidoDesencriptado: idReal !== null
  });
  
  if (!idReal) {
    // Si no se puede desencriptar, intentar como número directo (compatibilidad)
    const idNumerico = parseInt(planillaId);
    if (!isNaN(idNumerico) && idNumerico > 0) {
      console.log('⚠️ Guard usando ID numérico directo:', idNumerico);
      return this.verificarPlanillaPorId(idNumerico);
    } else {
      console.error('❌ Guard: ID inválido:', planillaId);
      // En lugar de redirigir inmediatamente, hacer una pausa
      setTimeout(() => {
        const destination = this.sessionService.esAdministrador()
          ? '/cotizaciones/aprobar-planillas-aportes'
          : '/cotizaciones/planillas-aportes';
        this.router.navigate([destination]);
      }, 100);
      return of(false);
    }
  }

  return this.verificarPlanillaPorId(idReal);
}

private verificarPlanillaPorId(planillaId: number): Observable<boolean> {
  console.log('🔍 Guard verificando planilla ID:', planillaId);
  
  // Verificar que sessionService tiene los datos necesarios
  const codigoPatronalUsuario = this.sessionService.getCodigoPatronal();
  console.log('🔍 Guard código patronal usuario:', codigoPatronalUsuario);
  
  if (!codigoPatronalUsuario) {
    console.warn('⚠️ Guard: No se pudo obtener código patronal del usuario');
    // Permitir acceso temporalmente para evitar bloqueos durante el reload
    return of(true);
  }

  // Para usuarios no administradores, verificar si la planilla pertenece a su empresa
  return this.planillasService.getPlanillaId(planillaId).pipe(
    map((response: any) => {
      console.log('🔍 Guard respuesta del servicio:', response);
      
      if (!response || !response.planilla) {
        console.warn('⚠️ Guard: Planilla no encontrada');
        setTimeout(() => {
          const destination = this.sessionService.esAdministrador()
            ? '/cotizaciones/aprobar-planillas-aportes'
            : '/cotizaciones/planillas-aportes';
          this.router.navigate([destination]);
        }, 100);
        return false;
      }

      const planilla = response.planilla;
      const codigoPatronalPlanilla = planilla.cod_patronal;

      console.log('🔍 Guard verificando empresa:', {
        usuarioEmpresa: codigoPatronalUsuario,
        planillaEmpresa: codigoPatronalPlanilla,
        planillaId: planillaId,
        sonIguales: codigoPatronalUsuario === codigoPatronalPlanilla
      });

      // Verificar si la planilla pertenece a la empresa del usuario
      if (codigoPatronalUsuario !== codigoPatronalPlanilla) {
        console.warn('⚠️ Guard: Acceso denegado - La planilla no pertenece a tu empresa');
        setTimeout(() => {
          this.router.navigate(['/denegado']);
        }, 100);
        return false;
      }

      console.log('✅ Guard: Acceso permitido - Planilla pertenece a la empresa del usuario');
      return true;
    }),
    catchError((error) => {
      console.error('❌ Guard: Error al verificar acceso a planilla:', error);
      console.error('❌ Guard: Stack trace:', error.stack);
      
      // En lugar de redirigir inmediatamente, hacer una pausa
      setTimeout(() => {
        const destination = this.sessionService.esAdministrador()
          ? '/cotizaciones/aprobar-planillas-aportes'
          : '/cotizaciones/planillas-aportes';
        this.router.navigate([destination]);
      }, 100);
      return of(false);
    })
  );
}
}