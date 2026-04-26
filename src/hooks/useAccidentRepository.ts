import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { AccidentReport } from '../types'
import toast from 'react-hot-toast'

export function useAccidentRepository() {
  const [records, setRecords] = useState<AccidentReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecords = useCallback(async (patientId: string) => {
    setLoading(true)
    setError(null)
    try {
      console.log('Loading accident reports for patient:', patientId)
      const { data, error: err } = await supabase
        .from('accident_report_repository')
        .select('*')
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false })

      if (err) {
        console.error('Error loading accident reports:', err)
        if (err.code === 'PGRST116') {
          toast.error('Accident report table not yet created. Please run the migration.')
        } else {
          toast.error('Failed to load accident reports')
        }
        setRecords([])
        return []
      }
      console.log('Loaded accident reports:', data)
      if (data && data.length > 0) {
        console.log('First report file_url:', data[0].file_url)
      }
      setRecords((data ?? []) as AccidentReport[])
      return (data ?? []) as AccidentReport[]
    } catch (err) {
      console.error('Failed to load accident reports:', err)
      toast.error('Failed to load accident reports')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadRecord = async (
    patientId: string,
    file: File,
    uploadedBy: string
  ): Promise<AccidentReport | null> => {
    try {
      setLoading(true)
      console.log('Uploading accident report:', { patientId, fileName: file.name })

      // Validate file
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed')
        return null
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB')
        return null
      }

      // Generate unique file path - don't include bucket name in path
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name}`

      // Upload to storage
      console.log('Uploading to storage with path:', fileName)
      const { data: storageData, error: storageError } = await supabase.storage
        .from('accident-reports')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (storageError) {
        console.error('Storage upload error:', storageError)
        throw storageError
      }

      console.log('File uploaded to storage:', storageData)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('accident-reports')
        .getPublicUrl(fileName)

      const fileUrl = urlData.publicUrl
      console.log('Generated public URL:', fileUrl)

      // Insert record into database
      console.log('Inserting record with data:', { patient_id: patientId, uploaded_by: uploadedBy, file_url: fileUrl })
      const { data: recordData, error: recordError } = await supabase
        .from('accident_report_repository')
        .insert({
          patient_id: patientId,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: uploadedBy
        })
        .select()
        .single()

      if (recordError) {
        console.error('Database insert error details:', {
          message: recordError.message,
          code: recordError.code,
          hint: recordError.hint,
        })
        throw recordError
      }

      console.log('Record inserted successfully:', recordData)
      setRecords((prev) => [recordData as AccidentReport, ...prev])
      toast.success('Accident report uploaded successfully')
      return (recordData ?? null) as AccidentReport | null
    } catch (err) {
      console.error('Upload error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to upload accident report')
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteRecord = async (recordId: string): Promise<boolean> => {
    try {
      console.log('Deleting accident report:', recordId)
      
      const record = records.find((r) => r.id === recordId)
      if (!record) {
        throw new Error('Record not found')
      }

      // Extract file path from URL
      const match = record.file_url.match(/accident-reports\/(.+)/)
      if (!match) {
        throw new Error('Invalid file URL')
      }

      const filePath = match[1]

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('accident-reports')
        .remove([filePath])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }

      // Delete from database
      const { error: recordError } = await supabase
        .from('accident_report_repository')
        .delete()
        .eq('id', recordId)

      if (recordError) {
        console.error('Database delete error:', recordError)
        throw recordError
      }

      setRecords((prev) => prev.filter((r) => r.id !== recordId))
      toast.success('Accident report deleted successfully')
      return true
    } catch (err) {
      console.error('Delete error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete accident report')
      return false
    }
  }

  return {
    records,
    loading,
    error,
    loadRecords,
    uploadRecord,
    deleteRecord
  }
}

