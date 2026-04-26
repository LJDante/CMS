# Deploy Supabase Edge Function

The staff account registration page uses a Supabase Edge Function to securely create user accounts with admin privileges.

## Setup Instructions

### 1. Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

Or on macOS using Homebrew:
```bash
brew install supabase/tap/supabase
```

### 2. Login to Supabase

```bash
supabase login
```

You'll be prompted to enter your access token. Get it from: https://app.supabase.com/account/tokens

### 3. Link Your Project

From the project root directory:
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

Get your project ID from your Supabase dashboard URL: `https://app.supabase.com/project/YOUR_PROJECT_ID`

### 4. Deploy the Edge Function

```bash
supabase functions deploy create-staff-account
```

### 5. Set Required Secrets

The Edge Function needs access to your Supabase service role key. Set it in Supabase:

```bash
supabase secrets set SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Use the secret name `SERVICE_ROLE_KEY` because secret names may not start with `SUPABASE_` in the Supabase dashboard.

Get your service role key from:
- Supabase Dashboard → Settings → API → Service Role Key

## Verification

1. Navigate to your Supabase Dashboard
2. Go to Edge Functions
3. You should see `create-staff-account` listed

The function will:
- ✅ Verify the user is authenticated
- ✅ Check that the user has `clinic_admin` role
- ✅ Create a new user with the provided email and password
- ✅ Create a profile record in the `public.profiles` table
- ✅ Automatically delete the user if profile creation fails

## Testing

Try registering a new staff account from the admin dashboard. You should now see success/error toasts instead of the "User not allowed" error.

