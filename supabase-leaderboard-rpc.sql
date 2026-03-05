-- Create an RPC to fetch top Sevaks for an organization by bypassing RLS
CREATE OR REPLACE FUNCTION get_top_sevaks_leaderboard(org_id UUID, limit_val INT DEFAULT 10)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH sevak_stats AS (
        SELECT 
            s.username, 
            s.full_name, 
            COALESCE(s.gender, 'Male') AS gender,
            COUNT(ve.id) AS count,
            COALESCE(SUM(ve.distance_km), 0) AS km
        FROM profiles s
        LEFT JOIN vihar_entries ve 
            ON ve.organization_id = s.organization_id 
            AND s.username = ANY(ve.sevaks)
        WHERE s.organization_id = org_id 
          AND s.role = 'sevak' 
          AND s.is_active = true
        GROUP BY s.username, s.full_name, s.gender
    ),
    ranked_stats AS (
        SELECT 
            *,
            RANK() OVER (PARTITION BY NULL ORDER BY count DESC, km DESC) as overall_rank,
            RANK() OVER (PARTITION BY gender ORDER BY count DESC, km DESC) as gender_rank
        FROM sevak_stats
    )
    SELECT json_build_object(
        'overall', (SELECT json_agg(row_to_json(r)) FROM (SELECT * FROM ranked_stats ORDER BY count DESC, km DESC LIMIT limit_val) r),
        'male', (SELECT json_agg(row_to_json(r)) FROM (SELECT * FROM ranked_stats WHERE lower(gender) = 'male' ORDER BY count DESC, km DESC LIMIT limit_val) r),
        'female', (SELECT json_agg(row_to_json(r)) FROM (SELECT * FROM ranked_stats WHERE lower(gender) = 'female' ORDER BY count DESC, km DESC LIMIT limit_val) r)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
