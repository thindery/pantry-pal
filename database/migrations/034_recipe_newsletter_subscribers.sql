-- PP-193: capture-only public recipe newsletter subscribers. No mail is sent yet.

CREATE TABLE IF NOT EXISTS recipe_newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    source TEXT NOT NULL,
    recipe_slug TEXT,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT recipe_newsletter_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_recipe_newsletter_subscribed
    ON recipe_newsletter_subscribers (consented_at)
    WHERE unsubscribed_at IS NULL;
