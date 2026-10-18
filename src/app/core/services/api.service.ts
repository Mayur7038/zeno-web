import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'https://zeno-api-mayur.onrender.com/api/v1';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const token = localStorage.getItem('zeno_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const tenantId = localStorage.getItem('zeno_tenant_id');
    if (tenantId) {
      headers = headers.set('X-Tenant-Id', tenantId);
    }

    const companyId = localStorage.getItem('zeno_company_id');
    if (companyId) {
      headers = headers.set('X-Company-Id', companyId);
    }

    const branchId = localStorage.getItem('zeno_branch_id');
    if (branchId) {
      headers = headers.set('X-Branch-Id', branchId);
    }

    return headers;
  }

  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
      params,
    });
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, {
      headers: this.getHeaders(),
    });
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body, {
      headers: this.getHeaders(),
    });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    });
  }
}
