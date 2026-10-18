import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AccountingVoucherLine {
  id?: string;
  ledgerId: string;
  ledger?: any;
  debitAmount?: number;
  creditAmount?: number;
  amount?: number;
  narration?: string;
}

export interface AccountingVoucher {
  id: string;
  companyId: string;
  branchId: string;
  voucherType: 'PAYMENT' | 'RECEIPT' | 'CONTRA' | 'JOURNAL' | 'DEBIT_NOTE' | 'CREDIT_NOTE';
  voucherNo: string;
  voucherDate: string;
  totalAmount: number;
  paymentMode?: string;
  referenceNo?: string;
  referenceDate?: string;
  narration?: string;
  sourceAccountLedgerId?: string;
  sourceAccountLedger?: any;
  status: 'POSTED' | 'CANCELLED';
  lines: AccountingVoucherLine[];
  ledgerEntries?: any[];
  createdAt?: string;
}

export interface FinancialYear {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedAt?: string;
  isCurrent: boolean;
  closingNotes?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccountingService {
  constructor(private api: ApiService) {}

  getVouchers(
    companyId: string,
    voucherType?: string,
    startDate?: string,
    endDate?: string,
    search?: string,
  ): Observable<AccountingVoucher[]> {
    let query = `?companyId=${companyId}`;
    if (voucherType) query += `&voucherType=${voucherType}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    return this.api.get<AccountingVoucher[]>(`/accounting/vouchers${query}`);
  }

  getVoucherById(id: string, companyId: string): Observable<AccountingVoucher> {
    return this.api.get<AccountingVoucher>(`/accounting/vouchers/${id}?companyId=${companyId}`);
  }

  createVoucher(data: Partial<AccountingVoucher> & { lines: any[]; destinationLedgerId?: string }): Observable<AccountingVoucher> {
    return this.api.post<AccountingVoucher>('/accounting/vouchers', data);
  }

  cancelVoucher(id: string, reason?: string): Observable<any> {
    return this.api.put(`/accounting/vouchers/${id}/cancel`, { reason });
  }

  getTrialBalance(companyId: string, asOfDate?: string): Observable<any> {
    let query = `?companyId=${companyId}`;
    if (asOfDate) query += `&asOfDate=${asOfDate}`;
    return this.api.get(`/accounting/reports/trial-balance${query}`);
  }

  getLedgerStatement(companyId: string, ledgerId: string, startDate?: string, endDate?: string): Observable<any> {
    let query = `?companyId=${companyId}&ledgerId=${ledgerId}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    return this.api.get(`/accounting/ledger-statement${query}`);
  }

  // Financial Year Management
  getFinancialYears(companyId: string): Observable<FinancialYear[]> {
    return this.api.get<FinancialYear[]>(`/accounting/financial-years?companyId=${companyId}`);
  }

  getCurrentFinancialYear(companyId: string): Observable<FinancialYear> {
    return this.api.get<FinancialYear>(`/accounting/financial-years/current?companyId=${companyId}`);
  }

  createFinancialYear(data: { companyId: string; name: string; startDate: string; endDate: string }): Observable<FinancialYear> {
    return this.api.post<FinancialYear>('/accounting/financial-years', data);
  }

  closeFinancialYear(data: { companyId: string; fyId?: string; closingNotes?: string }): Observable<any> {
    return this.api.post('/accounting/financial-years/close', data);
  }

  switchFinancialYear(data: { companyId: string; fyId: string }): Observable<FinancialYear> {
    return this.api.post<FinancialYear>('/accounting/financial-years/switch', data);
  }
}
