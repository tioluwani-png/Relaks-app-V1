'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Loader2,
  Pencil,
  MapPin,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Search,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { ShopDeliveryZone, ShopDeliveryArea } from '@/types/database'

function formatDeliveryTime(minDays: number, maxDays: number): string {
  if (minDays === 0 && maxDays === 0) return 'Same day'
  if (minDays === maxDays) return `${minDays} working day${minDays !== 1 ? 's' : ''}`
  return `${minDays}-${maxDays} working days`
}

export default function AdminShopZonesPage() {
  const [zones, setZones] = useState<ShopDeliveryZone[]>([])
  const [areas, setAreas] = useState<ShopDeliveryArea[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Zone dialog state
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<ShopDeliveryZone | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Zone form state
  const [formName, setFormName] = useState('')
  const [formFee, setFormFee] = useState('')
  const [formMinDays, setFormMinDays] = useState('1')
  const [formMaxDays, setFormMaxDays] = useState('3')
  const [formIsActive, setFormIsActive] = useState(true)

  // Area picker state
  const [isAreaPickerOpen, setIsAreaPickerOpen] = useState(false)
  const [areaPickerZone, setAreaPickerZone] = useState<ShopDeliveryZone | null>(null)
  const [areaSearch, setAreaSearch] = useState('')

  // Move area confirmation
  const [moveAreaConfirm, setMoveAreaConfirm] = useState<{
    area: ShopDeliveryArea
    fromZone: ShopDeliveryZone
    toZone: ShopDeliveryZone
  } | null>(null)

  // Delete zone confirmation
  const [deleteZoneConfirm, setDeleteZoneConfirm] = useState<ShopDeliveryZone | null>(null)

  // Custom area state
  const [isCustomAreaDialogOpen, setIsCustomAreaDialogOpen] = useState(false)
  const [customAreaName, setCustomAreaName] = useState('')
  const [customAreaZoneId, setCustomAreaZoneId] = useState<string | null>(null)

  // Quick assign state (from unassigned warning)
  const [quickAssignArea, setQuickAssignArea] = useState<ShopDeliveryArea | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/shop/zones')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setZones(data.zones || [])
      setAreas(data.areas || [])
    } catch (error) {
      console.error('Failed to load zones:', error)
      toast.error('Failed to load zones')
    } finally {
      setIsLoading(false)
    }
  }

  // Computed: unassigned areas
  const unassignedAreas = useMemo(
    () => areas.filter((a) => !a.zone_id),
    [areas]
  )

  // Computed: areas by zone
  const areasByZone = useMemo(() => {
    const map: Record<string, ShopDeliveryArea[]> = {}
    for (const zone of zones) {
      map[zone.id] = areas.filter((a) => a.zone_id === zone.id)
    }
    return map
  }, [areas, zones])

  // Open zone dialog for create/edit
  const openZoneDialog = (zone?: ShopDeliveryZone) => {
    if (zone) {
      setEditingZone(zone)
      setFormName(zone.name)
      setFormFee(zone.fee_naira.toString())
      setFormMinDays(zone.min_days.toString())
      setFormMaxDays(zone.max_days.toString())
      setFormIsActive(zone.is_active)
    } else {
      setEditingZone(null)
      setFormName('')
      setFormFee('')
      setFormMinDays('1')
      setFormMaxDays('3')
      setFormIsActive(true)
    }
    setIsZoneDialogOpen(true)
  }

  // Save zone (create or update)
  const handleSaveZone = async () => {
    if (!formName.trim() || !formFee) {
      toast.error('Name and fee are required')
      return
    }

    const minDays = parseInt(formMinDays) || 0
    const maxDays = parseInt(formMaxDays) || 0

    if (minDays > maxDays) {
      toast.error('Min days cannot be greater than max days')
      return
    }

    setIsSaving(true)
    try {
      if (editingZone) {
        // Update
        const res = await fetch(`/api/admin/shop/zones/${editingZone.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            fee_naira: parseInt(formFee),
            min_days: minDays,
            max_days: maxDays,
            is_active: formIsActive,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update zone')
        }

        toast.success('Zone updated!')
      } else {
        // Create
        const res = await fetch('/api/admin/shop/zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            fee_naira: parseInt(formFee),
            min_days: minDays,
            max_days: maxDays,
            is_active: formIsActive,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create zone')
        }

        toast.success('Zone created!')
      }

      setIsZoneDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save zone')
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle zone active
  const handleToggleActive = async (zone: ShopDeliveryZone) => {
    try {
      const res = await fetch(`/api/admin/shop/zones/${zone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !zone.is_active }),
      })

      if (!res.ok) throw new Error('Failed to toggle')

      setZones((prev) =>
        prev.map((z) => (z.id === zone.id ? { ...z, is_active: !zone.is_active } : z))
      )
      toast.success(zone.is_active ? 'Zone disabled' : 'Zone enabled')
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Failed to toggle zone')
    }
  }

  // Delete zone
  const handleDeleteZone = async () => {
    if (!deleteZoneConfirm) return

    try {
      const res = await fetch(`/api/admin/shop/zones/${deleteZoneConfirm.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete zone')
      }

      const data = await res.json()
      if (data.archived) {
        toast.success('Zone archived (has past orders)')
      } else {
        toast.success('Zone deleted')
      }

      setDeleteZoneConfirm(null)
      loadData()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete zone')
    }
  }

  // Move zone up/down
  const handleMoveZone = async (zone: ShopDeliveryZone, direction: 'up' | 'down') => {
    const currentIdx = zones.findIndex((z) => z.id === zone.id)
    if (currentIdx === -1) return

    const newIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    if (newIdx < 0 || newIdx >= zones.length) return

    const newZones = [...zones]
    ;[newZones[currentIdx], newZones[newIdx]] = [newZones[newIdx], newZones[currentIdx]]
    setZones(newZones)

    try {
      const res = await fetch('/api/admin/shop/zones/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneIds: newZones.map((z) => z.id) }),
      })

      if (!res.ok) throw new Error('Failed to reorder')
    } catch (error) {
      console.error('Reorder error:', error)
      toast.error('Failed to reorder zones')
      loadData() // Revert
    }
  }

  // Open area picker for a zone
  const openAreaPicker = (zone: ShopDeliveryZone) => {
    setAreaPickerZone(zone)
    setAreaSearch('')
    setIsAreaPickerOpen(true)
  }

  // Assign area to zone
  const handleAssignArea = async (area: ShopDeliveryArea, zoneId: string | null) => {
    // If area is in another zone, show confirmation
    if (area.zone_id && area.zone_id !== zoneId && zoneId) {
      const fromZone = zones.find((z) => z.id === area.zone_id)
      const toZone = zones.find((z) => z.id === zoneId)
      if (fromZone && toZone) {
        setMoveAreaConfirm({ area, fromZone, toZone })
        return
      }
    }

    await doAssignArea(area.id, zoneId)
  }

  const doAssignArea = async (areaId: string, zoneId: string | null) => {
    try {
      const res = await fetch(`/api/admin/shop/areas/${areaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: zoneId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to assign area')
      }

      // Update local state
      setAreas((prev) =>
        prev.map((a) => (a.id === areaId ? { ...a, zone_id: zoneId } : a))
      )
      toast.success('Area updated')
    } catch (error) {
      console.error('Assign error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to assign area')
    }
  }

  // Remove area from zone
  const handleRemoveArea = async (area: ShopDeliveryArea) => {
    await doAssignArea(area.id, null)
  }

  // Create custom area
  const handleCreateCustomArea = async () => {
    if (!customAreaName.trim()) {
      toast.error('Area name is required')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/shop/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customAreaName.trim(),
          zone_id: customAreaZoneId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create area')
      }

      const data = await res.json()
      setAreas((prev) => [...prev, data.area])
      toast.success('Area created!')
      setIsCustomAreaDialogOpen(false)
      setCustomAreaName('')
      setCustomAreaZoneId(null)
    } catch (error) {
      console.error('Create error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create area')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete custom area
  const handleDeleteArea = async (area: ShopDeliveryArea) => {
    if (!area.is_custom) {
      toast.error('Cannot delete standard LGAs')
      return
    }

    try {
      const res = await fetch(`/api/admin/shop/areas/${area.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete area')
      }

      setAreas((prev) => prev.filter((a) => a.id !== area.id))
      toast.success('Area deleted')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete area')
    }
  }

  // Filtered areas for picker
  const filteredAreas = useMemo(() => {
    if (!areaSearch.trim()) return areas
    const search = areaSearch.toLowerCase()
    return areas.filter((a) => a.name.toLowerCase().includes(search))
  }, [areas, areaSearch])

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Zones</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage Lagos delivery zones, fees, and areas
          </p>
        </div>
        <Button
          onClick={() => openZoneDialog()}
          className="bg-purple-500 hover:bg-purple-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Zone
        </Button>
      </div>

      {/* Unassigned Areas Warning */}
      {!isLoading && unassignedAreas.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">
            Unassigned Areas ({unassignedAreas.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unassignedAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => setQuickAssignArea(area)}
                className="px-3 py-1.5 bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 rounded-full text-sm hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
              >
                {area.name}
                {area.is_custom && (
                  <span className="ml-1 text-xs opacity-60">(custom)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : zones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No delivery zones yet</p>
            <Button
              onClick={() => openZoneDialog()}
              className="mt-4 bg-purple-500 hover:bg-purple-600"
            >
              Create First Zone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {zones.map((zone, idx) => (
            <Card
              key={zone.id}
              className={!zone.is_active ? 'opacity-60' : ''}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Zone Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-purple-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {zone.name}
                      </h3>
                      {!zone.is_active && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span className="font-medium text-gray-900 dark:text-white text-lg">
                        ₦{zone.fee_naira.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDeliveryTime(zone.min_days, zone.max_days)}
                      </span>
                    </div>

                    {/* Areas */}
                    <div className="flex flex-wrap gap-2">
                      {(areasByZone[zone.id] || []).map((area) => (
                        <span
                          key={area.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300"
                        >
                          {area.name}
                          {area.is_custom && (
                            <span className="text-xs text-purple-500">*</span>
                          )}
                          <button
                            onClick={() => handleRemoveArea(area)}
                            className="ml-0.5 hover:text-red-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => openAreaPicker(zone)}
                        className="px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-500 hover:border-purple-400 hover:text-purple-500 transition-colors"
                      >
                        + Add area
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveZone(zone, 'up')}
                        disabled={idx === 0}
                        className="h-8 w-8"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveZone(zone, 'down')}
                        disabled={idx === zones.length - 1}
                        className="h-8 w-8"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={zone.is_active}
                        onCheckedChange={() => handleToggleActive(zone)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openZoneDialog(zone)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteZoneConfirm(zone)}
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Zone Dialog (Create/Edit) */}
      <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Zone' : 'Add Zone'}</DialogTitle>
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
                placeholder="3000"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Days</Label>
                <Input
                  type="number"
                  min="0"
                  value={formMinDays}
                  onChange={(e) => setFormMinDays(e.target.value)}
                  placeholder="1"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label>Max Days</Label>
                <Input
                  type="number"
                  min="0"
                  value={formMaxDays}
                  onChange={(e) => setFormMaxDays(e.target.value)}
                  placeholder="3"
                  disabled={isSaving}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Preview: {formatDeliveryTime(parseInt(formMinDays) || 0, parseInt(formMaxDays) || 0)}
            </p>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                disabled={isSaving}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsZoneDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                onClick={handleSaveZone}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : editingZone ? (
                  'Save Changes'
                ) : (
                  'Create Zone'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Area Picker Dialog */}
      <Dialog open={isAreaPickerOpen} onOpenChange={setIsAreaPickerOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Area to {areaPickerZone?.name}</DialogTitle>
            <DialogDescription>
              Select areas to add to this zone
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={areaSearch}
              onChange={(e) => setAreaSearch(e.target.value)}
              placeholder="Search areas..."
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-1 min-h-0 max-h-64">
            {filteredAreas.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No areas found</p>
            ) : (
              <>
                {/* Unassigned areas first */}
                {filteredAreas
                  .filter((a) => !a.zone_id)
                  .map((area) => (
                    <button
                      key={area.id}
                      onClick={() => {
                        handleAssignArea(area, areaPickerZone?.id || null)
                        setIsAreaPickerOpen(false)
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                    >
                      <span>
                        {area.name}
                        {area.is_custom && (
                          <span className="ml-1 text-xs text-purple-500">(custom)</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">Unassigned</span>
                    </button>
                  ))}

                {/* Areas in other zones */}
                {filteredAreas
                  .filter((a) => a.zone_id && a.zone_id !== areaPickerZone?.id)
                  .map((area) => {
                    const currentZone = zones.find((z) => z.id === area.zone_id)
                    return (
                      <button
                        key={area.id}
                        onClick={() => handleAssignArea(area, areaPickerZone?.id || null)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                      >
                        <span>
                          {area.name}
                          {area.is_custom && (
                            <span className="ml-1 text-xs text-purple-500">(custom)</span>
                          )}
                        </span>
                        <span className="text-xs text-amber-600">
                          In {currentZone?.name}
                        </span>
                      </button>
                    )
                  })}
              </>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setCustomAreaZoneId(areaPickerZone?.id || null)
                setIsAreaPickerOpen(false)
                setIsCustomAreaDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Area
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Assign Dialog */}
      <Dialog open={!!quickAssignArea} onOpenChange={() => setQuickAssignArea(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign {quickAssignArea?.name}</DialogTitle>
            <DialogDescription>
              Select a zone for this area
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={async () => {
                  if (quickAssignArea) {
                    await doAssignArea(quickAssignArea.id, zone.id)
                    setQuickAssignArea(null)
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <span className="font-medium">{zone.name}</span>
                <span className="text-sm text-gray-500">
                  ₦{zone.fee_naira.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Area Dialog */}
      <Dialog open={isCustomAreaDialogOpen} onOpenChange={setIsCustomAreaDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Custom Area</DialogTitle>
            <DialogDescription>
              Add a neighbourhood or subdivision (e.g., Ajah, Sangotedo)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Area Name</Label>
              <Input
                value={customAreaName}
                onChange={(e) => setCustomAreaName(e.target.value)}
                placeholder="e.g. Ajah"
                disabled={isSaving}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsCustomAreaDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                onClick={handleCreateCustomArea}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Area'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Area Confirmation */}
      <AlertDialog
        open={!!moveAreaConfirm}
        onOpenChange={() => setMoveAreaConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Area?</AlertDialogTitle>
            <AlertDialogDescription>
              Move <strong>{moveAreaConfirm?.area.name}</strong> from{' '}
              <strong>{moveAreaConfirm?.fromZone.name}</strong> to{' '}
              <strong>{moveAreaConfirm?.toZone.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (moveAreaConfirm) {
                  await doAssignArea(moveAreaConfirm.area.id, moveAreaConfirm.toZone.id)
                  setMoveAreaConfirm(null)
                  setIsAreaPickerOpen(false)
                }
              }}
              className="bg-purple-500 hover:bg-purple-600"
            >
              Move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Zone Confirmation */}
      <AlertDialog
        open={!!deleteZoneConfirm}
        onOpenChange={() => setDeleteZoneConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteZoneConfirm?.name}</strong>? All areas in this zone will become unassigned.
              {' '}If this zone has past orders, it will be archived instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteZone}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
