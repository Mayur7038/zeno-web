import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { MastersService } from "../../core/services/masters.service";
import { TenantService } from "../../core/services/tenant.service";

@Component({
  selector: "app-profit-loss",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profit-loss.component.html',
})
export class ProfitLossComponent implements OnInit {
  loading = false;
  error = false;
  data: any = null;
  startDate = '';
  endDate = '';
  Math = Math;

  tradingExpenses: any[] = [];
  tradingIncomes: any[] = [];
  plExpenses: any[] = [];
  plIncomes: any[] = [];

  totalTradingExpense = 0;
  totalTradingIncome = 0;
  grossProfit = 0;
  grossLoss = 0;

  totalPlExpense = 0;
  totalPlIncome = 0;
  netProfit = 0;
  netLoss = 0;

  constructor(private masters: MastersService, public tenant: TenantService) {}

  ngOnInit() {
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    this.startDate = `${fy}-04-01`;
    this.endDate = `${fy + 1}-03-31`;
    this.tenant.loadHierarchy().subscribe({ next: () => this.load() });
  }

  load() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.loading = true;
    this.error = false;
    this.masters.getProfitLoss(compId, this.startDate, this.endDate).subscribe({
      next: (res) => { 
        this.data = res; 
        this.processData();
        this.loading = false; 
      },
      error: () => { this.loading = false; this.error = true; }
    });
  }

  processData() {
    const expenses = this.data.expenseRows || [];
    const incomes = this.data.incomeRows || [];

    const isTradingItem = (r: any) => {
      const g = r.groupName.toLowerCase();
      const l = r.ledgerName.toLowerCase();
      return g === 'purchase accounts' 
          || g === 'direct expenses'
          || g === 'direct incomes'
          || g === 'sales accounts'
          || g === 'stock-in-hand'
          || l.includes('opening stock')
          || l.includes('closing stock');
    };
    
    this.tradingExpenses = expenses.filter((r: any) => isTradingItem(r));
    this.plExpenses = expenses.filter((r: any) => !isTradingItem(r));

    this.tradingIncomes = incomes.filter((r: any) => isTradingItem(r));
    this.plIncomes = incomes.filter((r: any) => !isTradingItem(r));

    this.totalTradingExpense = this.tradingExpenses.reduce((sum, r) => sum + r.amount, 0);
    this.totalTradingIncome = this.tradingIncomes.reduce((sum, r) => sum + r.amount, 0);

    const gpDiff = this.totalTradingIncome - this.totalTradingExpense;
    this.grossProfit = gpDiff > 0 ? gpDiff : 0;
    this.grossLoss = gpDiff < 0 ? Math.abs(gpDiff) : 0;

    this.totalPlExpense = this.plExpenses.reduce((sum, r) => sum + r.amount, 0);
    this.totalPlIncome = this.plIncomes.reduce((sum, r) => sum + r.amount, 0);

    const plIncomeSide = this.totalPlIncome + this.grossProfit;
    const plExpenseSide = this.totalPlExpense + this.grossLoss;

    const netDiff = plIncomeSide - plExpenseSide;
    this.netProfit = netDiff > 0 ? netDiff : 0;
    this.netLoss = netDiff < 0 ? Math.abs(netDiff) : 0;
  }
}
