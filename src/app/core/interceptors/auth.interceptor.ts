import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  // If public auth endpoint, do not attach existing session headers
  const isAuthUrl =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/signup') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/verify-otp') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');

  let headers = req.headers;
  if (!isAuthUrl) {
    const token = localStorage.getItem('zeno_token');
    const tenantId = localStorage.getItem('zeno_tenant_id');
    const companyId = localStorage.getItem('zeno_company_id');
    const branchId = localStorage.getItem('zeno_branch_id');

    if (token && !headers.has('Authorization')) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    if (tenantId && !headers.has('X-Tenant-Id')) {
      headers = headers.set('X-Tenant-Id', tenantId);
    }
    if (companyId && !headers.has('X-Company-Id')) {
      headers = headers.set('X-Company-Id', companyId);
    }
    if (branchId && !headers.has('X-Branch-Id')) {
      headers = headers.set('X-Branch-Id', branchId);
    }
  }

  const clonedReq = req.clone({ headers });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized and not an auth public endpoint
      const isAuthUrl =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/signup') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/verify-otp') ||
        req.url.includes('/auth/forgot-password') ||
        req.url.includes('/auth/reset-password');

      if (error.status === 401 && !isAuthUrl) {
        const refreshToken = localStorage.getItem('zeno_refresh_token');
        if (refreshToken && !isRefreshing) {
          isRefreshing = true;
          return http.post<any>('http://localhost:4000/api/v1/auth/refresh', { refreshToken }).pipe(
            switchMap((res: any) => {
              isRefreshing = false;
              if (res.accessToken) {
                localStorage.setItem('zeno_token', res.accessToken);
                if (res.refreshToken) {
                  localStorage.setItem('zeno_refresh_token', res.refreshToken);
                }
                // Retry failed request with new token
                const retryReq = req.clone({
                  headers: req.headers.set('Authorization', `Bearer ${res.accessToken}`),
                });
                return next(retryReq);
              }
              clearAuthAndRedirect(router);
              return throwError(() => error);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              clearAuthAndRedirect(router);
              return throwError(() => refreshErr);
            }),
          );
        } else {
          clearAuthAndRedirect(router);
        }
      }

      return throwError(() => error);
    }),
  );
};

function clearAuthAndRedirect(router: Router) {
  localStorage.removeItem('zeno_token');
  localStorage.removeItem('zeno_refresh_token');
  localStorage.removeItem('zeno_user');
  router.navigate(['/auth/login']);
}
