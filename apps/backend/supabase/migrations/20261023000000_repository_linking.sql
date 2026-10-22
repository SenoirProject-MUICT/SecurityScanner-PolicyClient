-- Admins choose which of the installation's repositories the workspace follows.
-- Unlinked repositories stay mirrored so the picker can offer them, but their
-- pull requests are not imported. Repositories mirrored before this migration
-- were all being followed, so existing rows default to linked.
alter table public.repositories add column if not exists is_linked boolean not null default true;
