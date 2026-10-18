import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  constructor(private api: ApiService) {}

  // 1. Sales Orders
  getSalesOrders(companyId: string, status?: string, search?: string): Observable<any[]> {
    let query = `?companyId=${companyId}`;
    if (status) query += `&status=${status}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    return this.api.get<any[]>(`/sales/sales-orders${query}`);
  }

  getSalesOrderById(id: string): Observable<any> {
    return this.api.get<any>(`/sales/sales-orders/${id}`);
  }

  getCustomerPendingOrders(customerId: string, companyId: string): Observable<any[]> {
    return this.api.get<any[]>(
      `/sales/customer/${customerId}/pending-orders?companyId=${companyId}`,
    );
  }

  createSalesOrder(data: any): Observable<any> {
    return this.api.post('/sales/sales-orders', data);
  }

  cancelSalesOrder(id: string): Observable<any> {
    return this.api.put(`/sales/sales-orders/${id}/cancel`, {});
  }

  // 2. Delivery Challans
  getDeliveryChallans(companyId: string, status?: string, search?: string): Observable<any[]> {
    let query = `?companyId=${companyId}`;
    if (status) query += `&status=${status}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    return this.api.get<any[]>(`/sales/delivery-challans${query}`);
  }

  getDeliveryChallanById(id: string): Observable<any> {
    return this.api.get<any>(`/sales/delivery-challans/${id}`);
  }

  getCustomerPendingChallans(customerId: string, companyId: string): Observable<any[]> {
    return this.api.get<any[]>(
      `/sales/customer/${customerId}/pending-challans?companyId=${companyId}`,
    );
  }

  createDeliveryChallan(data: any): Observable<any> {
    return this.api.post('/sales/delivery-challans', data);
  }

  // 3. Sales Invoices
  getSalesInvoices(companyId: string, status?: string, search?: string): Observable<any[]> {
    let query = `?companyId=${companyId}`;
    if (status) query += `&status=${status}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    return this.api.get<any[]>(`/sales/sales-invoices${query}`);
  }

  getSalesInvoiceById(id: string): Observable<any> {
    return this.api.get<any>(`/sales/sales-invoices/${id}`);
  }

  getCustomerPendingInvoices(customerId: string, companyId: string): Observable<any[]> {
    return this.api.get<any[]>(
      `/sales/customer/${customerId}/pending-invoices?companyId=${companyId}`,
    );
  }

  createSalesInvoice(data: any): Observable<any> {
    return this.api.post('/sales/sales-invoices', data);
  }

  // 4. Sales Returns (Credit Notes)
  getSalesReturns(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/sales/sales-returns?companyId=${companyId}`);
  }

  createSalesReturn(data: any): Observable<any> {
    return this.api.post('/sales/sales-returns', data);
  }

  // 5. Customer Receipts
  getCustomerReceipts(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/sales/customer-receipts?companyId=${companyId}`);
  }

  createCustomerReceipt(data: any): Observable<any> {
    return this.api.post('/sales/customer-receipts', data);
  }
}
