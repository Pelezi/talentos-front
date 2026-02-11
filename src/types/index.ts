export type EntityType = 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'UPDATE';

export interface Category {
  id: number;
  name: string;
  type: EntityType;
  groupId?: number;
  createdAt?: string;
  updatedAt?: string;
  hidden?: boolean;
}

export interface Subcategory {
  id: number;
  name: string;
  categoryId: number;
  type: EntityType;
  groupId?: number;
  createdAt?: string;
  updatedAt?: string;
  hidden?: boolean;
}

export interface Budget {
  id: number;
  userId?: number;
  groupId?: number;
  name: string;
  amount: number;
  type: EntityType;
  month: number;
  year: number;
  subcategoryId: number;
  annual?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: number;
  subcategoryId: number;
  amount: number;
  month?: number;
  year: number;
  type: EntityType;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: number;
  subcategoryId: number;
  accountId?: number;
  toAccountId?: number;
  subcategory?: Subcategory & { category: Category };
  title: string;
  amount: number;
  description?: string;
  date: string;
  type: EntityType;
  userId?: number;
  user?: User;
  groupId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupPermission {
  groupId: number;
  groupName: string;
  isOwner?: boolean;
  role?: string | null;
  permissions: {
    canViewTransactions?: boolean;
    canManageOwnTransactions?: boolean;
    canManageGroupTransactions?: boolean;
    canViewCategories?: boolean;
    canManageCategories?: boolean;
    canViewSubcategories?: boolean;
    canManageSubcategories?: boolean;
    canViewBudgets?: boolean;
    canManageBudgets?: boolean;
    canViewAccounts?: boolean;
    canManageOwnAccounts?: boolean;
    canManageGroupAccounts?: boolean;
    canManageGroup?: boolean;
  } | null;
}

export interface User {
  id: number;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  firstAccess?: boolean;
  timezone?: string;
  defaultHomepage?: string;
  isOwner?: boolean;
  groups?: GroupPermission[];
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface ExpenseComparison {
  subcategoryId: number;
  budgeted: number;
  actual: number;
  difference: number;
  month: number;
  year: number;
}

export interface BudgetComparison {
  budgeted: number;
  actual: number;
  difference: number;
}

export interface TransactionAggregated {
  subcategoryId: number;
  total: number;
  count: number;
  month: number;
  year: number;
  type: EntityType;
  userId?: number;
  user?: User;
}

// Group types
export interface Group {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupRole {
  id: number;
  groupId: number;
  name: string;
  description?: string;
  canViewTransactions: boolean;
  canManageOwnTransactions: boolean;
  canManageGroupTransactions: boolean;
  canViewCategories: boolean;
  canManageCategories: boolean;
  canViewSubcategories: boolean;
  canManageSubcategories: boolean;
  canViewBudgets: boolean;
  canManageBudgets: boolean;
  canViewAccounts: boolean;
  canManageOwnAccounts: boolean;
  canManageGroupAccounts: boolean;
  canManageGroup: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: number;
  groupId: number;
  userId: number;
  roleId: number;
  joinedAt: string;
  updatedAt: string;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  role?: GroupRole;
}

export interface GroupPermissions {
  canViewTransactions: boolean;
  canManageOwnTransactions: boolean;
  canManageGroupTransactions: boolean;
  canViewCategories: boolean;
  canManageCategories: boolean;
  canViewSubcategories: boolean;
  canManageSubcategories: boolean;
  canViewBudgets: boolean;
  canManageBudgets: boolean;
  canViewAccounts: boolean;
  canManageOwnAccounts: boolean;
  canManageGroupAccounts: boolean;
  canManageGroup: boolean;
}

// Notification types
export type NotificationType =
  | 'GROUP_INVITATION'
  | 'GROUP_MEMBER_JOINED'
  | 'GROUP_MEMBER_LEFT'
  | 'TRANSACTION_CREATED'
  | 'TRANSACTION_UPDATED'
  | 'TRANSACTION_DELETED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'SUBCATEGORY_CREATED'
  | 'SUBCATEGORY_UPDATED'
  | 'SUBCATEGORY_DELETED'
  | 'BUDGET_CREATED'
  | 'BUDGET_UPDATED'
  | 'BUDGET_DELETED'
  | 'GROUP_UPDATED';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface GroupInvitation {
  id: number;
  groupId: number;
  groupName?: string;
  userId: number;
  invitedBy: number;
  inviterName?: string;
  roleId: number;
  roleName?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  updatedAt: string;
}

// Account types
export type AccountType = 'CREDIT' | 'CASH' | 'PREPAID';
export type BudgetMonthBasis = 'PURCHASE_DATE' | 'DUE_DATE';

export interface Account {
  id: number;
  userId: number;
  user?: {
    firstName: string;
    lastName: string;
  };
  groupId?: number;
  name: string;
  type: AccountType;
  subcategoryId?: number;
  creditDueDay?: number;
  creditClosingDay?: number;
  debitMethod?: 'INVOICE' | 'PER_PURCHASE';
  budgetMonthBasis?: BudgetMonthBasis;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalance {
  id: number;
  accountId: number;
  amount: number;
  date: string;
  createdAt: string;
}

export interface AccountWithBalance extends Account {
  currentBalance?: AccountBalance;
}
