# TT Challenge UI/UX Design Rules

> 이 문서는 TT Challenge 앱의 UI/UX 일관성을 유지하기 위한 규칙입니다.
> 모든 새로운 컴포넌트와 수정 사항은 이 규칙을 준수해야 합니다.

---

## 1. 📐 레이아웃 (Layout)

### 1.1 전체 구조
- **최대 너비**: `500px` (`#root` max-width)
- **배경색**: `#000000` (var(--fit-black))
- **기본 구조**: Header → Content Area → Bottom Nav

### 1.2 수평 여백 (Horizontal Padding)
- **페이지 컨테이너**: `padding: 20px 16px` (`.page-container`)
- **카드 내부**: `padding: 24px` (`.card`)
- ⚠️ **금지**: 개별 섹션에 추가 `px-16`, `px-20` 등을 중복 적용하지 않는다
- ✅ **규칙**: 모든 콘텐츠 박스의 좌우 가장자리는 화면 양쪽에서 동일한 간격을 유지해야 한다

### 1.3 수직 여백 (Vertical Spacing)
| 간격 | 용도 |
|---|---|
| `4px` | 같은 그룹 내 미세 간격 (라벨-값) |
| `8px` | 인접 요소 간 기본 간격 |
| `12px` | 카드 내 요소 간 간격, 그리드 갭 |
| `16px` | 섹션 내 블록 간 간격 |
| `20px` | 소제목과 콘텐츠 간 간격 |
| `24px` | 카드 간 간격 |
| `32px` | 큰 섹션 간 간격 |
| `40px` | 메인 섹션 구분 |

### 1.4 그리드 시스템
- **2열 그리드**: `grid-template-columns: repeat(2, minmax(0, 1fr))` 사용
- **3열 그리드**: `grid-template-columns: repeat(3, 1fr)` 사용  
- **갭**: `12px` 기본
- ⚠️ **금지**: `1fr 1fr`처럼 단순 표기를 쓰지 않는다 (overflow 방지를 위해 `minmax(0, 1fr)` 사용)

---

## 2. 🎨 색상 (Colors)

### 2.1 기본 팔레트
| 변수 | 값 | 용도 |
|---|---|---|
| `--fit-black` | `#000000` | 배경 |
| `--fit-dark-100` | `#1a1a1b` | 카드 테두리 |
| `--fit-dark-200` | `#2c2c2e` | 보조 배경 |
| `--fit-green` | `#baff00` | 주요 강조색 (CTA, 활성 상태) |
| `--fit-green-dim` | `rgba(186,255,0,0.1)` | 녹색 배경 효과 |
| `--fit-red` | `#ff3b30` | 경고, 삭제 |
| `--fit-gray-100` | `#f2f4f6` | 밝은 텍스트 |
| `--fit-gray-400` | `#8e8e93` | 보조 텍스트 |
| `--fit-gray-600` | `#48484a` | 비활성 아이콘, 테두리 |
| `--fit-gray-800` | `#1c1c1e` | 카드 배경 |
| `--fit-white` | `#ffffff` | 주요 텍스트 |

### 2.2 색상 사용 규칙
- ✅ **CTA 버튼**: `--fit-green` 배경 + `--fit-black` 텍스트
- ✅ **보조 버튼**: `--fit-gray-800` 배경 + `--fit-white` 텍스트
- ✅ **활성 네비게이션**: `--fit-green`
- ✅ **비활성 네비게이션**: `--fit-gray-600`
- ⚠️ **금지**: 하드코딩된 색상값 사용 (반드시 CSS 변수를 사용)

---

## 3. 📝 타이포그래피 (Typography)

### 3.1 폰트
- **기본 폰트**: Pretendard Variable
- **Fallback**: -apple-system, BlinkMacSystemFont, system-ui

### 3.2 크기 체계
| 클래스 | 크기 | 용도 |
|---|---|---|
| `font-11` | 11px | 뱃지, 라벨 |
| `font-12` | 12px | 보조 정보 |
| `font-14` | 14px | 본문 텍스트 |
| `font-15` | 15px | 서브 텍스트 |
| `font-16` | 16px | 버튼 텍스트 |
| `font-18` / `text-18` | 18px | 소제목 |
| `font-22` | 22px | 중간 제목 |
| `font-24` | 24px | 큰 제목 |
| `font-32` | 32px | 메인 타이틀 |

### 3.3 폰트 굵기
| 값 | 용도 |
|---|---|
| `400` | 본문 |
| `600` | 강조 텍스트 |
| `700` (`.bold`) | 제목, 버튼 |
| `800` | 대형 숫자, 메인 타이틀 |
| `900` | 히어로 텍스트 |

---

## 4. 🔲 컴포넌트 (Components)

### 4.1 카드
- **배경**: `--fit-gray-800` (`#1c1c1e`)
- **테두리 반경**: `16px` (기본), `20px` (대형 카드)
- **내부 여백**: `24px` (기본), `20px 24px` (히어로 카드)
- **테두리**: `1px solid var(--fit-dark-100)` (선택)

### 4.2 버튼
| 타입 | 클래스 | 배경 | 텍스트 | 테두리 반경 |
|---|---|---|---|---|
| Primary | `.btn-primary` | `--fit-green` | `--fit-black` | `8px` |
| Primary Large | `.btn-primary-lg` | `--fit-green` | `--fit-black` | `14px` |
| Secondary | `.btn-secondary` | `--fit-gray-800` | `--fit-white` | `8px` |
| Dark Large | `.btn-dark-lg` | `--fit-gray-800` | `--fit-white` | `14px` |
| Green Outline | `.btn-green-outline` | transparent | `--fit-green` | `8px` |

### 4.3 인풋
- **배경**: `--fit-gray-800`
- **텍스트 색상**: `--fit-white`
- **테두리**: `1px solid var(--fit-gray-600)` (기본) → `var(--fit-green)` (포커스)
- **테두리 반경**: `12px`
- **내부 여백**: `16px 20px`

### 4.4 네비게이션 바
- **높이**: `65px`
- **배경**: `rgba(0, 0, 0, 0.9)` + `backdrop-filter: blur(20px)`
- **위치**: `sticky bottom: 0`
- **아이콘 크기**: `22px`
- **라벨 크기**: `11px`

---

## 5. 🎬 애니메이션 (Animation)

### 5.1 페이지 전환
- **효과**: `opacity + translateX` (Framer Motion)
- **진입**: `{ opacity: 0, x: 20 }` → `{ opacity: 1, x: 0 }`
- **퇴장**: `{ opacity: 0, x: -20 }`
- **지속 시간**: `0.3s`

### 5.2 버튼 터치 효과
- **크기 변화**: `transform: scale(0.96)` on `:active`
- **전환**: `transition: all 0.2s`

### 5.3 로딩 화면
- **위치**: `position: fixed; inset: 0` (전체 화면 정중앙)
- **z-index**: `9999`
- **아이콘**: 펄스 애니메이션 (`1.5s ease-in-out infinite`)
- **배경**: `#000`

---

## 6. 🏗️ 코드 아키텍처 (Code Architecture)

### 6.1 데이터베이스 호출 규칙
- ✅ **정적 임포트**: `import * as db from './lib/database'` 사용
- ✅ **직접 호출**: `db.createGroup(...)` 형태로 호출
- ⚠️ **금지**: `const dbModule = await db;` 패턴 사용 금지 (AbortError 원인)
- ⚠️ **금지**: `React.useMemo(() => import(...))` 동적 임포트 패턴 사용 금지

### 6.2 상태 관리 규칙
- **낙관적 업데이트**: UI 먼저 업데이트 후, DB에 반영 (try-catch로 실패 시 롤백)
- **로딩 상태**: `useState(true)`로 초기화, `finally` 블록에서 `setLoading(false)`
- **중복 요청 방지**: 폼 제출 시 `isSubmitting` 상태를 사용

### 6.3 병렬 데이터 로딩
- ✅ **사용**: `Promise.all([db.a(), db.b(), db.c()])` 으로 병렬 요청
- ⚠️ **금지**: 순차적 `await` 체인 (성능 저하 원인)

### 6.4 CSS 유틸리티 관리
- **기본 유틸리티**: `index.css`에 정의 (마진, 패딩, 폰트, 플렉스 등)
- **컴포넌트 스타일**: `App.css`에 정의
- ⚠️ **주의**: 동일 유틸리티 클래스가 `index.css`와 `App.css`에 중복 정의되지 않도록 관리
- ⚠️ **금지**: Tailwind 전용 클래스 사용 (`fixed`, `inset-0`, `z-[9999]` 등 → 직접 CSS 작성)

---

## 7. 📱 반응형 (Responsiveness)

### 7.1 기본 규칙
- **최소 너비**: `320px`
- **최대 너비**: `500px` (모바일 앱 형태)
- **오버플로우**: `overflow-x: hidden` (`#root`에 적용)

### 7.2 그리드 반응형
- 2열 그리드에서 `minmax(0, 1fr)` 사용으로 콘텐츠 오버플로우 방지
- 카드 내부 패딩을 적절히 조절 (`24px 16px` 등)

---

## 8. ✅ 체크리스트

새로운 UI 작업 시 확인해야 할 항목:

- [ ] 모든 박스의 좌우 가장자리가 정렬되어 있는가?
- [ ] CSS 변수를 사용하고 있는가? (하드코딩 색상 X)
- [ ] 버튼에 `:active` 터치 피드백이 있는가?
- [ ] 카드 배경이 `--fit-gray-800`을 사용하는가?
- [ ] DB 호출이 `db.xxx()` 직접 호출 형태인가?
- [ ] 병렬 가능한 DB 요청이 `Promise.all`로 묶여 있는가?
- [ ] 폼 제출에 `isSubmitting` 중복 방지가 있는가?
- [ ] `font-weight`, `font-size`가 정의된 체계를 따르는가?
- [ ] 여백이 4의 배수 체계(4, 8, 12, 16, 20, 24, 32, 40)를 따르는가?
