import { api } from "@/lib/api";

export interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: string;
  vendor: string | null;
  receipt_url?: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseInput {
  category: string;
  description?: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  vendor?: string;
  notes?: string;
}

export interface ExpenseStats {
  totalExpenses: number;
  monthlyExpenses: number;
  todayExpenses: number;
  categoryBreakdown: { category: string; total: number }[];
}

export const EXPENSE_CATEGORIES = [
  'Inventory/Stock',
  'Rent',
  'Utilities',
  'Salaries',
  'Marketing',
  'Equipment',
  'Maintenance',
  'Transportation',
  'Insurance',
  'Taxes',
  'Office Supplies',
  'Other',
];

const toApiPayload = (expense: Partial<ExpenseInput>) => ({
  category: expense.category,
  description: expense.description,
  amount: expense.amount,
  expenseDate: expense.expense_date,
  paymentMethod: expense.payment_method,
  vendor: expense.vendor,
  notes: expense.notes,
});

const fromApi = (e: any): Expense => ({
  id: e._id || e.id,
  category: e.category,
  description: e.description ?? null,
  amount: Number(e.amount),
  expense_date: e.expenseDate ? String(e.expenseDate).split('T')[0] : e.expense_date,
  payment_method: e.paymentMethod || e.payment_method,
  vendor: e.vendor ?? null,
  receipt_url: e.receiptUrl ?? e.receipt_url ?? null,
  notes: e.notes ?? null,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
});

export const expenseService = {
  async getAll(): Promise<Expense[]> {
    const data = await api.get<any[]>("/api/expenses");
    return (data || []).map(fromApi).sort((a, b) => (a.expense_date > b.expense_date ? -1 : 1));
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const all = await this.getAll();
    return all.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
  },

  async create(expense: ExpenseInput): Promise<Expense> {
    const data = await api.post<any>('/api/expenses', toApiPayload(expense));
    return fromApi(data);
  },

  async update(id: string, expense: Partial<ExpenseInput>): Promise<Expense> {
    const data = await api.put<any>(`/api/expenses/${id}`, toApiPayload(expense));
    return fromApi(data);
  },

  async delete(id: string): Promise<void> {
    await api.del(`/api/expenses/${id}`);
  },

  async getStats(): Promise<ExpenseStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const expenses = await this.getAll();

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    
    const monthlyExpenses = expenses
      .filter(e => e.expense_date >= startOfMonth)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const todayExpenses = expenses
      .filter(e => e.expense_date === today)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const categoryMap = new Map<string, number>();
    expenses.forEach(e => {
      const current = categoryMap.get(e.category) || 0;
      categoryMap.set(e.category, current + Number(e.amount));
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    return {
      totalExpenses,
      monthlyExpenses,
      todayExpenses,
      categoryBreakdown,
    };
  },
};
