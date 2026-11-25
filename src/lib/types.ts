/**
 * The shapes of the rows we read from the database.
 * They mirror the tables in supabase/migrations.
 */

export type Household = {
  id: string;
  name: string;
  owner_id: string | null;
  invite_code: string | null;
  invite_expires_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  color: string;
  household_id: string | null;
  joined_household_at: string | null;
};

/** A profile together with the household it belongs to, if any. */
export type ProfileWithHousehold = Profile & {
  household: Household | null;
};
