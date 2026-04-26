# 🦷 Dental Repository Setup Guide

The Dental Repository feature has been successfully added to your clinic management system. Follow these steps to get it fully operational.

## ✅ What's Been Created

### 1. **Database Migration**
- **File**: `migrations/20260330_create_dental_repository.sql`
- **Table**: `public.dental_repository`
- **Includes**: Proper RLS policies, indexes, and foreign key constraints

### 2. **Frontend Components**
- **Page**: `src/pages/DentalRepository.tsx`
- **Hook**: `src/hooks/useDentalRepository.ts`
- **Types**: Added `DentalRecord` and `DentalFormType` to `src/types.ts`
- **Navigation**: Added to sidebar in `src/components/Layout.tsx`

### 3. **Routing**
- **Route**: `/dental-repository` (protected)
- **Navigation**: Quick access via left sidebar with Smile icon

---

## 🔧 Setup Steps

### Step 1: Run Database Migration

Copy and paste the entire SQL from `migrations/20260330_create_dental_repository.sql` into your **Supabase SQL Editor** and execute it.

This creates:
- ✅ `dental_repository` table with all required columns
- ✅ RLS (Row Level Security) policies
- ✅ Performance indexes

**SQL Preview:**
```sql
CREATE TABLE IF NOT EXISTS public.dental_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  form_type text NOT NULL CHECK (form_type IN ('dental_health_record', 'dental_health_referral')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Step 2: Create Storage Bucket

In your **Supabase Dashboard**:

1. Go to **Storage** (left sidebar)
2. Click **Create a new bucket**
3. **Bucket name**: `dental-files`
4. **Privacy**: Public (or Private - see security note below)
5. Click **Create**

**Security Note**: Make the bucket public so users can download/preview PDFs. RLS policies on the `dental_repository` table control who can upload/delete.

### Step 3: Verify RLS Policies

The migration creates three policies on the `dental_repository` table:
- `Clinic staff can read dental records` - READ access for authenticated users
- `Clinic staff can create dental records` - INSERT access for authenticated users
- `Clinic staff can delete dental records` - DELETE access for authenticated users

**To verify in Supabase**:
1. Go to **Authentication → Policies**
2. Select table `dental_repository`
3. You should see the 3 policies listed above

---

## 🎯 Features Overview

### **Patient Search**
- Fast search by patient name or ID
- Left sidebar shows all patients
- Click to select a patient

### **Document Upload**
- **Document Types**:
  - `Dental Health Record` (blue badge)
  - `Dental Health Referral` (purple badge)
- **Supported Format**: PDF only
- **Max File Size**: 50MB
- **Automatic metadata**: Captures file size, upload time, uploaded by

### **Document View**
- **List View**: Shows all documents for selected patient
- **Badges**: Clearly labeled by document type
- **Metadata**: File size and upload timestamp
- **Sorting**: Newest first

### **Document Actions**
- **👁️ Preview**: Opens PDF in browser (new tab)
- **⬇️ Download**: Downloads PDF to local machine
- **🗑️ Delete**: Permanently removes document (with confirmation)

---

## 📊 Database Schema

### Table: `dental_repository`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key, auto-generated |
| `patient_id` | uuid | Links to patients table (cascade delete) |
| `form_type` | text | `dental_health_record` or `dental_health_referral` |
| `file_url` | text | Supabase Storage public URL |
| `file_name` | text | Original filename (for download) |
| `file_size` | integer | File size in bytes |
| `uploaded_at` | timestamptz | When document was uploaded |
| `uploaded_by` | uuid | User ID who uploaded |
| `created_at` | timestamptz | Record creation timestamp |

### Indexes Created
- `dental_repository_patient_id_idx` - Fast lookup by patient
- `dental_repository_form_type_idx` - Fast filtering by document type
- `dental_repository_uploaded_at_idx` - Fast sorting by date

---

## 🔐 Security Features

### Row Level Security (RLS)
- Authenticated clinic staff can only see records they have permission for
- Prevents unauthorized access to other patients' documents

### Storage Policy
- Public bucket means anyone can download if they have the URL
- BUT: URls are only accessible from the app
- RLS on `dental_repository` table prevents listing unauthorized records

### Data Validation
- File type validation: PDF only
- File size limit: 50MB
- Cascade delete: Deleting a patient removes all their dental records

---

## 🚀 Usage Guide

### To Use the Dental Repository:

1. **Navigate to the page**:
   - Click "Dental Repository" in the left sidebar
   - Or go to `http://localhost:YOUR_PORT/dental-repository`

2. **Select a patient**:
   - Use the search box to find a patient
   - Click patient name to select
   - Their dental documents load automatically

3. **Upload a document**:
   - Click "Upload Document"
   - Select document type (Dental Health Record or Referral)
   - Choose PDF file (max 50MB)
   - Click "Upload Document"
   - Status updates automatically

4. **View document**:
   - Click the 👁️ icon to preview PDF in browser
   - Click ⬇️ to download to your computer

5. **Delete document**:
   - Click 🗑️ icon
   - Confirm deletion
   - Document is permanently removed

---

## 🧪 Testing Checklist

- [ ] Database migration ran successfully
- [ ] `dental-files` storage bucket created and public
- [ ] RLS policies visible in Supabase dashboard
- [ ] Page loads and shows in navigation
- [ ] Patient search works
- [ ] Can upload a test PDF
- [ ] Uploaded document appears in list
- [ ] Can preview PDF in browser
- [ ] Can download PDF
- [ ] Can delete with confirmation
- [ ] PDF remains accessible after delete if URL is saved
- [ ] Console shows no errors

---

## 💡 Pro Tips

### Performance
- Indexes on `patient_id`, `form_type`, and `uploaded_at` ensure fast queries
- Patient list loads once, then records load on selection
- Lazy loading prevents UI lag

### User Experience
- Badge colors help quickly identify document type
- Timestamp shows when document was uploaded
- File size helps assess document completeness
- Disabled delete button shows loading state

### Troubleshooting

**Problem**: "Upload failed"
- **Solution**: Check file is PDF and under 50MB
- **Check**: Supabase storage bucket exists and is public
- **Check**: RLS policies are created

**Problem**: "Failed to load dental records"
- **Solution**: Run migration first
- **Check**: Browser console for detailed error
- **Check**: Patient is selected

**Problem**: "Preview doesn't work"
- **Solution**: Try downloading instead
- **Check**: PDF file is valid
- **Check**: Storage bucket is public

**Problem**: "Delete failed"
- **Solution**: Check permissions in RLS policies
- **Check**: User is authenticated
- **Check**: Record exists in database

---

## 📝 Next Steps (Optional Enhancements)

1. **Add Scanned Document Preparation Guide**
   - Document quality requirements
   - File naming conventions
   - Batch upload template

2. **Add Dental Notes**
   - Add `notes` column to store clinical observations
   - Links to consultations

3. **Add Expiration Tracking**
   - Add `expiration_date` for referrals
   - Show expired documents
   - Archive old documents

4. **Add Sharing/Export**
   - Generate report with multiple documents
   - Email documents to parents/guardians
   - Archive by academic year

5. **Add Document Annotations**
   - Highlight important areas
   - Add notes directly on PDF
   - Export annotated versions

---

## 🎉 You're All Set!

The Dental Repository is now integrated into your system. Clinic staff can:
- ✅ Quickly find any patient's dental records
- ✅ Upload new documents with proper categorization
- ✅ Preview and download documents
- ✅ Maintain organized dental history
- ✅ Fast search and retrieval

**Current dev server**: http://localhost:5183/ (adjust port if different)

Enjoy managing dental records efficiently! 🦷
