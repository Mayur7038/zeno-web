import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './coming-soon.component.html',
})
export class ComingSoonComponent implements OnInit {
  moduleKey = 'sales';

  moduleData: Record<string, any> = {
    sales: {
      title: 'Order-to-Cash (Sales & Billing)',
      icon: 'pi pi-receipt',
      description: 'The end-to-end sales lifecycle module with integrated GST e-invoicing, delivery tracking, credit management, and accounts receivable reconciliation.',
      steps: [
        { title: 'Quotation', desc: 'Customer RFQ & Pricing' },
        { title: 'Sales Order', desc: 'Order confirmation' },
        { title: 'Delivery Challan', desc: 'Stock OUT / dispatch' },
        { title: 'Tax Invoice', desc: 'GST posting & Dr Customer' },
        { title: 'Receipt', desc: 'Payment received' },
      ],
      highlights: [
        { title: 'E-Way Bill & E-Invoice Integration', desc: 'Direct NIC portal IRN and QR code generation for compliant B2B invoices.' },
        { title: 'Multi-Godown Stock Allocation', desc: 'Real-time reserved inventory check before committing customer orders.' },
        { title: 'Credit Limit & Days Control', desc: 'Automated warnings and hold orders when customer overdue limits are exceeded.' },
      ],
    },
    manufacturing: {
      title: 'BOM & Assembly Manufacturing',
      icon: 'pi pi-cog',
      description: 'Multi-level Bill of Materials (BOM), production planning, raw material auto-consumption, and finished goods stock-in valuation.',
      steps: [
        { title: 'BOM Setup', desc: 'Components & Overhead' },
        { title: 'Work Order', desc: 'Batch production run' },
        { title: 'Issue to Production', desc: 'Raw material stock OUT' },
        { title: 'Assembly Completion', desc: 'FG Stock IN & Costing' },
      ],
      highlights: [
        { title: 'Multi-Level BOM Trees', desc: 'Define sub-assemblies, scrap percentages, and direct labour overhead costs.' },
        { title: 'Atomic Inventory Stock Ledger', desc: 'Consumes raw materials atomically and adds finished goods at exact weighted average cost.' },
        { title: 'Production Variance Reports', desc: 'Compare actual component consumption versus standard engineering BOM tolerances.' },
      ],
    },
  };

  moduleInfo: any = this.moduleData['sales'];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const key = params['module'] || 'sales';
      this.moduleKey = key;
      this.moduleInfo = this.moduleData[key] || {
        title: `${key.toUpperCase()} Module`,
        icon: 'pi pi-compass',
        description: 'This specialized enterprise module is scheduled in the subsequent development milestone.',
        steps: [
          { title: 'Planning', desc: 'Schema specification' },
          { title: 'API Engine', desc: 'TypeORM transaction service' },
          { title: 'PrimeNG UI', desc: 'Enterprise data views' },
        ],
        highlights: [
          { title: 'Full Multi-Tenancy', desc: 'Strict organizational isolation.' },
          { title: 'Audit Trail', desc: 'Pessimistic concurrency and audit logs.' },
        ],
      };
    });
  }
}
