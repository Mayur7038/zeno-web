import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class MastersService {
  constructor(private api: ApiService) {}

  getLedgers(companyId: string, isVendorOnly = false, isCustomerOnly = false): Observable<any[]> {
    return this.api.get<any[]>(
      `/masters/ledgers?companyId=${companyId}&isVendorOnly=${isVendorOnly}&isCustomerOnly=${isCustomerOnly}`,
    );
  }

  createLedger(data: any): Observable<any> {
    return this.api.post('/masters/ledgers', data);
  }

  getLedgerGroups(companyId?: string): Observable<any[]> {
    const query = companyId && companyId !== 'undefined' && companyId !== 'null' ? `?companyId=${companyId}` : '';
    return this.api.get<any[]>(`/masters/ledger-groups${query}`);
  }

  createLedgerGroup(data: any): Observable<any> {
    return this.api.post('/masters/ledger-groups', data);
  }

  updateLedgerGroup(id: string, data: any): Observable<any> {
    return this.api.put(`/masters/ledger-groups/${id}`, data);
  }

  deleteLedgerGroup(id: string): Observable<any> {
    return this.api.delete(`/masters/ledger-groups/${id}`);
  }

  updateLedger(id: string, data: any): Observable<any> {
    return this.api.put(`/masters/ledgers/${id}`, data);
  }

  deleteLedger(id: string): Observable<any> {
    return this.api.delete(`/masters/ledgers/${id}`);
  }

  getItems(companyId: string, search?: string): Observable<any[]> {
    let query = `?companyId=${companyId}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    return this.api.get<any[]>(`/masters/items${query}`);
  }

  getItemById(id: string): Observable<any> {
    return this.api.get<any>(`/masters/items/${id}`);
  }

  createItem(data: any): Observable<any> {
    return this.api.post('/masters/items', data);
  }

  updateItem(id: string, data: any): Observable<any> {
    return this.api.put(`/masters/items/${id}`, data);
  }

  deleteItem(id: string): Observable<any> {
    return this.api.delete(`/masters/items/${id}`);
  }

  // Units of Measure
  getUnits(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/masters/units?companyId=${companyId}`);
  }

  createUnit(data: any): Observable<any> {
    return this.api.post('/masters/units', data);
  }

  updateUnit(id: string, data: any): Observable<any> {
    return this.api.put(`/masters/units/${id}`, data);
  }

  deleteUnit(id: string): Observable<any> {
    return this.api.delete(`/masters/units/${id}`);
  }

  // Stock Groups (Item Groups)
  getItemGroups(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/masters/item-groups?companyId=${companyId}`);
  }

  createItemGroup(data: any): Observable<any> {
    return this.api.post('/masters/item-groups', data);
  }

  updateItemGroup(id: string, data: any): Observable<any> {
    return this.api.put(`/masters/item-groups/${id}`, data);
  }

  deleteItemGroup(id: string): Observable<any> {
    return this.api.delete(`/masters/item-groups/${id}`);
  }

  // Stock Categories (Item Categories)
  getItemCategories(companyId: string, itemGroupId?: string): Observable<any[]> {
    let query = `?companyId=${companyId}`;
    if (itemGroupId) query += `&itemGroupId=${itemGroupId}`;
    return this.api.get<any[]>(`/masters/item-categories${query}`);
  }

  createItemCategory(data: any): Observable<any> {
    return this.api.post('/masters/item-categories', data);
  }

  updateItemCategory(id: string, data: any): Observable<any> {
    return this.api.put(`/masters/item-categories/${id}`, data);
  }

  deleteItemCategory(id: string): Observable<any> {
    return this.api.delete(`/masters/item-categories/${id}`);
  }

  // Item Variants
  getVariants(companyId?: string, itemId?: string): Observable<any[]> {
    let query = '';
    const params: string[] = [];
    if (companyId) params.push(`companyId=${companyId}`);
    if (itemId) params.push(`itemId=${itemId}`);
    if (params.length) query = `?${params.join('&')}`;
    return this.api.get<any[]>(`/masters/variants${query}`);
  }

  createVariant(data: any): Observable<any> {
    return this.api.post('/masters/variants', data);
  }

  updateVariant(id: string, data: any): Observable<any> {
    return this.api.put(`/masters/variants/${id}`, data);
  }

  deleteVariant(id: string): Observable<any> {
    return this.api.delete(`/masters/variants/${id}`);
  }

  // Variant Master Definitions (Attributes & Dropdown Values)
  getVariantDefinitions(companyId?: string): Observable<any[]> {
    const query = companyId ? `?companyId=${companyId}` : '';
    return this.api.get<any[]>(`/masters/variant-definitions${query}`);
  }

  createVariantDefinition(data: any): Observable<any> {
    return this.api.post('/masters/variant-definitions', data);
  }

  updateVariantDefinition(id: string, data: any): Observable<any> {
    return this.api.put(`/masters/variant-definitions/${id}`, data);
  }

  deleteVariantDefinition(id: string): Observable<any> {
    return this.api.delete(`/masters/variant-definitions/${id}`);
  }

  // Reports
  getTrialBalance(companyId: string): Observable<any> {
    return this.api.get<any>(`/accounting/trial-balance?companyId=${companyId}`);
  }

  getProfitLoss(companyId: string, startDate?: string, endDate?: string): Observable<any> {
    let url = `/accounting/profit-loss?companyId=${companyId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return this.api.get<any>(url);
  }

  getBalanceSheet(companyId: string, asOfDate?: string): Observable<any> {
    let url = `/accounting/balance-sheet?companyId=${companyId}`;
    if (asOfDate) url += `&asOfDate=${asOfDate}`;
    return this.api.get<any>(url);
  }

  getLedgerStatement(companyId: string, ledgerId: string, startDate?: string, endDate?: string): Observable<any> {
    let url = `/accounting/ledger-statement?companyId=${companyId}&ledgerId=${ledgerId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return this.api.get<any>(url);
  }

  getStockSummary(companyId: string, godownId?: string): Observable<any[]> {
    let query = `?companyId=${companyId}`;
    if (godownId) query += `&godownId=${godownId}`;
    return this.api.get<any[]>(`/inventory/summary${query}`);
  }

  getStockItemStatement(companyId: string, itemId: string, startDate?: string, endDate?: string): Observable<any> {
    let url = `/inventory/item-statement?companyId=${companyId}&itemId=${itemId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return this.api.get<any>(url);
  }

  // Settings
  getSettings(companyId: string): Observable<any> {
    return this.api.get<any>(`/settings?companyId=${companyId}`);
  }

  getFeatureToggles(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/settings/toggles?companyId=${companyId}`);
  }

  setFeatureToggle(companyId: string, featureKey: string, isEnabled: boolean): Observable<any> {
    return this.api.post('/settings/toggles', { companyId, featureKey, isEnabled });
  }
}
