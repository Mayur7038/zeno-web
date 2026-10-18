import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface PriceListFilterParams {
  pricingType?: string;
  activeOnly?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  constructor(private api: ApiService) {}

  // 1. Stock Summary & Item Balance
  getStockSummary(companyId: string, godownId?: string): Observable<any[]> {
    let url = `/inventory/summary?companyId=${companyId}`;
    if (godownId) url += `&godownId=${godownId}`;
    return this.api.get<any[]>(url);
  }

  getItemBalance(
    companyId: string,
    godownId: string,
    itemId: string,
    variantId?: string,
  ): Observable<any> {
    let url = `/inventory/item-balance?companyId=${companyId}&godownId=${godownId}&itemId=${itemId}`;
    if (variantId) url += `&variantId=${variantId}`;
    return this.api.get<any>(url);
  }

  // 2. Opening Balance
  getOpeningBalances(companyId: string, godownId: string): Observable<any[]> {
    return this.api.get<any[]>(
      `/inventory/opening-balance?companyId=${companyId}&godownId=${godownId}`,
    );
  }

  updateOpeningBalances(data: any): Observable<any[]> {
    return this.api.post<any[]>('/inventory/opening-balance', data);
  }

  // 3. Stock Transfer
  getTransfers(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/inventory/transfers?companyId=${companyId}`);
  }

  getTransferById(id: string): Observable<any> {
    return this.api.get<any>(`/inventory/transfers/${id}`);
  }

  createTransfer(data: any): Observable<any> {
    return this.api.post<any>('/inventory/transfers', data);
  }

  cancelTransfer(id: string): Observable<any> {
    return this.api.put<any>(`/inventory/transfers/${id}/cancel`, {});
  }

  // 4. Stock Adjustment
  getAdjustments(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/inventory/adjustments?companyId=${companyId}`);
  }

  getAdjustmentById(id: string): Observable<any> {
    return this.api.get<any>(`/inventory/adjustments/${id}`);
  }

  createAdjustment(data: any): Observable<any> {
    return this.api.post<any>('/inventory/adjustments', data);
  }

  cancelAdjustment(id: string): Observable<any> {
    return this.api.put<any>(`/inventory/adjustments/${id}/cancel`, {});
  }

  // 5. Price Lists
  getPriceLists(companyId: string, params?: PriceListFilterParams): Observable<any[]> {
    let url = `/inventory/price-lists?companyId=${companyId}`;
    if (params?.pricingType) url += `&pricingType=${params.pricingType}`;
    if (params?.activeOnly) url += `&activeOnly=true`;
    return this.api.get<any[]>(url);
  }

  getPriceListById(id: string): Observable<any> {
    return this.api.get<any>(`/inventory/price-lists/${id}`);
  }

  createPriceList(data: any): Observable<any> {
    return this.api.post<any>('/inventory/price-lists', data);
  }

  updatePriceList(id: string, data: any): Observable<any> {
    return this.api.put<any>(`/inventory/price-lists/${id}`, data);
  }

  deletePriceList(id: string): Observable<any> {
    return this.api.delete<any>(`/inventory/price-lists/${id}`);
  }

  getEffectivePrice(
    companyId: string,
    itemId: string,
    customerId?: string,
    asOfDate?: string,
  ): Observable<any> {
    let url = `/inventory/price-lists/effective-price?companyId=${companyId}&itemId=${itemId}`;
    if (customerId) url += `&customerId=${customerId}`;
    if (asOfDate) url += `&asOfDate=${asOfDate}`;
    return this.api.get<any>(url);
  }
}
