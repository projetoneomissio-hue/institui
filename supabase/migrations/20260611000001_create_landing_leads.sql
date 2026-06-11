create table if not exists landing_leads (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid references unidades(id) on delete cascade,
  nome text not null,
  contato text not null,
  atividade_titulo text,
  created_at timestamptz default now()
);

alter table landing_leads enable row level security;

-- Qualquer visitante público pode registrar interesse
create policy "anon_insert_leads" on landing_leads
  for insert with check (true);

-- Apenas staff da unidade pode visualizar os leads
create policy "staff_read_leads" on landing_leads
  for select using (
    unidade_id in (
      select unidade_id from user_roles where user_id = auth.uid()
    )
  );
