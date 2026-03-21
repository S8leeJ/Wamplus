'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type ApartmentForCompare = {
  id: string
  name: string
  image_url: string | null
  address?: string | null
}

export async function getApartments(): Promise<ApartmentForCompare[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('apartments')
    .select('id, name, image_url, address')
    .order('name')

  if (error) {
    console.error('Error fetching apartments:', error)
    return []
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    image_url: r.image_url ?? null,
    address: r.address ?? null,
  }))
}

export type UnitWithApartment = {
  id: string
  apartment_id: string
  room_type: string
  layout_name: string | null
  bedrooms: number | null
  bathrooms: number | null
  sq_ft: number | null
  floor: number | null
  windows: string | null
  image_url: string | null
  monthly_rent: number | null
  apartment: { id: string; name: string }
}

export async function getUnitsByApartmentIds(
  apartmentIds: string[]
): Promise<UnitWithApartment[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (apartmentIds.length === 0) return []

  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, apartment_id, room_type, layout_name, bedrooms, bathrooms, sq_ft, floor, windows, image_url')
    .in('apartment_id', apartmentIds)
    .order('apartment_id')
    .order('room_type')

  if (unitsError) {
    console.error('Error fetching units:', unitsError)
    return []
  }

  const aptIds = [...new Set((units ?? []).map((u) => u.apartment_id))]
  const unitIds = (units ?? []).map((u) => u.id)
  if (aptIds.length === 0) return []

  const [
    { data: apartments, error: aptError },
    { data: prices, error: pricesError },
  ] = await Promise.all([
    supabase.from('apartments').select('id, name').in('id', aptIds),
    unitIds.length > 0
      ? supabase.from('prices').select('unit_id, monthly_rent').in('unit_id', unitIds)
      : { data: [], error: null },
  ])

  if (aptError) {
    console.error('Error fetching apartments:', aptError)
    return []
  }
  if (pricesError) {
    console.error('Error fetching prices:', pricesError)
  }

  const aptMap = new Map((apartments ?? []).map((a) => [a.id, a]))
  const priceMap = new Map<string, number>()
  for (const p of prices ?? []) {
    const rent = (p as { unit_id?: string; monthly_rent?: number }).monthly_rent
    if (p.unit_id && rent != null && !priceMap.has(p.unit_id)) {
      priceMap.set(p.unit_id, Number(rent))
    }
  }

  return (units ?? []).map((u) => ({
    ...u,
    monthly_rent: priceMap.get(u.id) ?? null,
    apartment: aptMap.get(u.apartment_id) ?? { id: u.apartment_id, name: 'Unknown' },
  }))
}

export type CompareItemWithDetails = {
  id: string
  apartment_id: string
  unit_id: string
  apartment: { id: string; name: string }
  unit: {
    id: string
    room_type: string
    layout_name: string | null
    bedrooms: number | null
    bathrooms: number | null
    sq_ft: number | null
    floor: number | null
    windows: string | null
    image_url: string | null
    monthly_rent: number | null
  }
}

export async function getCompareItems(): Promise<CompareItemWithDetails[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: items, error: itemsError } = await supabase
    .from('favorites')
    .select('id, apartment_id, unit_id')
    .eq('user_id', user.id)
    .not('unit_id', 'is', null)

  if (itemsError) {
    console.error('Error fetching compare items:', itemsError)
    return []
  }

  if (!items?.length) return []

  const unitIds = items.map((i) => i.unit_id).filter(Boolean) as string[]
  const aptIds = [...new Set(items.map((i) => i.apartment_id))]

  const [
    { data: units },
    { data: apartments },
    { data: prices, error: pricesError },
  ] = await Promise.all([
    supabase.from('units').select('id, apartment_id, room_type, layout_name, bedrooms, bathrooms, sq_ft, floor, windows, image_url').in('id', unitIds),
    supabase.from('apartments').select('id, name').in('id', aptIds),
    supabase.from('prices').select('unit_id, monthly_rent').in('unit_id', unitIds),
  ])

  if (pricesError) {
    console.error('Error fetching prices:', pricesError)
  }

  const unitMap = new Map((units ?? []).map((u) => [u.id, u]))
  const aptMap = new Map((apartments ?? []).map((a) => [a.id, a]))
  // Build price map: prefer prices.monthly_rent, fallback to units.price
  const priceMap = new Map<string, number>()
  for (const p of prices ?? []) {
    const rent = (p as { monthly_rent?: number }).monthly_rent
    if (p.unit_id && rent != null && !priceMap.has(p.unit_id)) {
      priceMap.set(p.unit_id, Number(rent))
    }
  }

  return items
    .filter((i) => i.unit_id && unitMap.has(i.unit_id) && aptMap.has(i.apartment_id))
    .map((i) => {
      const unit = unitMap.get(i.unit_id!)!
      return {
        id: i.id,
        apartment_id: i.apartment_id,
        unit_id: i.unit_id!,
        apartment: aptMap.get(i.apartment_id)!,
        unit: { ...unit, monthly_rent: priceMap.get(i.unit_id!) ?? null },
      }
    })
}

export async function addToCompare(
  apartmentId: string,
  unitId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('favorites').insert({
    user_id: user.id,
    apartment_id: apartmentId,
    unit_id: unitId,
  })

  if (error) {
    console.error('Error adding to compare:', error)
    return {
      ok: false,
      error: error.message ?? 'Failed to add unit. Ensure the unit_id migration is applied to favorites.',
    }
  }

  revalidatePath('/compare')
  revalidatePath('/apartments')
  return { ok: true }
}

export async function removeFromCompare(favoriteId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', favoriteId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error removing from compare:', error)
    throw error
  }

  revalidatePath('/compare')
  revalidatePath('/apartments')
}
