import { createClient } from '@supabase/supabase-js'

const url = 'https://ovkerghkikkzkponjrue.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
const token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjQ3ZDkzY2UzLWE3MDMtNGFlYy1iMDhmLTliZWQxYzA2MTBhZSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL292a2VyZ2hraWtremtwb25qcnVlLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI1ZmNjNjNiNi1iYjZjLTRiZDMtYmU0YS03MzM1MTM3MDNlZjAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc1OTA5NDc4LCJpYXQiOjE3NzU5MDU4NzgsImVtYWlsIjoiYWRtaW5AZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NzU5MDU4Nzh9XSwic2Vzc2lvbl9pZCI6IjFkYjczZDVkLTljOWYtNGJmMi04YTk2LTFiYzQzN2Q4YjgxNyIsImlzX2Fub255bW91cyI6ZmFsc2V9.bAJ28yZvVh9yZLHKhZrmWK5o7Mu3v6YyDbg47mXHbV10dQ5g6hKHRaoM0JcE8h4B2puAeCgI6jeVrGk1UDPwEQ'

const client = createClient(url, key || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

try {
  const { data, error } = await client.auth.getUser(token)
  console.log('data', JSON.stringify(data, null, 2))
  console.log('error', JSON.stringify(error, null, 2))
} catch (err) {
  console.error('throw', err)
}
