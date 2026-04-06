-- Submissions from the "Add unit" dashboard form (before merging into apartments/units)
CREATE TABLE IF NOT EXISTS unit_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apartment_name TEXT NOT NULL,
  room_type TEXT,
  bedrooms INT,
  bathrooms NUMERIC(3, 1),
  sq_ft INT,
  floor INT,
  windows TEXT,
  monthly_rent INT,
  utilities_monthly INT,
  parking_monthly INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_submissions_user_id ON unit_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_submissions_created_at ON unit_submissions(created_at DESC);

ALTER TABLE unit_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert own unit submissions"
  ON unit_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own unit submissions"
  ON unit_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
