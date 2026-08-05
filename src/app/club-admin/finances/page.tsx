'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  Pencil,
  Trash2,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

interface ExpenseRow {
  id: string
  category: string
  description: string
  amount_naira: number
  expense_date: string
  receipt_url: string | null
  created_at: string
  created_by: string
}

interface MonthlyStats {
  revenue: number
  expenses: number
  profit: number
}

const EXPENSE_CATEGORIES = [
  'Delivery',
  'Book Purchase',
  'Packaging',
  'Marketing',
  'Operations',
  'Staff',
  'Other',
]

const DEFAULT_EXPENSE_FORM = {
  category: '',
  description: '',
  amount_naira: '',
  expense_date: format(new Date(), 'yyyy-MM-dd'),
}

export default function ClubAdminFinancesPage() {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ revenue: 0, expenses: 0, profit: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(DEFAULT_EXPENSE_FORM)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    loadFinanceData()
  }, [selectedMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadFinanceData = async () => {
    setIsLoading(true)
    try {
      const monthDate = new Date(selectedMonth + '-01')
      const monthStart = startOfMonth(monthDate).toISOString()
      const monthEnd = endOfMonth(monthDate).toISOString()

      // Get expenses for the month
      const { data: expenseData, error: expenseError } = await supabase
        .from('rental_expenses')
        .select('*')
        .gte('expense_date', monthStart.split('T')[0])
        .lte('expense_date', monthEnd.split('T')[0])
        .order('expense_date', { ascending: false })

      if (expenseError) {
        console.error('Expense error:', expenseError)
        // Table might not exist yet
        setExpenses([])
      } else {
        setExpenses((expenseData || []) as ExpenseRow[])
      }

      // Get revenue for the month
      const { data: revenueData } = await supabase
        .from('rental_payments')
        .select('amount_naira')
        .eq('paystack_status', 'success')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)

      const payments = (revenueData || []) as Array<{ amount_naira: number }>
      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount_naira || 0), 0)
      const expenses = (expenseData || []) as ExpenseRow[]
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount_naira || 0), 0)

      setMonthlyStats({
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
      })
    } catch (error) {
      console.error('Failed to load finances:', error)
      toast.error('Failed to load financial data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.category || !form.amount_naira) {
      toast.error('Category and amount are required')
      return
    }

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        category: form.category,
        description: form.description.trim() || null,
        amount_naira: parseFloat(form.amount_naira),
        expense_date: form.expense_date,
        created_by: user?.id,
      }

      if (editingId) {
        const { error } = await supabase
          .from('rental_expenses')
          .update(payload as never)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Expense updated')
      } else {
        const { error } = await supabase
          .from('rental_expenses')
          .insert(payload as never)

        if (error) throw error
        toast.success('Expense added')
      }

      setForm(DEFAULT_EXPENSE_FORM)
      setEditingId(null)
      setIsDialogOpen(false)
      loadFinanceData()
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error('Failed to save expense')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (expense: ExpenseRow) => {
    setForm({
      category: expense.category,
      description: expense.description || '',
      amount_naira: expense.amount_naira.toString(),
      expense_date: expense.expense_date,
    })
    setEditingId(expense.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return

    try {
      const { error } = await supabase
        .from('rental_expenses')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Expense deleted')
      loadFinanceData()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  const openNewDialog = () => {
    setForm(DEFAULT_EXPENSE_FORM)
    setEditingId(null)
    setIsDialogOpen(true)
  }

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i)
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finances</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track revenue, expenses, and profit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openNewDialog} className="gap-2 bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {monthlyStats.revenue.toLocaleString()} NGN
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                      {monthlyStats.expenses.toLocaleString()} NGN
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${monthlyStats.profit >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                    <DollarSign className={`h-6 w-6 ${monthlyStats.profit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
                    <p className={`text-2xl font-bold ${monthlyStats.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {monthlyStats.profit >= 0 ? '+' : ''}{monthlyStats.profit.toLocaleString()} NGN
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expenses List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5" />
                Expenses ({expenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No expenses recorded for this month</p>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {expense.category}
                          </span>
                          <span className="text-sm text-gray-400">
                            {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {expense.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-red-600">
                          -{expense.amount_naira.toLocaleString()} NGN
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add/Edit Expense Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (NGN) *</Label>
              <Input
                type="number"
                value={form.amount_naira}
                onChange={(e) => setForm({ ...form, amount_naira: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
                disabled={isSaving}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : editingId ? (
                  'Update'
                ) : (
                  'Add Expense'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
