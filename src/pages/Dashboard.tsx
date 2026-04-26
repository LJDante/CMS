import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import RegisterStaffAccount from './RegisterStaffAccount'
import type { ClinicVisit } from '../types'
import { format, addDays } from 'date-fns'

interface DashboardStats {
  todayVisits: number
  distinctStudents: number
  sentHome: number
  referred: number
}

interface RecentActivityItem {
  id: string
  type: 'visit' | 'consultation' | 'request'
  title: string
  date: string
  description: string
  path: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lowStockCount, setLowStockCount] = useState<number | null>(null)
  const [pendingRequests, setPendingRequests] = useState<number | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [patientNames, setPatientNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = `${today}T00:00:00`
      const end = `${format(addDays(new Date(today), 1), 'yyyy-MM-dd')}T00:00:00`

      const [visitResult, inventoryResult, pendingRequestsResult, recentVisitResult, recentRequestResult, recentConsultationResult, patientResult] = await Promise.allSettled([
        supabase
          .from('clinic_visits')
          .select('*')
          .gte('visit_date', start)
          .lt('visit_date', end),
        supabase
          .from('inventory')
          .select('id,quantity_on_hand,reorder_level'),
        supabase
          .from('supply_requests')
          .select('id')
          .eq('status', 'pending'),
        supabase
          .from('clinic_visits')
          .select('id,patient_id,visit_date,disposition,entrance_time')
          .order('entrance_time', { ascending: false, nullsFirst: false })
          .limit(4),
        supabase
          .from('supply_requests')
          .select('id,requested_at,status')
          .order('requested_at', { ascending: false })
          .limit(4),
        supabase
          .from('consultations')
          .select('id,patient_id,consultation_date,status')
          .order('consultation_date', { ascending: false })
          .limit(4),
        supabase
          .from('patients')
          .select('id,first_name,last_name')
      ])

      const visitData = visitResult.status === 'fulfilled' && !visitResult.value.error ? (visitResult.value.data as ClinicVisit[]) : []
      if (visitResult.status === 'rejected' || (visitResult.status === 'fulfilled' && visitResult.value.error)) {
        // eslint-disable-next-line no-console
        console.error('Clinic visits load failed', visitResult.status === 'rejected' ? visitResult.reason : visitResult.value.error)
      }

      const distinctStudents = new Set(visitData.map((v) => v.patient_id)).size
      const sentHome = visitData.filter((v) => v.disposition === 'sent_home').length
      const referred = visitData.filter((v) => v.disposition === 'referred').length
      setStats({
        todayVisits: visitData.length,
        distinctStudents,
        sentHome,
        referred
      })

      const inventoryData = inventoryResult.status === 'fulfilled' && !inventoryResult.value.error ? (inventoryResult.value.data as Array<{ id: string; quantity_on_hand: number; reorder_level: number | null }>) : []
      if (inventoryResult.status === 'rejected' || (inventoryResult.status === 'fulfilled' && inventoryResult.value.error)) {
        // eslint-disable-next-line no-console
        console.error('Inventory load failed', inventoryResult.status === 'rejected' ? inventoryResult.reason : inventoryResult.value.error)
      }
      setLowStockCount(
        inventoryData.filter((item) => item.reorder_level !== null && item.quantity_on_hand <= item.reorder_level).length
      )

      const pendingData = pendingRequestsResult.status === 'fulfilled' && !pendingRequestsResult.value.error ? pendingRequestsResult.value.data : []
      if (pendingRequestsResult.status === 'rejected' || (pendingRequestsResult.status === 'fulfilled' && pendingRequestsResult.value.error)) {
        // eslint-disable-next-line no-console
        console.error('Pending requests load failed', pendingRequestsResult.status === 'rejected' ? pendingRequestsResult.reason : pendingRequestsResult.value.error)
      }
      setPendingRequests((pendingData ?? []).length)

      const patientData = patientResult.status === 'fulfilled' && !patientResult.value.error ? (patientResult.value.data as Array<{ id: string; first_name: string; last_name: string }>) : []
      if (patientResult.status === 'rejected' || (patientResult.status === 'fulfilled' && patientResult.value.error)) {
        // eslint-disable-next-line no-console
        console.error('Patient names load failed', patientResult.status === 'rejected' ? patientResult.reason : patientResult.value.error)
      }
      const patientMap = Object.fromEntries(patientData.map((patient) => [patient.id, `${patient.last_name}, ${patient.first_name}`]))
      setPatientNames(patientMap)

      const visitsRecent = recentVisitResult.status === 'fulfilled' && !recentVisitResult.value.error ? (recentVisitResult.value.data as Array<{ id: string; patient_id: string; visit_date: string; disposition: string; entrance_time?: string }>) : []
      if (recentVisitResult.status === 'rejected' || (recentVisitResult.status === 'fulfilled' && recentVisitResult.value.error)) {
        // eslint-disable-next-line no-console
        console.error('Recent visits load failed', recentVisitResult.status === 'rejected' ? recentVisitResult.reason : recentVisitResult.value.error)
      }

      const requestsRecent = recentRequestResult.status === 'fulfilled' && !recentRequestResult.value.error ? (recentRequestResult.value.data as Array<{ id: string; requested_at: string; status: string }>) : []
      if (recentRequestResult.status === 'rejected' || (recentRequestResult.status === 'fulfilled' && recentRequestResult.value.error)) {
        // eslint-disable-next-line no-console
        console.error('Recent requests load failed', recentRequestResult.status === 'rejected' ? recentRequestResult.reason : recentRequestResult.value.error)
      }

      const consultationsRecent = recentConsultationResult.status === 'fulfilled' && !recentConsultationResult.value.error ? (recentConsultationResult.value.data as Array<{ id: string; patient_id: string; consultation_date: string; status: string }>) : []
      if (recentConsultationResult.status === 'rejected' || (recentConsultationResult.status === 'fulfilled' && recentConsultationResult.value.error)) {
        // eslint-disable-next-line no-console
        console.error('Recent consultations load failed', recentConsultationResult.status === 'rejected' ? recentConsultationResult.reason : recentConsultationResult.value.error)
      }

      const activityItems: RecentActivityItem[] = [
        ...visitsRecent.map((visit) => ({
          id: `visit-${visit.id}`,
          type: 'visit' as const,
          title: `${patientMap[visit.patient_id] || 'Patient'} visit`,
          date: visit.entrance_time || visit.visit_date,
          description: visit.disposition ? visit.disposition.replaceAll('_', ' ') : 'Clinic visit logged',
          path: '/visits'
        })),
        ...requestsRecent.map((request) => ({
          id: `request-${request.id}`,
          type: 'request' as const,
          title: `Supply request ${request.status}`,
          date: request.requested_at,
          description: request.status === 'pending' ? 'Awaiting approval' : `Status: ${request.status}`,
          path: '/requests'
        })),
        ...consultationsRecent.map((consultation) => ({
          id: `consultation-${consultation.id}`,
          type: 'consultation' as const,
          title: `${patientMap[consultation.patient_id] || 'Patient'} consultation`,
          date: consultation.consultation_date,
          description: consultation.status ? consultation.status.replaceAll('_', ' ') : 'Consultation recorded',
          path: '/consultations'
        }))
      ]

      setRecentActivity(
        activityItems
          .filter((item) => item.date)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)
      )
    }
    void load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  const formatActivityDate = (value: string) => {
    try {
      const parsed = new Date(value)
      return `${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    } catch {
      return value
    }
  }

  const { profile } = useAuth()

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clinic overview</h1>
          <p className="mt-1 text-slate-500">
            Snapshot of today&apos;s clinic activity. All data is stored securely in Supabase
            (PostgreSQL) and separate from the main school system.
          </p>
        </div>
        {profile?.role === 'clinic_admin' && (
          <div className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 shadow-sm dark:border-primary-800 dark:bg-primary-950 dark:text-primary-200">
            Admin access: staff registration is available below.
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Visits today</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {stats?.todayVisits ?? '—'}
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Students seen</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {stats?.distinctStudents ?? '—'}
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Sent home</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{stats?.sentHome ?? '—'}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Referred</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{stats?.referred ?? '—'}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent activity</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Latest clinic records and approvals for quick review.</p>
            </div>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{formatActivityDate(item.date)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                No recent actions are available yet.
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-6">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Alerts</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Important items that need attention now.</p>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium text-slate-500">Low stock items</p>
                <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">{lowStockCount ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium text-slate-500">Pending supply requests</p>
                <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">{pendingRequests ?? '—'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-6">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quick links</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Jump straight to the most important clinic pages.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to="/patients" className="btn-outline w-full text-left">Patients</Link>
              <Link to="/consultations" className="btn-outline w-full text-left">Consultations</Link>
              <Link to="/visits" className="btn-outline w-full text-left">Clinic Visits</Link>
              <Link to="/inventory" className="btn-outline w-full text-left">Inventory</Link>
              <Link to="/requests" className="btn-outline w-full text-left">Supply Requests</Link>
              <Link to="/dental-repository" className="btn-outline w-full text-left">Dental Repository</Link>
            </div>
          </section>
        </div>
      </div>

      {profile?.role === 'clinic_admin' && (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Register staff or doctor</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create new clinic staff accounts directly from the dashboard.
              </p>
            </div>
          </div>
          <RegisterStaffAccount hideHeader />
        </section>
      )}
    </div>
  )
}

