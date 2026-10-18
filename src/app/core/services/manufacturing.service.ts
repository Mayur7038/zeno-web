import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ManufacturingService {
  constructor(private api: ApiService) {}

  // Bill of Materials (BOM)
  getBoms(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/manufacturing/boms?companyId=${companyId}`);
  }

  getBomById(id: string): Observable<any> {
    return this.api.get<any>(`/manufacturing/boms/${id}`);
  }

  createBom(data: any): Observable<any> {
    return this.api.post('/manufacturing/boms', data);
  }

  updateBom(id: string, data: any): Observable<any> {
    return this.api.put(`/manufacturing/boms/${id}`, data);
  }

  deleteBom(id: string): Observable<any> {
    return this.api.delete(`/manufacturing/boms/${id}`);
  }

  // Assembly / Production Entries
  getProductionEntries(companyId: string): Observable<any[]> {
    return this.api.get<any[]>(`/manufacturing/production-entries?companyId=${companyId}`);
  }

  getProductionEntryById(id: string): Observable<any> {
    return this.api.get<any>(`/manufacturing/production-entries/${id}`);
  }

  createProductionEntry(data: any): Observable<any> {
    return this.api.post('/manufacturing/production-entries', data);
  }

  cancelProductionEntry(id: string): Observable<any> {
    return this.api.put(`/manufacturing/production-entries/${id}/cancel`, {});
  }
}
