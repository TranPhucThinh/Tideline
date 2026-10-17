\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select public.mutate_payables('settings', '{"day_start":25,"income":15000000}');
select public.mutate_payables('create', '{"id":"10000000-0000-0000-0000-000000000001","name":"Loan","provider":"","note":"","kind":"installment","amount":2200000,"first_due":"2026-10-31","count":6,"estimated":false}');
-- Replayed creation must not duplicate the item.
select public.mutate_payables('create', '{"id":"10000000-0000-0000-0000-000000000001","name":"Loan","provider":"","note":"","kind":"installment","amount":2200000,"first_due":"2026-10-31","count":6,"estimated":false}');
select public.mutate_payables('pay', '{"id":"10000000-0000-0000-0000-000000000001","sequence":0,"paid_on":"2020-01-01","amount":2200000}');
select public.mutate_payables('pay', '{"id":"10000000-0000-0000-0000-000000000001","sequence":0,"paid_on":"2020-01-02","amount":2500000}');
do $$ begin
  if (select count(*) from public.payable_items) <> 1 then raise exception 'duplicate item'; end if;
  if (select amount from public.payable_overrides limit 1) <> 2200000 then raise exception 'replay changed payment'; end if;
  begin
    perform public.mutate_payables('delete', '{"id":"10000000-0000-0000-0000-000000000001"}');
    raise exception 'paid item deleted';
  exception when check_violation then null; end;
  begin
    perform public.mutate_payables('amount', '{"id":"10000000-0000-0000-0000-000000000001","sequence":0,"amount":1}');
    raise exception 'paid amount edited';
  exception when check_violation then null; end;
  begin
    perform public.mutate_payables('pay', '{"id":"10000000-0000-0000-0000-000000000001","sequence":8,"paid_on":"2020-01-01"}');
    raise exception 'out-of-range occurrence accepted';
  exception when check_violation then null; end;
  begin
    perform public.mutate_payables('pay', jsonb_build_object('id','10000000-0000-0000-0000-000000000001','sequence',1,'paid_on',(current_date + 7)::text));
    raise exception 'future payment accepted';
  exception when check_violation then null; end;
  begin
    update public.payable_items set amount = 1;
    raise exception 'direct write allowed';
  exception when insufficient_privilege then null; end;
end $$;
select public.mutate_payables('undo', '{"id":"10000000-0000-0000-0000-000000000001","sequence":0}');
do $$ begin
  if (select paid_on from public.payable_overrides limit 1) is not null then raise exception 'undo failed'; end if;
end $$;
select public.mutate_payables('create', '{"id":"10000000-0000-0000-0000-000000000003","name":"Sub","kind":"subscription","amount":500000,"first_due":"2026-01-31","count":null}');
select public.mutate_payables('stop', jsonb_build_object('id','10000000-0000-0000-0000-000000000003','stop_from',(current_date + 1)::text));
do $$ begin
  begin
    perform public.mutate_payables('stop', jsonb_build_object('id','10000000-0000-0000-0000-000000000003','stop_from',(current_date + 40)::text));
    raise exception 'cancellation was extended and removed obligations resurrected';
  exception when check_violation then null; end;
end $$;
-- Exercise one-off correction, metadata, per-cycle income and subscription price paths.
select public.mutate_payables('create', '{"id":"10000000-0000-0000-0000-000000000004","name":"Order","kind":"once","amount":100000,"first_due":"2026-10-20","count":null}');
select public.mutate_payables('amount', '{"id":"10000000-0000-0000-0000-000000000004","sequence":0,"amount":120000}');
select public.mutate_payables('edit', '{"id":"10000000-0000-0000-0000-000000000004","name":"Renamed","provider":"Shopee","note":""}');
select public.mutate_payables('income', '{"cycle_start":"2026-10-25","amount":0}');
select public.mutate_payables('create', '{"id":"10000000-0000-0000-0000-000000000005","name":"Future sub","kind":"subscription","amount":500000,"first_due":"2090-01-31","count":null}');
select public.mutate_payables('pay', '{"id":"10000000-0000-0000-0000-000000000005","sequence":1,"paid_on":"2020-01-01"}');
select public.mutate_payables('price', '{"id":"10000000-0000-0000-0000-000000000005","sequence":0,"amount":600000}');
do $$ begin
  if (select amount from public.payable_overrides where item_id = '10000000-0000-0000-0000-000000000004') <> 120000 then raise exception 'metadata reset override'; end if;
  if (select amount from public.payable_overrides where item_id = '10000000-0000-0000-0000-000000000005') <> 500000 then raise exception 'price reset paid snapshot'; end if;
  if (select amount from public.payable_incomes where cycle_start = '2026-10-25') <> 0 then raise exception 'zero income lost'; end if;
end $$;
select public.mutate_payables('income', '{"cycle_start":"2026-10-25","amount":null}');
select public.mutate_payables('settings', '{"day_start":10,"income":16000000}');
do $$ begin
  if exists(select 1 from public.payable_incomes) then raise exception 'income reset failed'; end if;
  if (select count(*) from public.payable_settings) <> 2 then raise exception 'setting history overwritten'; end if;
  if (select day_start from public.payable_settings where effective_from = '2000-01-01') <> 25 then raise exception 'old day changed'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$ begin
  if exists(select 1 from public.payable_items) then raise exception 'RLS leak'; end if;
  begin
    perform public.mutate_payables('delete', '{"id":"10000000-0000-0000-0000-000000000001"}');
    raise exception 'cross-user delete allowed';
  exception when no_data_found then null; end;
end $$;
reset role;
-- Hand-calculated SQL date boundaries must match the UI's domain calculations.
delete from public.payable_settings where user_id = '00000000-0000-0000-0000-000000000002';
insert into public.payable_settings values ('00000000-0000-0000-0000-000000000002','2000-01-01',25,15000000), ('00000000-0000-0000-0000-000000000002','2026-11-25',10,16000000);
do $$ declare b record; begin
  if public.payable_month_date('2024-01-31',1) <> '2024-02-29'::date or public.payable_month_date('2024-01-31',2) <> '2024-03-31'::date then raise exception 'monthly anchor drift'; end if;
  select * into b from public.payable_period('2026-11-24','00000000-0000-0000-0000-000000000002');
  if b.start_date <> '2026-10-25'::date or b.end_date <> '2026-11-24'::date then raise exception 'old cycle changed'; end if;
  select * into b from public.payable_period('2026-11-25','00000000-0000-0000-0000-000000000002');
  if b.start_date <> '2026-11-25'::date or b.end_date <> '2026-12-09'::date then raise exception 'transition gap or overlap'; end if;
end $$;
rollback;
