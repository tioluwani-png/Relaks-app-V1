'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  Calculator,
  Plus,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface SettlementPeriod {
  id: string
  period_start: string
  period_end: string
  status: 'open' | 'closed'
  total_revenue: number
  total_expenses: number
  net_profit: number
  partner_percentage: number | null
  relaks_percentage: number | null
  partner_amount: number | null
  relaks_amount: number | null
  closed_at: string | null
  closed_by: string | null
  created_at: string
}

interface PeriodPreview {
  revenue: number
  expenses: number
  netProfit: number
}

export default function ClubAdminSettlementsPage() {
  const supabase = createClient()
  const [periods, setPeriods] = useState<SettlementPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<SettlementPeriod | null>(null)
  const [periodPreview, setPeriodPreview] = useState<PeriodPreview | null>(null)
  const [closeForm, setCloseForm] = useState({
    partnerPercentage: '50',
    relaksPercentage: '50',
  })
  const [createForm, setCreateForm] = useState({
    periodStart: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    periodEnd: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    loadPeriods()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPeriods = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('rental_settlement_periods')
        .select('*')
        .order('period_start', { ascending: false })

      if (error) {
        console.error('Settlement periods error:', error)
        // Table might not exist yet
        setPeriods([])
      } else {
        setPeriods((data || []) as SettlementPeriod[])
      }
    } catch (error) {
      console.error('Failed to load periods:', error)
      toast.error('Failed to load settlement periods')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.periodStart || !createForm.periodEnd) {
      toast.error('Start and end dates are required')
      return
    }

    setIsCreating(true)
    try {
      // Calculate financials for the period
      const { revenue, expenses } = await calculatePeriodFinancials(
        createForm.periodStart,
        createForm.periodEnd
      )

      const payload = {
        period_start: createForm.periodStart,
        period_end: createForm.periodEnd,
        status: 'open',
        total_revenue: revenue,
        total_expenses: expenses,
        net_profit: revenue - expenses,
      }

      const { error } = await supabase
        .from('rental_settlement_periods')
        .insert(payload as never)

      if (error) throw error

      toast.success('Settlement period created')
      setIsCreateDialogOpen(false)
      loadPeriods()
    } catch (error) {
      console.error('Error creating period:', error)
      toast.error('Failed to create period')
    } finally {
      setIsCreating(false)
    }
  }

  const calculatePeriodFinancials = async (start: string, end: string) => {
    const startDate = new Date(start).toISOString()
    const endDate = new Date(end + 'T23:59:59').toISOString()

    // Get revenue
    const { data: revenueData } = await supabase
      .from('rental_payments')
      .select('amount_naira')
      .eq('paystack_status', 'success')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const payments = (revenueData || []) as Array<{ amount_naira: number }>
    const revenue = payments.reduce((sum, p) => sum + (p.amount_naira || 0), 0)

    // Get expenses
    const { data: expenseData } = await supabase
      .from('rental_expenses')
      .select('amount_naira')
      .gte('expense_date', start)
      .lte('expense_date', end)

    const expenseRows = (expenseData || []) as Array<{ amount_naira: number }>
    const expenses = expenseRows.reduce((sum, e) => sum + (e.amount_naira || 0), 0)

    return { revenue, expenses }
  }

  const openCloseDialog = async (period: SettlementPeriod) => {
    setSelectedPeriod(period)

    // Recalculate current financials
    const { revenue, expenses } = await calculatePeriodFinancials(
      period.period_start,
      period.period_end
    )

    setPeriodPreview({
      revenue,
      expenses,
      netProfit: revenue - expenses,
    })

    setCloseForm({
      partnerPercentage: '50',
      relaksPercentage: '50',
    })
    setIsCloseDialogOpen(true)
  }

  const handlePercentageChange = (field: 'partnerPercentage' | 'relaksPercentage', value: string) => {
    const numValue = parseFloat(value) || 0
    if (field === 'partnerPercentage') {
      setCloseForm({
        partnerPercentage: value,
        relaksPercentage: (100 - numValue).toString(),
      })
    } else {
      setCloseForm({
        relaksPercentage: value,
        partnerPercentage: (100 - numValue).toString(),
      })
    }
  }

  const handleClosePeriod = async () => {
    if (!selectedPeriod || !periodPreview) return

    const partnerPct = parseFloat(closeForm.partnerPercentage) || 0
    const relaksPct = parseFloat(closeForm.relaksPercentage) || 0

    if (partnerPct + relaksPct !== 100) {
      toast.error('Percentages must add up to 100%')
      return
    }

    setIsClosing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const partnerAmount = (periodPreview.netProfit * partnerPct) / 100
      const relaksAmount = (periodPreview.netProfit * relaksPct) / 100

      const { error } = await supabase
        .from('rental_settlement_periods')
        .update({
          status: 'closed',
          total_revenue: periodPreview.revenue,
          total_expenses: periodPreview.expenses,
          net_profit: periodPreview.netProfit,
          partner_percentage: partnerPct,
          relaks_percentage: relaksPct,
          partner_amount: partnerAmount,
          relaks_amount: relaksAmount,
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
        } as never)
        .eq('id', selectedPeriod.id)

      if (error) throw error

      toast.success('Settlement period closed')
      setIsCloseDialogOpen(false)
      setSelectedPeriod(null)
      loadPeriods()
    } catch (error) {
      console.error('Error closing period:', error)
      toast.error('Failed to close period')
    } finally {
      setIsClosing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'closed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          Closed
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
        <Clock className="h-3 w-3" />
        Open
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settlements</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage settlement periods and profit splits
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2 bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          New Period
        </Button>
      </div>

      {/* Settlement Periods */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : periods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No settlement periods yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first settlement period to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {periods.map((period) => (
            <Card key={period.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Period Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {format(new Date(period.period_start), 'MMM d')} - {format(new Date(period.period_end), 'MMM d, yyyy')}
                      </h3>
                      {getStatusBadge(period.status)}
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-xs text-gray-500">Revenue</p>
                          <p className="font-medium text-green-600">
                            {period.total_revenue.toLocaleString()} NGN
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <div>
                          <p className="text-xs text-gray-500">Expenses</p>
                          <p className="font-medium text-red-600">
                            {period.total_expenses.toLocaleString()} NGN
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className={`h-4 w-4 ${period.net_profit >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
                        <div>
                          <p className="text-xs text-gray-500">Net Profit</p>
                          <p className={`font-medium ${period.net_profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {period.net_profit >= 0 ? '+' : ''}{period.net_profit.toLocaleString()} NGN
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Split info if closed */}
                    {period.status === 'closed' && period.partner_percentage !== null && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Profit Split</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Partner ({period.partner_percentage}%)</p>
                            <p className="font-semibold text-orange-600">
                              {(period.partner_amount || 0).toLocaleString()} NGN
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Relaks ({period.relaks_percentage}%)</p>
                            <p className="font-semibold text-purple-600">
                              {(period.relaks_amount || 0).toLocaleString()} NGN
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {period.status === 'open' && (
                      <Button
                        onClick={() => openCloseDialog(period)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Close Period
                      </Button>
                    )}
                    {period.status === 'closed' && (
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Period Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Settlement Period</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePeriod} className="space-y-4 mt-4">
            <div>
              <Label>Period Start *</Label>
              <Input
                type="date"
                value={createForm.periodStart}
                onChange={(e) => setCreateForm({ ...createForm, periodStart: e.target.value })}
                disabled={isCreating}
              />
            </div>
            <div>
              <Label>Period End *</Label>
              <Input
                type="date"
                value={createForm.periodEnd}
                onChange={(e) => setCreateForm({ ...createForm, periodEnd: e.target.value })}
                disabled={isCreating}
              />
            </div>
            <p className="text-sm text-gray-500">
              The settlement period will capture all revenue and expenses within these dates.
            </p>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Period'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Period Dialog */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close Settlement Period</DialogTitle>
          </DialogHeader>
          {selectedPeriod && periodPreview && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2">
                <p className="text-sm text-gray-500">
                  {format(new Date(selectedPeriod.period_start), 'MMM d')} - {format(new Date(selectedPeriod.period_end), 'MMM d, yyyy')}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="font-medium text-green-600">{periodPreview.revenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expenses</p>
                    <p className="font-medium text-red-600">{periodPreview.expenses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Net Profit</p>
                    <p className={`font-medium ${periodPreview.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {periodPreview.netProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium">Set profit split percentages:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Partner %</Label>
                    <Input
                      type="number"
                      value={closeForm.partnerPercentage}
                      onChange={(e) => handlePercentageChange('partnerPercentage', e.target.value)}
                      min="0"
                      max="100"
                      step="1"
                      disabled={isClosing}
                    />
                    <p className="text-sm text-orange-600 mt-1">
                      = {((periodPreview.netProfit * (parseFloat(closeForm.partnerPercentage) || 0)) / 100).toLocaleString()} NGN
                    </p>
                  </div>
                  <div>
                    <Label>Relaks %</Label>
                    <Input
                      type="number"
                      value={closeForm.relaksPercentage}
                      onChange={(e) => handlePercentageChange('relaksPercentage', e.target.value)}
                      min="0"
                      max="100"
                      step="1"
                      disabled={isClosing}
                    />
                    <p className="text-sm text-purple-600 mt-1">
                      = {((periodPreview.netProfit * (parseFloat(closeForm.relaksPercentage) || 0)) / 100).toLocaleString()} NGN
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Once closed, this settlement period cannot be reopened. Make sure all expenses are recorded.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCloseDialogOpen(false)}
                  disabled={isClosing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleClosePeriod}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  disabled={isClosing}
                >
                  {isClosing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Close Period
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
