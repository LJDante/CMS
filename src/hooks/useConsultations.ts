import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Patient, Consultation, ConsultationNote } from '../types'
import type { ConsultationFormData, AttendanceDateRange } from '../types/consultations'
import toast from 'react-hot-toast'

// Hook for managing patients data
export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('enrollment_status', 'active')
        .order('last_name', { ascending: true })

      if (error) throw error
      setPatients((data ?? []) as Patient[])
    } catch (error) {
      toast.error('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = useMemo(() =>
    (searchTerm: string) => patients.filter((p) => {
      const term = searchTerm.toLowerCase()
      const fullName = `${p.last_name}, ${p.first_name}`.toLowerCase()
      return fullName.includes(term) || p.patient_id.toLowerCase().includes(term)
    }), [patients]
  )

  return {
    patients,
    loading,
    filteredPatients,
    refresh: loadPatients
  }
}

// Hook for managing consultations
export function useConsultations(patientId?: string) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)

  const loadConsultations = async (id: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', id)
        .order('consultation_date', { ascending: false })

      if (error) throw error
      setConsultations((data ?? []) as Consultation[])
    } catch (error) {
      toast.error('Failed to load consultations')
    } finally {
      setLoading(false)
    }
  }

  const addConsultation = async (patientId: string, formData: ConsultationFormData) => {
    try {
      const { patient_id: _ignoredPatientId, ...insertData } = formData
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          patient_id: patientId,
          ...insertData
        })
        .select()
        .single()

      if (error) throw error

      const newConsultation = {
        ...(data as Consultation),
        follow_up_date: (data as any)?.follow_up_date ?? undefined
      }

      setConsultations(prev => [newConsultation, ...prev])
      toast.success('Consultation added successfully')
      return data
    } catch (error) {
      toast.error('Failed to add consultation')
      throw error
    }
  }

  const updateConsultation = async (id: string, updates: Partial<ConsultationFormData>) => {
    try {
      const { error } = await supabase
        .from('consultations')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      const normalizeConsultation = (consultation: Consultation): Consultation => ({
        ...consultation,
        ...updates,
        follow_up_date: updates.follow_up_date === null ? undefined : updates.follow_up_date ?? consultation.follow_up_date,
        lmp: updates.lmp === null ? undefined : updates.lmp ?? consultation.lmp
      } as Consultation)

      setConsultations(prev =>
        prev.map(consultation =>
          consultation.id === id ? normalizeConsultation(consultation) : consultation
        )
      )
      toast.success('Consultation updated successfully')
    } catch (error) {
      toast.error('Failed to update consultation')
      throw error
    }
  }

  const deleteConsultation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('consultations')
        .delete()
        .eq('id', id)

      if (error) throw error

      setConsultations(prev => prev.filter(c => c.id !== id))
      toast.success('Consultation deleted successfully')
    } catch (error) {
      toast.error('Failed to delete consultation')
      throw error
    }
  }

  const uploadPrescription = async (consultationId: string, file: File): Promise<string[] | null> => {
    try {
      const path = `${consultationId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('prescriptions').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('prescription_images')
        .eq('id', consultationId)
        .single()
      if (consultationError) throw consultationError

      const updated = [...(consultation?.prescription_images ?? []), publicUrl]
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ prescription_images: updated })
        .eq('id', consultationId)
      if (updateError) throw updateError

      return updated
    } catch (err) {
      console.error('Upload prescription error:', err)
      return null
    }
  }

  const deletePrescription = async (consultationId: string, fileUrl: string): Promise<string[] | null> => {
    try {
      const match = fileUrl.match(/prescriptions\/(.+)$/)
      if (match) {
        await supabase.storage.from('prescriptions').remove([match[1]])
      }

      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('prescription_images')
        .eq('id', consultationId)
        .single()
      if (consultationError) throw consultationError

      const updated = (consultation?.prescription_images ?? []).filter((url: string) => url !== fileUrl)
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ prescription_images: updated })
        .eq('id', consultationId)
      if (updateError) throw updateError

      return updated
    } catch (err) {
      console.error('Delete prescription error:', err)
      return null
    }
  }

  return {
    consultations,
    loading,
    loadConsultations,
    addConsultation,
    updateConsultation,
    deleteConsultation,
    uploadPrescription,
    deletePrescription
  }
}

// Hook for managing consultation notes
export function useConsultationNotes() {
  const [notes, setNotes] = useState<ConsultationNote[]>([])
  const [loading, setLoading] = useState(false)

  const loadNotes = async (consultationId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('consultation_notes')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setNotes((data ?? []) as ConsultationNote[])
    } catch (error) {
      toast.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const addNote = async (consultationId: string, noteText: string) => {
    try {
      const { data, error } = await supabase
        .from('consultation_notes')
        .insert({
          consultation_id: consultationId,
          note: noteText
        })
        .select()
        .single()

      if (error) throw error

      setNotes(prev => [...prev, data as ConsultationNote])
      toast.success('Note added successfully')
    } catch (error) {
      toast.error('Failed to add note')
      throw error
    }
  }

  return {
    notes,
    loading,
    loadNotes,
    addNote
  }
}