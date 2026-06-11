-- Add landing_config JSONB to unidades for white-label customizable landing pages
alter table unidades
  add column if not exists landing_config jsonb default '{}';
