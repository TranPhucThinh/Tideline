-- Reject future-dated transactions at the database boundary.

create or replace function public.reject_future_entries()
returns trigger
language plpgsql
as $$
begin
  if new.date > timezone('Asia/Ho_Chi_Minh', now())::date then
    raise exception 'Entry date cannot be in the future';
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_reject_future on public.expenses;
create trigger expenses_reject_future
  before insert or update on public.expenses
  for each row execute procedure public.reject_future_entries();

drop trigger if exists incomes_reject_future on public.incomes;
create trigger incomes_reject_future
  before insert or update on public.incomes
  for each row execute procedure public.reject_future_entries();
