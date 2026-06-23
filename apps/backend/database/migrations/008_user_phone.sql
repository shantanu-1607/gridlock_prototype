-- Add phone column to users table for WhatsApp dispatch alerts
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Seed sandbox phone numbers for demo fleet members
-- These numbers must have opted in to the Twilio sandbox (texted "join fruit-generally")
UPDATE users SET phone = '+917709861898' WHERE email = 'fleet1@gridlock.demo';
UPDATE users SET phone = '+916202091482' WHERE email = 'fleet2@gridlock.demo';

-- Update all remaining fleet members with a placeholder so the column is never null
-- (in production, each officer's real number would be stored here)
UPDATE users SET phone = NULL WHERE phone IS NULL AND role = 'fleet';
