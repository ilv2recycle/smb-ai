-- Voting table for LytxOne AI Strategy Portfolio
create table if not exists lytxone_votes (
  id bigint generated always as identity primary key,
  strategy_id text not null,
  emoji text not null,
  voter_id text not null,  -- anonymous fingerprint (no PII)
  created_at timestamptz default now(),
  unique(strategy_id, emoji, voter_id)
);

-- Enable RLS
alter table lytxone_votes enable row level security;

-- Anyone can read vote counts
create policy "Anyone can read votes"
  on lytxone_votes for select
  using (true);

-- Anyone can insert votes (anonymous voting)
create policy "Anyone can insert votes"
  on lytxone_votes for insert
  with check (true);

-- Anyone can delete their own votes (un-vote)
create policy "Anyone can delete own votes"
  on lytxone_votes for delete
  using (true);

-- Index for fast aggregation
create index idx_lytxone_votes_strategy on lytxone_votes(strategy_id, emoji);
