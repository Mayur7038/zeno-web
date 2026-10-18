import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSignal = signal<any>(null);
  currentUser = this.userSignal.asReadonly();
  isLoggedIn = computed(() => !!this.userSignal());

  constructor(
    private api: ApiService,
    private router: Router,
  ) {
    this.restoreSession();
  }

  signup(data: {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    gstin?: string;
    stateCode?: string;
    stateName?: string;
    mobile: string;
  }): Observable<any> {
    return this.api.post('/auth/signup', data);
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.api.post('/auth/verify-otp', { email, otp }).pipe(
      tap((res: any) => {
        if (res.accessToken) {
          this.setSession(res);
        }
      }),
    );
  }

  login(email: string, password: string): Observable<any> {
    return this.api.post('/auth/login', { email, password }).pipe(
      tap((res: any) => {
        if (res.accessToken) {
          this.setSession(res);
        }
      }),
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.api.post('/auth/forgot-password', { email });
  }

  resetPassword(data: { email: string; otp: string; newPassword: string }): Observable<any> {
    return this.api.post('/auth/reset-password', data);
  }

  refreshSession(): Observable<any> {
    const refreshToken = localStorage.getItem('zeno_refresh_token');
    return this.api.post('/auth/refresh', { refreshToken }).pipe(
      tap((res: any) => {
        if (res.accessToken) {
          localStorage.setItem('zeno_token', res.accessToken);
          if (res.refreshToken) {
            localStorage.setItem('zeno_refresh_token', res.refreshToken);
          }
        }
      }),
    );
  }

  private setSession(res: any) {
    localStorage.setItem('zeno_token', res.accessToken);
    localStorage.setItem('zeno_refresh_token', res.refreshToken);

    const user = res.user || {};
    const tenantId = res.tenant?.id || user.tenantId;
    const companyId = res.company?.id || user.companyId || (user.branches?.[0]?.companyId) || '';
    const branchId = res.branch?.id || user.branchId || (user.branches?.[0]?.branchId) || '';

    if (tenantId) localStorage.setItem('zeno_tenant_id', tenantId);
    if (companyId) localStorage.setItem('zeno_company_id', companyId);
    if (branchId) localStorage.setItem('zeno_branch_id', branchId);

    const sessionUser = {
      ...user,
      tenantId,
      companyId,
      branchId,
      tenantName: res.tenant?.name || user.tenantName || 'Zeno Enterprise',
    };

    localStorage.setItem('zeno_user', JSON.stringify(sessionUser));
    this.userSignal.set(sessionUser);
  }

  private restoreSession() {
    const raw = localStorage.getItem('zeno_user');
    const token = localStorage.getItem('zeno_token');
    if (raw && token) {
      try {
        this.userSignal.set(JSON.parse(raw));
      } catch (e) {
        this.logout();
      }
    }
  }

  logout() {
    localStorage.removeItem('zeno_token');
    localStorage.removeItem('zeno_refresh_token');
    localStorage.removeItem('zeno_user');
    localStorage.removeItem('zeno_tenant_id');
    localStorage.removeItem('zeno_company_id');
    localStorage.removeItem('zeno_branch_id');
    this.userSignal.set(null);
    this.router.navigate(['/auth/login']);
  }
}
