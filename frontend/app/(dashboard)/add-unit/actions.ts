'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type AddUnitFormState = {
  apartmentName: string
  roomType: string
  bedrooms: string
  bathrooms: string
  sqFt: string
  floor: string
  windows: string
  price: string
  utilities: string
  parking: string
}

function parseOptionalInt(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

function parseOptionalFloat(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}

export async function submitUnitSubmission(
  input: AddUnitFormState
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const apartment_name = input.apartmentName.trim()
  if (!apartment_name) {
    return { ok: false, error: 'Apartment name is required.' }
  }

  const { error } = await supabase.from('unit_submissions').insert({
    user_id: user.id,
    apartment_name,
    room_type: input.roomType.trim() || null,
    bedrooms: parseOptionalInt(input.bedrooms),
    bathrooms: parseOptionalFloat(input.bathrooms),
    sq_ft: parseOptionalInt(input.sqFt),
    floor: parseOptionalInt(input.floor),
    windows: input.windows.trim() || null,
    monthly_rent: parseOptionalInt(input.price),
    utilities_monthly: parseOptionalInt(input.utilities),
    parking_monthly: parseOptionalInt(input.parking),
  })

  if (error) {
    console.error('unit_submissions insert:', error)
    return {
      ok: false,
      error:
        error.message ??
        'Could not save. Run the unit_submissions migration in Supabase if this table is missing.',
    }
  }

  return { ok: true }
}
