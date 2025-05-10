import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {

  constructor(private http: HttpClient) {}

  getEmpresaByNroPatronal(nroPatronal: string): Observable<any> {
    return this.http.get<any>(`${environment.url}servicios-externos/GetEmpresaByNroPatronal/${nroPatronal}`);
  }

  getAllEmpresas(): Observable<any> {
      return this.http.get<any>(`${environment.url}empresas`);
  }

  empresasNroPatronal(nroPatronal: string): Observable<any> {
    return this.http.get<any>(`${environment.url}empresas/cod-patronal/${nroPatronal}`);
  }

  getTipoByCodPatronal(codPatronal: string): Observable<string> {
    return this.http.get<string>(`$${environment.url}empresas/tipo/${codPatronal}`, {
      responseType: 'text' as 'json', 
    });
  }

  getDireccionCompleta(idEmpresa: number): Observable<{ direccion: string }> {
    return this.http.get<{ direccion: string }>(`${environment.url}empresas/${idEmpresa}/direccion-completa`);
  }
  
  


}
