import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, ClipboardList, Users, Pill, ClipboardCheck, BarChart2, LogOut, Menu, X, FileText, AlertCircle, Calendar, Activity, MessageSquare, Smile, HardDrive } from 'lucide-react'
import { getDisplayName } from '../utils/nameFormatter'
import clsx from 'clsx'

const navSections = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
    ]
  },
  {
    title: 'Clinic',
    items: [
      { to: '/patients', icon: Users, label: 'Patients' },
      { to: '/registered-patients', icon: Users, label: 'Registered Patients' },
      { to: '/visits', icon: ClipboardList, label: 'Clinic Visits' },
      { to: '/consultations', icon: MessageSquare, label: 'Consultations' }
    ]
  },
  {
    title: 'Records',
    items: [
      { to: '/medical-records', icon: FileText, label: 'Medical Records' },
      { to: '/dental-repository', icon: Smile, label: 'Dental Repository' },
      { to: '/physical-examinations', icon: Activity, label: 'Physical Examinations' },
      { to: '/accident-reports', icon: AlertCircle, label: 'Accident Reports' }
    ]
  },
  {
    title: 'Operations',
    items: [
      { to: '/scheduling', icon: Calendar, label: 'Scheduling' },
      { to: '/inventory', icon: Pill, label: 'Inventory' },
      { to: '/requests', icon: ClipboardCheck, label: 'Supply Requests' },
      { to: '/reports', icon: BarChart2, label: 'Reports' },
      { to: '/backup', icon: HardDrive, label: 'Backup & Restore' }
    ]
  }
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut, showIdleWarning, warningSecondsLeft, extendSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/50 lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-full w-80 flex-col transform border-r border-slate-200 bg-primary-800 shadow-lg transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="space-y-3 border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={import.meta.env.BASE_URL + 'LCCBnLogo.png'} alt="La Consolacion College-Biñan" className="h-11" />
            <div>
              <p className="text-lg font-semibold text-white">LCC Biñan Clinic</p>
              <p className="text-sm text-white/70">School clinic management</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(({ to, icon: Icon, label }) => {
                  const active = location.pathname === to
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={clsx(
                        'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-base transition duration-150',
                        active
                          ? 'bg-white/10 text-white border-l-4 border-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <span
                        className={clsx(
                          'inline-flex h-10 w-10 items-center justify-center rounded-2xl transition',
                          active ? 'bg-white/20 text-white' : 'text-white/60 group-hover:text-white group-hover:bg-white/10'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/20 bg-primary-900/80 p-4 backdrop-blur">
          <div className="mb-1 truncate text-base font-semibold text-white">
            {getDisplayName(profile?.full_name, profile?.role)}
          </div>
          <div className="mb-3 text-sm uppercase tracking-[0.18em] text-white/70">
            {profile?.role?.replace(/_/g, ' ')}
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-base font-medium text-white transition hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col lg:pl-80">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-primary-600 px-4 backdrop-blur relative">
          <div className="absolute left-0 top-0 bottom-0 w-0 border-l-8 border-l-primary-900 border-y-8 border-y-transparent"></div>
          <button
            className="rounded p-2 hover:bg-white/10 text-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-white">Clinic Dashboard</h1>
          <div className="flex-1" />
        </header>
        <main className="flex-1 p-4 md:p-6 bg-white">{children}</main>
      </div>
      {showIdleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-xl font-semibold text-gray-900">Inactive — staying signed in?</h3>
            <p className="mb-4 text-base text-gray-600">You've been idle. You'll be signed out in {warningSecondsLeft} second{warningSecondsLeft === 1 ? '' : 's'} unless you choose to stay signed in.</p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { void signOut(); }}>
                Sign out now
              </button>
              <button className="btn-primary" onClick={() => extendSession()}>
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

