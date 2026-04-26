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
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          patient_id: patientId,
          ...formData
        })
        .select()
        .single()

      if (error) throw error

      setConsultations(prev => [data as Consultation, ...prev])
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

      setConsultations(prev =>
        prev.map(consultation =>
          consultation.id === id ? { ...consultation, ...updates } : consultation
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

  return {
    consultations,
    loading,
    loadConsultations,
    addConsultation,
    updateConsultation,
    deleteConsultation
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