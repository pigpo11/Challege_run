-- ============================================
-- TT Challenge - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. profiles (사용자 프로필)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text UNIQUE NOT NULL,
  password text NOT NULL, -- 6자리 PIN (해시 권장, 현재는 평문)
  profile_pic text,
  status_message text DEFAULT '러닝 열정 폭발 🔥',
  monthly_distance numeric DEFAULT 0,
  monthly_goal numeric DEFAULT 100,
  last_updated_month int DEFAULT EXTRACT(MONTH FROM NOW()),
  pbs jsonb DEFAULT '{"1KM":"00''00\"","3KM":"00''00\"","5KM":"00''00\"","10KM":"00''00\""}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- 2. groups (그룹)
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  leader_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  invite_code varchar(8) UNIQUE NOT NULL,
  total_score int DEFAULT 0,
  total_distance numeric DEFAULT 0,
  created_at timestamptz DEFAULT NOW()
);

-- 3. teams (팀)
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- 4. group_members (그룹-유저 연결 테이블)
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member', -- 'leader' or 'member'
  joined_at timestamptz DEFAULT NOW(),
  UNIQUE(group_id, profile_id)
);

-- 5. team_members (팀-유저 연결 테이블)
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT NOW(),
  UNIQUE(team_id, profile_id)
);

-- 6. missions (미션 인증)
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL, -- 빠른 조회용 비정규화
  week int NOT NULL,
  type text NOT NULL, -- '챌린지 인증' or '개인 러닝'
  status text DEFAULT 'pending', -- 'pending', 'approved', 'none'
  records jsonb DEFAULT '{}'::jsonb,
  distance numeric DEFAULT 0,
  images text[] DEFAULT '{}',
  liked_by text[] DEFAULT '{}',
  created_at timestamptz DEFAULT NOW()
);

-- 7. comments (미션 댓글)
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- 8. challenges (주차별 챌린지)
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week int NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  record_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- ============================================
-- Insert default challenges
-- ============================================
INSERT INTO challenges (week, title, description, record_fields) VALUES
  (1, '베이스라인 설정', '1/3/5km 개인 TT 측정 및 목표 설정', '[{"id":"1KM","label":"1KM","placeholder":"00:00","unit":""},{"id":"3KM","label":"3KM","placeholder":"00:00","unit":""},{"id":"5KM","label":"5KM","placeholder":"00:00","unit":""}]'::jsonb),
  (2, '심폐 & 파워 강화', '트레드밀 업힐 인터벌 및 러닝 파워 집중', '[{"id":"power","label":"파워","placeholder":"250W","unit":"W"},{"id":"hr","label":"심박","placeholder":"165bpm","unit":"bpm"}]'::jsonb),
  (3, '스피드 개발', '스프린트 훈련을 통한 최고속도 향상', '[{"id":"sprint","label":"100m","placeholder":"15s","unit":"s"}]'::jsonb),
  (4, '팀 실전 테스트', '팀 5km 릴레이 TT 및 실전 점검', '[{"id":"relay","label":"5KM","placeholder":"20:00","unit":""}]'::jsonb),
  (5, '디로드 & 회복', '저강도 러닝 및 리커버리 세션', '[{"id":"recovery","label":"회복","placeholder":"느낌","unit":""}]'::jsonb),
  (6, '레이스 준비', '영양 관리 및 최상의 컨디션 조절', '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS Policies (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations for authenticated users (anon key)
-- In production, tighten these based on user roles
CREATE POLICY "Allow all for anon" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON missions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON challenges FOR ALL USING (true) WITH CHECK (true);
