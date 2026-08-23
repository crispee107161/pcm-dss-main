-- The Audience.csv "Top pages" affinity-score chart was removed from the
-- app (not used anywhere) — no write path can reach category: 'page' rows
-- in FollowerAudienceRank any longer, so any that exist are permanently
-- orphaned and would resurface as live-looking data (with distribution
-- values that can exceed 1.0, since affinity isn't a percentage share) if a
-- future change ever relaxed the 'city'-only filtering. No-op on any
-- database that never received an Audience.csv upload with this code live.
DELETE FROM "FollowerAudienceRank" WHERE category = 'page';
