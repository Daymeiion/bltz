-- Add the enum value in its own transaction. PostgreSQL requires the ALTER TYPE
-- to commit before the new value can be referenced by later statements.
alter type media_provenance add value if not exists 'scraped_candidate';
