-- Apply to an existing PostgreSQL schema before running with ddl-auto=validate.
-- Hibernate ddl-auto=update adds this nullable column automatically in development.
-- Existing customer challenges without a token must be replaced by registering again.
ALTER TABLE email_challenges
    ADD COLUMN IF NOT EXISTS registration_token_hash VARCHAR(64);
