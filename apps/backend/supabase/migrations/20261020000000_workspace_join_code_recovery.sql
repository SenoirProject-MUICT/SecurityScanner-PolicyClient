-- Keep the SHA-256 lookup hash and store a reversible encrypted copy for
-- admins who need to share an existing, unexpired join code again.
alter table public.workspace_join_codes
  add column if not exists code_ciphertext text;
