'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
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
import type { WalletTransaction } from '@/types/database'

type Period = 'week' | 'month' | 'all'

export default function ShopWalletPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const [available, setAvailable] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [showBalance, setShowBalance] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)

  // Dialog states
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutNote, setPayoutNote] = useState('')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentDirection, setAdjustmentDirection] = useState<'credit' | 'debit'>('credit')
  const [adjustmentNote, setAdjustmentNote] = useState('')

  useEffect(() => {
    loadWallet()
  }, [period])

  const loadWallet = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/wallet?period=${period}`)
      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 500 && data.error?.includes('wallet_transactions')) {
          setError('migration_needed')
        } else {
          setError(data.error || 'Failed to load wallet')
        }
        // Still show the page with zero balances
        setPending(0)
        setAvailable(0)
        setTransactions([])
        return
      }

      setPending(data.pending || 0)
      setAvailable(data.available || 0)
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('Load wallet error:', err)
      setError('Failed to load wallet')
      setPending(0)
      setAvailable(0)
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSelected = async () => {
    if (selectedIds.size === 0) return

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/wallet/transactions', {
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
      const response = await fetch('/api/admin/wallet/transactions', {
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

  const handleRecordAdjustment = async () => {
    const amount = parseInt(adjustmentAmount, 10)
    if (!amount || amount <= 0 || !adjustmentNote.trim()) {
      toast.error('Please enter valid amount and note')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/wallet/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjustment',
          amount,
          direction: adjustmentDirection,
          note: adjustmentNote.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to record adjustment')

      toast.success('Adjustment recorded')
      setAdjustmentDialogOpen(false)
      setAdjustmentAmount('')
      setAdjustmentNote('')
      loadWallet()
    } catch (error) {
      console.error('Adjustment error:', error)
      toast.error('Failed to record adjustment')
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
    const headers = ['Date', 'Type', 'Direction', 'Amount', 'Status', 'Note', 'Reference']
    const rows = transactions.map((t) => [
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
      t.type,
      t.direction,
      t.amount_naira,
      t.status,
      t.note || '',
      t.paystack_reference || '',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shop-wallet-${format(new Date(), 'yyyy-MM-dd')}.csv`
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop Wallet</h1>
          <p className="text-gray-500 text-sm mt-1">Track shop revenue and payouts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadWallet}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <span className="font-medium">Shop Balance</span>
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

        {pendingTransactions.length > 0 && (
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

        <Button variant="outline" onClick={() => setPayoutDialogOpen(true)}>
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Record Payout
        </Button>

        <Button variant="outline" onClick={() => setAdjustmentDialogOpen(true)}>
          Adjustment
        </Button>
      </div>

      {/* Migration Warning */}
      {error === 'migration_needed' && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Setup required:</strong> The wallet_transactions table needs to be created.
              Run the SQL migration in your Supabase dashboard.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transactions ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No transactions yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Sales will appear here once a payment is verified
              </p>
            </div>
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
                    {tx.status === 'pending' && (
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
              Record a payout that was made from the shop wallet
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
                placeholder="e.g., Weekly withdrawal to bank"
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

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Adjustment</DialogTitle>
            <DialogDescription>
              Add a manual adjustment (credit or debit)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Direction</Label>
              <Select
                value={adjustmentDirection}
                onValueChange={(v) => setAdjustmentDirection(v as 'credit' | 'debit')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (Add)</SelectItem>
                  <SelectItem value="debit">Debit (Subtract)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="e.g., 5000"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                value={adjustmentNote}
                onChange={(e) => setAdjustmentNote(e.target.value)}
                placeholder="Reason for adjustment"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordAdjustment} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Record Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
