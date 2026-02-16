# Database Schema: 10km Relay TT Challenge (Group/Team Refined)

## 1. 개요 (Hierarchy)
- **Group (그룹)**: 가장 큰 단위 (예: '러닝 크루 A', '강남 러닝 클럽'). 그룹장이 관리.
- **Team (팀)**: 그룹 내에 속한 4인 단위 소모임. 그룹 내 경쟁/릴레이 단위.
- **Member (멤버)**: 토스 로그인을 통해 가입한 개인 유저.

## 2. 테이블 상세 설계

### 2.1. groups (그룹) - NEW
| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| id | uuid (PK) | 그룹 고유번호 |
| name | text | 그룹명 |
| leader_id | uuid (FK) | 그룹장 프로필 ID (profiles.id) |
| invite_code | varchar(8) | 그룹 참여를 위한 고유 초대 코드 |
| total_score | int | 그룹 합산 점수 (그룹간 경쟁용) |
| created_at | timestamptz | 생성일 |

### 2.2. teams (팀) - UPDATED
| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| id | uuid (PK) | 팀 고유번호 |
| group_id | uuid (FK) | 소속 그룹 ID (groups.id) |
| name | text | 팀명 |
| captain_id | uuid | 팀 대표자 ID |
| created_at | timestamptz | 생성일 |

### 2.3. profiles (사용자 프로필) - UPDATED
| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| id | uuid (PK) | auth.users.id 참조 |
| group_id | uuid (FK) | 소속 그룹 ID |
| team_id | uuid (FK) | 소속 팀 ID |
| role | text | 역할 (leader, member) |
| nickname | text | 토스 닉네임 연동 |
| created_at | timestamptz | 가입일 |

### 2.4. mission_logs (미션 인증 및 승인) - UPDATED
| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| id | uuid (PK) | 로그 고유번호 |
| group_id | uuid | 소속 그룹 (그룹장이 승인 대상을 필터링하는 기준) |
| team_id | uuid | 소속 팀 |
| status | text | 상태 (pending: 그룹장 확인 대기, approved, rejected) |
| week | int | 주차 |
| approved_by | uuid | 승인한 그룹장 ID |

*(기존 tt_records 및 attendance 테이블은 유지)*

## 3. 멤버 초대 방식 추천 (Invite System)

1. **고유 초대코드 (Invite Code)**: 
   - 그룹장이 그룹 생성 시 6~8자리의 랜덤 고유 코드를 생성합니다.
   - 새로운 멤버가 앱 진입 시 "초대코드 입력" 칸에 해당 코드를 입력하면 자동으로 그룹에 소속됩니다.
   - **장점**: 개발이 간단하고, 카카오톡/문자로 전달하기 매우 편리합니다.
2. **공유 링크 (Deep Link)**:
   - 토스 앱 내에서 링크를 공유하고, 해당 링크 클릭 시 그룹 ID가 포함된 상태로 앱이 실행됩니다.
3. **QR 코드**:
   - 오프라인 러닝 모임에서 그룹장이 화면을 보여주고 멤버들이 스캔하여 즉시 가입합니다.

**추천**: **고유 초대코드 + 공유 링크** 조합을 권장합니다.

---

## 3. 주요 쿼리 및 로직 설계

### 3.1. 팀별 기록 단축률 계산 (View 추천)
```sql
SELECT 
    team_id,
    AVG(CASE WHEN week = 6 THEN time_in_seconds END) - AVG(CASE WHEN week = 1 THEN time_in_seconds END) as improved_seconds
FROM tt_records
GROUP BY team_id;
```

### 3.2. 관리자 미션 승인 트리거
- `mission_logs` 테이블의 `status`가 'approved'로 변경될 때, 해당 유저의 `profiles` 점수나 `teams`의 합산 점수를 자동으로 업데이트하는 기능을 Supabase Edge Functions 또는 Triggers로 구현 가능합니다.

## 4. 보안 정책 (RLS)
1. **profiles**: 본인의 정보만 수정 가능, 같은 팀원은 조회 가능.
2. **mission_logs**: 본인의 로그만 생성 가능, 관리자는 모든 로그 수정(승인) 가능.
3. **teams**: 모든 유저는 조회 가능, 관리자만 생성/수정 가능.
