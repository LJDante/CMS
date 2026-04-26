-- Remove schedules where the staff_id no longer exists in profiles table
DELETE FROM public.staff_schedules
WHERE staff_id NOT IN (SELECT id FROM public.profiles);

-- Verify the cleanup
SELECT COUNT(*) as remaining_schedules FROM public.staff_schedules;
