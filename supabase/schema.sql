-- CareAfter schema: run in the Supabase SQL editor (once per project).
-- Auth passwords live in auth.users; this staff table is the profile row.

create table if not exists public.staff (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  hospital_name text,
  hospital_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null,
  name text not null,
  whatsapp_number text,
  diagnosis text,
  risk_factors text,
  medicines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'flagged'))
);

create table if not exists public.checkin_questions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.checkin_responses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  question text,
  answer text,
  urgency_level text,
  timestamp timestamptz not null default now()
);

create index if not exists patients_hospital_id_idx on public.patients (hospital_id);
create index if not exists patients_status_idx on public.patients (status);
create index if not exists checkin_questions_patient_id_idx on public.checkin_questions (patient_id);
create index if not exists checkin_responses_patient_id_idx on public.checkin_responses (patient_id, timestamp);

alter table public.staff enable row level security;
alter table public.patients enable row level security;
alter table public.checkin_questions enable row level security;
alter table public.checkin_responses enable row level security;

drop policy if exists "staff_own_row" on public.staff;
create policy "staff_own_row" on public.staff
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "patients_same_hospital" on public.patients;
create policy "patients_same_hospital" on public.patients
  for all
  using (hospital_id in (select hospital_id from public.staff where id = auth.uid()))
  with check (hospital_id in (select hospital_id from public.staff where id = auth.uid()));

drop policy if exists "questions_same_hospital" on public.checkin_questions;
create policy "questions_same_hospital" on public.checkin_questions
  for all
  using (
    patient_id in (
      select p.id from public.patients p
      join public.staff s on s.hospital_id = p.hospital_id
      where s.id = auth.uid()
    )
  )
  with check (
    patient_id in (
      select p.id from public.patients p
      join public.staff s on s.hospital_id = p.hospital_id
      where s.id = auth.uid()
    )
  );

drop policy if exists "responses_same_hospital" on public.checkin_responses;
create policy "responses_same_hospital" on public.checkin_responses
  for all
  using (
    patient_id in (
      select p.id from public.patients p
      join public.staff s on s.hospital_id = p.hospital_id
      where s.id = auth.uid()
    )
  )
  with check (
    patient_id in (
      select p.id from public.patients p
      join public.staff s on s.hospital_id = p.hospital_id
      where s.id = auth.uid()
    )
  );

-- New Auth users get a staff row. hospital_id defaults to the user id
-- (one hospital per staff account). To share a ward, set multiple staff
-- rows to the same hospital_id.
create or replace function public.handle_new_staff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.staff (id, email, hospital_name, hospital_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'hospital_name', 'My Hospital'),
    new.id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_staff on auth.users;
create trigger on_auth_user_created_staff
  after insert on auth.users
  for each row execute procedure public.handle_new_staff();
