/**
 * Format a person's name based on their role
 * Adds "Dr. " prefix for doctors (clinic_doctor role)
 */
export function getDisplayName(fullName: string | undefined, role?: string): string {
  if (!fullName) return 'Unknown'
  
  if (role === 'clinic_doctor') {
    return `Dr. ${fullName}`
  }
  
  return fullName
}
