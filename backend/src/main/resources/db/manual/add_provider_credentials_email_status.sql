-- Apply to an existing PostgreSQL schema before running with ddl-auto=validate.
-- In development, Hibernate ddl-auto=update adds the nullable column.
ALTER TABLE provider_applications
    ADD COLUMN IF NOT EXISTS credentials_email_status VARCHAR(16)
        CONSTRAINT ck_provider_applications_credentials_email_status
        CHECK (credentials_email_status IN ('UNCONFIRMED', 'SENT', 'FAILED'));
