import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  startOfYear,
  endOfYear,
  format,
  endOfMonth,
  addMonths
} from 'date-fns'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import type { ClinicVisit } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

type PeriodType = 'year' | 'quarter'

interface Summary {
  label: string
  totalVisits: number
  byGroup: Record<string, number>
}

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [periodType, setPeriodType] = useState<PeriodType>('year')
  const [quarter, setQuarter] = useState(1)
  const [groupBy, setGroupBy] = useState<'disposition' | 'complaint'>('disposition')
  const [visits, setVisits] = useState<ClinicVisit[]>([])

  const loadVisits = async () => {
    let from: Date
    let to: Date
    if (periodType === 'year') {
      from = startOfYear(new Date(year, 0, 1))
      to = endOfYear(new Date(year, 0, 1))
    } else {
      const startMonth = (quarter - 1) * 3
      from = new Date(year, startMonth, 1)
      to = endOfMonth(addMonths(from, 2))
    }

    const { data, error } = await supabase
      .from('clinic_visits')
      .select('*')
      .gte('visit_date', format(from, 'yyyy-MM-dd'))
      .lte('visit_date', format(to, 'yyyy-MM-dd'))

    if (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      setVisits([])
      return
    }

    setVisits((data ?? []) as ClinicVisit[])
  }

  useEffect(() => {
    void loadVisits()
  }, [year, periodType, quarter])

  const summary = useMemo<Summary | null>(() => {
    if (!visits) return null
    const byGroup: Record<string, number> = {}
    for (const v of visits) {
      const key = groupBy === 'disposition' ? v.disposition : v.complaint || 'unspecified'
      byGroup[key] = (byGroup[key] ?? 0) + 1
    }

    const label =
      periodType === 'year'
        ? `${year}`
        : `Q${quarter} ${year}`

    return {
      label,
      totalVisits: visits.length,
      byGroup
    }
  }, [visits, groupBy, periodType, quarter, year])

  const chartData = useMemo(() => {
    if (!summary) return { labels: [], datasets: [] }
    const rawKeys = Object.keys(summary.byGroup)
    const labels = rawKeys.map((k) => k.replaceAll('_', ' '))
    const data = rawKeys.map((k) => summary.byGroup[k])
    return {
      labels,
      datasets: [
        {
          label: 'Cases',
          data,
          backgroundColor: 'rgba(99,102,241,0.8)'
        }
      ]
    }
  }, [summary])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false }
    }
  }), [])

  const generatePDF = () => {
    if (!summary) return
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Clinic Visits Report', 14, 16)
    doc.setFontSize(11)
    doc.text(`Period: ${summary.label}`, 14, 24)
    doc.text(`Grouped by: ${groupBy}`, 14, 30)
    doc.text(`Total visits: ${summary.totalVisits}`, 14, 36)

    const rows = Object.entries(summary.byGroup).map(([k, v]) => [k, String(v)])

    ;(doc as any).autoTable({
      startY: 44,
      head: [['Category', 'Count']],
      body: rows,
      styles: { fontSize: 10 }
    })

    doc.save(`clinic-report-${summary.label.replace(/\s+/g, '-')}.pdf`)
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
      <p className="mt-1 text-slate-500">Generate aggregate clinic statistics and export as PDF.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3 items-end">
        <div>
          <label className="text-sm text-slate-600">Period type</label>
          <select
            className="input-field mt-1"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
          >
            <option value="year">Year</option>
            <option value="quarter">Quarter (3 months)</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-600">Year</label>
          <input
            type="number"
            className="input-field w-28 mt-1"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
          />
        </div>

        {periodType === 'quarter' && (
          <div>
            <label className="text-sm text-slate-600">Quarter</label>
            <select
              className="input-field mt-1 w-28"
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value) || 1)}
            >
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-sm text-slate-600">Group by</label>
          <select
            className="input-field mt-1 w-40"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'disposition' | 'complaint')}
          >
            <option value="disposition">Disposition</option>
            <option value="complaint">Complaint</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="card">
            <p className="text-sm font-medium text-slate-500">Period</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{summary.label}</p>
            <p className="mt-1 text-sm text-slate-600">Total visits: {summary.totalVisits}</p>
          </div>

          <div className="card md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">By {groupBy}</p>
              <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={generatePDF}>
                Export PDF
              </button>
            </div>

            <div className="mt-4 h-64">
              <Bar data={chartData as any} options={chartOptions as any} />
            </div>

            <ul className="mt-3 space-y-1 text-sm">
              {Object.entries(summary.byGroup).map(([key, count]) => (
                <li key={key} className="flex items-center justify-between">
                  <span className="capitalize">{key.replaceAll('_', ' ')}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
              {Object.keys(summary.byGroup).length === 0 && (
                <li className="text-slate-500">No data for this period.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

