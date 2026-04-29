import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.'
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const state = {
  userId: null,
  profileId: null,
  patientId: null,
  studentId: null,
  inventoryId: null,
  supplyRequestId: null,
  supplyRequestItemId: null,
  staffScheduleId: null,
  recurringScheduleId: null,
  medicalRecordId: null,
  physicalExamId: null,
  dentalRepoId: null,
  accidentReportId: null
}

function randomDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
}

function randomEmail() {
  return `supabase-test+${randomUUID().slice(0, 8)}@example.com`
}

async function queryTable(tableName) {
  const { error } = await supabase.from(tableName).select('id').limit(1)
  if (error) {
    throw new Error(`Unable to query table ${tableName}: ${error.message}`)
  }
}

async function insertAndReturnId(tableName, row) {
  const { data, error } = await supabase.from(tableName).insert(row).select('id').single()
  if (error) {
    throw new Error(`Insert to ${tableName} failed: ${error.message}`)
  }
  const result = data?.id ?? data
  assert(result, `Insert to ${tableName} returned no id`)
  return result
}

async function deleteById(tableName, id) {
  const { error } = await supabase.from(tableName).delete().eq('id', id)
  if (error) {
    console.warn(`Cleanup warning: failed to delete ${tableName} id=${id}: ${error.message}`)
  }
}

async function getTableColumns(tableName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', tableName)

  if (error) {
    throw new Error(`Unable to load columns for ${tableName}: ${error.message}`)
  }

  return (data || []).map((row) => row.column_name)
}

async function createAuthUser() {
  const email = randomEmail()
  const password = 'TestPass123!'
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'clinic_staff', full_name: 'Service Role Test' }
  })

  if (error) {
    throw new Error(`Unable to create auth user: ${error.message}`)
  }

  const user = data?.user ?? data
  if (!user?.id) {
    throw new Error('Auth user creation returned an invalid user object')
  }

  return { id: user.id, email }
}

async function deleteAuthUser(userId) {
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) {
    console.warn(`Cleanup warning: unable to delete auth user ${userId}: ${error.message}`)
  }
}

async function createTestPatient() {
  const patientId = randomDigits(7)
  const id = await insertAndReturnId('patients', {
    patient_id: patientId,
    patient_type: 'student',
    first_name: 'Test',
    last_name: 'Patient'
  })
  return id
}

async function createTestStudent() {
  const studentId = randomDigits(7)
  const { data, error } = await supabase
    .from('students')
    .insert({
      student_id: studentId,
      first_name: 'Test',
      last_name: 'Student'
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Unable to create students row: ${error.message}`)
  }

  return data?.id
}

async function createTestProfile(userId, email) {
  const profileId = await insertAndReturnId('profiles', {
    id: userId,
    full_name: 'Service Role Test',
    role: 'clinic_staff',
    email
  })
  return profileId
}

async function run() {
  console.log('Running Supabase table validation tests...')

  const columns = await getTableColumns('accident_reports').catch(() => [])
  const accidentUsesPatientId = columns.includes('patient_id')
  const accidentUsesStudentId = columns.includes('student_id')

  state.userId = null
  state.profileId = null
  state.patientId = null
  state.studentId = null

  try {
    await queryTable('profiles')
    await queryTable('patients')
    await queryTable('medical_records')
    await queryTable('physical_examinations')
    await queryTable('dental_repository')
    await queryTable('accident_reports')
    await queryTable('staff_schedules')
    await queryTable('recurring_schedules')
    await queryTable('inventory')
    await queryTable('supply_requests')
    await queryTable('supply_request_items')

    console.log('Query checks passed for all required tables.')

    const authUser = await createAuthUser()
    state.userId = authUser.id
    state.profileId = await createTestProfile(authUser.id, authUser.email)

    state.patientId = await createTestPatient()

    state.inventoryId = await insertAndReturnId('inventory', {
      name: 'Test Supply Item',
      category: 'supply',
      unit: 'pcs',
      quantity_on_hand: 1
    })

    state.supplyRequestId = await insertAndReturnId('supply_requests', {
      requested_by: state.profileId,
      status: 'pending'
    })

    state.supplyRequestItemId = await insertAndReturnId('supply_request_items', {
      request_id: state.supplyRequestId,
      inventory_id: state.inventoryId,
      quantity: 1
    })

    state.staffScheduleId = await insertAndReturnId('staff_schedules', {
      staff_id: state.profileId,
      schedule_date: new Date().toISOString().slice(0, 10),
      start_time: '08:00',
      end_time: '12:00',
      is_available: true
    })

    state.recurringScheduleId = await insertAndReturnId('recurring_schedules', {
      staff_id: state.profileId,
      start_time: '08:00',
      end_time: '12:00',
      days_of_week: ['Monday'],
      is_available: true
    })

    state.medicalRecordId = await insertAndReturnId('medical_records', {
      patient_id: state.patientId,
      diagnosed_diseases: 'None',
      allergies: 'None',
      immunization_history: 'Up to date',
      last_updated_by: state.profileId
    })

    state.physicalExamId = await insertAndReturnId('physical_examinations', {
      patient_id: state.patientId,
      exam_date: new Date().toISOString().split('T')[0],
      weight_kg: 55,
      height_cm: 160,
      examined_by: state.profileId
    })

    state.dentalRepoId = await insertAndReturnId('dental_repository', {
      patient_id: state.patientId,
      form_type: 'dental_health_record',
      file_url: 'https://example.com/test.pdf',
      file_name: 'test.pdf',
      uploaded_by: state.profileId
    })

    if (accidentUsesPatientId) {
      state.accidentReportId = await insertAndReturnId('accident_reports', {
        patient_id: state.patientId,
        accident_date: new Date().toISOString().split('T')[0],
        description: 'Test accident report',
        severity: 'minor'
      })
    } else if (accidentUsesStudentId) {
      state.studentId = await createTestStudent()
      state.accidentReportId = await insertAndReturnId('accident_reports', {
        student_id: state.studentId,
        accident_date: new Date().toISOString().split('T')[0],
        description: 'Test accident report',
        severity: 'minor'
      })
    } else {
      throw new Error('Unable to determine accident_reports foreign key schema.')
    }

    console.log('Insert checks passed for all required tables.')
    console.log('Supabase table validation complete. All checks passed.')
  } catch (error) {
    console.error('Supabase table validation failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await cleanup()
  }
}

async function cleanup() {
  if (state.accidentReportId) {
    await deleteById('accident_reports', state.accidentReportId)
  }
  if (state.dentalRepoId) {
    await deleteById('dental_repository', state.dentalRepoId)
  }
  if (state.physicalExamId) {
    await deleteById('physical_examinations', state.physicalExamId)
  }
  if (state.medicalRecordId) {
    await deleteById('medical_records', state.medicalRecordId)
  }
  if (state.recurringScheduleId) {
    await deleteById('recurring_schedules', state.recurringScheduleId)
  }
  if (state.staffScheduleId) {
    await deleteById('staff_schedules', state.staffScheduleId)
  }
  if (state.supplyRequestItemId) {
    await deleteById('supply_request_items', state.supplyRequestItemId)
  }
  if (state.supplyRequestId) {
    await deleteById('supply_requests', state.supplyRequestId)
  }
  if (state.inventoryId) {
    await deleteById('inventory', state.inventoryId)
  }
  if (state.studentId) {
    await deleteById('students', state.studentId)
  }
  if (state.patientId) {
    await deleteById('patients', state.patientId)
  }
  if (state.profileId) {
    await deleteById('profiles', state.profileId)
  }
  if (state.userId) {
    await deleteAuthUser(state.userId)
  }
}

await run()
