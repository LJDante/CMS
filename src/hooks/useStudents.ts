import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Student } from '../types'
import toast from 'react-hot-toast'

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      // try sorting by last_name (common case); fallback to unsorted if column is missing
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('last_name')
      if (error) {
        console.warn('Failed to load patients with ordering by last_name, retrying without order:', error)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('patients')
          .select('*')
        if (fallbackError) {
          console.error('Failed to load patients', fallbackError)
          toast.error('Failed to load patients')
          return
        }
        setStudents((fallbackData ?? []) as Student[])
        return
      }
      setStudents((data ?? []) as Student[])
    } catch (err) {
      console.error('Failed to load students:', err)
      toast.error('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const addStudent = (student: Student) => {
    setStudents(prev => [...prev, student])
  }

  return {
    students,
    loading,
    loadStudents,
    addStudent
  }
}