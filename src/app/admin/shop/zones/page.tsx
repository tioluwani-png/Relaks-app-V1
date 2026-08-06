'use client'

import { useState, useEffect } from 'react'
import { Loader2, Pencil, MapPin, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { LAGOS_LGAS } from '@/lib/shop/config'
import type { ShopDeliveryZone } from '@/types/database'

export default function AdminShopZonesPage() {
  const supabase = createClient()
  const [zones, setZones] = useState<ShopDeliveryZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingZone, setEditingZone] = useState<ShopDeliveryZone | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formFee, setFormFee] = useState('')
  const [formLgas, setFormLgas] = useState<string[]>([])

  useEffect(() => {
    loadZones()
  }, [])

  const loadZones = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('shop_delivery_zones')
        .select('*')
        .order('fee_naira')

      if (error) throw error
      setZones((data || []) as ShopDeliveryZone[])
    } catch (error) {
      console.error('Failed to load zones:', error)
      toast.error('Failed to load zones')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (zone: ShopDeliveryZone) => {
    setEditingZone(zone)
    setFormName(zone.name)
    setFormFee(zone.fee_naira.toString())
    setFormLgas(zone.lgas)
    setIsDialogOpen(true)
  }

  const toggleLga = (lga: string) => {
    setFormLgas((prev) =>
      prev.includes(lga) ? prev.filter((l) => l !== lga) : [...prev, lga]
    )
  }

  const handleSave = async () => {
    if (!editingZone) return
    if (!formName.trim() || !formFee) {
      toast.error('Name and fee are required')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('shop_delivery_zones')
        .update({
          name: formName.trim(),
          fee_naira: parseInt(formFee),
          lgas: formLgas,
        } as never)
        .eq('id', editingZone.id)

      if (error) throw error

      toast.success('Zone updated!')
      setIsDialogOpen(false)
      loadZones()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save zone')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (zone: ShopDeliveryZone) => {
    try {
      const { error } = await supabase
        .from('shop_delivery_zones')
        .update({ is_active: !zone.is_active } as never)
        .eq('id', zone.id)

      if (error) throw error

      setZones((prev) =>
        prev.map((z) => (z.id === zone.id ? { ...z, is_active: !zone.is_active } : z))
      )
      toast.success(zone.is_active ? 'Zone disabled' : 'Zone enabled')
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Failed to toggle zone')
    }
  }

  // Get which LGAs are assigned to other zones
  const getAssignedLgas = () => {
    const assigned: Record<string, string> = {}
    for (const zone of zones) {
      if (editingZone && zone.id === editingZone.id) continue
      for (const lga of zone.lgas) {
        assigned[lga] = zone.name
      }
    }
    return assigned
  }

  const assignedLgas = getAssignedLgas()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Zones</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage Lagos delivery zones and fees
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {zones.map((zone) => (
            <Card key={zone.id} className={!zone.is_active ? 'opacity-60' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-500" />
                  <CardTitle className="text-lg">{zone.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={zone.is_active}
                    onCheckedChange={() => handleToggleActive(zone)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(zone)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  ₦{zone.fee_naira.toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-1">
                  {zone.lgas.map((lga) => (
                    <span
                      key={lga}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400"
                    >
                      {lga}
                    </span>
                  ))}
                </div>
                {zone.lgas.length === 0 && (
                  <p className="text-sm text-amber-600">No LGAs assigned</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Unassigned LGAs warning */}
      {!isLoading && (
        <div className="mt-6">
          {(() => {
            const allAssigned = zones.flatMap((z) => z.lgas)
            const unassigned = LAGOS_LGAS.filter((lga) => !allAssigned.includes(lga))

            if (unassigned.length === 0) return null

            return (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 font-medium mb-2">
                  Unassigned LGAs ({unassigned.length})
                </p>
                <p className="text-sm text-amber-700">
                  These LGAs are not in any delivery zone: {unassigned.join(', ')}
                </p>
              </div>
            )
          })()}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Zone Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Island / Lekki"
                disabled={isSaving}
              />
            </div>

            <div>
              <Label>Delivery Fee (₦)</Label>
              <Input
                type="number"
                value={formFee}
                onChange={(e) => setFormFee(e.target.value)}
                placeholder="2000"
                disabled={isSaving}
              />
            </div>

            <div>
              <Label className="mb-3 block">LGAs in this zone</Label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {LAGOS_LGAS.map((lga) => {
                  const isSelected = formLgas.includes(lga)
                  const assignedTo = assignedLgas[lga]
                  const isDisabled = !!assignedTo

                  return (
                    <button
                      key={lga}
                      type="button"
                      onClick={() => !isDisabled && toggleLga(lga)}
                      disabled={isDisabled || isSaving}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        isSelected
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : isDisabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <span className="truncate">{lga}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      {isDisabled && (
                        <span className="text-xs text-gray-400 truncate ml-1">
                          ({assignedTo})
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formLgas.length} LGA{formLgas.length !== 1 && 's'} selected
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Zone'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
