'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth } from 'date-fns'
import {
  Loader2,
  Eye,
  EyeOff,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Download,
  RefreshCw,
  PieChart,
  Settings,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { WalletTransaction, MonthlySummary, ReadingClubSplitSetting } from '@/types/database'

type Period = 'week' | 'month' | 'all'

const EXPENSE_CATEGORIES = [
  'logistics',
  'delivery',
  'packaging',
  'marketing',
  'inventory',
  'miscellaneous',
]

export default function ReadingClubWalletPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [pending, setPending] = useState(0)
  const [available, setAvailable] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [showBalance, setShowBalance] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [split, setSplit] = useState<ReadingClubSplitSetting>({ relaks_percent: 50, partner_percent: 50 })
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)

  // Dialog states
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutNote, setPayoutNote] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('logistics')
  const [expenseNote, setExpenseNote] = useState('')
  const [newRelaksPercent, setNewRelaksPercent] = useState('50')
  const [newPartnerPercent, setNewPartnerPercent] = useState('50')

  useEffect(() => {
    loadWallet()
  }, [period])

  const loadWallet = async () => {
    setIsLoading(true)
    try {
      const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM')
      const response = await fetch(`/api/club-admin/wallet?period=${period}&month=${currentMonth}`)
      if (!response.ok) throw new Error('Failed to load wallet')

      const data = await response.json()
      setPending(data.pending)
      setAvailable(data.available)
      setTransactions(data.transactions)
      setIsAdmin(data.isAdmin)
      setSplit(data.split)
      setMonthlySummary(data.monthlySummary)
      setNewRelaksPercent(data.split.relaks_percent.toString())
      setNewPartnerPercent(data.split.partner_percent.toString())
    } catch (error) {
      console.error('Load wallet error:', error)
      toast.error('Failed to load wallet')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSelected = async () => {
    if (selectedIds.size === 0) return

    setActionLoading(true)
    try {
      const response = await fetch('/api/club-admin/wallet/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          transactionIds: Array.from(selectedIds),
        }),
      })

      if (!response.ok) throw new Error('Failed to confirm')

      const data = await response.json()
      toast.success(`Confirmed ${data.confirmed} transaction(s)`)
      setSelectedIds(new Set())
      loadWallet()
    } catch (error) {
      console.error('Confirm error:', error)
      toast.error('Failed to confirm transactions')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecordPayout = async () => {
    const amount = parseInt(payoutAmount, 10)
    if (!amount || amount <= 0 || !payoutNote.trim()) {
      toast.error('Please enter valid amount and note')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/club-admin/wallet/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'payout',
          amount,
          note: payoutNote.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to record payout')

      toast.success('Payout recorded')
      setPayoutDialogOpen(false)
      setPayoutAmount('')
      setPayoutNote('')
      loadWallet()
    } catch (error) {
      console.error('Payout error:', error)
      toast.error('Failed to record payout')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecordExpense = async () => {
    const amount = parseInt(expenseAmount, 10)
    if (!amount || amount <= 0 || !expenseNote.trim()) {
      toast.error('Please enter valid amount and note')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/club-admin/wallet/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'expense',
          amount,
          category: expenseCategory,
          note: expenseNote.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to record expense')

      toast.success('Expense recorded')
      setExpenseDialogOpen(false)
      setExpenseAmount('')
      setExpenseNote('')
      loadWallet()
    } catch (error) {
      console.error('Expense error:', error)
      toast.error('Failed to record expense')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateSplit = async () => {
    const relaks = parseInt(newRelaksPercent, 10)
    const partner = parseInt(newPartnerPercent, 10)

    if (relaks + partner !== 100) {
      toast.error('Percentages must add up to 100')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/club-admin/wallet/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relaks_percent: relaks,
          partner_percent: partner,
        }),
      })

      if (!response.ok) throw new Error('Failed to update split')

      toast.success('Profit split updated')
      setSettingsDialogOpen(false)
      loadWallet()
    } catch (error) {
      console.error('Update split error:', error)
      toast.error('Failed to update split')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const pendingTransactions = transactions.filter((t) => t.status === 'pending')

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Direction', 'Amount', 'Status', 'Category', 'Note', 'Reference']
    const rows = transactions.map((t) => [
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
      t.type,
      t.direction,
      t.amount_naira,
      t.status,
      t.category || '',
      t.note || '',
      t.paystack_reference || '',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reading-club-wallet-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reading Club Wallet</h1>
          <p className="text-gray-500 text-sm mt-1">Track rental revenue and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadWallet}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setSettingsDialogOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <span className="font-medium">Reading Club Balance</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-sm text-white/80">Available</p>
              <p className="text-3xl font-bold">
                {showBalance ? `₦${available.toLocaleString()}` : '••••••'}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/70">Pending</p>
              <p className="text-lg font-medium text-white/90">
                {showBalance ? `₦${pending.toLocaleString()}` : '••••••'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      {monthlySummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-orange-500" />
              {format(new Date(monthlySummary.month + '-01'), 'MMMM yyyy')} Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-lg font-semibold text-green-600">
                  ₦{monthlySummary.revenue.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expenses</p>
                <p className="text-lg font-semibold text-red-600">
                  ₦{monthlySummary.expenses.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Profit</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ₦{monthlySummary.netProfit.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Split ({split.relaks_percent}/{split.partner_percent})</p>
                <div className="text-sm">
                  <span className="text-purple-600">Relaks: ₦{monthlySummary.relaksShare.toLocaleString()}</span>
                  <span className="mx-1 text-gray-300">|</span>
                  <span className="text-orange-600">Partner: ₦{monthlySummary.partnerShare.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && pendingTransactions.length > 0 && (
          <Button
            onClick={handleConfirmSelected}
            disabled={selectedIds.size === 0 || actionLoading}
            className="bg-green-500 hover:bg-green-600"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Confirm ({selectedIds.size})
          </Button>
        )}

        {isAdmin && (
          <>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(true)}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Record Payout
            </Button>

            <Button variant="outline" onClick={() => setExpenseDialogOpen(true)}>
              <Receipt className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </>
        )}
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transactions ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    tx.status === 'pending' && 'bg-yellow-50 border-yellow-200',
                    tx.status === 'available' && 'bg-white border-gray-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isAdmin && tx.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    )}
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center',
                        tx.direction === 'credit'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      )}
                    >
                      {tx.direction === 'credit' ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        {tx.category && (
                          <span className="ml-2 text-xs text-gray-500">({tx.category})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tx.note || tx.paystack_reference?.slice(0, 20)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={cn(
                        'font-semibold',
                        tx.direction === 'credit' ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {tx.direction === 'credit' ? '+' : '-'}₦{tx.amount_naira.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded',
                          tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        )}
                      >
                        {tx.status}
                      </span>
                      <span className="text-gray-400">
                        {format(new Date(tx.created_at), 'MMM d')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payout</DialogTitle>
            <DialogDescription>
              Record a payout made from the reading club wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="e.g., 50000"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="e.g., Partner withdrawal - October"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayout} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Record Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a business expense
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="e.g., 5000"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="Description of the expense"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordExpense} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profit Split Settings</DialogTitle>
            <DialogDescription>
              Configure how profits are split between Relaks and partner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Relaks Share (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newRelaksPercent}
                onChange={(e) => {
                  setNewRelaksPercent(e.target.value)
                  setNewPartnerPercent((100 - parseInt(e.target.value || '0', 10)).toString())
                }}
              />
            </div>
            <div>
              <Label>Partner Share (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newPartnerPercent}
                onChange={(e) => {
                  setNewPartnerPercent(e.target.value)
                  setNewRelaksPercent((100 - parseInt(e.target.value || '0', 10)).toString())
                }}
              />
            </div>
            <p className="text-sm text-gray-500">
              Current split: {split.relaks_percent}% Relaks / {split.partner_percent}% Partner
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSplit} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
