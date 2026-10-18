import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class TenantService {
  companies = signal<any[]>([]);
  branches = signal<any[]>([]);
  godowns = signal<any[]>([]);

  currentCompany = signal<any>(null);
  currentBranch = signal<any>(null);
  currentGodown = signal<any>(null);
  companySettings = signal<any>(null);
  taxMasters = signal<any[]>([]);

  constructor(private api: ApiService) {
    const savedCompId = localStorage.getItem('zeno_company_id');
    if (savedCompId) {
      this.currentCompany.set({ id: savedCompId });
    }
  }

  loadHierarchy(): Observable<any> {
    return this.api.get<any[]>('/tenancy/companies').pipe(
      tap((companies) => {
        this.companies.set(companies);
        if (companies && companies.length > 0) {
          const savedCompId = localStorage.getItem('zeno_company_id');
          const comp = companies.find((c) => c.id === savedCompId) || companies[0];
          this.setCompany(comp);
        }
      }),
    );
  }

  setCompany(company: any) {
    this.currentCompany.set(company);
    localStorage.setItem('zeno_company_id', company.id);

    this.loadCompanySettings(company.id);

    if (company.branches && company.branches.length > 0) {
      this.branches.set(company.branches);
      const savedBranchId = localStorage.getItem('zeno_branch_id');
      const branch = company.branches.find((b: any) => b.id === savedBranchId) || company.branches[0];
      this.setBranch(branch);
    }
  }

  loadCompanySettings(companyId?: string) {
    const compId = companyId || this.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.api.get<any>(`/settings?companyId=${compId}`).subscribe({
      next: (s) => {
        if (s) {
          this.companySettings.set(s);
        }
      },
      error: () => {},
    });
    this.api.get<any[]>(`/settings/tax-masters?companyId=${compId}`).subscribe({
      next: (taxes) => {
        if (taxes) {
          this.taxMasters.set(taxes);
        }
      },
      error: () => {},
    });
  }

  getGstActiveLevel(): 'COMPANY' | 'ITEM_GROUP' | 'ITEM_CATEGORY' | 'ITEM' {
    return this.companySettings()?.gstActiveLevel || 'ITEM';
  }

  getCompanyFlatGstRate(): number {
    const taxes = this.taxMasters();
    if (taxes && taxes.length > 0) {
      const active = taxes.find((t) => t.isActive !== false) || taxes[0];
      return Number(active.taxRate) || 18;
    }
    return 18;
  }

  setBranch(branch: any) {
    this.currentBranch.set(branch);
    localStorage.setItem('zeno_branch_id', branch.id);

    this.api.get<any[]>(`/tenancy/godowns?branchId=${branch.id}`).subscribe({
      next: (godowns) => {
        this.godowns.set(godowns);
        if (godowns && godowns.length > 0) {
          this.currentGodown.set(godowns[0]);
        }
      },
    });
  }

  setGodown(godown: any) {
    this.currentGodown.set(godown);
  }

  reloadGodowns() {
    const branch = this.currentBranch();
    const query = branch ? `?branchId=${branch.id}` : '';
    this.api.get<any[]>(`/tenancy/godowns${query}`).subscribe({
      next: (godowns) => {
        this.godowns.set(godowns);
      },
    });
  }
}
