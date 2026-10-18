import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';
import { P2pService } from '../../core/services/p2p.service';
import { SalesService } from '../../core/services/sales.service';
import { MastersService } from '../../core/services/masters.service';
import { InventoryService } from '../../core/services/inventory.service';
import { AccountingService } from '../../core/services/accounting.service';

export type DateFilterType = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM';
export type ChartMetricType = 'SALES' | 'PROFIT' | 'BILLS';

interface KpiCard {
  id: string;
  title: string;
  value: string;
  comparison: string;
  changePercent: string;
  isPositive: boolean;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  colorClass: string;
}

interface OutstandingCustomer {
  customerName: string;
  invoiceNo: string;
  dueDate: string;
  amount: number;
  overdueDays: number;
  status: 'OVERDUE' | 'DUE TODAY' | 'CURRENT';
}

interface TopProduct {
  name: string;
  sku: string;
  category: string;
  quantitySold: number;
  unit: string;
  salesAmount: number;
  profit: number;
  marginPercent: number;
}

interface BusinessAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  icon: string;
  title: string;
  actionText: string;
  route: string;
}

interface ChartDataPoint {
  label: string;
  sales: number;
  profit: number;
  bills: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  activeDateFilter: DateFilterType = 'TODAY';
  activeChartMetric: ChartMetricType = 'SALES';
  customStartDate = '2026-10-01';
  customEndDate = '2026-10-07';

  // Chart hover tooltip coordinates
  hoveredPoint: ChartDataPoint | null = null;
  tooltipX = 0;
  tooltipY = 0;
  barSpacing = 90;

  // 2. Main KPI Cards
  kpiCards: KpiCard[] = [];

  // 3. Sales Overview Chart Points & Summary
  chartPoints: ChartDataPoint[] = [];
  salesSummary = {
    totalSales: 148500,
    salesReturn: 4200,
    netSales: 144300,
    grossProfit: 42600,
  };

  // 4. Money Summary
  moneySummary = {
    cashBalance: 122500,
    bankBalance: 550000,
    totalLiquid: 672500,
    customerCollection: 92400,
    supplierPayments: 64000,
    customerOutstanding: 584200,
    supplierOutstanding: 312800,
    netCashFlow: 28400,
  };

  // 5. Customer Outstanding
  receivablesSummary = {
    total: 584200,
    overdue: 142000,
    dueToday: 38500,
    dueThisWeek: 84200,
  };

  outstandingCustomers: OutstandingCustomer[] = [
    {
      customerName: 'Apex Logistics & Trade',
      invoiceNo: 'INV-2026-089',
      dueDate: '01-Oct-2026',
      amount: 45000,
      overdueDays: 6,
      status: 'OVERDUE',
    },
    {
      customerName: 'Metro Distributors Corp',
      invoiceNo: 'INV-2026-092',
      dueDate: '03-Oct-2026',
      amount: 32500,
      overdueDays: 4,
      status: 'OVERDUE',
    },
    {
      customerName: 'Zenith Retail Outlets',
      invoiceNo: 'INV-2026-095',
      dueDate: '07-Oct-2026',
      amount: 38500,
      overdueDays: 0,
      status: 'DUE TODAY',
    },
    {
      customerName: 'Sunrise Enterprises Ltd',
      invoiceNo: 'INV-2026-099',
      dueDate: '10-Oct-2026',
      amount: 64200,
      overdueDays: -3,
      status: 'CURRENT',
    },
    {
      customerName: 'Global Supermart Stores',
      invoiceNo: 'INV-2026-101',
      dueDate: '14-Oct-2026',
      amount: 28000,
      overdueDays: -7,
      status: 'CURRENT',
    },
  ];

  // 6. Inventory Alerts
  inventoryAlerts = {
    outOfStock: 5,
    lowStock: 14,
    reorderRequired: 8,
    expiringSoon: 7,
    nonMovingStock: 12,
  };

  // 7. Top Selling Products
  topProducts: TopProduct[] = [
    {
      name: 'Industrial Safety Boots (ISI Grade)',
      sku: 'SKU-SFT-001',
      category: 'Footwear',
      quantitySold: 184,
      unit: 'Pairs',
      salesAmount: 349600,
      profit: 98400,
      marginPercent: 28.1,
    },
    {
      name: 'Heavy-Duty Reinforced Work Gloves',
      sku: 'SKU-GLV-012',
      category: 'Safety Gear',
      quantitySold: 320,
      unit: 'Pairs',
      salesAmount: 112000,
      profit: 35800,
      marginPercent: 32.0,
    },
    {
      name: 'Reflective High-Visibility Vest',
      sku: 'SKU-VST-044',
      category: 'Apparel',
      quantitySold: 260,
      unit: 'Pcs',
      salesAmount: 98800,
      profit: 31200,
      marginPercent: 31.6,
    },
    {
      name: 'Polycarbonate Hard Hat Helmet',
      sku: 'SKU-HLM-089',
      category: 'Head Protection',
      quantitySold: 145,
      unit: 'Pcs',
      salesAmount: 87000,
      profit: 26100,
      marginPercent: 30.0,
    },
    {
      name: 'Clear Anti-Fog Chemical Goggles',
      sku: 'SKU-GGL-021',
      category: 'Eye Protection',
      quantitySold: 210,
      unit: 'Pcs',
      salesAmount: 63000,
      profit: 22050,
      marginPercent: 35.0,
    },
  ];

  // 8. Purchase Summary
  purchaseSummary = {
    todayPurchase: 82400,
    monthlyPurchase: 1428000,
    pendingPOs: 3,
    pendingGRNs: 2,
    pendingBills: 6,
    supplierOutstanding: 312800,
  };

  // 9. Expense Summary
  expenseSummary = {
    total: 68500,
    salary: 35000,
    salaryPercent: 51,
    rent: 18000,
    rentPercent: 26,
    electricity: 5500,
    electricityPercent: 8,
    transport: 4200,
    transportPercent: 6,
    other: 5800,
    otherPercent: 9,
  };

  // 10. Profit Summary
  profitSummary = {
    sales: 144300,
    purchaseCost: 101700,
    grossProfit: 42600,
    grossMarginPercent: 29.5,
    expenses: 14200,
    netProfit: 28400,
    netMarginPercent: 19.7,
  };

  // 11. Needs Your Attention
  businessAlerts: BusinessAlert[] = [
    {
      id: 'al-1',
      type: 'danger',
      icon: 'pi-exclamation-circle',
      title: '8 customer invoices are overdue (₹1,42,000)',
      actionText: 'Collect Payments',
      route: '/sales/customer-receipts',
    },
    {
      id: 'al-2',
      type: 'danger',
      icon: 'pi-times-circle',
      title: '5 products are out of stock',
      actionText: 'Restock Items',
      route: '/masters/items',
    },
    {
      id: 'al-3',
      type: 'warning',
      icon: 'pi-shopping-bag',
      title: '14 products are below minimum reorder level',
      actionText: 'Create Purchase Order',
      route: '/procure-to-pay/purchase-orders',
    },
    {
      id: 'al-4',
      type: 'info',
      icon: 'pi-truck',
      title: '3 purchase orders awaiting GRN receipt',
      actionText: 'Receive Stock',
      route: '/procure-to-pay/goods-receipt-notes',
    },
    {
      id: 'al-5',
      type: 'warning',
      icon: 'pi-credit-card',
      title: '4 supplier payments due this week (₹85,000)',
      actionText: 'Pay Bills',
      route: '/procure-to-pay/vendor-payments',
    },
    {
      id: 'al-6',
      type: 'info',
      icon: 'pi-clock',
      title: '7 product batches expiring within 30 days',
      actionText: 'Review Batches',
      route: '/inventory/price-list',
    },
  ];

  constructor(
    public tenant: TenantService,
    public router: Router,
    private p2p: P2pService,
    private sales: SalesService,
    private masters: MastersService,
    private inventory: InventoryService,
    private accounting: AccountingService,
  ) {}

  get activePeriodLabel(): string {
    switch (this.activeDateFilter) {
      case 'TODAY': return 'Today';
      case 'YESTERDAY': return 'Yesterday';
      case 'THIS_WEEK': return 'This Week';
      case 'THIS_MONTH': return 'This Month';
      case 'THIS_YEAR': return 'This Financial Year';
      case 'CUSTOM': return 'Selected Custom Range';
    }
  }

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe({
      next: () => this.loadLiveData(),
    });
    this.calculateMetricsForPeriod(this.activeDateFilter);
  }

  setDateFilter(filter: DateFilterType) {
    this.activeDateFilter = filter;
    this.calculateMetricsForPeriod(filter);
  }

  onCustomDateChange() {
    if (this.customStartDate && this.customEndDate) {
      this.calculateMetricsForPeriod('CUSTOM');
    }
  }

  setChartMetric(metric: ChartMetricType) {
    this.activeChartMetric = metric;
  }

  calculateMetricsForPeriod(filter: DateFilterType) {
    let salesMult = 1;
    let periodName = 'vs yesterday';

    switch (filter) {
      case 'TODAY':
        salesMult = 1;
        periodName = 'vs yesterday';
        this.chartPoints = [
          { label: '9 AM', sales: 12000, profit: 3500, bills: 2 },
          { label: '11 AM', sales: 28500, profit: 8200, bills: 6 },
          { label: '1 PM', sales: 45000, profit: 13100, bills: 8 },
          { label: '3 PM', sales: 22000, profit: 6400, bills: 4 },
          { label: '5 PM', sales: 18000, profit: 5200, bills: 3 },
          { label: '7 PM', sales: 15000, profit: 4200, bills: 3 },
          { label: '9 PM', sales: 8000, profit: 2000, bills: 2 },
        ];
        break;

      case 'YESTERDAY':
        salesMult = 0.88;
        periodName = 'vs prev day';
        this.chartPoints = [
          { label: '9 AM', sales: 10500, profit: 3000, bills: 2 },
          { label: '11 AM', sales: 24000, profit: 6900, bills: 5 },
          { label: '1 PM', sales: 38000, profit: 10800, bills: 7 },
          { label: '3 PM', sales: 21000, profit: 5900, bills: 4 },
          { label: '5 PM', sales: 16500, profit: 4700, bills: 3 },
          { label: '7 PM', sales: 12000, profit: 3400, bills: 2 },
          { label: '9 PM', sales: 7800, profit: 1500, bills: 1 },
        ];
        break;

      case 'THIS_WEEK':
        salesMult = 5.67;
        periodName = 'vs last week';
        this.chartPoints = [
          { label: 'Mon', sales: 112000, profit: 32000, bills: 22 },
          { label: 'Tue', sales: 129800, profit: 36200, bills: 24 },
          { label: 'Wed', sales: 148500, profit: 42600, bills: 28 },
          { label: 'Thu', sales: 135000, profit: 39000, bills: 26 },
          { label: 'Fri', sales: 158000, profit: 46500, bills: 31 },
          { label: 'Sat', sales: 124000, profit: 37200, bills: 23 },
          { label: 'Sun', sales: 34700, profit: 11500, bills: 8 },
        ];
        break;

      case 'THIS_MONTH':
        salesMult = 23.4;
        periodName = 'vs last month';
        this.chartPoints = [
          { label: 'Wk 1', sales: 842000, profit: 245000, bills: 162 },
          { label: 'Wk 2', sales: 915000, profit: 262000, bills: 175 },
          { label: 'Wk 3', sales: 880000, profit: 248000, bills: 168 },
          { label: 'Wk 4', sales: 843000, profit: 230000, bills: 135 },
        ];
        break;

      case 'THIS_YEAR':
      case 'CUSTOM':
        salesMult = 124.2;
        periodName = 'vs last year';
        this.chartPoints = [
          { label: 'Apr', sales: 2450000, profit: 710000, bills: 460 },
          { label: 'May', sales: 2680000, profit: 775000, bills: 510 },
          { label: 'Jun', sales: 2540000, profit: 735000, bills: 480 },
          { label: 'Jul', sales: 2720000, profit: 788000, bills: 520 },
          { label: 'Aug', sales: 2890000, profit: 838000, bills: 550 },
          { label: 'Sep', sales: 3120000, profit: 905000, bills: 590 },
          { label: 'Oct', sales: 2050000, profit: 489000, bills: 310 },
        ];
        break;
    }

    const baseSales = Math.round(148500 * salesMult);
    const baseProfit = Math.round(42600 * salesMult);
    const baseBills = Math.round(28 * (salesMult < 1 ? 0.9 : Math.max(1, salesMult * 0.85)));
    const baseReturns = Math.round(4200 * salesMult);

    this.salesSummary = {
      totalSales: baseSales,
      salesReturn: baseReturns,
      netSales: baseSales - baseReturns,
      grossProfit: baseProfit,
    };

    this.profitSummary = {
      sales: baseSales - baseReturns,
      purchaseCost: Math.round(baseSales * 0.69),
      grossProfit: baseProfit,
      grossMarginPercent: 29.5,
      expenses: Math.round(baseSales * 0.1),
      netProfit: Math.round(baseProfit - baseSales * 0.1),
      netMarginPercent: 19.7,
    };

    // Build the 8 KPI Cards
    this.kpiCards = [
      {
        id: 'kpi-sales',
        title: filter === 'TODAY' ? "Today's Sales" : 'Period Sales',
        value: `₹${this.formatCurrency(baseSales)}`,
        comparison: periodName,
        changePercent: '+14.2%',
        isPositive: true,
        trend: 'up',
        icon: 'pi-shopping-bag',
        colorClass: 'icon-blue',
      },
      {
        id: 'kpi-profit',
        title: filter === 'TODAY' ? "Today's Profit" : 'Period Profit',
        value: `₹${this.formatCurrency(baseProfit)}`,
        comparison: '29.5% margin',
        changePercent: '+8.5%',
        isPositive: true,
        trend: 'up',
        icon: 'pi-chart-line',
        colorClass: 'icon-emerald',
      },
      {
        id: 'kpi-receivable',
        title: 'Customer Receivable',
        value: `₹${this.formatCurrency(this.receivablesSummary.total)}`,
        comparison: '14 overdue bills',
        changePercent: '₹1.4L late',
        isPositive: false,
        trend: 'down',
        icon: 'pi-arrow-down-left',
        colorClass: 'icon-amber',
      },
      {
        id: 'kpi-payable',
        title: 'Supplier Payable',
        value: `₹${this.formatCurrency(this.moneySummary.supplierOutstanding)}`,
        comparison: '6 bills pending',
        changePercent: 'Due in 7d',
        isPositive: true,
        trend: 'neutral',
        icon: 'pi-arrow-up-right',
        colorClass: 'icon-purple',
      },
      {
        id: 'kpi-stock',
        title: 'Stock Value',
        value: '₹18,45,000',
        comparison: '240 Active SKUs',
        changePercent: '5 out of stock',
        isPositive: false,
        trend: 'down',
        icon: 'pi-box',
        colorClass: 'icon-cyan',
      },
      {
        id: 'kpi-bills',
        title: filter === 'TODAY' ? "Today's Bills" : 'Total Bills',
        value: `${baseBills} Bills`,
        comparison: periodName,
        changePercent: '+16.7%',
        isPositive: true,
        trend: 'up',
        icon: 'pi-file-edit',
        colorClass: 'icon-indigo',
      },
      {
        id: 'kpi-return',
        title: 'Sales Return',
        value: `₹${this.formatCurrency(baseReturns)}`,
        comparison: '2.8% of gross sales',
        changePercent: '1 return',
        isPositive: false,
        trend: 'down',
        icon: 'pi-replay',
        colorClass: 'icon-orange',
      },
      {
        id: 'kpi-liquid',
        title: 'Cash + Bank Balance',
        value: `₹${this.formatCurrency(this.moneySummary.totalLiquid)}`,
        comparison: 'Cash: ₹1.2L | Bank: ₹5.5L',
        changePercent: 'Healthy',
        isPositive: true,
        trend: 'up',
        icon: 'pi-wallet',
        colorClass: 'icon-teal',
      },
    ];

    this.barSpacing = Math.round(620 / Math.max(1, this.chartPoints.length));
  }

  loadLiveData() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;

    // Load actual stock summary if available
    this.masters.getStockSummary(compId).subscribe({
      next: (stock) => {
        if (stock && stock.length > 0) {
          const totalVal = stock.reduce((s, it) => s + Number(it.totalValue || 0), 0);
          const zeroStock = stock.filter((it) => Number(it.totalQuantity || 0) <= 0).length;
          const lowStock = stock.filter((it) => Number(it.totalQuantity || 0) > 0 && Number(it.totalQuantity || 0) < 10).length;

          const stockCard = this.kpiCards.find((c) => c.id === 'kpi-stock');
          if (stockCard) {
            stockCard.value = `₹${this.formatCurrency(totalVal)}`;
            stockCard.comparison = `${stock.length} Active SKUs`;
          }

          this.inventoryAlerts.outOfStock = zeroStock || 5;
          this.inventoryAlerts.lowStock = lowStock || 14;
        }
      },
      error: () => {},
    });

    // Load pending orders
    this.p2p.getPurchaseOrders(compId, 'PENDING').subscribe({
      next: (orders) => {
        if (orders) {
          this.purchaseSummary.pendingPOs = orders.length || 3;
        }
      },
      error: () => {},
    });

    // Load real purchase invoices
    this.p2p.getPurchaseInvoices(compId).subscribe({
      next: (invoices) => {
        if (invoices && invoices.length > 0) {
          const unpaid = invoices.filter((i) => i.status !== 'PAID');
          const sumUnpaid = unpaid.reduce((s, i) => s + (Number(i.grandTotal) - Number(i.paidAmount || 0)), 0);
          if (sumUnpaid > 0) {
            this.purchaseSummary.supplierOutstanding = sumUnpaid;
            this.moneySummary.supplierOutstanding = sumUnpaid;
            const payableCard = this.kpiCards.find((c) => c.id === 'kpi-payable');
            if (payableCard) {
              payableCard.value = `₹${this.formatCurrency(sumUnpaid)}`;
            }
          }
        }
      },
      error: () => {},
    });
  }

  // --- SVG Chart Calculations ---
  getBarHeight(pt: ChartDataPoint): number {
    const maxVal = Math.max(...this.chartPoints.map((p) => this.getMetricValue(p)), 10);
    const val = this.getMetricValue(pt);
    return Math.max(8, Math.round((val / maxVal) * 150));
  }

  getBarY(pt: ChartDataPoint): number {
    const h = this.getBarHeight(pt);
    return 180 - h;
  }

  getMetricValue(pt: ChartDataPoint): number {
    switch (this.activeChartMetric) {
      case 'SALES': return pt.sales;
      case 'PROFIT': return pt.profit;
      case 'BILLS': return pt.bills;
    }
  }

  getBarColor(): string {
    switch (this.activeChartMetric) {
      case 'SALES': return '#3b82f6';
      case 'PROFIT': return '#10b981';
      case 'BILLS': return '#6366f1';
    }
  }

  onBarHover(pt: ChartDataPoint, event: MouseEvent) {
    this.hoveredPoint = pt;
    const target = event.currentTarget as SVGElement;
    const rect = target.getBoundingClientRect();
    const parentRect = (target.closest('.chart-canvas') as HTMLElement)?.getBoundingClientRect();
    if (parentRect) {
      this.tooltipX = rect.left - parentRect.left + 14;
      this.tooltipY = rect.top - parentRect.top;
    }
  }

  onBarLeave() {
    this.hoveredPoint = null;
  }

  getCashFlowRatio(): number {
    const inFlow = this.moneySummary.customerCollection;
    const outFlow = this.moneySummary.supplierPayments;
    const total = inFlow + outFlow;
    if (total === 0) return 50;
    return Math.round((inFlow / total) * 100);
  }

  formatCurrency(value: number): string {
    if (isNaN(value)) return '0';
    return Number(value).toLocaleString('en-IN');
  }

  getKpiIconClass(colorClass: string): string {
    switch (colorClass) {
      case 'icon-blue': return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'icon-emerald': return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
      case 'icon-amber': return 'bg-amber-50 text-amber-600 border border-amber-200';
      case 'icon-purple': return 'bg-purple-50 text-purple-600 border border-purple-200';
      case 'icon-pink': return 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200';
      case 'icon-cyan': return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
      case 'icon-indigo': return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
      case 'icon-orange': return 'bg-orange-50 text-orange-600 border border-orange-200';
      case 'icon-teal': return 'bg-teal-50 text-teal-600 border border-teal-200';
      default: return 'bg-surface-100 text-surface-600 border border-surface-200';
    }
  }

  getAlertCardClass(type: string): string {
    if (type === 'warning') return 'border-amber-200 bg-amber-50/60';
    if (type === 'info') return 'border-blue-200 bg-blue-50/60';
    return 'border-rose-200 bg-rose-50/60';
  }

  getAlertIconClass(type: string): string {
    if (type === 'warning') return 'text-amber-600';
    if (type === 'info') return 'text-blue-600';
    return 'text-rose-600';
  }

  getStatusPillClass(status: string): string {
    if (status === 'OVERDUE') return 'bg-rose-100 text-rose-800';
    if (status === 'DUE TODAY') return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-100 text-emerald-800';
  }
}
