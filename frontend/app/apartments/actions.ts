'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function addToFavorites(apartmentId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!apartmentId) {
        return
    }

    const { error } = await supabase
        .from('favorites')
        .insert({
            user_id: user.id,
            apartment_id: apartmentId,
            unit_id: null,
        })

    if (error) {
        console.error('Error adding favorite:', error)
        throw error
    }

    revalidatePath('/apartments')
}

export async function removeFromFavorites(apartmentId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!apartmentId) {
        return
    }

    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('apartment_id', apartmentId)
        .is('unit_id', null)

    if (error) {
        console.error('Error removing favorite:', error)
        throw error
    }

    revalidatePath('/apartments')
}
