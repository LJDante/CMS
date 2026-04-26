import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { DentalRecord, Patient } from '../types'
import toast from 'react-hot-toast'

export function useDentalRepository() {
  const [records, setRecords] = useState<DentalRecord[]>([])
  const [loading, setLoading] = useState(false)

  const loadRecords = async (patientId: string) => {
    if (!patientId) {
      setRecords([])
      return
    }

    try {
      setLoading(true)
      console.log('Loading dental records for patient:', patientId)

      const { data, error } = await supabase
        .from('dental_repository')
        .select('*')
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error('Error loading dental records:', error)
        if (error.code === 'PGRST116') {
          // Table doesn't exist yet
          toast.error('Dental repository table not yet created. Please run the migration.')
        } else {
          toast.error('Failed to load dental records')
        }
        setRecords([])
        return
      }

      setRecords((data ?? []) as DentalRecord[])
    } catch (error) {
      console.error('Failed to load dental records:', error)
      toast.error('Failed to load dental records')
    } finally {
      setLoading(false)
    }
  }

  const uploadRecord = async (
    patientId: string,
    file: File,
    formType: 'dental_health_record' | 'dental_health_referral',
    uploadedBy: string
  ) => {
    try {
      setLoading(true)
      console.log('Uploading dental record:', { patientId, fileName: file.name, formType })

      // Upload file to Supabase Storage
      const fileName = `${patientId}/${Date.now()}-${file.name}`
      const { data: storageData, error: storageError } = await supabase.storage
        .from('dental-files')
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
        .from('dental-files')
        .getPublicUrl(fileName)

      const fileUrl = urlData.publicUrl

      // Insert record into database
      const { data: recordData, error: recordError } = await supabase
        .from('dental_repository')
        .insert({
          patient_id: patientId,
          form_type: formType,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: uploadedBy
        })
        .select()
        .single()

      if (recordError) {
        console.error('Database insert error:', recordError)
        throw recordError
      }

      console.log('Record inserted successfully:', recordData)

      setRecords(prev => [recordData as DentalRecord, ...prev])
      toast.success('Dental record uploaded successfully')
      return recordData
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload dental record')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteRecord = async (recordId: string) => {
    try {
      console.log('Deleting dental record:', recordId)

      // Get the record first to get the file path
      const record = records.find(r => r.id === recordId)
      if (!record) {
        throw new Error('Record not found')
      }

      // Extract file path from URL
      const filePathMatch = record.file_url.match(/dental-files\/(.+)/)
      if (!filePathMatch) {
        throw new Error('Invalid file URL')
      }

      const filePath = filePathMatch[1]

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('dental-files')
        .remove([filePath])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Continue anyway, delete from database
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('dental_repository')
        .delete()
        .eq('id', recordId)

      if (dbError) {
        console.error('Database delete error:', dbError)
        throw dbError
      }

      setRecords(prev => prev.filter(r => r.id !== recordId))
      toast.success('Dental record deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete dental record')
      throw error
    }
  }

  return {
    records,
    loading,
    loadRecords,
    uploadRecord,
    deleteRecord
  }
}
