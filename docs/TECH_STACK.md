# Technology Stack: 10km Relay TT Challenge (AppinToss)

본 프로젝트는 **AppinToss(토스 인앱 웹뷰)** 환경에서 최상의 퍼포먼스와 네이티브에 가까운 사용자 경험을 제공하기 위해 다음과 같은 기술 스택을 채택합니다.

## 1. Frontend Framework
- **Core**: `React 18` + `TypeScript`
  - **선택 이유**: 강한 타입 안정성과 풍부한 에코시스템. 토스 디자인 시스템(TDS)과의 높은 호환성.
- **Build Tool**: `Vite`
  - **선택 이유**: Next.js보다 가볍고 빠른 HMR(Hot Module Replacement)을 제공하며, 단일 페이지 앱(SPA) 기반의 웹뷰 환경에서 최적의 로딩 속도를 보장.

## 2. Styling & Design
- **Styling**: `Vanilla CSS` + `Modular Design`
  - **선택 이유**: 현재 프로토타입의 블랙 & 그린 테마를 가장 세밀하게 제어 가능. (추후 확정 시 Tailwind CSS 도입 검토)
- **Animation**: `Framer Motion`
  - **선택 이유**: 앱 수준의 부드러운 화면 전환 및 인터랙션 구현.
- **Icons**: `Lucide React`
  - **선택 이유**: 가볍고 확장성이 뛰어나며 현대적인 라인 아이콘 스타일 유지.

## 3. State Management & Data Fetching
- **Server State**: `TanStack Query (React Query) v5` (도입 예정)
  - **선택 이유**: 데이터 캐싱 및 미션 승인 상태 업데이트 시 자동 리프레시 처리 용이.
- **Client State**: `Zustand`
  - **선택 이유**: Redux보다 가볍고 단순한 보일러플레이트로 팀/유저 정보 전역 관리.

## 4. Backend & Database (추천)
- **BaaS**: `Supabase`
  - **선택 이유**: 
    - **PostgreSQL**: 팀 기록 및 랭킹 산출을 위한 강력한 쿼리 기능.
    - **Realtime**: 관리자가 승인을 누르는 즉시 유저 화면에 반영되는 실시간 업데이트 기능.
    - **Storage**: 러닝 미션 인증 사진 업로드 및 관리.
    - **Auth**: 토스 인증 연동 전 초기 유저 식별용으로 적합.

## 5. AppinToss Integration (WebView)
- **Bridge**: `Toss WebView Bridge` API 활용 (예상)
  - **Auth**: 토스 유저 정보 및 본인 인증 연동.
  - **Native Features**: 사진 촬영(Camera), 저장공간 접근, 진동(Haptics), 푸시 알림 연동.
  - **Health Data**: IOS(HealthKit) 및 Android(Google Fit) 연동을 통한 러닝 데이터 자동 수집.

## 6. Infrastructure
- **Deployment**: `Vercel` 또는 `토스 내부 인프라`
- **CI/CD**: GitHub Actions

---

## 7. 기술적 고려사항 (WebView Optimization)
1. **Safe Area**: 상단 노치 및 하단 홈 바 영역에 대응하는 CSS `env(safe-area-inset-*)` 설정. (적용 완료)
2. **Fast Load**: 주요 자산 이미지 최적화 및 코드 스플리팅을 통한 첫 페이지 진입 속도 1.5초 이내 달성.
3. **Micro-interactions**: 토스 특유의 사용자 경험을 위해 버튼 클릭 시의 햅틱 피드백 및 트랜지션 디테일 강화.
