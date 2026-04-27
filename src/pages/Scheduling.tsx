import { useState, useEffect } from 'react'

import toast from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import { StaffScheduleWithProfile } from '../types'
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { getDisplayName } from '../utils/nameFormatter'

const truncateStaffName = (name: string, maxLength = 24): string => {
  if (name.length <= maxLength) return name

  const parts = name.trim().split(/\s+/)
  if (parts.length <= 2) {
    return `${name.slice(0, maxLength - 3)}...`
  }

  const first = parts[0]
  const last = parts[parts.length - 1]
  const condensed = `${first} ${last}`

  if (condensed.length + 3 <= maxLength) {
    return `${condensed}...`
  }

  return `${name.slice(0, maxLength - 3)}...`
}

const formatRole = (role: string | undefined) => {
  if (!role) return 'Staff'
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface FormData {
  staff_id: string
  schedule_date: string
  start_time: string
  end_time: string
  is_available: boolean
  notes: string
  repeat_weekly: boolean
  repeat_weeks: number
  is_recurring: boolean
  recurring_days: string[] // ['Monday', 'Tuesday', etc.]
}

export default function Scheduling() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<StaffScheduleWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [staffList, setStaffList] = useState<{ id: string; full_name: string; role?: string }[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<StaffScheduleWithProfile[]>([])
  const [selectedDayDate, setSelectedDayDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table')
  const [formData, setFormData] = useState<FormData>({
    staff_id: '',
    schedule_date: '',
    start_time: '',
    end_time: '',
    is_available: true,
    notes: '',
    repeat_weekly: false,
    repeat_weeks: 4,
    is_recurring: false,
    recurring_days: [],
  })

  useEffect(() => {
    fetchStaffAndSchedules()
  }, [currentDate, selectedStaff])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  async function fetchStaffAndSchedules() {
    try {
      setLoading(true)

      // Load all non-patient staff
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .not('role', 'eq', 'patient')
        .order('full_name')

      if (staffError) throw staffError
      setStaffList(staffData || [])

      // Create a map of all staff for quick lookup
      const staffMap = new Map((staffData || []).map(p => [p.id, p]))

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      const daysInMonth = getDaysInMonth(currentDate)

      // Fetch schedules WITH staff profile data via join
      let schedulesQuery = supabase
        .from('staff_schedules')
        .select(`
          id,
          staff_id,
          schedule_date,
          start_time,
          end_time,
          is_available,
          notes,
          created_at,
          updated_at,
          staff:profiles!staff_id (
            id,
            full_name,
            role
          )
        `)
        .gte('schedule_date', startOfMonth.toISOString().split('T')[0])
        .lte('schedule_date', endOfMonth.toISOString().split('T')[0])

      if (selectedStaff) {
        schedulesQuery = schedulesQuery.eq('staff_id', selectedStaff)
      }

      const { data: schedulesData, error: schedulesError } = await schedulesQuery
        .order('schedule_date')
        .order('start_time')

      if (schedulesError) {
        console.error('Error fetching schedules:', schedulesError)
        throw schedulesError
      }

      if (schedulesData && schedulesData.length > 0) {
        // nothing to log
      }

      // Fetch recurring schedules
      let recurringQuery = supabase
        .from('recurring_schedules')
        .select(`
          id,
          staff_id,
          start_time,
          end_time,
          days_of_week,
          is_available,
          notes,
          is_active,
          staff:profiles!staff_id (
            id,
            full_name,
            role
          )
        `)
        .eq('is_active', true)

      if (selectedStaff) {
        recurringQuery = recurringQuery.eq('staff_id', selectedStaff)
      }

      const { data: recurringData, error: recurringError } = await recurringQuery

      if (recurringError) {
        console.error('Error fetching recurring schedules:', recurringError)
        throw recurringError
      }

      // Generate schedule instances from recurring schedules for current month
      const generatedSchedules: any[] = []
      const dayMap: Record<string, number> = {
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
        'Friday': 5, 'Saturday': 6, 'Sunday': 0
      }

      if (recurringData && recurringData.length > 0) {
        for (const recurring of recurringData) {
          // For each day in current month
          for (let day = 1; day <= daysInMonth; day++) {
            const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][checkDate.getDay()]

            // If this day is in the recurring days, add a schedule instance
            if (recurring.days_of_week.includes(dayName)) {
              generatedSchedules.push({
                id: `recurring_${recurring.id}_${day}`,
                staff_id: recurring.staff_id,
                schedule_date: checkDate.toISOString().split('T')[0],
                start_time: recurring.start_time,
                end_time: recurring.end_time,
                is_available: recurring.is_available,
                notes: recurring.notes,
                staff: recurring.staff,
                is_recurring: true,
              })
            }
          }
        }
      }

      // Fallback: if join didn't work, manually fetch missing profiles
      let scheduleDataWithStaff = (schedulesData || []).concat(generatedSchedules)
      const missingProfileIds = scheduleDataWithStaff
        .filter(s => !s.staff)
        .map(s => s.staff_id)

      if (missingProfileIds.length > 0) {
        const { data: missingProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', missingProfileIds)

        const profileMap = new Map((missingProfiles || []).map(p => [p.id, p]))

        scheduleDataWithStaff = scheduleDataWithStaff.map(schedule => ({
          ...schedule,
          staff: schedule.staff || profileMap.get(schedule.staff_id)
        }))
      }

      // Transform the data - staff is already joined
      const transformedData = (scheduleDataWithStaff || []).map((schedule: any) => {
        const staff = schedule.staff
        if (!staff) {
          // schedule data missing profile information
        }
        return {
          ...schedule,
          staff: staff || {
            id: schedule.staff_id,
            full_name: 'Deleted Staff Member',
            role: 'staff'
          },
        }
      })

      setSchedules(transformedData)
    } catch (error) {
      console.error('Error fetching schedules:', error)
      toast.error('Failed to load schedules')
      setError('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedules = fetchStaffAndSchedules

  function getDaysInMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  function getFirstDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  function formatTime(time24: string) {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  function formatTimeRange(startTime: string, endTime: string) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`
  }

  function formatDate(date: Date) {
    return date.toISOString().split('T')[0]
  }

  function getAvailableDaysByStaff() {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const grouped = new Map<string, { staff: StaffScheduleWithProfile['staff']; days: Set<string> }>()

    schedules
      .filter((schedule) => schedule.is_available)
      .forEach((schedule) => {
        const staffId = schedule.staff_id
        if (!grouped.has(staffId)) {
          grouped.set(staffId, { staff: schedule.staff, days: new Set() })
        }

        const group = grouped.get(staffId)!
        const date = new Date(schedule.schedule_date + 'T00:00:00')
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
        group.days.add(dayName)
      })

    return Array.from(grouped.values())
      .map((group) => ({
        staff: group.staff,
        days: Array.from(group.days).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)),
      }))
      .sort((a, b) => (a.staff?.full_name || 'Unknown').localeCompare(b.staff?.full_name || 'Unknown'))
  }

  function getSchedulesForDate(dateStr: string) {
    return schedules.filter(schedule => schedule.schedule_date === dateStr)
  }

  function openAddModal(dateStr = '') {
    setEditingId(null)
    setSelectedDaySchedules([])
    setSelectedDayDate('')
    setFormData({
      staff_id: '',
      schedule_date: dateStr,
      start_time: '',
      end_time: '',
      is_available: true,
      notes: '',
      repeat_weekly: false,
      repeat_weeks: 4,
      is_recurring: false,
      recurring_days: [],
    })
    setShowModal(true)
  }

  function closeDayDetails() {
    setSelectedDaySchedules([])
    setSelectedDayDate('')
  }

  function openEditModal(schedule: StaffScheduleWithProfile) {
    setEditingId(schedule.id)
    setFormData({
      staff_id: schedule.staff_id,
      schedule_date: schedule.schedule_date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      is_available: schedule.is_available,
      notes: schedule.notes || '',
      repeat_weekly: false,
      repeat_weeks: 4,
      is_recurring: false,
      recurring_days: [],
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setFormData({
      staff_id: '',
      schedule_date: '',
      start_time: '',
      end_time: '',
      is_available: true,
      notes: '',
      repeat_weekly: false,
      repeat_weeks: 4,
      is_recurring: false,
      recurring_days: [],
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.staff_id || !formData.start_time || !formData.end_time) {
      setError('Please fill in all required fields')
      return
    }

    if (formData.start_time >= formData.end_time) {
      setError('End time must be after start time')
      return
    }

    if (!formData.is_recurring && !formData.schedule_date) {
      setError('Please select a date for the schedule')
      return
    }

    if (formData.is_recurring && formData.recurring_days.length === 0) {
      setError('Please select at least one day of the week')
      return
    }

    try {
      setSubmitting(true)

      if (editingId) {
        const { error: updateError } = await supabase
          .from('staff_schedules')
          .update({
            staff_id: formData.staff_id,
            schedule_date: formData.schedule_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            is_available: formData.is_available,
            notes: formData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        if (updateError) throw updateError
        setSuccess('Schedule updated successfully')
      } else if (formData.is_recurring) {
        // Create recurring schedule
        const { data: recurringData, error: recurringError } = await supabase
          .from('recurring_schedules')
          .insert({
            staff_id: formData.staff_id,
            start_time: formData.start_time,
            end_time: formData.end_time,
            days_of_week: formData.recurring_days,
            is_available: formData.is_available,
            notes: formData.notes || null,
          })
          .select()

        if (recurringError) throw recurringError

        // Generate schedules for next 12 weeks
        const scheduleData = []
        const dayMap: Record<string, number> = {
          'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
          'Friday': 5, 'Saturday': 6, 'Sunday': 0
        }

        const baseDate = new Date()
        for (let week = 0; week < 12; week++) {
          for (const dayName of formData.recurring_days) {
            const targetDayNum = dayMap[dayName]
            const currentDayNum = baseDate.getDay()
            const daysAhead = (targetDayNum - currentDayNum + 7) % 7
            const scheduleDate = new Date(baseDate)
            scheduleDate.setDate(scheduleDate.getDate() + daysAhead + week * 7)

            scheduleData.push({
              staff_id: formData.staff_id,
              schedule_date: scheduleDate.toISOString().split('T')[0],
              start_time: formData.start_time,
              end_time: formData.end_time,
              is_available: formData.is_available,
              notes: formData.notes || null,
            })
          }
        }

        const { error: schedulesError } = await supabase
          .from('staff_schedules')
          .insert(scheduleData)

        if (schedulesError) throw schedulesError
        setSuccess(`Recurring schedule created for ${formData.recurring_days.length} day(s) per week for 12 weeks`)
      } else {
        // Create single schedule or repeated weekly
        const scheduleData = []
        const baseDate = new Date(formData.schedule_date)

        if (formData.repeat_weekly) {
          for (let i = 0; i < formData.repeat_weeks; i++) {
            const scheduleDate = new Date(baseDate)
            scheduleDate.setDate(scheduleDate.getDate() + i * 7)

            scheduleData.push({
              staff_id: formData.staff_id,
              schedule_date: scheduleDate.toISOString().split('T')[0],
              start_time: formData.start_time,
              end_time: formData.end_time,
              is_available: formData.is_available,
              notes: formData.notes || null,
            })
          }
        } else {
          scheduleData.push({
            staff_id: formData.staff_id,
            schedule_date: formData.schedule_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            is_available: formData.is_available,
            notes: formData.notes || null,
          })
        }

        const { error: insertError } = await supabase
          .from('staff_schedules')
          .insert(scheduleData)

        if (insertError) throw insertError
        setSuccess(
          formData.repeat_weekly
            ? `Created ${formData.repeat_weeks} weekly schedules`
            : 'Schedule created successfully'
        )
      }

      closeModal()
      fetchStaffAndSchedules()
    } catch (error) {
      console.error('Error saving schedule:', error)
      setError(error instanceof Error ? error.message : 'Failed to save schedule')
    } finally {
      setSubmitting(false)
    }
  }

const handleDeleteSchedule = async (scheduleId: string) => {
  try {
    if (scheduleId.startsWith('recurring_')) {
      const match = scheduleId.match(/^recurring_([0-9a-fA-F-]{36})_\d+$/)
      if (!match) {
        throw new Error('Invalid recurring schedule id')
      }
      const cleanId = match[1]
      const { error } = await supabase
        .from('recurring_schedules')
        .delete()
        .eq('id', cleanId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('staff_schedules')
        .delete()
        .eq('id', scheduleId)
      if (error) throw error
    }
    toast.success('Schedule deleted successfully')
    setSelectedDaySchedules(prev => prev.filter(s => s.id !== scheduleId))
    fetchSchedules()
  } catch (error) {
    console.error('Error deleting schedule:', error)
    toast.error('Failed to delete schedule')
  }
}

  async function handleDeleteAll() {
    const confirmed = window.confirm('Are you sure you want to delete ALL schedules? This action cannot be undone.')
    if (!confirmed) return

    try {
      setSubmitting(true)

      let deleteQuery = supabase
        .from('staff_schedules')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (selectedStaff) {
        deleteQuery = deleteQuery.eq('staff_id', selectedStaff)
      }

      const { error } = await deleteQuery
      if (error) throw error

      let recurringDeleteQuery = supabase
        .from('recurring_schedules')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (selectedStaff) {
        recurringDeleteQuery = recurringDeleteQuery.eq('staff_id', selectedStaff)
      }

      const { error: recurringError } = await recurringDeleteQuery
      if (recurringError) throw recurringError

      setSuccess('All schedules deleted successfully')
      fetchStaffAndSchedules()
    } catch (error) {
      console.error('Error deleting schedules:', error)
      setError('Failed to delete schedules')
    } finally {
      setSubmitting(false)
    }
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  const monthName = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Staff Schedules</h1>
          <p className="mt-1 text-slate-600">View and manage doctor and staff availability</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-slate-200 p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                viewMode === 'table'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-gray-50'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                viewMode === 'calendar'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-gray-50'
              }`}
            >
              Calendar View
            </button>
          </div>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            <Plus className="h-5 w-5" />
            Add Schedule
          </button>
          {schedules.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-5 w-5" />
              {submitting ? 'Deleting...' : 'Delete All'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <Check className="h-5 w-5 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="rounded-lg border border-slate-200 p-2 hover:bg-gray-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-40 text-center font-semibold text-slate-900">{monthName}</div>
          <button
            onClick={handleNextMonth}
            className="rounded-lg border border-slate-200 p-2 hover:bg-gray-50"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={handleToday}
            className="ml-2 rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
          >
            Today
          </button>
        </div>

        <div>
          <select
            value={selectedStaff || ''}
            onChange={(e) => setSelectedStaff(e.target.value || null)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Staff</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {getDisplayName(staff.full_name, staff.role)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-12">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading schedules...</span>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="mb-4">
              <div className="grid grid-cols-7 gap-2 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-2 text-sm font-semibold text-slate-600">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {emptyDays.map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square rounded-lg bg-gray-50 p-2" />
                ))}

                {days.map((day) => {
                  const dateStr = formatDate(
                    new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                  )
                  const daySchedules = getSchedulesForDate(dateStr)
                  const isToday = dateStr === formatDate(new Date())

                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-lg border-2 p-2 cursor-pointer transition hover:shadow-md ${
                        isToday
                          ? 'border-primary-400 bg-primary-50'
                          : daySchedules.length > 0
                            ? 'border-green-200 bg-green-50'
                            : 'border-slate-200 bg-white'
                      }`}
                      onClick={() => {
                        if (daySchedules.length > 0) {
                          setSelectedDaySchedules(daySchedules)
                          setSelectedDayDate(dateStr)
                          setShowModal(false)
                          return
                        }

                        openAddModal(dateStr)
                      }}
                    >
                      <div className="text-sm font-semibold text-slate-900">{day}</div>
                      <div className="mt-1 space-y-1">
                        {daySchedules.slice(0, 2).map((schedule) => {
                          const displayName = getDisplayName(schedule.staff?.full_name, schedule.staff?.role) || 'Unknown Staff'
                          return (
                            <div
                              key={schedule.id}
                              className="overflow-hidden rounded bg-primary-100 px-1 py-0.5 text-xs text-primary-700"
                              title={`${displayName}: ${formatTimeRange(schedule.start_time, schedule.end_time)} ${schedule.is_available ? '(Available)' : '(Unavailable)'}`}
                            >
                              <div className="font-medium truncate">{truncateStaffName(displayName)}</div>
                              <div className="text-xs opacity-75">{formatTimeRange(schedule.start_time, schedule.end_time)}</div>
                            </div>
                          )
                        })}
                        {daySchedules.length > 2 && (
                          <div className="text-xs text-slate-500">+{daySchedules.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <div className="border-b border-slate-200 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-900">Staff Availability</h2>
            <select
              value={selectedStaff || ''}
              onChange={(e) => setSelectedStaff(e.target.value || null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">All Staff</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {getDisplayName(staff.full_name, staff.role)}
                </option>
              ))}
            </select>
          </div>

          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Available Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {getAvailableDaysByStaff().length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    No available schedules found for this period.
                  </td>
                </tr>
              ) : (
                getAvailableDaysByStaff().map((row) => (
                  <tr key={row.staff.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {getDisplayName(row.staff.full_name, row.staff.role)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                      {formatRole(row.staff.role)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {row.days.length > 0 ? row.days.join(', ') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedDaySchedules.length > 0 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Schedules on {selectedDayDate}</h3>
                <p className="text-sm text-slate-500">{selectedDaySchedules.length} schedule{selectedDaySchedules.length !== 1 ? 's' : ''} for this day</p>
              </div>
              <button
                onClick={closeDayDetails}
                className="rounded p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              {selectedDaySchedules.map((schedule) => (
                <div key={schedule.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{getDisplayName(schedule.staff?.full_name, schedule.staff?.role) || 'Unknown Staff'}</p>
                      <p className="text-sm text-slate-600">{formatTimeRange(schedule.start_time, schedule.end_time)} • {schedule.is_available ? 'Available' : 'Unavailable'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          openEditModal(schedule)
                          closeDayDetails()
                        }}
                        className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          closeDayDetails()
                          handleDeleteSchedule(schedule.id)
                        }}
                        className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {schedule.notes && (
                    <p className="mt-3 text-sm text-slate-700">Notes: {schedule.notes}</p>
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    closeDayDetails()
                    openAddModal(selectedDayDate)
                  }}
                  className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Add Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit Schedule' : 'Add Schedule'}
              </h3>
              <button
                onClick={closeModal}
                className="rounded p-2 hover:bg-slate-100"
                disabled={submitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Staff Member *</label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                  disabled={submitting}
                  size={Math.min(staffList.length + 1, 8)}
                >
                  <option value="">-- Select staff member --</option>
                  {staffList.length === 0 ? (
                    <option disabled>No staff members available</option>
                  ) : (
                    staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {getDisplayName(staff.full_name, staff.role)}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {staffList.length} staff member{staffList.length !== 1 ? 's' : ''} available
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Date *</label>
                <input
                  type="date"
                  value={formData.schedule_date}
                  onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Start Time *</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">End Time *</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="rounded border-slate-300"
                  disabled={submitting}
                />
                <label htmlFor="is_available" className="text-sm font-medium text-slate-700">
                  Available
                </label>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Schedule Recurrence</h3>

                {/* Recurring Schedule Toggle */}
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked, schedule_date: '' })}
                    className="rounded border-slate-300"
                    disabled={submitting}
                  />
                  <label htmlFor="is_recurring" className="text-sm font-medium text-slate-700">
                    Recurring Weekly Schedule (Repeats Every Week)
                  </label>
                </div>

                {formData.is_recurring ? (
                  // Recurring Schedule - Select Days
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Select Days of the Week *
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                        <div key={day} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`day_${day}`}
                            checked={formData.recurring_days.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, recurring_days: [...formData.recurring_days, day] })
                              } else {
                                setFormData({ ...formData, recurring_days: formData.recurring_days.filter(d => d !== day) })
                              }
                            }}
                            className="rounded border-slate-300"
                            disabled={submitting}
                          />
                          <label htmlFor={`day_${day}`} className="text-sm text-slate-700">
                            {day}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      This schedule will repeat every week on selected days for 12 weeks
                    </p>
                  </div>
                ) : (
                  // One-time or Limited Repeats
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Date *</label>
                    <input
                      type="date"
                      value={formData.schedule_date}
                      onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                      className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                      disabled={submitting}
                    />

                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="repeat_weekly"
                        checked={formData.repeat_weekly}
                        onChange={(e) => setFormData({ ...formData, repeat_weekly: e.target.checked })}
                        className="rounded border-slate-300"
                        disabled={submitting}
                      />
                      <label htmlFor="repeat_weekly" className="text-sm font-medium text-slate-700">
                        Repeat Weekly (Limited)
                      </label>
                    </div>

                    {formData.repeat_weekly && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Number of Weeks *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="52"
                          value={formData.repeat_weeks}
                          onChange={(e) => setFormData({ ...formData, repeat_weeks: parseInt(e.target.value) || 1 })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                          disabled={submitting}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Will create {formData.repeat_weeks} weekly schedule{formData.repeat_weeks !== 1 ? 's' : ''} starting from the selected date
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                  rows={3}
                  placeholder="Add any notes..."
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:bg-slate-400"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
