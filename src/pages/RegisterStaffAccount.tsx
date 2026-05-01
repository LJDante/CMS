import { useState } from 'react'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface FormData {
  fullName: string
  email: string
  password: string
  role: 'clinic_doctor' | 'clinic_nurse' | 'clinic_staff' | 'clinic_admin'
}

interface RegisterStaffAccountProps {
  hideHeader?: boolean
}

export default function RegisterStaffAccount({ hideHeader = false }: RegisterStaffAccountProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    role: 'clinic_staff'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
        toast.error('Please fill in all required fields')
        return
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }

      // Step 1: Sign up new staff
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            role: formData.role
          }
        }
      })

      if (signUpError) {
        toast.error(signUpError.message)
        return
      }

      if (!signUpData.user) {
        toast.error('Failed to create user')
        return
      }

      toast.success(`Account created successfully for ${formData.fullName}!`)
      setFormData({ fullName: '', email: '', password: '', role: 'clinic_staff' })
      setShowPassword(false)

    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Register Staff Account</h1>
          <p className="mt-2 text-slate-600">Create a new staff account for clinic personnel</p>
        </div>
      )}

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              className="input-field"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john.doe@school.com"
              className="input-field"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter a secure password"
                className="input-field pr-10"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Minimum 6 characters required</p>
          </div>

          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input-field cursor-pointer"
              disabled={loading}
              required
            >
              <option value="clinic_staff">Clinic Staff</option>
              <option value="clinic_nurse">Clinic Nurse</option>
              <option value="clinic_doctor">Clinic Doctor</option>
              <option value="clinic_admin">Clinic Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Staff Account'
            )}
          </button>
        </form>
      </div>

      <div className="card max-w-2xl border-b-4 border-blue-500 bg-blue-50">
        <h3 className="mb-3 font-semibold text-slate-900">Account Information</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>• Passwords must be at least 6 characters long</li>
          <li>• Staff can log in immediately after account creation</li>
          <li>• Clinic Doctor and Clinic Staff roles have different permissions</li>
        </ul>
      </div>
    </div>
  )
}
