import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class P2pService {
  constructor(private api: ApiService) {}

  // 1. Purchase Orders
  getPurchaseOrders(companyId: string, status?: string, search?: string): Observable<any[]> {
    let query = `?companyId=${companyId}`;
    if (status) query += `&status=${status}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    return this.api.get<any[]>(`/procure-to-pay/purchase-orders${query}`);
  }

  getPurchaseOrderById(id: string): Observable<any> {
    return this.api.get<any>(`/procure-to-pay/purchase-orders/${id}`);
  }

  getVendorPendingOrders(vendorId: string, companyId: string): Observable<any[]> {
    return this.api.get<any[]>(
      `/procure-to-pay/vendor/${vendorId}/pending-orders?companyId=${companyId}`,
    );
  }

  createPurchaseOrder(data: any): Observable<any> {
    return this.api.post('/procure-to-pay/purchase-orders', data);
  }

  cancelPurchaseOrder(id: string): Observable<any> {
    return this.api.put(`/procure-to-pay/purchase-orders/${id}/cancel`, {});
  }

  // 2. Goods Receipt Notes (GRN)
  getGoodsReceiptNotes(companyId: string, status?: string, search?: string): Observable<any[]> {
    let query = `?companyId=${companyId}`;
    if (status) query += `&status=${status}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    return this.api.get<any[]>(`/procure-to-pay/goods-receipt-notes${query}`);
  }

  getGoodsReceiptNoteById(id: string): Observable<any> {
    return this.api.get<any>(`/procure-to-pay/goods-receipt-notes/${id}`);
  }

  getVendorPendingGrns(vendorId: string, companyId: string): Observable<any[]> {
    return this.api.get<any[]>(
      `/procure-to-pay/vendor/${vendorId}/pending-grns?companyId=${companyId}`,
    );
  }

  createGoodsReceiptNote(data: any): Observable<any> {
    return this.api.post('/procure-to-pay/goods-receipt-notes', data);
  }

  // 3. Purchase Invoices
  getPurchaseInvoices(companyId: string, status?: string, search?: string): Observable<any[]> {
    let query = `?companyId=${companyId}`;
    if (status) query += `&status=${status}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    return this.api.get<any[]>(`/procure-to-pay/purchase-invoices${query}`);
  }

  getPurchaseInvoiceById(id: string): Observable<any> {
    return this.api.get<any>(`/procure-to-pay/purchase-invoices/${id}`);
  }

  getVendorPendingInvoices(vendorId: string, companyId: string): Observable<any[]> {
    return this.api.get<any[]>(
      `/procure-to-pay/vendor/${vendorId}/pending-invoices?companyId=${companyId}`,
    );
  }

  createPurchaseInvoice(data: any): Observable<any> {
    return this.api.post('/procure-to-pay/purchase-invoices', data);
  }

  // 4. Purchase Returns
  getPurchaseReturns(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/procure-to-pay/purchase-returns?companyId=${companyId}`);
  }

  createPurchaseReturn(data: any): Observable<any> {
    return this.api.post('/procure-to-pay/purchase-returns', data);
  }

  // 5. Vendor Payments
  getVendorPayments(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/procure-to-pay/vendor-payments?companyId=${companyId}`);
  }

  createVendorPayment(data: any): Observable<any> {
    return this.api.post('/procure-to-pay/vendor-payments', data);
  }
}
