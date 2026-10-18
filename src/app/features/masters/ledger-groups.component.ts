import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';

interface LedgerGroupItem {
  id: string;
  name: string;
  code?: string;
  nature: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';
  parentId?: string;
  parent?: { id: string; name: string };
  isCreditorVendor: boolean;
  isDebtorCustomer: boolean;
  isPredefined: boolean;
  children?: LedgerGroupItem[];
}

export interface LedgerGroupNode extends LedgerGroupItem {
  level: number;
  hasChildren: boolean;
  childCount: number;
  childrenList: LedgerGroupNode[];
}

@Component({
  selector: 'app-ledger-groups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ledger-groups.component.html',
})
export class LedgerGroupsComponent implements OnInit {
  groups: LedgerGroupItem[] = [];
  displayedRows: LedgerGroupNode[] = [];
  expandedGroupIds = new Set<string>();
  loading = false;
  saving = false;
  searchQuery = '';
  natureFilter = 'ALL';

  showModal = false;
  editingGroup: LedgerGroupItem | null = null;
  errorMessage = '';

  formData: {
    name: string;
    code: string;
    nature: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';
    parentId: string | null;
    isDebtorCustomer: boolean;
    isCreditorVendor: boolean;
  } = {
    name: '',
    code: '',
    nature: 'ASSET',
    parentId: null,
    isDebtorCustomer: false,
    isCreditorVendor: false,
  };

  constructor(
    private mastersService: MastersService,
    private tenantService: TenantService,
  ) {}

  ngOnInit() {
    this.loadGroups();
  }

  get predefinedCount() {
    return this.groups.filter((g) => g.isPredefined).length;
  }

  get partyGroupsCount() {
    return this.groups.filter((g) => g.isDebtorCustomer || g.isCreditorVendor).length;
  }

  get availableParents(): LedgerGroupItem[] {
    if (!this.editingGroup) return this.groups;
    return this.groups.filter((g) => g.id !== this.editingGroup?.id);
  }

  loadGroups() {
    this.loading = true;
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');

    this.mastersService.getLedgerGroups(companyId || undefined).subscribe({
      next: (res) => {
        const raw = res || [];
        const seen = new Set<string>();
        this.groups = raw.filter((g: any) => {
          const key = (g.name || '').trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        this.filterGroups();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get hasAnySubGroups(): boolean {
    return this.groups.some((g) => {
      const pId = g.parentId || g.parent?.id;
      return !!pId && this.groups.some((parent) => parent.id === pId);
    });
  }

  isExpanded(id: string): boolean {
    if (this.searchQuery.trim()) {
      return true;
    }
    return this.expandedGroupIds.has(id);
  }

  toggleExpand(id: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.expandedGroupIds.has(id)) {
      this.expandedGroupIds.delete(id);
    } else {
      this.expandedGroupIds.add(id);
    }
    this.filterGroups();
  }

  expandAll() {
    for (const g of this.groups) {
      this.expandedGroupIds.add(g.id);
    }
    this.filterGroups();
  }

  collapseAll() {
    this.expandedGroupIds.clear();
    this.filterGroups();
  }

  onParentChange() {
    if (this.formData.parentId) {
      const parent = this.groups.find((g) => g.id === this.formData.parentId);
      if (parent) {
        this.formData.nature = parent.nature;
      }
    }
  }

  filterGroups() {
    // 1. Index all groups by id
    const groupMap = new Map<string, LedgerGroupItem>();
    this.groups.forEach((g) => groupMap.set(g.id, g));

    // 2. Identify child groups and root groups
    const childrenMap = new Map<string, LedgerGroupItem[]>();
    const rootGroups: LedgerGroupItem[] = [];

    for (const g of this.groups) {
      const pId = g.parentId || g.parent?.id;
      if (pId && groupMap.has(pId)) {
        if (!childrenMap.has(pId)) {
          childrenMap.set(pId, []);
        }
        childrenMap.get(pId)!.push(g);
      } else {
        rootGroups.push(g);
      }
    }

    // 3. Sort root groups alphabetically by name
    rootGroups.sort((a, b) => a.name.localeCompare(b.name));

    // 4. Recursive tree builder
    const buildTree = (item: LedgerGroupItem, level: number): LedgerGroupNode => {
      const rawChildren = childrenMap.get(item.id) || [];
      rawChildren.sort((a, b) => a.name.localeCompare(b.name));
      const childrenList = rawChildren.map((c) => buildTree(c, level + 1));
      return {
        ...item,
        level,
        hasChildren: childrenList.length > 0,
        childCount: childrenList.length,
        childrenList,
      };
    };

    const tree = rootGroups.map((r) => buildTree(r, 0));

    // 5. Filter tree based on search query and nature filter
    const q = this.searchQuery.trim().toLowerCase();
    const nature = this.natureFilter;

    const matchesDirectly = (node: LedgerGroupNode): boolean => {
      const natureMatch = nature === 'ALL' || node.nature === nature;
      const queryMatch = !q || node.name.toLowerCase().includes(q) || Boolean(node.code && node.code.toLowerCase().includes(q));
      return Boolean(natureMatch && queryMatch);
    };

    const filterNode = (node: LedgerGroupNode): LedgerGroupNode | null => {
      const direct = matchesDirectly(node);
      const filteredChildren = node.childrenList
        .map((c) => filterNode(c))
        .filter((c): c is LedgerGroupNode => c !== null);

      if (direct || filteredChildren.length > 0) {
        return {
          ...node,
          hasChildren: filteredChildren.length > 0,
          childCount: filteredChildren.length,
          childrenList: filteredChildren,
        };
      }
      return null;
    };

    const filteredTree = tree
      .map((root) => filterNode(root))
      .filter((r): r is LedgerGroupNode => r !== null);

    // 6. Flatten to displayedRows
    const rows: LedgerGroupNode[] = [];
    const isSearching = q.length > 0;

    const flatten = (node: LedgerGroupNode) => {
      rows.push(node);
      const expanded = isSearching || this.expandedGroupIds.has(node.id);
      if (node.hasChildren && expanded) {
        for (const child of node.childrenList) {
          flatten(child);
        }
      }
    };

    for (const root of filteredTree) {
      flatten(root);
    }

    this.displayedRows = rows;
  }

  getNatureBadge(nature: string): string {
    switch (nature) {
      case 'ASSET':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'LIABILITY':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'INCOME':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'EXPENSE':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-surface-100 text-surface-700 border border-surface-200';
    }
  }

  getNatureColor(nature: string): string {
    switch (nature) {
      case 'ASSET':
        return '#2563EB';
      case 'LIABILITY':
        return '#D97706';
      case 'INCOME':
        return '#16A34A';
      case 'EXPENSE':
        return '#DC2626';
      default:
        return '#64748B';
    }
  }

  openCreateModal() {
    this.editingGroup = null;
    this.formData = {
      name: '',
      code: '',
      nature: 'ASSET',
      parentId: null,
      isDebtorCustomer: false,
      isCreditorVendor: false,
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  openEditModal(group: LedgerGroupItem) {
    this.editingGroup = group;
    this.formData = {
      name: group.name,
      code: group.code || '',
      nature: group.nature,
      parentId: group.parentId || null,
      isDebtorCustomer: group.isDebtorCustomer,
      isCreditorVendor: group.isCreditorVendor,
    };
    if (group.parentId) {
      this.expandedGroupIds.add(group.parentId);
    }
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingGroup = null;
    this.errorMessage = '';
  }

  saveGroup() {
    if (!this.formData.name.trim()) {
      this.errorMessage = 'Please enter a group name.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');

    const payload = {
      ...this.formData,
      companyId,
      parentId: this.formData.parentId || null,
    };

    if (this.formData.parentId) {
      this.expandedGroupIds.add(this.formData.parentId);
    }

    if (this.editingGroup) {
      this.mastersService.updateLedgerGroup(this.editingGroup.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadGroups();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to update ledger group';
        },
      });
    } else {
      this.mastersService.createLedgerGroup(payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadGroups();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to create ledger group';
        },
      });
    }
  }

  deleteGroup(group: LedgerGroupItem) {
    if (group.isPredefined) {
      alert('Standard predefined groups cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete custom group "${group.name}"?`)) {
      return;
    }

    this.mastersService.deleteLedgerGroup(group.id).subscribe({
      next: () => {
        this.loadGroups();
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to delete ledger group');
      },
    });
  }
}
