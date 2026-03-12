-- Supabase SQL to update create_upcoming_alert

CREATE OR REPLACE FUNCTION create_upcoming_alert(
  vihar_date_input DATE,
  vihar_time_input TIME,
  from_loc TEXT,
  to_loc TEXT,
  v_type TEXT,
  s_count INT,
  sv_count INT
) RETURNS JSON AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_new_vihar_id BIGINT;
  v_message TEXT;
  target_user RECORD;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Get user's organization
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = v_user_id;

  -- 1. Insert into upcoming_vihars
  INSERT INTO upcoming_vihars (organization_id, created_by, vihar_date, vihar_time, from_location, to_location, vihar_type, sadhu_count, sadhvi_count)
  VALUES (v_org_id, v_user_id, vihar_date_input, vihar_time_input, from_loc, to_loc, v_type, s_count, sv_count)
  RETURNING id INTO v_new_vihar_id;

  -- 2. Construct Notification Message (e.g. 12 Mar 2026)
  v_message := 'Upcoming Vihar on ' || to_char(vihar_date_input, 'DD Mon YYYY') || ' at ' || vihar_time_input || ' from ' || from_loc || ' to ' || to_loc;

  -- 3. Insert notifications for all active users in the org
  FOR target_user IN 
    SELECT id FROM profiles WHERE organization_id = v_org_id AND is_active = true
  LOOP
    INSERT INTO notifications (user_id, organization_id, type, title, message, payload)
    VALUES (
      target_user.id,
      v_org_id,
      'alert_upcoming',
      '📢 New Upcoming Vihar Alert!',
      v_message,
      jsonb_build_object('vihar_id', v_new_vihar_id, 'from', from_loc, 'to', to_loc, 'date', vihar_date_input, 'time', vihar_time_input)
    );
  END LOOP;

  RETURN json_build_object('success', true, 'vihar_id', v_new_vihar_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
