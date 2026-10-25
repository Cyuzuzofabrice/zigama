-- Zigama schema. Run the whole file once in Supabase: SQL Editor > New query > Run.
create extension if not exists pgcrypto;

create table groups(
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check(char_length(name) between 2 and 80),
  amount integer not null check(amount>0 and amount<=10000000),
  freq text not null check(freq in('weekly','monthly')),
  start_date date not null default current_date,
  share_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now());
create table members(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  name text not null check(char_length(name) between 1 and 80),
  phone text check(phone ~ '^250[0-9]{9}$'),
  created_at timestamptz not null default now(),
  unique(id,group_id));
create table payments(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  member_id uuid not null,
  cycle integer not null check(cycle>=0),
  amount integer not null check(amount>0 and amount<=10000000),
  method text not null check(method in('MoMo','Cash','Bank')),
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(member_id,group_id) references members(id,group_id) on delete cascade);
create table loans(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  member_id uuid not null,
  principal integer not null check(principal>0 and principal<=100000000),
  rate numeric(5,2) not null check(rate>=0 and rate<=100),
  months integer not null check(months between 1 and 60),
  created_at timestamptz not null default now(),
  unique(id,group_id),
  foreign key(member_id,group_id) references members(id,group_id) on delete cascade);
create table repayments(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  loan_id uuid not null,
  amount integer not null check(amount>0),
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(loan_id,group_id) references loans(id,group_id) on delete cascade);
create table audit_log(
  id bigserial primary key,
  group_id uuid not null references groups on delete cascade,
  actor uuid, action text not null, detail jsonb, at timestamptz not null default now());

-- Row level security: a treasurer can only touch rows of groups they own.
create or replace function owns(gid uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from groups where id=gid and owner=auth.uid()) $$;
alter table groups enable row level security; alter table members enable row level security;
alter table payments enable row level security; alter table loans enable row level security;
alter table repayments enable row level security; alter table audit_log enable row level security;
create policy own_groups on groups for all using(owner=auth.uid()) with check(owner=auth.uid());
create policy own_members on members for all using(owns(group_id)) with check(owns(group_id));
create policy own_payments on payments for all using(owns(group_id)) with check(owns(group_id));
create policy own_loans on loans for all using(owns(group_id)) with check(owns(group_id));
create policy own_repayments on repayments for all using(owns(group_id)) with check(owns(group_id));
create policy own_audit on audit_log for select using(owns(group_id));

-- A loan can never be larger than the cash the group holds.
create or replace function check_loan_cash() returns trigger language plpgsql security definer set search_path=public as $$
declare cash bigint;
begin
  select coalesce((select sum(amount) from payments where group_id=new.group_id and voided_at is null),0)
       - coalesce((select sum(principal) from loans where group_id=new.group_id),0)
       + coalesce((select sum(amount) from repayments where group_id=new.group_id and voided_at is null),0) into cash;
  if new.principal>cash then raise exception 'Loan is larger than the cash the group holds (RWF %).',cash; end if;
  return new;
end $$;
create trigger loans_cash before insert on loans for each row execute function check_loan_cash();

-- Audit trail: every change is recorded and cannot be edited by the user.
create or replace function log_change() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into audit_log(group_id,actor,action,detail) values(new.group_id,auth.uid(),tg_table_name||' '||lower(tg_op),to_jsonb(new)); return new; end $$;
create trigger audit_members after insert or update on members for each row execute function log_change();
create trigger audit_payments after insert or update on payments for each row execute function log_change();
create trigger audit_loans after insert or update on loans for each row execute function log_change();
create trigger audit_repayments after insert or update on repayments for each row execute function log_change();

-- Read-only member view: names and contributions only. No phone numbers, no loans.
create or replace function get_shared(token uuid) returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'group',jsonb_build_object('name',g.name,'amount',g.amount,'freq',g.freq,'start_date',g.start_date),
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name)) from members m where m.group_id=g.id),'[]'::jsonb),
 'payments',coalesce((select jsonb_agg(jsonb_build_object('member_id',p.member_id,'cycle',p.cycle,'amount',p.amount)) from payments p where p.group_id=g.id and p.voided_at is null),'[]'::jsonb))
from groups g where g.share_token=token $$;
grant execute on function get_shared(uuid) to anon, authenticated;
