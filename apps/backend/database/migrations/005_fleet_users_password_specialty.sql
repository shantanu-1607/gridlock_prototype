-- Add password and specialty to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password VARCHAR(255),
ADD COLUMN IF NOT EXISTS specialty VARCHAR(100) DEFAULT 'General Purpose';

-- Seed the users with the 'gridlock' password hash
-- and assign specialties
UPDATE users
SET password = '$2b$10$mfHr0Ro15fL4.674e5nk/uMQgPmSIa7dxEJmvtf2AOB/k.UtFxzj.'
WHERE role IN ('controller', 'fleet');

-- Assign some specialties to make it interesting
UPDATE users SET specialty = 'Heavy Tow Truck' WHERE email IN ('fleet1@gridlock.demo', 'fleet6@gridlock.demo');
UPDATE users SET specialty = 'Barricade Specialist' WHERE email IN ('fleet2@gridlock.demo', 'fleet7@gridlock.demo');
UPDATE users SET specialty = 'Traffic Control' WHERE email IN ('fleet3@gridlock.demo', 'fleet8@gridlock.demo');
UPDATE users SET specialty = 'Hazmat' WHERE email IN ('fleet4@gridlock.demo');
UPDATE users SET specialty = 'General Purpose' WHERE email IN ('fleet5@gridlock.demo', 'fleet9@gridlock.demo', 'fleet10@gridlock.demo');
