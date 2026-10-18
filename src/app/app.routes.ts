import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  // Public Auth Routes
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/signup',
    loadComponent: () =>
      import('./features/auth/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },

  // Protected App Shell Routes
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      // Procure-to-Pay (Phase 1)
      {
        path: 'procure-to-pay/purchase-orders',
        loadComponent: () =>
          import(
            './features/procure-to-pay/purchase-orders/purchase-orders.component'
          ).then((m) => m.PurchaseOrdersComponent),
      },
      {
        path: 'procure-to-pay/goods-receipt-notes',
        loadComponent: () =>
          import(
            './features/procure-to-pay/goods-receipt-notes/goods-receipt-notes.component'
          ).then((m) => m.GoodsReceiptNotesComponent),
      },
      {
        path: 'procure-to-pay/purchase-invoices',
        loadComponent: () =>
          import(
            './features/procure-to-pay/purchase-invoices/purchase-invoices.component'
          ).then((m) => m.PurchaseInvoicesComponent),
      },
      {
        path: 'procure-to-pay/purchase-returns',
        loadComponent: () =>
          import(
            './features/procure-to-pay/purchase-returns/purchase-returns.component'
          ).then((m) => m.PurchaseReturnsComponent),
      },
      {
        path: 'procure-to-pay/vendor-payments',
        loadComponent: () =>
          import(
            './features/procure-to-pay/vendor-payments/vendor-payments.component'
          ).then((m) => m.VendorPaymentsComponent),
      },
      // Order-to-Cash (Sales & Billing)
      {
        path: 'sales/sales-orders',
        loadComponent: () =>
          import(
            './features/sales/sales-orders/sales-orders.component'
          ).then((m) => m.SalesOrdersComponent),
      },
      {
        path: 'sales/delivery-challans',
        loadComponent: () =>
          import(
            './features/sales/delivery-challans/delivery-challans.component'
          ).then((m) => m.DeliveryChallansComponent),
      },
      {
        path: 'sales/sales-invoices',
        loadComponent: () =>
          import(
            './features/sales/sales-invoices/sales-invoices.component'
          ).then((m) => m.SalesInvoicesComponent),
      },
      {
        path: 'sales/sales-returns',
        loadComponent: () =>
          import(
            './features/sales/sales-returns/sales-returns.component'
          ).then((m) => m.SalesReturnsComponent),
      },
      {
        path: 'sales/customer-receipts',
        loadComponent: () =>
          import(
            './features/sales/customer-receipts/customer-receipts.component'
          ).then((m) => m.CustomerReceiptsComponent),
      },
      // Accounting Vouchers (Payment, Receipt, Contra, Journal, Debit Note, Credit Note)
      {
        path: 'accounting/payments',
        loadComponent: () =>
          import(
            './features/accounting/payment-vouchers/payment-vouchers.component'
          ).then((m) => m.PaymentVouchersComponent),
      },
      {
        path: 'accounting/receipts',
        loadComponent: () =>
          import(
            './features/accounting/receipt-vouchers/receipt-vouchers.component'
          ).then((m) => m.ReceiptVouchersComponent),
      },
      {
        path: 'accounting/contra',
        loadComponent: () =>
          import(
            './features/accounting/contra-vouchers/contra-vouchers.component'
          ).then((m) => m.ContraVouchersComponent),
      },
      {
        path: 'accounting/journals',
        loadComponent: () =>
          import(
            './features/accounting/journal-vouchers/journal-vouchers.component'
          ).then((m) => m.JournalVouchersComponent),
      },
      {
        path: 'accounting/debit-notes',
        loadComponent: () =>
          import(
            './features/accounting/debit-notes/debit-notes.component'
          ).then((m) => m.DebitNotesComponent),
      },
      {
        path: 'accounting/credit-notes',
        loadComponent: () =>
          import(
            './features/accounting/credit-notes/credit-notes.component'
          ).then((m) => m.CreditNotesComponent),
      },
      // Inventory Management
      {
        path: 'inventory/stock-transfer',
        loadComponent: () =>
          import(
            './features/inventory/stock-transfer/stock-transfer.component'
          ).then((m) => m.StockTransferComponent),
      },
      {
        path: 'inventory/stock-adjustment',
        loadComponent: () =>
          import(
            './features/inventory/stock-adjustment/stock-adjustment.component'
          ).then((m) => m.StockAdjustmentComponent),
      },
      {
        path: 'inventory/opening-balance',
        loadComponent: () =>
          import(
            './features/inventory/opening-balance/opening-balance.component'
          ).then((m) => m.OpeningBalanceComponent),
      },
      {
        path: 'inventory/price-list',
        loadComponent: () =>
          import(
            './features/inventory/price-list/price-list.component'
          ).then((m) => m.PriceListComponent),
      },
      // Masters
      {
        path: 'masters/ledgers',
        loadComponent: () =>
          import('./features/masters/ledgers.component').then(
            (m) => m.LedgersComponent,
          ),
      },
      {
        path: 'masters/ledger-groups',
        loadComponent: () =>
          import('./features/masters/ledger-groups.component').then(
            (m) => m.LedgerGroupsComponent,
          ),
      },
      {
        path: 'masters/items',
        loadComponent: () =>
          import('./features/masters/items.component').then(
            (m) => m.ItemsComponent,
          ),
      },
      {
        path: 'masters/stock-groups',
        loadComponent: () =>
          import('./features/masters/stock-groups.component').then(
            (m) => m.StockGroupsComponent,
          ),
      },
      {
        path: 'masters/stock-categories',
        loadComponent: () =>
          import('./features/masters/stock-categories.component').then(
            (m) => m.StockCategoriesComponent,
          ),
      },
      {
        path: 'masters/units',
        loadComponent: () =>
          import('./features/masters/units.component').then(
            (m) => m.UnitsComponent,
          ),
      },
      {
        path: 'masters/variants',
        loadComponent: () =>
          import('./features/masters/variants.component').then(
            (m) => m.VariantsComponent,
          ),
      },
      // Manufacturing (BOM & Assembly)
      {
        path: 'manufacturing/boms',
        loadComponent: () =>
          import('./features/manufacturing/boms.component').then(
            (m) => m.BomsComponent,
          ),
      },
      {
        path: 'manufacturing/production-entries',
        loadComponent: () =>
          import(
            './features/manufacturing/production-entries.component'
          ).then((m) => m.ProductionEntriesComponent),
      },
      // Reports & Accounting
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports-hub.component').then(
            (m) => m.ReportsHubComponent,
          ),
      },
      {
        path: 'reports/trial-balance',
        loadComponent: () =>
          import('./features/reports/trial-balance.component').then(
            (m) => m.TrialBalanceComponent,
          ),
      },
      {
        path: 'reports/profit-loss',
        loadComponent: () =>
          import('./features/reports/profit-loss.component').then(
            (m) => m.ProfitLossComponent,
          ),
      },
      {
        path: 'reports/balance-sheet',
        loadComponent: () =>
          import('./features/reports/balance-sheet.component').then(
            (m) => m.BalanceSheetComponent,
          ),
      },
      {
        path: 'reports/ledger-statement',
        loadComponent: () =>
          import('./features/reports/ledger-report.component').then(
            (m) => m.LedgerReportComponent,
          ),
      },
      {
        path: 'reports/stock-item-statement',
        loadComponent: () =>
          import('./features/reports/stock-item-report.component').then(
            (m) => m.StockItemReportComponent,
          ),
      },
      {
        path: 'reports/stock-summary',
        loadComponent: () =>
          import('./features/reports/stock-summary.component').then(
            (m) => m.StockSummaryComponent,
          ),
      },
      {
        path: 'reports/gstr1-summary',
        loadComponent: () =>
          import('./features/reports/gstr1-report.component').then(
            (m) => m.Gstr1ReportComponent,
          ),
      },
      {
        path: 'reports/gstr3b-summary',
        loadComponent: () =>
          import('./features/reports/gstr3b-report.component').then(
            (m) => m.Gstr3bReportComponent,
          ),
      },
      // Settings & Administration
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },
      // Roadmap & Coming Soon
      {
        path: 'coming-soon/:module',
        loadComponent: () =>
          import('./features/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent,
          ),
      },
      {
        path: 'coming-soon',
        loadComponent: () =>
          import('./features/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent,
          ),
      },
    ],
  },

  // Fallback
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
