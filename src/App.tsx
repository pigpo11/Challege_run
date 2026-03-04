import React, { useState, useRef, useEffect } from 'react';
import { Home, Trophy, Calendar, Settings, ChevronLeft, ChevronDown, Camera, Check, Plus, ArrowRight, Activity, Zap, Share2, UserPlus, Shield, User, Trash, Edit2, X, MoreVertical, Heart, MessageCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createWorker } from 'tesseract.js';
import imageCompression from 'browser-image-compression';
import * as db from './lib/database';
import './App.css';

type Group = {
  id: string;
  name: string;
  leaderId: string;
  inviteCode: string;
  totalScore: number;
  totalDistance: number;
  activeWeek?: number;
};

type Team = {
  id: string;
  groupId: string;
  name: string;
  members: string[];
  bonusPoints: number;
};


type Mission = {
  id: string;
  groupId: string;
  teamId: string;
  profileId: string;
  userName: string;
  week: number;
  type: string;
  status: 'pending' | 'approved' | 'none';
  timestamp?: string;
  records?: { [key: string]: string };
  distance?: number;
  images?: string[];
  likedBy: string[];
  comments: Comment[];
};



type Comment = {
  id: string;
  userName: string;
  text: string;
  timestamp: string;
};

type WeeklyChallenge = {
  id: string;
  week: number;
  title: string;
  description: string;
  recordFields?: { id: string; label: string; placeholder?: string; unit?: string; category?: 'personal' | 'strength' | 'team'; sub?: string }[];
};

const WEEK1_STRUCTURE = {
  personal: [
    { id: 'p1', title: '정규수업 주 4회 참여', sub: '스페셜 클래스 포함' },
    { id: 'p2', title: '주 4일 5km 러닝', sub: '트레드밀, 무동력 트레드밀, 야외러닝' },
  ],
  strength: [
    { id: 's1', title: 'Bulgarian Split Squat', sub: '12 REPS / LEG x 5 SETS' },
    { id: 's2', title: 'Sled Push 40m', sub: '40M PUSH x 5 SETS' },
    { id: 's3', title: '복근 운동', sub: '영상 루틴 수행' },
  ],
  team: [
    { id: 't1', title: '팀 미션 (전부 수행)', sub: '① EMOM 10 + ② 트레드밀 인터벌' },
  ]
};

const calculatePoints = (missions: Mission[], userName: string, challenges?: WeeklyChallenge[]) => {
  const userMissions = missions.filter(m => {
    if (m.status !== 'approved') return false;
    // 내가 업로드한 경우
    if (m.userName === userName) return true;
    // 내가 파트너로 지목된 경우 (2인 미션) - 여전히 개인 득점에 기여할 수 있는 파트너 성과
    if (m.records?.partnerName === userName) return true;
    return false;
  });

  // Group missions by week
  const missionsByWeek = userMissions.reduce((acc: any, m) => {
    if (!acc[m.week]) acc[m.week] = [];
    acc[m.week].push(m);
    return acc;
  }, {});

  let totalScore = 0;

  Object.keys(missionsByWeek).forEach(weekStr => {
    const week = parseInt(weekStr);
    const weeklyMissions = missionsByWeek[week];

    const completedIds = weeklyMissions.map((m: Mission) => m.records?.missionId).filter(Boolean);
    let weeklyScore = 0;

    const currentChallenge = challenges?.find(c => c.week === week);
    const dbPersonal = currentChallenge?.recordFields?.filter(f => f.category === 'personal') || [];
    const dbStrength = currentChallenge?.recordFields?.filter(f => f.category === 'strength') || [];
    const dbTeam = currentChallenge?.recordFields?.filter(f => f.category === 'team') || [];

    // Personal (Already capped: 1 id match = 3, 2 ids match = 7)
    const pFields = currentChallenge ? dbPersonal : (week === 1 ? WEEK1_STRUCTURE.personal : []);
    const pCount = pFields.filter(m => completedIds.includes(m.id)).length;
    if (pCount >= 2) weeklyScore += 7;
    else if (pCount === 1) weeklyScore += 3;

    // Strength (Already capped: all ids match = 10)
    const sFields = currentChallenge ? dbStrength : (week === 1 ? WEEK1_STRUCTURE.strength : []);
    const sCount = sFields.filter((m: any) => completedIds.includes(m.id)).length;
    if (sCount >= sFields.length && sFields.length > 0) weeklyScore += 10;
    const tFields = currentChallenge ? dbTeam : (week === 1 ? WEEK1_STRUCTURE.team : []);

    totalScore += weeklyScore;

    // Fallback for non-structured challenge missions (Category-less)
    if (pFields.length === 0 && sFields.length === 0 && tFields.length === 0) {
      if (weeklyMissions.some((m: Mission) => m.type === '챌린지 인증')) {
        totalScore += 10;
      }
    }
  });

  return totalScore;
};

const calculateTeamMissionPoints = (missions: Mission[], teamId: string, challenges?: WeeklyChallenge[]) => {
  const teamMissions = missions.filter(m => m.teamId === teamId && m.status === 'approved');
  if (teamMissions.length === 0) return 0;

  // Group by week
  const missionsByWeek = teamMissions.reduce((acc: any, m) => {
    if (!acc[m.week]) acc[m.week] = [];
    acc[m.week].push(m);
    return acc;
  }, {});

  let totalTeamScore = 0;
  Object.keys(missionsByWeek).forEach(weekStr => {
    const week = parseInt(weekStr);
    const weeklyMissions = missionsByWeek[week];
    const currentChallenge = challenges?.find(c => c.week === week);
    const tFields = currentChallenge?.recordFields?.filter(f => f.category === 'team') || (week === 1 ? WEEK1_STRUCTURE.team : []);

    const validTeamMissions = weeklyMissions.filter((m: Mission) => tFields.some(tf => tf.id === m.records?.missionId));

    let weeklySum = 0;
    validTeamMissions.forEach((tm: any) => {
      let score = 0;
      const pc = parseInt(tm.records?.participantCount || '1');
      if (pc >= 3) score = 45;
      else if (pc >= 2) score = 20;
      else score = 4;
      weeklySum += score;
    });
    // Cap at 45 per week by summing all, but clamping to maximum 45
    totalTeamScore += Math.min(45, weeklySum);
  });

  return totalTeamScore;
};



const OnboardingView = ({ onCreate, onJoin, onBack, allGroupNames }: { onCreate: (n: string) => void, onJoin: (c: string) => void, onBack: () => void, allGroupNames: string[] }) => {
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="page-container flex flex-col justify-center h-full px-24 bg-black">
      <div className="text-center mb-48">
        <div className="onboarding-icon-box mx-auto mb-20">
          <Activity size={36} className="text-green" />
        </div>
        <h1 className="text-white text-32 bold tracking-tight">TT Challenge</h1>
        <p className="text-gray mt-12 font-15">그룹을 생성하거나 초대코드로 참여하세요</p>
      </div>

      <div className="onboarding-content">
        {mode === 'choice' && (
          <div className="flex flex-col gap-16">
            <button className="btn-primary-lg" onClick={() => setMode('create')}>
              <Plus size={20} /> 그룹 생성하기 (그룹장)
            </button>
            <button className="btn-secondary-lg" onClick={() => setMode('join')}>
              <UserPlus size={20} /> 초대코드로 그룹 가입
            </button>
            <button className="btn-dark-lg mt-8" onClick={onBack}>
              뒤로가기
            </button>
          </div>
        )}

        {mode === 'create' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="onboarding-form">
            <h3 className="text-white mb-20 text-18 bold">새로운 그룹 만들기</h3>
            <div className="onboarding-fields">
              <input
                type="text"
                className="fit-input-lg"
                placeholder="멋진 그룹 이름을 지어주세요"
                value={value}
                onChange={e => setValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-16 mt-24">
                <button className="btn-dark-lg flex-1" onClick={() => { setMode('choice'); setValue(''); setError(''); }}>뒤로가기</button>
                <button className="btn-primary-lg flex-1" onClick={() => {
                  if (allGroupNames.includes(value.trim())) {
                    setError('중복되는 그룹명입니다.');
                    return;
                  }
                  setError('');
                  onCreate(value);
                }}>그룹 생성</button>
              </div>
              {error && <p className="error-msg-premium text-center">{error}</p>}
            </div>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="onboarding-form">
            <h3 className="text-white mb-20 text-18 bold">그룹 초대코드 입력</h3>
            <div className="onboarding-fields">
              <input
                type="text"
                className="fit-input-lg"
                placeholder="6자리 초대코드"
                value={value}
                onChange={e => setValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-16 mt-24">
                <button className="btn-dark-lg flex-1" onClick={() => { setMode('choice'); setValue(''); setError(''); }}>뒤로가기</button>
                <button className="btn-primary-lg flex-1" onClick={() => onJoin(value.toUpperCase())}>그룹 참가</button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
const GroupSelectorView = ({
  myGroups,
  onSelect,
  onAddNew,
  onBack
}: {
  myGroups: Group[],
  onSelect: (id: string) => void,
  onAddNew: () => void,
  onBack: () => void
}) => {
  return (
    <div className="page-container flex flex-col justify-center h-full px-24 bg-black">
      <div className="text-center mb-40">
        <h1 className="text-white text-32 bold tracking-tighter">그룹 전환</h1>
        <p className="text-gray mt-12 font-15">참여 중인 그룹을 선택하거나<br />새로운 그룹에 도전해보세요</p>
      </div>

      <div className="flex flex-col gap-12 max-h-360 overflow-y-auto scroll-hide pr-2">
        {myGroups.map(g => (
          <div key={g.id} className="group-select-card" onClick={() => onSelect(g.id)}>
            <div className="flex-1">
              <h3 className="text-white text-18 bold">{g.name}</h3>
            </div>
            <p className="text-green font-12 bold uppercase tracking-wider shrink-0">전환하기</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-12 mt-32">
        <button className="btn-primary-lg py-20" onClick={onAddNew}>
          <Plus size={20} /> 새로운 그룹 참가하기
        </button>

        <button className="btn-dark-lg py-20" onClick={onBack}>
          뒤로가기
        </button>
      </div>
    </div>
  );
};


const AuthView = ({ onLogin, onSignup, allUserNames }: { onLogin: (name: string, pass: string) => boolean | Promise<boolean>, onSignup: (data: any) => void, allUserNames: string[] }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState(1);

  // Login State
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Signup State
  const [newName, setNewName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [newGoal, setNewGoal] = useState('100');
  const [signupError, setSignupError] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);
  const confirmPinInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus PIN input when step changes
  useEffect(() => {
    if (signupStep === 2) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } else if (signupStep === 3) {
      setTimeout(() => confirmPinInputRef.current?.focus(), 100);
    }
  }, [signupStep]);

  const handleLogin = async () => {
    const result = await onLogin(loginName, loginPass);
    if (!result) {
      setLoginError('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  };

  const nextSignupStep = () => {
    if (signupStep === 1) {
      if (!newName.trim()) return;
      if (allUserNames.includes(newName.trim())) {
        setSignupError('중복된 닉네임 입니다.');
        return;
      }
      setSignupError('');
    }
    if (signupStep === 3) {
      if (newPass !== confirmPass) {
        setSignupError('비밀번호가 일치하지 않습니다.');
        return;
      }
      setSignupError('');
    }
    setSignupStep(prev => prev + 1);
  };

  const handleSignupComplete = () => {
    onSignup({
      name: newName,
      password: newPass,
      monthlyGoal: newGoal
    });
  };

  const renderPinInput = (value: string, onChange: (v: string) => void, ref: React.RefObject<HTMLInputElement | null>) => {
    return (
      <div className="flex flex-col items-center">
        <div
          className="pin-input-container cursor-pointer"
          onClick={() => ref.current?.focus()}
        >
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`pin-box ${value.length === i ? 'active' : ''} ${value.length > i ? 'filled' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (value.length > i) {
                  onChange(value.substring(0, i));
                }
                ref.current?.focus();
              }}
            >
              {value[i] ? (i < value.length - 1 ? '*' : value[i]) : '-'}
            </div>
          ))}
          <input
            ref={ref}
            type="tel"
            pattern="[0-9]*"
            maxLength={6}
            className="auth-hidden-input"
            value={value}
            onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </div>
      </div>
    );
  };

  const renderSignupStep = () => {
    switch (signupStep) {
      case 1: // Nickname
        return (
          <div className="auth-container relative">
            <button className="auth-back-btn" onClick={() => setMode('login')}><ChevronLeft size={28} /></button>
            <div className="auth-header">
              <h1 className="auth-title">반가워요!<br />닉네임을 알려주세요</h1>
              <p className="auth-subtitle">챌린지에서 사용할 이름이에요</p>
            </div>
            <div className="auth-input-wrapper">
              <input
                type="text"
                className="auth-input text-center"
                placeholder="닉네임 입력"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            {signupError && <p className="error-msg-premium text-center">{signupError}</p>}
            <button className="auth-btn-primary" disabled={!newName.trim()} onClick={nextSignupStep}>다음</button>
          </div>
        );
      case 2: // Password
        return (
          <div className="auth-container relative">
            <button className="auth-back-btn" onClick={() => { setNewPass(''); setSignupError(''); setSignupStep(1); }}><ChevronLeft size={28} /></button>
            <div className="auth-header">
              <h1 className="auth-title">로그인 시 사용할<br />숫자 6자리를 입력해주세요</h1>
            </div>
            {renderPinInput(newPass, setNewPass, pinInputRef)}
            <button className="auth-btn-primary" disabled={newPass.length < 6} onClick={nextSignupStep}>다음</button>
          </div>
        );
      case 3: // Password Confirm
        return (
          <div className="auth-container relative">
            <button className="auth-back-btn" onClick={() => { setConfirmPass(''); setSignupError(''); setSignupStep(2); }}><ChevronLeft size={28} /></button>
            <div className="auth-header">
              <h1 className="auth-title">비밀번호를<br />한 번 더 입력해 주세요</h1>
            </div>
            {renderPinInput(confirmPass, setConfirmPass, confirmPinInputRef)}
            {signupError && <p className="error-msg-premium text-center">{signupError}</p>}
            <button className="auth-btn-primary" disabled={confirmPass.length < 6} onClick={nextSignupStep}>다음</button>
          </div>
        );
      case 4: // Monthly Goal
        return (
          <div className="auth-container relative">
            <button className="auth-back-btn" onClick={() => { setNewGoal('100'); setSignupStep(3); }}><ChevronLeft size={28} /></button>
            <div className="auth-header">
              <h1 className="auth-title">이번 달 목표 러닝 마일리지를<br />설정해 주세요</h1>
              <p className="auth-subtitle">나에게 맞는 목표를 정해보세요</p>
            </div>
            <div className="auth-input-wrapper">
              <input
                type="number"
                className="auth-input text-24 font-bold text-center"
                placeholder="100"
                value={newGoal}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setNewGoal(v);
                }}
                autoFocus
              />
              <span className="text-white font-20 ml-8">km</span>
            </div>
            <button className="auth-btn-primary" onClick={handleSignupComplete}>시작하기</button>
          </div>
        );
      default: return null;
    }
  };

  if (mode === 'signup') return renderSignupStep();

  return (
    <div className="auth-container">
      <div className="flex-center flex-col mb-48">
        <Zap size={64} fill="var(--fit-green)" color="var(--fit-green)" strokeWidth={0} className="mb-20" />
        <h1 className="text-white text-36 bold italic tracking-tight">TT Challenge</h1>
      </div>

      <div className="auth-input-group">
        <div className="auth-input-wrapper">
          <User className="auth-input-icon" size={20} />
          <input
            type="text"
            className="auth-input"
            placeholder="닉네임"
            value={loginName}
            onChange={e => setLoginName(e.target.value)}
          />
        </div>
        <div className="auth-input-wrapper">
          <Shield className="auth-input-icon" size={20} />
          <input
            type="password"
            maxLength={6}
            className="auth-input"
            placeholder="비밀번호 (6자리 숫자)"
            value={loginPass}
            onChange={e => setLoginPass(e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>

      {loginError && <p className="error-msg-premium">{loginError}</p>}

      <button className="auth-btn-primary" onClick={handleLogin}>로그인</button>

      <div className="text-center">
        <button className="auth-btn-text" onClick={() => setMode('signup')}>처음이신가요?</button>
      </div>
    </div>
  );
};

const HomeView = ({ group, allGroups, groupMemberMappings, team, missions, userInfo, onStartInput, currentWeek, challenges }: { group: Group | null, allGroups: Group[], groupMemberMappings: { groupId: string, userName: string }[], team: Team | null, missions: Mission[], userInfo: any, onStartInput: () => void, currentWeek: number, challenges: WeeklyChallenge[] }) => {
  const myMissions = missions.filter(m => (team ? m.teamId === team.id : !m.teamId) && m.week === currentWeek && m.userName === userInfo.name);
  const currentChallenge = challenges.find(c => c.week === currentWeek);

  const aggregateStatus = myMissions.length === 0 ? 'none' :
    myMissions.some(m => m.status === 'pending') ? 'pending' : 'approved';

  const myPoints = calculatePoints(missions, userInfo.name, challenges);
  const teamIndividualPoints = team ? team.members.reduce((sum, name) => sum + calculatePoints(missions, name, challenges), 0) : 0;
  const teamMissionScore = team ? calculateTeamMissionPoints(missions, team.id, challenges) : 0;
  const teamPoints = teamIndividualPoints + teamMissionScore + (team?.bonusPoints || 0);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentMonthMissions = missions.filter(m => {
    const d = new Date(m.timestamp || new Date());
    return (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
  });

  const sortedGroupsByDistance = [...allGroups].map(g => {
    // Get all members for this group
    const memberNames = groupMemberMappings.filter(gm => gm.groupId === g.id).map(gm => gm.userName);

    // Sum distance of all these members in the current month
    const monthlyDist = currentMonthMissions
      .filter(m => memberNames.includes(m.userName) && (m.status === 'approved' || m.type === '개인 러닝'))
      .reduce((sum, m) => sum + (m.distance || 0), 0);

    return { ...g, monthlyDistance: monthlyDist };
  }).sort((a, b) => b.monthlyDistance - a.monthlyDistance);

  const myGroupRank = group ? sortedGroupsByDistance.findIndex(g => g.id === group.id) + 1 : null;
  const myGroupData = group ? sortedGroupsByDistance.find(g => g.id === group.id) : null;

  return (
    <div className="page-container">
      <div className="summary-section">
        <div className="flex-between">
          <p className="text-green font-20 uppercase tracking-widest" style={{ fontWeight: 800 }}>{group ? 'GROUP' : 'INDIVIDUAL'}</p>
          {myGroupRank && <span className="text-white font-12 bold">전체 {myGroupRank}위</span>}
        </div>
        <h1 className="main-title">{team ? `팀 ${team.name}` : userInfo.name}</h1>
      </div>
      {!group ? (
        <>
          <div className="mt-32">
            <div className="distance-hero-card">
              <div className="flex-between">
                <div className="flex items-center gap-12">
                  <Activity size={20} className="text-green" />
                  <p className="text-gray-400 font-16 bold">{new Date().getMonth() + 1}월 러닝 마일리지</p>
                </div>
                <div className="mileage-goal-wrap mt-0">
                  <span className="mileage-goal-txt">목표 {Number(userInfo.monthlyGoal).toFixed(2)}km 대비</span>
                </div>
              </div>

              <div className="stat-card-distance">
                <div className="mileage-card-v2">
                  <span className="mileage-current" style={{ fontSize: '42px' }}>
                    {Number(userInfo.monthlyDistance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="font-18 text-gray-600 ml-4 font-normal">km</span>
                  </span>
                  <div className="mileage-progress-bar-wrap mt-16">

                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (parseFloat(userInfo.monthlyDistance) / parseFloat(userInfo.monthlyGoal)) * 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="mileage-progress-fill"
                    />
                  </div>
                  <div className="mileage-percent-wrap">
                    <span className="mileage-percent-txt">{Math.round((parseFloat(userInfo.monthlyDistance) / parseFloat(userInfo.monthlyGoal)) * 100)}% 달성</span>
                  </div>
                </div>
              </div>
            </div>





            <div className="verification-hero-card mt-16">
              <div className="verif-text-group">
                <h3 className="text-white font-16 bold">오늘의 러닝 인증하기</h3>
                <p className="text-gray-500 font-13">기록을 남기고 성장을 확인하세요🔥</p>
              </div>
              <button className="camera-action-btn" onClick={onStartInput}>
                <Camera size={24} />
              </button>
            </div>
          </div>

          <div className="section-header flex-between mt-40">
            <h3 className="section-title-alt">그룹 랭킹</h3>
          </div>

          <div className="group-mini-ranking mt-12">
            {(sortedGroupsByDistance as any[]).slice(0, 10).map((g: any, i: number) => (
              <div key={g.id} className="mini-rank-item">
                <span className="rank-num">{i + 1}</span>
                <span className="group-name">{g.name}</span>
                <span className="group-score">{(g.monthlyDistance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km</span>
              </div>
            ))}
          </div>

          <div className="section-header flex-between mt-40">
            <h3 className="section-title-alt">활동 퍼포먼스</h3>
          </div>

          <div className="mt-12">
            <div className="stat-card" style={{ width: '100%', minHeight: 'auto' }}>
              <div className="stat-card-header">
                <Activity size={18} className="text-green" />
                <p className="stat-card-title">Personal Bests</p>
              </div>

              <div className="pb-grid">
                <div className="pb-item">
                  <span className="pb-dist bold">1KM</span>
                  <span className="pb-time">{userInfo.pbs['1KM']}</span>
                </div>
                <div className="pb-item">
                  <span className="pb-dist bold">3KM</span>
                  <span className="pb-time">{userInfo.pbs['3KM']}</span>
                </div>
                <div className="pb-item">
                  <span className="pb-dist bold">5KM</span>
                  <span className="pb-time">{userInfo.pbs['5KM']}</span>
                </div>
                <div className="pb-item">
                  <span className="pb-dist bold">10KM</span>
                  <span className="pb-time">{userInfo.pbs['10KM']}</span>
                </div>

              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card mission-status-card mt-32">
            <div className="flex-between items-start mb-24">
              <div className="flex-1 min-w-0">
                <h3 className="text-white">{currentWeek}주차 미션</h3>
                <p className="text-gray font-14 truncate-2-lines">{currentChallenge ? `${currentChallenge.title}` : '진행 중인 미션이 없습니다.'}</p>
              </div>
              <div className={`status-pill ${aggregateStatus} ml-12`}>
                {aggregateStatus === 'approved' ? '승인완료' : aggregateStatus === 'pending' ? '승인대기' : '미제출'}
              </div>
            </div>

            {((currentChallenge?.recordFields && currentChallenge.recordFields.some(f => f.category)) || (currentWeek === 1 && !currentChallenge)) && (
              <div className="mission-container flex flex-col gap-24 mt-32">
                {['personal', 'strength', 'team'].map(cat => {
                  const dbFields = currentChallenge?.recordFields?.filter(f => f.category === cat) || [];
                  // If challenge object exists, show its fields. If not, fallback to hardcoded ONLY for Week 1.
                  const fields = currentChallenge
                    ? dbFields
                    : (currentWeek === 1 ? (WEEK1_STRUCTURE as any)[cat] : []);

                  if (fields.length === 0) return null;

                  return (
                    <div key={cat} className="mission-category-section">
                      <div className="category-header">
                        <div className="category-title-wrap">
                          {cat === 'personal' ? <Zap size={18} className="text-green" /> :
                            cat === 'strength' ? <Activity size={18} className="text-green" /> :
                              <Trophy size={18} className="text-green" />}
                          <span className="category-name">{cat === 'personal' ? '개인' : cat === 'strength' ? '스트렝스' : '팀 미션'}</span>
                        </div>
                        {cat === 'team' && <span className="category-reward-badge">1인 <b>4P</b> / 2인 <b>20P</b> / 4인/3인 <b>45P</b></span>}
                        {cat === 'personal' && <span className="category-reward-badge">2개 <b>7P</b> / 1개 <b>3P</b></span>}
                        {cat === 'strength' && <span className="category-reward-badge">모두 수행시 <b>10P</b></span>}
                      </div>
                      <div className="mission-grid">
                        {fields.map((m: any, idx: number) => {
                          let record;
                          if (cat === 'team' && team) {
                            // For team missions, find valid record based on participant logic
                            record = missions.find(rm =>
                              rm.teamId === team.id &&
                              rm.week === currentWeek &&
                              rm.records?.missionId === (m.id || m.label) &&
                              rm.status !== 'none' &&
                              (
                                // 4인이면 팀원 모두에게 표시
                                rm.records?.participantCount === '4' ||
                                // 2인이면 업로더 또는 선택된 파트너에게 표시
                                (rm.records?.participantCount === '2' && (rm.userName === userInfo.name || rm.records?.partnerName === userInfo.name)) ||
                                // 1인이면 본인에게만 표시
                                ((!rm.records?.participantCount || rm.records?.participantCount === '1') && rm.userName === userInfo.name)
                              )
                            );
                          } else {
                            // For personal/strength, keep original logic
                            record = myMissions.find(rm => rm.records?.missionId === (m.id || m.label));
                          }

                          const status = record?.status || 'none';
                          const pCount = record?.records?.participantCount;
                          const partnerName = record?.records?.partnerName;

                          return (
                            <div key={m.id || m.label} className={`mission-item-card ${status}`}>
                              <div className="mission-item-content">
                                <div className="mission-number">{idx + 1}</div>
                                <div className="mission-text-wrap">
                                  <p className="mission-title">
                                    {m.title || m.label}
                                    {status !== 'none' && pCount && (
                                      <span className="text-green ml-4">
                                        ({pCount === '4' ? '4인/3인' : `${pCount}인`}{pCount === '2' && partnerName ? `: ${partnerName}` : ''})
                                      </span>
                                    )}
                                  </p>
                                  <p className="mission-sub">{m.sub}</p>
                                </div>
                                <div className="mission-status-icon">
                                  <Check size={16} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="btn-primary-lg w-full mt-32 flex-center gap-8 py-20" onClick={onStartInput}>
              <Camera size={20} /> {myMissions.length === 0 ? '오늘의 챌린지 인증하기' : '미션 리스트 확인 및 추가 인증'}
            </button>

            {aggregateStatus === 'pending' && (
              <div className="info-box-alt mt-24">
                <Zap size={18} className="text-green" />
                <p className="font-14 text-white">그룹장이 미션을 확인 중입니다.</p>
              </div>
            )}
          </div>

          <div className="section-header flex-between mt-40">
            <h3 className="section-title-alt">{new Date().getMonth() + 1}월 그룹 랭킹</h3>
          </div>

          <div className="group-mini-ranking mt-12">
            {(sortedGroupsByDistance as any[]).slice(0, 5).map((g: any, i: number) => (
              <div key={g.id} className={`mini-rank-item ${group && g.id === group.id ? 'active' : ''}`}>
                <span className="rank-num">{i + 1}</span>
                <span className="group-name">{g.name}</span>
                <span className="group-score">{(g.monthlyDistance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} km</span>
              </div>
            ))}
            {group && myGroupRank && myGroupRank > 5 && myGroupData && (
              <>
                <div className="rank-divider my-8 border-t border-gray-800" />
                <div className="mini-rank-item active">
                  <span className="rank-num">{myGroupRank}</span>
                  <span className="group-name">{group.name}</span>
                  <span className="group-score">{(myGroupData.monthlyDistance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} km</span>
                </div>
              </>
            )}
          </div>

          <div className="section-header flex-between mt-40">
            <h3 className="section-title-alt">활동 퍼포먼스</h3>
            <ArrowRight size={18} color="#48484A" />
          </div>

          <div className="stats-grid mt-12">
            <div className="stat-card">
              <div className="stat-card-header">
                <Zap size={20} className="text-green" />
                <p className="stat-card-title">챌린지 포인트</p>
              </div>

              <div className="points-display-v2 mt-12">
                <div className="point-row-v2">
                  <span className="label">나의 포인트</span>
                  <span className="value">{myPoints} <small>pts</small></span>
                </div>
                <div className="point-row-v2 mt-8">
                  <span className="label truncate flex-1">{team ? `팀 ${team.name}` : '소속 팀'} 포인트</span>
                  <span className="value">{teamPoints} <small>pts</small></span>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <Activity size={18} className="text-green" />
                <p className="stat-card-title">{new Date().getMonth() + 1}월 러닝 마일리지</p>
              </div>

              <div className="stat-card-distance">
                <div className="mileage-card-v2">
                  <span className="mileage-current">
                    {Number(userInfo.monthlyDistance).toLocaleString(undefined, { maximumFractionDigits: 2 })}<span className="font-14 text-gray-600 ml-4 font-normal">km</span>
                  </span>
                  <div className="mileage-goal-wrap">

                    <span className="mileage-goal-txt">목표 {userInfo.monthlyGoal}km 대비</span>
                  </div>
                  <div className="mileage-progress-bar-wrap">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (parseFloat(userInfo.monthlyDistance) / parseFloat(userInfo.monthlyGoal)) * 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="mileage-progress-fill"
                    />
                  </div>
                  <div className="mileage-percent-wrap">
                    <span className="mileage-percent-txt">{Math.round((parseFloat(userInfo.monthlyDistance) / parseFloat(userInfo.monthlyGoal)) * 100)}% 달성</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )
      }
    </div >
  );
};

const RankingView = ({ currentGroupId, userInfo, teams, missions, groups, myGroupIds, challenges, groupMembers, allUserNames, groupMemberMappings }: { currentGroupId: string | null, userInfo: any, teams: Team[], missions: Mission[], groups: Group[], myGroupIds: string[], challenges: WeeklyChallenge[], groupMembers: string[], allUserNames: string[], groupMemberMappings: any[] }) => {
  const [rankTab, setRankTab] = useState<'team' | 'individual'>('team');
  const [displayGroupIdx, setDisplayGroupIdx] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const isGroupMode = !!currentGroupId;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // 이번 달 미션만 필터링 (랭킹용)
  const currentMonthMissions = missions.filter(m => {
    const d = new Date(m.timestamp || new Date());
    return (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
  });

  // 내가 속한 실제 그룹 객체 리스트
  const myJoinedGroups = groups.filter(g => myGroupIds.includes(g.id));

  // 표시할 그룹 이름 결정 (개인 모드용)
  const getDisplayGroupName = () => {
    if (myJoinedGroups.length === 0) return '-';
    const idx = displayGroupIdx % myJoinedGroups.length;
    return myJoinedGroups[idx].name;
  };

  const handleGroupCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (myJoinedGroups.length > 1) {
      setDisplayGroupIdx(prev => prev + 1);
    }
  };

  // Calculate real team rankings based on challenge points (ALL TIME)
  const teamRankings = isGroupMode
    ? teams.filter(t => t.groupId === currentGroupId).map(t => {
      const individualSum = t.members.reduce((sum, name) => sum + calculatePoints(missions, name, challenges), 0);
      const teamMissionsOnly = calculateTeamMissionPoints(missions, t.id, challenges);
      const points = individualSum + teamMissionsOnly + (t.bonusPoints || 0);
      return { name: t.name, pts: points, members: t.members.length };
    }).sort((a, b) => b.pts - a.pts)
    : [];

  // Individual rankings (this month only)
  // Decide the pool of users based on mode
  let monthUserNames: string[] = [];

  if (isGroupMode) {
    // 1. Group Mode: Show everyone in this group
    // We combine members from all teams in this group AND the groupMembers list for robustness
    const membersFromTeams = teams
      .filter(t => t.groupId === currentGroupId)
      .flatMap(t => t.members);

    const membersFromMissions = currentMonthMissions
      .filter(m => m.groupId === currentGroupId)
      .map(m => m.userName);

    monthUserNames = Array.from(new Set([...membersFromTeams, ...groupMembers, ...membersFromMissions]));
  } else {
    // 2. Individual Mode: Show all valid members (exclude deleted traces)
    // Only show names that exist in allUserNames to handle deleted users like 'ㅎㅇ'
    const missionNames = Array.from(new Set(currentMonthMissions.map(m => m.userName)));
    monthUserNames = missionNames.filter(name => allUserNames.includes(name));

    // Ensure I'm always in the list
    if (!monthUserNames.includes(userInfo.name)) monthUserNames.push(userInfo.name);
  }

  const individualRankings = monthUserNames.map(name => {
    const isMe = name === userInfo.name;
    const distance = currentMonthMissions
      .filter(m => m.userName === name && (m.status === 'approved' || m.type === '개인 러닝'))
      .reduce((sum, m) => sum + (m.distance || 0), 0);

    // Find profile info from mappings for pic/status
    const profileInfo = groupMemberMappings.find(m => m.userName === name);

    return {
      name,
      distance,
      displayTag: isGroupMode
        ? (teams.find(t => t.members.includes(name))?.name || '-')
        : (isMe ? getDisplayGroupName() : (profileInfo?.groups?.[0] || '-')),
      pic: isMe ? userInfo.profilePic : (profileInfo?.profilePic || null),
      isMe,
      status: isMe ? userInfo.statusMessage : (profileInfo?.statusMessage || '')
    };
  }).sort((a, b) => b.distance - a.distance);

  const renderPersonRow = (p: any, i: number) => (
    <div key={i} className={`ranking-row-v2 ${p.isMe ? 'active-user-row' : ''}`}>
      <div className="rank-num-v2">{i + 1}</div>
      <div className="avatar-v2-wrap">
        {p.pic && !failedImages.has(p.name) ? (
          <img
            src={db.getProxiedUrl(p.pic)}
            alt={p.name}
            className="avatar-v2"
            loading="lazy"
            onError={() => setFailedImages(prev => new Set(prev).add(p.name))}
          />
        ) : (
          <div className="avatar-v2-placeholder">{p.name.substring(0, 1)}</div>
        )}
      </div>
      <div className="rank-info-v2">
        <div className="flex items-center gap-8">
          <p className="rank-name-v2">
            {p.name}
            {p.isMe && <span className="me-badge-v2">나</span>}
          </p>
          <span
            className={`rank-team-text-v2 ${!isGroupMode && myJoinedGroups.length > 1 ? 'cursor-pointer hover-opacity' : ''}`}
            onClick={!isGroupMode ? handleGroupCycle : undefined}
            title={!isGroupMode && myJoinedGroups.length > 1 ? "클릭하여 그룹 전환" : ""}
          >
            {p.displayTag}
          </span>
        </div>
        {p.status && (
          <p className="rank-status-v2-new mt-4">{p.status}</p>
        )}
      </div>
      <div className="rank-pts-right">
        <span className="rank-pts-num">{(Number(p.distance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className="rank-pts-unit">km</span>
      </div>
    </div>
  );

  return (
    <div className="page-container pb-40">
      <div className="px-20 pt-24">
        <div className="flex-between mb-20">
          <h3 className="section-title-alt">
            {isGroupMode ? '실시간 챌린지 랭킹 👑' : '실시간 러닝 랭킹 👑'}
          </h3>
          <span className="ranking-refresh-label">
            {isGroupMode && rankTab === 'team' ? '전체 누적 랭킹' : '매월 1일 갱신'}
          </span>
        </div>

        {/* Tab Toggle (only in group mode) */}
        {isGroupMode && (
          <div className="rank-tab-wrap mb-20">
            <button
              className={`rank-tab-btn ${rankTab === 'team' ? 'rank-tab-active' : ''}`}
              onClick={() => setRankTab('team')}
            >
              🏆 팀 랭킹
            </button>
            <button
              className={`rank-tab-btn ${rankTab === 'individual' ? 'rank-tab-active' : ''}`}
              onClick={() => setRankTab('individual')}
            >
              👤 개인 랭킹
            </button>
          </div>
        )}

        {/* Team Ranking */}
        {isGroupMode && rankTab === 'team' && (
          <div className="ranking-card-v2">
            {teamRankings.map((t, i) => (
              <div key={i} className="ranking-row-v2">
                <div className="rank-num-v2">{i + 1}</div>
                <div className="team-icon-wrap">
                  <Trophy size={18} color={i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'} />
                </div>
                <div className="rank-info-v2">
                  <p className="rank-name-v2">{t.name}</p>
                  <p className="rank-team-v2">{t.members}명 참여</p>
                </div>
                <div className="rank-pts-right">
                  <span className="rank-pts-num">{t.pts.toLocaleString()}</span>
                  <span className="rank-pts-unit">pts</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Individual Ranking (in group or solo) */}
        {(!isGroupMode || rankTab === 'individual') && (
          <div className="ranking-card-v2">
            {individualRankings.map((p, i) => renderPersonRow(p, i))}
          </div>
        )}
      </div>
    </div>
  );
};

const PBInputItem = ({ label, id, value, onChange }: { label: string, id: string, value: { min: string, sec: string }, onChange: (v: { min: string, sec: string }) => void }) => (
  <div className="pb-input-item-v2">
    <label>{label}</label>
    <div className="pb-time-picker-v2">
      <input
        type="number"
        placeholder="00"
        className="pb-num-input-v2 no-spinner"
        value={value.min}
        onChange={(e) => {
          const val = e.target.value.slice(0, 2);
          onChange({ ...value, min: val });
          if (val.length === 2) {
            document.getElementById(`pb-sec-${id}`)?.focus();
          }
        }}
        onFocus={(e) => e.target.select()}
      />
      <span className="pb-time-separator-v2">'</span>
      <input
        id={`pb-sec-${id}`}
        type="number"
        placeholder="00"
        className="pb-num-input-v2 no-spinner"
        value={value.sec}
        onChange={(e) => onChange({ ...value, sec: e.target.value.slice(0, 2) })}
        onFocus={(e) => e.target.select()}
      />
      <span className="pb-time-suffix-v2">"</span>
    </div>
  </div>
);


const ProfileView = ({
  missions,
  userInfo,
  onUpdate,
  onEditMission,
  onLogout,
  onLeaveGroup,
  currentGroupName
}: {
  missions: Mission[],
  userInfo: any,
  onUpdate: (n: string, s: string, p: string | null, d: string, pbs: any, goal?: string) => void,
  onEditMission: (m: Mission) => void,
  onLogout: () => void,
  onLeaveGroup?: () => void,
  currentGroupName?: string
}) => {


  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userInfo.name);
  const [editStatus, setEditStatus] = useState(userInfo.statusMessage);
  const [editPic, setEditPic] = useState<string | null>(userInfo.profilePic);
  const [editGoal, setEditGoal] = useState(userInfo.monthlyGoal);
  const [isProfilePicBroken, setIsProfilePicBroken] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const picInputRef = useRef<HTMLInputElement>(null);

  const parsePB = (pb: string) => {
    if (!pb) return { min: '', sec: '' };
    let match = pb.match(/(\d+)[':](\d+)/);
    if (match) return { min: match[1], sec: match[2] };
    match = pb.match(/(\d+)/);
    if (match) return { min: match[1], sec: '00' };
    return { min: '', sec: '' };
  };

  const formatPB = (min: string, sec: string) => {
    if (!min && !sec) return "00'00\"";
    const m = (min || '0').padStart(2, '0');
    const s = (sec || '0').padStart(2, '0');
    return `${m}'${s}"`;
  };

  const [editPbs, setEditPbs] = useState({
    '1KM': parsePB(userInfo.pbs['1KM']),
    '3KM': parsePB(userInfo.pbs['3KM']),
    '5KM': parsePB(userInfo.pbs['5KM']),
    '10KM': parsePB(userInfo.pbs['10KM']),
  });

  const handleSave = () => {
    const finalPbs = {
      '1KM': formatPB(editPbs['1KM'].min, editPbs['1KM'].sec),
      '3KM': formatPB(editPbs['3KM'].min, editPbs['3KM'].sec),
      '5KM': formatPB(editPbs['5KM'].min, editPbs['5KM'].sec),
      '10KM': formatPB(editPbs['10KM'].min, editPbs['10KM'].sec),
    };

    onUpdate(editName, editStatus, editPic, userInfo.monthlyDistance, finalPbs, editGoal);
    setIsEditing(false);
  };


  const handlePicUpload = () => {
    picInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setEditPic(imageUrl);
    }
  };




  const myHistory = missions.filter(m => m.userName === userInfo.name && (m.status !== 'none' || m.type === '개인 러닝'));

  return (
    <div className="page-container pb-60">
      {/* Clean Profile Header */}
      <div className="profile-header-wrap-v3 px-20 pt-40 pb-32">
        {isEditing ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card profile-edit-card-v2">
            <div className="flex-center flex-col mb-24">
              <div className="profile-pic-uploader" onClick={handlePicUpload}>
                <input type="file" ref={picInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                {editPic && !isProfilePicBroken ? (
                  <img src={editPic} alt="Profile" className="profile-pic-preview" onError={() => setIsProfilePicBroken(true)} />
                ) : (
                  <div className="profile-pic-placeholder">
                    <User size={32} color="#636366" />
                  </div>
                )}
                <div className="upload-badge">
                  <Camera size={12} color="white" />
                </div>
              </div>
            </div>

            <div className="input-group-v2">
              <label>닉네임</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="input-group-v2 mt-16">
              <label>상태 메시지</label>
              <input type="text" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
            </div>

            <div className="input-group-v2 mt-16">
              <label>{new Date().getMonth() + 1}월 목표 마일리지 (km)</label>
              <input type="number" className="no-spinner" value={editGoal} onChange={(e) => {
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setEditGoal(v);
              }} onFocus={(e) => e.target.select()} />
            </div>



            <div className="record-divider-v2 my-24" />

            <div className="pb-input-grid-v2">
              <PBInputItem id="1KM" label="1KM PB" value={editPbs['1KM']} onChange={(v) => setEditPbs({ ...editPbs, '1KM': v })} />
              <PBInputItem id="3KM" label="3KM PB" value={editPbs['3KM']} onChange={(v) => setEditPbs({ ...editPbs, '3KM': v })} />
              <PBInputItem id="5KM" label="5KM PB" value={editPbs['5KM']} onChange={(v) => setEditPbs({ ...editPbs, '5KM': v })} />
              <PBInputItem id="10KM" label="10KM PB" value={editPbs['10KM']} onChange={(v) => setEditPbs({ ...editPbs, '10KM': v })} />
            </div>


            <div className="flex gap-12 mt-32">
              <button className="btn-dark flex-1 bold" style={{ background: '#2c2c2e', color: '#8e8e93', border: 'none', borderRadius: '14px', padding: '16px' }} onClick={() => {
                // Reset state on cancel
                setEditPbs({
                  '1KM': parsePB(userInfo.pbs['1KM']),
                  '3KM': parsePB(userInfo.pbs['3KM']),
                  '5KM': parsePB(userInfo.pbs['5KM']),
                  '10KM': parsePB(userInfo.pbs['10KM']),
                });

                setEditGoal(userInfo.monthlyGoal);
                setIsEditing(false);

              }}>취소</button>
              <button className="btn-primary flex-1 bold" style={{ borderRadius: '14px', padding: '16px' }} onClick={handleSave}>저장</button>
            </div>
          </motion.div>

        ) : (
          <div className="profile-row-ref">
            <div className="profile-row-left" onClick={() => setIsEditing(true)}>
              <div className="avatar-ref">
                {userInfo.profilePic && !isProfilePicBroken ? (
                  <img src={userInfo.profilePic} alt="Profile" className="avatar-ref-img" onError={() => setIsProfilePicBroken(true)} />
                ) : (
                  <div className="avatar-ref-placeholder">
                    <User size={28} color="#555" />
                  </div>
                )}
              </div>
              <span className="avatar-ref-label">추가/변경</span>
            </div>

            <div className="profile-row-center">
              <h2 className="profile-name-ref">{userInfo.name}</h2>
              <p className="profile-sub-ref">{userInfo.statusMessage}</p>
            </div>

            <button className="edit-btn-ref" onClick={() => setIsEditing(true)}>
              <Settings size={16} color="#8e8e93" />
            </button>
          </div>
        )}
      </div>

      {/* Activity Statistics Grid */}
      <div className="-mt-16">
        <div className="stats-grid mt-12">


          <div className="stat-card">
            <div className="stat-card-header">
              <Activity size={20} className="text-green" />
              <p className="stat-card-title">Personal Bests</p>
            </div>

            <div className="pb-grid">
              <div className="pb-item">
                <span className="pb-dist">1KM</span>
                <span className="pb-time">{userInfo.pbs['1KM']}</span>
              </div>
              <div className="pb-item">
                <span className="pb-dist">3KM</span>
                <span className="pb-time">{userInfo.pbs['3KM']}</span>
              </div>
              <div className="pb-item">
                <span className="pb-dist">5KM</span>
                <span className="pb-time">{userInfo.pbs['5KM']}</span>
              </div>
              <div className="pb-item">
                <span className="pb-dist">10KM</span>
                <span className="pb-time">{userInfo.pbs['10KM']}</span>
              </div>
            </div>

          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <Activity size={18} className="text-green" />
              <p className="stat-card-title">{new Date().getMonth() + 1}월 러닝 마일리지</p>
            </div>

            <div className="stat-card-distance">
              <div className="mileage-card-v2">
                <span className="mileage-current">
                  {userInfo.monthlyDistance}<span className="font-14 text-gray-600 ml-4 font-normal">km</span>
                </span>
                <div className="mileage-goal-wrap">

                  <span className="mileage-goal-txt">목표 {userInfo.monthlyGoal}km 대비</span>
                </div>
                <div className="mileage-progress-bar-wrap">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (parseFloat(userInfo.monthlyDistance) / parseFloat(userInfo.monthlyGoal)) * 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="mileage-progress-fill"
                  />
                </div>
                <div className="mileage-percent-wrap">
                  <span className="mileage-percent-txt">{Math.round((parseFloat(userInfo.monthlyDistance) / parseFloat(userInfo.monthlyGoal)) * 100)}% 달성</span>
                </div>
              </div>

            </div>
          </div>




        </div>
      </div>

      {/* Menu Sections */}
      <div className="menu-group-container mt-40">
        <div
          className="mx-20 px-20 py-22 flex items-center gap-10 cursor-pointer"
          style={{ background: '#1c1c1e', borderRadius: '20px', marginBottom: '20px', marginTop: '32px' }}
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
        >
          <h3 className="section-title-alt" style={{ fontSize: '16px', fontWeight: 800, margin: 0, padding: 0 }}>
            인증 히스토리
          </h3>
          <motion.div
            animate={{ rotate: isHistoryExpanded ? 180 : 0 }}
            className="flex items-center"
            style={{ display: 'flex' }}
          >
            <ChevronDown size={20} color="var(--fit-green)" />
          </motion.div>
        </div>

        <AnimatePresence>
          {isHistoryExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="history-container-visual">
                {myHistory.length > 0 ? (() => {
                  const sortedMissions = [...myHistory].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

                  return sortedMissions.map((m: Mission) => {
                    const d = new Date(m.timestamp || new Date());
                    const dateHeader = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) + ' ' +
                      d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

                    const firstImage = m.images && m.images.length > 0 ? m.images[0] : null;
                    const recordEntries = Object.entries(m.records || {}).filter(([_, v]) => v);
                    let recordSummary = '';
                    if (m.type === '개인 러닝') {
                      recordSummary = `${Number(m.distance).toFixed(2)}km`;
                    } else if (recordEntries.length > 0) {
                      const [key, val] = recordEntries[0];
                      recordSummary = `${key} ${val}`;
                    }

                    return (
                      <div key={m.id} className="history-date-group">
                        <h4 className="history-date-header-v2">{dateHeader}</h4>
                        <div className="history-visual-grid" style={{ gridTemplateColumns: '1fr' }}>
                          <div className={`history-visual-tile ${m.status}`} onClick={() => m.status === 'pending' && onEditMission(m)}>
                            {firstImage ? (
                              firstImage.includes('#vid') ? (
                                <video src={firstImage} className="history-tile-img" autoPlay loop muted playsInline />
                              ) : (
                                <img src={firstImage} alt="History" className="history-tile-img" loading="lazy" />
                              )
                            ) : (
                              <div className="history-tile-placeholder">
                                <Activity size={18} color="#48484a" />
                              </div>
                            )}
                            <div className="history-tile-overlay">
                              <span className="history-tile-type">{m.type === '개인 러닝' ? '개인 러닝' : `인증 ${m.week}주차`}</span>
                              <span className="history-tile-record-summary">{recordSummary}</span>
                            </div>
                            {m.status === 'pending' ? (
                              <button
                                className="history-tile-edit-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditMission(m);
                                }}
                              >
                                <Edit2 size={10} />
                                수정
                              </button>

                            ) : (
                              <div className={`history-tile-status-dot ${m.status}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })() : (
                  <div className="empty-history-premium py-40">
                    <p className="text-gray-700 font-14">아직 인증된 기록이 없습니다.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        <div className="px-20 mt-12 flex flex-col gap-10">
          {onLeaveGroup && (
            <button className="btn-dark-lg py-16 text-red-dim" onClick={() => {
              if (window.confirm(`${currentGroupName} 그룹에서 정말 탈퇴하시겠습니까?`)) {
                onLeaveGroup();
              }
            }}>
              그룹 탈퇴하기
            </button>
          )}

          <button className="btn-dark-lg py-16 text-red-dim" onClick={() => {
            if (window.confirm('로그아웃 하시겠습니까?')) {
              onLogout();
            }
          }}>
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

// tesseract.js import moved to top of file

const DistanceExtractor = ({ onExtract, onImageSelect, distance, setDistance, isGroup }: { onExtract: (dist: string) => void, onImageSelect: (url: string) => void, distance: string, setDistance: (d: string) => void, isGroup: boolean }) => {
  const [loading, setLoading] = useState(false);

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const imageUrl = URL.createObjectURL(file);
    onImageSelect(imageUrl);

    // If in group mode, do not run OCR
    if (isGroup) return;

    setLoading(true);

    try {
      const worker = await createWorker('eng+kor');
      const ret = await worker.recognize(file);
      const text = ret.data.text;
      console.log("OCR Extracted Text:", text);

      // More robust regex: look for numbers followed by km, or just likely distance patterns
      const kmRegex = /([\d.]+)\s*(km|㎞|kM|dist|거리)/i;
      const match = text.match(kmRegex);

      if (match && match[1]) {
        const dist = match[1];
        onExtract(dist);
        setDistance(dist);
      } else {
        // Fallback: search for any decimal number that looks like a distance (e.g., 1.0 to 99.9)
        const fallbackRegex = /\b(\d{1,2}\.\d{1,2})\b/;
        const fallbackMatch = text.match(fallbackRegex);
        if (fallbackMatch && fallbackMatch[1]) {
          const dist = fallbackMatch[1];
          onExtract(dist);
          setDistance(dist);
        } else {
          // Manual mode can be handled by the UI state if needed, but for now we just allow manual entry
        }
      }


      await worker.terminate();
    } catch (err) {
      console.error(err);
      alert('이미지 분석 중 오류가 발생했습니다. 직접 입력해주세요. (사진은 목록에 추가되었습니다)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="distance-extractor-card"
    >
      {!isGroup && (
        <div className="flex-between">
          <div className="flex-col">
            <h4 className="distance-label-premium">러닝 거리</h4>
            <p className="distance-sub-premium">필요 시 직접 수정해 주세요.</p>
          </div>
          <div className="flex items-center gap-20">
            <input
              type="number"
              inputMode="decimal"
              className="distance-input-premium no-spinner"
              value={distance}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setDistance(v);
              }}
              onFocus={(e) => e.target.select()}
            />
            <span className="text-green font-24 bold italic">km</span>
          </div>
        </div>
      )}

      <div className={`mt-24 ${isGroup ? '' : 'pt-24 border-t border-white/5'}`}>
        <label className="cert-upload-trigger">
          {loading ? (
            <div className="flex items-center gap-12">
              <div className="w-16 h-16 border-2 border-green border-t-transparent rounded-full animate-spin" />
              <span className="text-green font-15 bold">이미지 분석 중...</span>
            </div>
          ) : (
            <>
              <Camera size={20} className="text-green" />
              <span className="text-white font-16 bold">러닝 인증사진 추가</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={processImage} className="hidden" />
        </label>
      </div>
    </motion.div>
  );
};



const MissionInputView = ({ onBack, onSubmit, onToast, isGroup, challenge, initialMission, currentWeek, missions, currentUserName, isSubmitting, teamMembers = [] }: { onBack: () => void, onSubmit: (r: any, p: string[], d: string) => void, onToast: (msg: string) => void, isGroup: boolean, challenge?: WeeklyChallenge, initialMission?: Mission, currentWeek: number, missions: Mission[], currentUserName: string, isSubmitting?: boolean, teamMembers?: string[] }) => {
  const [records, setRecords] = useState<any>(initialMission?.records || {});
  const [photos, setPhotos] = useState<string[]>(initialMission?.images || []);
  const [runDistance, setRunDistance] = useState<string>(initialMission ? String(initialMission.distance) : '0');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const completedMissionIds = missions
    .filter(m => m.userName === currentUserName && m.id !== initialMission?.id && m.week === currentWeek)
    .map(m => m.records?.missionId)
    .filter(Boolean);

  // Initialize records based on challenge fields if not editing
  useEffect(() => {
    if (initialMission) return;

    // Reset records to empty for new mission
    setRecords({});
  }, [challenge, initialMission]);


  const parseMin = (val: string) => {
    if (!val) return '';
    return val.split("'")[0] || '';
  };

  const parseSec = (val: string) => {
    if (!val) return '';
    const parts = val.split("'");
    if (parts.length < 2) return '';
    return parts[1].replace('"', '');
  };

  const updateTimeRecord = (id: string, newVal: string, type: 'min' | 'sec') => {
    const current = records[id] || "";
    const parts = current.split("'");
    let min = parts[0] || "";
    let sec = (parts[1] || "").replace('"', "");

    if (type === 'min') min = newVal;
    else sec = newVal;

    setRecords({ ...records, [id]: `${min}'${sec}"` });
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const remainingSlots = 7 - photos.length;
      const filesToAdd = newFiles.slice(0, remainingSlots);

      for (const file of filesToAdd) {
        // Video check
        if (file.type.startsWith('video/')) {
          // Size check (20MB)
          if (file.size > 20 * 1024 * 1024) {
            onToast('동영상은 20MB 이하만 가능합니다.');
            continue;
          }

          // Duration check (10s)
          try {
            const videoUrl = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = videoUrl;
            await new Promise((resolve, reject) => {
              video.onloadedmetadata = () => {
                if (video.duration > 10.5) { // Allow slight buffer
                  URL.revokeObjectURL(videoUrl);
                  reject('10초 이내 영상만 가능합니다.');
                } else {
                  resolve(true);
                }
              };
              video.onerror = () => {
                URL.revokeObjectURL(videoUrl);
                reject('영상 파일을 읽을 수 없습니다.');
              };
            });
            const url = videoUrl + '#vid';
            setPhotos(prev => [...prev, url]);
            continue; // Already added
          } catch (err: any) {
            onToast(err);
            continue;
          }
        } else if (file.type.startsWith('image/')) {
          // Image size check (optional but good)
          if (file.size > 10 * 1024 * 1024) {
            onToast('이미지는 10MB 이하만 가능합니다.');
            continue;
          }
        } else {
          onToast('이미지 또는 동영상 파일만 가능합니다.');
          continue;
        }

        const url = URL.createObjectURL(file);
        setPhotos(prev => [...prev, url]);
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    // Video hash (#vid) removal for correct revocation
    const rawUrl = newPhotos[index].split('#')[0];
    URL.revokeObjectURL(rawUrl);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleExtractedDistance = (dist: string) => {
    setRunDistance(dist);
  };


  const handleExtractedImage = (url: string) => {
    if (photos.length < 7) {
      setPhotos(prev => [...prev, url]);
    }
  };

  const handleFinalSubmit = () => {
    if (isGroup && !records.missionId) {
      onToast('하나 이상의 미션을 선택해주세요');
      return;
    }
    onSubmit(records, photos, runDistance);
  };


  return (
    <div className="page-container flex flex-col h-full bg-black">
      <div className="cert-guide-box">
        <div className="flex items-center gap-12 mb-12 cursor-pointer" onClick={onBack}>
          <ChevronLeft size={24} className="text-white" />
          <h2 className="text-white font-24 bold tracking-tight">기록 인증하기</h2>
        </div>
        <p className="text-gray-500 font-14 leading-relaxed">
          {isGroup
            ? <>챌린지 인증 사진/영상을 추가해 주세요.<br />인증 즉시 커뮤니티에 공유되며, 점수가 즉시 반영됩니다.⚡️</>
            : <>거리가 포함된 러닝 인증 사진/영상을 추가해 주세요.<br />인식된 거리는 마일리지에 즉시 반영됩니다.⚡️</>
          }

        </p>

      </div>

      <div className="flex-1 overflow-y-auto pb-40 no-scrollbar">
        {!isGroup && (
          <DistanceExtractor onExtract={handleExtractedDistance} onImageSelect={handleExtractedImage} distance={runDistance} setDistance={setRunDistance} isGroup={isGroup} />
        )}

        {isGroup && (
          <div className="mt-0">
            <div className="flex-between mb-16">
              <h3 className="text-white font-18 bold">인증 사진/영상 <span className="text-gray-600 font-13 font-normal ml-8">{photos.length}/7</span></h3>
            </div>

            <div className="photo-upload-area">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={handleFileChange} />
              <div className="photo-upload-grid">
                {photos.map((p, i) => {
                  // Since blob URLs don't have types easily accessible, we can try to guess or use a better way. 
                  // But for now, let's just try to render as video if it fails as image or vice versa.
                  // Better: let's use a dummy check or just render video if we know it from handleFileChange.
                  // Actually, let's check if the URL contains "video" which we can add as a hash if needed.
                  const urlWithHint = p;
                  const reallyIsVideo = urlWithHint.includes('#vid');

                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={i}
                      className="photo-preview shadow-lg"
                    >
                      {reallyIsVideo ? (
                        <video src={db.getProxiedUrl(p)} className="w-full h-full object-cover rounded-20" muted playsInline />
                      ) : (
                        <img src={db.getProxiedUrl(p)} alt="Certification" className="w-full h-full object-cover rounded-20" />
                      )}
                      <button className="btn-remove-photo" onClick={() => removePhoto(i)}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  );
                })}
                {photos.length < 7 && (
                  <div onClick={() => fileInputRef.current?.click()} className="photo-add-btn">
                    <Camera size={24} className="text-gray-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}





        {isGroup && (
          <div className="animate-fadeIn mt-60 mb-40">
            <h3 className="text-white font-18 bold mb-24">챌린지 기록</h3>

            {((challenge?.recordFields && challenge.recordFields.some(f => f.category)) || (currentWeek === 1 && !challenge)) ? (
              <div className="mission-selector-container">
                <p className="text-gray-500 font-13 mb-8">수행하신 미션을 선택해 주세요.</p>
                {['personal', 'strength', 'team'].map(cat => {
                  const dbItems = challenge?.recordFields?.filter(f => f.category === cat) || [];
                  const items = challenge
                    ? dbItems
                    : (currentWeek === 1 ? (WEEK1_STRUCTURE as any)[cat] : []);

                  if (items.length === 0) return null;

                  return (
                    <div key={cat} className="flex flex-col gap-12 mt-16">
                      <span className="text-green font-12 bold uppercase tracking-wider px-8 mb-4">{cat === 'personal' ? '개인' : cat === 'strength' ? '스트렝스' : '팀 미션'}</span>
                      {items.map((item: any) => {
                        const itemId = item.id || item.label;
                        const isAlreadySubmitted = completedMissionIds.includes(itemId);

                        return (
                          <div
                            key={itemId}
                            className={`selector-item ${records.missionId === itemId ? 'active' : ''} ${isAlreadySubmitted ? 'opacity-40' : ''}`}
                            onClick={() => {
                              if (isAlreadySubmitted) {
                                onToast('이미 제출한 미션 입니다');
                                return;
                              }
                              setRecords({ ...records, missionId: itemId, category: cat });
                            }}
                          >
                            <div className="flex-between">
                              <div>
                                <p className="mission-title">{item.title || item.label}</p>
                                <p className="mission-sub">{item.sub}</p>
                              </div>
                              {isAlreadySubmitted && (
                                <span className="bg-white/10 text-gray-400 font-10 bold px-6 py-2 rounded-4 whitespace-nowrap">제출됨</span>
                              )}
                            </div>

                            {cat === 'team' && records.missionId === itemId && (
                              <>
                                <div className="participant-picker" onClick={e => e.stopPropagation()}>
                                  <p className="text-gray-500 font-12 mr-8">참여 인원:</p>
                                  {[1, 2, 4].map(num => (
                                    <div
                                      key={num}
                                      className={`participant-bubble ${String(records.participantCount || '1') === String(num) ? 'active' : ''}`}
                                      onClick={() => {
                                        const newCount = String(num);
                                        const updates: any = { participantCount: newCount };
                                        if (newCount !== '2') updates.partnerName = ''; // 2인이 아님 파트너 초기화
                                        setRecords({ ...records, ...updates });
                                      }}
                                    >
                                      {num === 4 ? '4인/3인' : `${num}인`}
                                    </div>
                                  ))}
                                </div>

                                {records.participantCount === '2' && (
                                  <div className="partner-selector-wrap mt-12" onClick={e => e.stopPropagation()}>
                                    <p className="text-gray-500 font-12 mb-8">함께한 멤버 선택:</p>
                                    <div className="flex flex-wrap gap-8">
                                      {teamMembers.filter(m => m !== currentUserName).map(m => (
                                        <div
                                          key={m}
                                          className={`partner-bubble ${records.partnerName === m ? 'active' : ''}`}
                                          onClick={() => setRecords({ ...records, partnerName: m })}
                                        >
                                          {m}
                                        </div>
                                      ))}
                                      {teamMembers.filter(m => m !== currentUserName).length === 0 && (
                                        <p className="text-gray-700 font-12">선택 가능한 팀원이 없습니다.</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="record-card">
                {challenge?.recordFields && challenge.recordFields.length > 0 ? (
                  challenge.recordFields.map((field, idx) => (
                    <React.Fragment key={field.id}>
                      <div className="record-row group">
                        <label className="record-label">{field.label}</label>
                        <div className="record-time-picker">
                          <input
                            type="number"
                            className="record-time-input-small no-spinner"
                            placeholder="00"
                            value={parseMin(records[field.id])}
                            onChange={(e) => {
                              const val = e.target.value.slice(0, 2);
                              updateTimeRecord(field.id, val, 'min');
                              if (val.length === 2) {
                                document.getElementById(`sec-${field.id}`)?.focus();
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                          <span className="record-time-sep">'</span>
                          <input
                            id={`sec-${field.id}`}
                            type="number"
                            className="record-time-input-small no-spinner"
                            placeholder="00"
                            value={parseSec(records[field.id])}
                            onChange={(e) => updateTimeRecord(field.id, e.target.value.slice(0, 2), 'sec')}
                            onFocus={(e) => e.target.select()}
                          />
                          <span className="record-time-sep">"</span>
                        </div>
                      </div>
                      {idx < (challenge.recordFields?.length || 0) - 1 && <div className="record-divider" />}
                    </React.Fragment>
                  ))
                ) : (
                  <div className="record-row">
                    <label className="record-label">1KM</label>
                    <div className="record-time-picker">
                      <input
                        type="number"
                        className="record-time-input-small no-spinner"
                        placeholder="00"
                        value={parseMin(records['1KM'])}
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 2);
                          updateTimeRecord('1KM', val, 'min');
                          if (val.length === 2) {
                            document.getElementById('sec-1KM')?.focus();
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                      <span className="record-time-sep">'</span>
                      <input
                        id="sec-1KM"
                        type="number"
                        className="record-time-input-small no-spinner"
                        placeholder="00"
                        value={parseSec(records['1KM'])}
                        onChange={(e) => updateTimeRecord('1KM', e.target.value.slice(0, 2), 'sec')}
                        onFocus={(e) => e.target.select()}
                      />
                      <span className="record-time-sep">"</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


      </div>

      <div className="px-20 pb-32 pt-16">
        <button className="btn-primary-lg" onClick={handleFinalSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="flex items-center gap-8">
              <div className="animate-spin h-16 w-16 border-2 border-white/30 border-t-white rounded-full" />
              <span>업로드 중...</span>
            </div>
          ) : '제출하기'}
        </button>
      </div>
    </div>
  );
};

const ImageWithFallback = ({ src, alt, className }: { src: string, alt: string, className: string }) => {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="flex-center flex-col bg-gray-900 w-full h-full min-h-[300px] text-gray-500 p-20 text-center">
        <Camera size={40} className="mb-12 opacity-50" />
        <p className="font-13 bold text-white mb-4">이미지를 불러올 수 없습니다</p>
        <p className="font-11 opacity-70">HEIC 형식이나 일시적인 통신 오류일 수 있습니다.</p>
        <a href={src} target="_blank" rel="noreferrer" className="mt-16 text-green font-11 bold underline">원본 파일 보기</a>
      </div>
    );
  }
  return <img src={db.getProxiedUrl(src)} alt={alt} className={className} loading="lazy" onError={() => setError(true)} />;
};

const MissionCard = ({ mission, currentUserName, userRole, teams, onLike, onComment, onDeleteMission, onDeleteComment, challenges, groupMemberMappings }: {
  mission: Mission,
  currentUserName: string,
  userRole: string,
  teams: Team[],
  onLike: (id: string) => void,
  onComment: (id: string, text: string) => void,
  onDeleteMission?: (id: string) => void,
  onDeleteComment?: (mId: string, cId: string) => void,
  challenges: WeeklyChallenge[],
  groupMemberMappings?: any[]
}) => {
  const [commentText, setCommentText] = useState('');
  const [isAvatarBroken, setIsAvatarBroken] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const handleScroll = () => {
    if (scrollRef.current) {
      const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
      setActivePhotoIdx(idx);
    }
  };
  const isLiked = mission.likedBy.includes(currentUserName);
  const isAdmin = userRole === 'leader';
  const isAuthor = mission.userName === currentUserName;

  const authorTeam = teams.find(t => t.id === mission.teamId) || teams.find(t => t.members.includes(mission.userName));
  const authorProfile = groupMemberMappings?.find(m => m.userName === mission.userName);
  const profilePic = authorProfile?.profilePic;

  const challenge = challenges.find(c => c.week === mission.week);
  const missionId = mission.records?.missionId;
  const category = mission.records?.category;
  let categoryLabel = "";
  if (category === 'personal') categoryLabel = '개인';
  else if (category === 'strength') categoryLabel = '스트렝스';
  else if (category === 'team') categoryLabel = '팀 미션';

  const missionTitle = missionId ? (
    challenge?.recordFields?.find(f => f.id === missionId)?.label ||
    ([...WEEK1_STRUCTURE.personal, ...WEEK1_STRUCTURE.strength, ...WEEK1_STRUCTURE.team] as any[])
      .find(f => f.id === missionId)?.title || ""
  ) : "";

  const partnerName = mission.records?.partnerName;
  const pCount = mission.records?.participantCount;

  const displayTag = missionTitle
    ? `${categoryLabel ? categoryLabel + ' - ' : ''}${missionTitle}${pCount && pCount !== '1' ? ` (${pCount}인${pCount === '2' && partnerName ? `: ${partnerName}` : ''})` : ''} / ${mission.week}주차`
    : (mission.type === '개인 러닝' ? `개인 러닝 / ${mission.week}주차` : `${mission.week}주차 인증`);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(mission.id, commentText);
    setCommentText('');
  };

  return (
    <div className="mission-card-premium">
      <div className="mission-card-header flex-between">
        <div className="flex items-center gap-12">
          <div className="avatar-v2-wrap">
            {profilePic && !isAvatarBroken ? (
              <img src={db.getProxiedUrl(profilePic)} alt={mission.userName} className="avatar-v2" onError={() => setIsAvatarBroken(true)} />
            ) : (
              <div className="avatar-v2-placeholder">
                {mission.userName.substring(0, 1)}
              </div>
            )}
          </div>
          <div className="mission-user-info">
            <div className="flex items-center gap-6">
              <p className="name">{mission.userName}</p>
              {authorTeam && <span className="font-12 text-gray-500 bg-gray-900 px-6 py-2 rounded-4">{authorTeam.name}</span>}
              {mission.status === 'pending' && <span className="font-11 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1 rounded-4">승인 대기 중</span>}
            </div>
            <p className="meta">{new Date(mission.timestamp || new Date()).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {displayTag}</p>
          </div>
        </div>
        {(isAdmin || isAuthor) && (
          <button className="icon-btn-fit-subtle opacity-60 hover:opacity-100" onClick={() => onDeleteMission?.(mission.id)}>
            <Trash size={16} className="text-red-dim" />
          </button>
        )}
      </div>

      <div className="mission-photo-container relative">
        {mission.images && mission.images.length > 0 ? (
          <>
            <div
              className="mission-photo-scroll"
              ref={scrollRef}
              onScroll={handleScroll}
            >
              {mission.images.map((img, i) => (
                <div key={i} className="mission-photo-item">
                  {img.includes('#vid') ? (
                    <video src={db.getProxiedUrl(img)} className="mission-photo" autoPlay loop muted playsInline />
                  ) : (
                    <ImageWithFallback src={img} alt={`Certification ${i + 1}`} className="mission-photo" />
                  )}
                </div>
              ))}
            </div>
            {mission.images.length > 1 && (
              <div className="photo-indicators">
                {mission.images.map((_, i) => (
                  <div key={i} className={`indicator ${i === activePhotoIdx ? 'active' : ''}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex-center flex-col text-gray-800 py-40">
            <Camera size={48} />
            <p className="font-12 mt-8">인증 사진 없음</p>
          </div>
        )}
      </div>

      <div className="mission-social-actions">
        <button className={`social-action-btn ${isLiked ? 'liked' : ''}`} onClick={() => onLike(mission.id)}>
          <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
          <span className="font-14 bold">{mission.likedBy.length}</span>
        </button>
        <button className="social-action-btn">
          <MessageCircle size={22} />
          <span className="font-14 bold">{mission.comments.length}</span>
        </button>
      </div>

      <div className="mission-comments-section">
        <div className="comments-list">
          {mission.comments.map(c => {
            const isCommentAuthor = c.userName === currentUserName;
            return (
              <div key={c.id} className="comment-item flex-between group">
                <div className="flex gap-8 overflow-hidden">
                  <span className="comment-user shrink-0">{c.userName}</span>
                  <span className="comment-text truncate">{c.text}</span>
                </div>
                {(isAdmin || isAuthor || isCommentAuthor) && (
                  <button
                    className="btn-delete-subtle opacity-0 group-hover:opacity-100"
                    onClick={() => onDeleteComment?.(mission.id, c.id)}
                  >
                    <Trash size={12} />
                  </button>
                )}

              </div>
            );
          })}
        </div>
        <form className="comment-input-wrap" onSubmit={handleCommentSubmit}>
          <input
            className="comment-input"
            placeholder="댓글 달기..."
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
          />
          <button type="submit" className="comment-submit-btn">게시</button>
        </form>
      </div>
    </div>
  );
};


const WeeklyFeedView = ({
  week,
  missions,
  currentUserName,
  userRole,
  teams,
  onLike,
  onComment,
  onDeleteMission,
  onDeleteComment,
  challenges,
  groupMemberMappings
}: {
  week: number | null,
  missions: Mission[],
  currentUserName: string,
  userRole: string,
  teams: Team[],
  onLike: (id: string) => void,
  onComment: (id: string, text: string) => void,
  onDeleteMission?: (id: string) => void,
  onDeleteComment?: (mId: string, cId: string) => void,
  challenges: WeeklyChallenge[],
  groupMemberMappings: any[]
}) => {
  return (
    <div className="page-container flex flex-col h-full bg-black">
      <div className="feed-header flex items-center gap-16">
        <h2 className="text-white bold font-20">{week ? `${week}주차 인증 현황` : '커뮤니티'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-16 pt-20 pb-100 scroll-hide">
        {missions.length > 0 ? (
          <div className="mission-feed-wrap">
            {missions.map(m => (
              <MissionCard
                key={m.id}
                mission={m}
                currentUserName={currentUserName}
                userRole={userRole}
                teams={teams}
                onLike={onLike}
                onComment={onComment}
                onDeleteMission={onDeleteMission}
                onDeleteComment={onDeleteComment}
                challenges={challenges}
                groupMemberMappings={groupMemberMappings}
              />

            ))}
          </div>
        ) : (
          <div className="empty-state-fit py-100 flex-center flex-col">
            <Camera size={48} className="text-gray-800 mb-16" />
            <p className="text-gray-700">인증된 미션이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ChallengeView = ({
  challenges,
  userRole,
  onAdd,
  onUpdate,
  onDelete,
  currentWeek,
  onActivate
}: {
  challenges: WeeklyChallenge[],
  userRole: 'user' | 'leader',
  onAdd: () => void,
  onUpdate: (id: string, title: string, desc: string, fields?: any[]) => void,
  onDelete: (id: string) => void,
  currentWeek: number,
  onActivate: (week: number) => void
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editFields, setEditFields] = useState<{ id: string; label: string; placeholder?: string; unit?: string; category?: 'personal' | 'strength' | 'team'; sub?: string }[]>([]);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleStartEdit = (c: WeeklyChallenge) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditDesc(c.description);
    setEditFields(c.recordFields || []);
    setShowMenu(null);
  };

  const handleSave = (id: string) => {
    // Filter out items that have neither title nor subtitle
    const validFields = editFields.filter(f => f.label.trim() !== '' || (f.sub && f.sub.trim() !== ''));
    onUpdate(id, editTitle, editDesc, validFields);
    setEditingId(null);
  };

  const addField = (category: 'personal' | 'strength' | 'team') => {
    setEditFields([...editFields, { id: `f${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, label: '', placeholder: '', unit: '', category, sub: '' }]);
  };

  const updateField = (idx: number, key: string, val: string) => {
    const newFields = [...editFields];
    newFields[idx] = { ...newFields[idx], [key]: val };
    setEditFields(newFields);
  };

  const removeField = (idx: number) => {
    setEditFields(editFields.filter((_, i) => i !== idx));
  };

  return (
    <div className="page-container pb-100">
      <div className="flex-between px-16 mb-24">
        <h2 className="section-title-alt">챌린지 로드맵</h2>
        {userRole === 'leader' && (
          <button className="btn-add-team-v2" onClick={onAdd}>
            <Plus size={16} /> 주차 추가
          </button>
        )}
      </div>

      <div className="flex flex-col gap-12 px-16">
        {challenges.sort((a, b) => a.week - b.week).map((c) => (
          <motion.div
            layout
            key={c.id}
            className={`card roadmap-card-alt ${c.week === currentWeek ? 'active' : ''} overflow-visible`}
            onClick={() => {
              if (!editingId) setExpandedId(expandedId === c.id ? null : c.id);
            }}
          >

            {editingId === c.id ? (
              <div className="flex flex-col gap-12 py-8" onClick={(e) => e.stopPropagation()}>
                <input
                  className="fit-input-roadmap-title"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="훈련 제목"
                  autoFocus
                />
                <textarea
                  className="fit-textarea-roadmap-desc"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="훈련 상세 내용"
                />

                <div className="mt-12">
                  <span className="text-gray-400 font-12 bold uppercase tracking-wider mb-12 block">기록 항목 설정 (카테고리별)</span>

                  {['personal', 'strength', 'team'].map(cat => (
                    <div key={cat} className="mb-24">
                      <div className="flex-between mb-8 px-4">
                        <span className="text-green font-11 bold uppercase tracking-widest">
                          {cat === 'personal' ? '개인 미션' : cat === 'strength' ? '스트렝스' : '팀 미션'}
                        </span>
                        <button className="btn-add-field-v2" onClick={() => addField(cat as any)}>+ 항목 추가</button>
                      </div>

                      <div className="challenge-fields-list-v2">
                        {editFields.map((field, realIdx) => {
                          if (field.category !== cat) return null;
                          return (
                            <div key={field.id} className="challenge-field-card-v2 animate-fadeIn">
                              <div className="flex items-center gap-12">
                                <div className="flex-1 flex flex-col gap-8">
                                  <input
                                    className="field-input-premium-v2"
                                    value={field.label}
                                    onChange={(e) => updateField(realIdx, 'label', e.target.value)}
                                    placeholder="미션 제목 (예: 주 4일 5km 러닝)"
                                  />
                                  <input
                                    className="field-input-subtext-v2"
                                    value={field.sub || ''}
                                    onChange={(e) => updateField(realIdx, 'sub', e.target.value)}
                                    placeholder="상세 설명 (예: 트레드밀, 야외러닝)"
                                  />
                                </div>
                                <button className="btn-delete-field-v2" onClick={() => removeField(realIdx)}>
                                  <Trash size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {editFields.filter(f => f.category === cat).length === 0 && (
                          <div className="field-empty-placeholder">등록된 항목이 없습니다.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>


                <div className="flex justify-end gap-12 mt-4 w-full">
                  <button className="icon-btn-fit-red p-12" onClick={() => setEditingId(null)}><X size={20} /></button>
                  <button className="icon-btn-fit-green p-12" onClick={() => handleSave(c.id)}><Check size={20} /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-between">
                  <span className="week-num">{c.week.toString().padStart(2, '0')}주차</span>
                  <div className="flex items-center gap-8">
                    {c.week === currentWeek && <span className="live-tag">LIVE</span>}
                    {userRole === 'leader' && (
                      <div className="relative">
                        <button
                          className="icon-btn-fit-subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(showMenu === c.id ? null : c.id);
                          }}
                        >
                          <MoreVertical size={14} className="text-white" />
                        </button>
                        {showMenu === c.id && (
                          <div className="team-action-dropdown" onClick={(e) => e.stopPropagation()}>
                            <button className="dropdown-item-fit" onClick={() => { onActivate(c.week); setShowMenu(null); }}>
                              <Zap size={14} className={c.week === currentWeek ? 'text-green' : ''} /> 활성화
                            </button>

                            <button className="dropdown-item-fit" onClick={() => handleStartEdit(c)}>
                              <Edit2 size={14} /> 수정
                            </button>
                            <div className="dropdown-divider-fit" />
                            <button className="dropdown-item-fit text-red" onClick={() => { onDelete(c.id); setShowMenu(null); }}>
                              <Trash size={14} /> 삭제
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="mt-8 text-white">{c.title}</h3>

                <AnimatePresence>
                  {expandedId === c.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="record-divider my-12" style={{ opacity: 0.3 }} />
                      <p className="text-gray font-14 leading-relaxed">{c.description}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const BonusPointsInput = ({ initialValue, onUpdate }: { initialValue: number, onUpdate: (val: number) => void }) => {
  const [val, setVal] = useState<string>(initialValue === 0 ? '' : initialValue.toString());

  // Update local value if initialValue changes from outside
  useEffect(() => {
    if (initialValue !== parseInt(val) && !(val === '' && initialValue === 0) && !(val === '-')) {
      setVal(initialValue === 0 ? '' : initialValue.toString());
    }
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // Allow empty string, single minus sign, or valid integer
    if (v === '' || v === '-' || /^-?\d*$/.test(v)) {
      setVal(v);
      const parsed = parseInt(v);
      if (!isNaN(parsed)) {
        onUpdate(parsed);
      } else if (v === '' || v === '-') {
        onUpdate(0);
      }
    }
  };

  return (
    <input
      type="text"
      className="fit-input-premium-inline"
      style={{ width: '80px', textAlign: 'center' }}
      value={val}
      onChange={handleChange}
      onBlur={() => {
        if (val === '-' || val === '') {
          setVal('0');
          onUpdate(0);
        }
      }}
      placeholder="0"
    />
  );
};

const LeaderView = ({
  group,
  teams,
  addTeam,
  renameTeam,
  deleteTeam,
  addMember,
  removeMember,
  kickMember,
  updateTeamPoints,
  allMembers,
  onDeleteGroup
}: {
  group: Group,
  teams: Team[],
  addTeam: () => void,
  renameTeam: (teamId: string, newName: string) => void,
  deleteTeam: (teamId: string) => void,
  addMember: (teamId: string, name: string) => void,
  removeMember: (teamId: string, name: string) => void,
  kickMember: (name: string) => void,
  updateTeamPoints: (teamId: string, pts: number) => void,
  allMembers: string[],
  onDeleteGroup: (id: string) => void
}) => {
  const [adminTab, setAdminTab] = useState<'teams' | 'members'>('teams');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [showMemberSelect, setShowMemberSelect] = useState<string | null>(null);
  const [showTeamMenu, setShowTeamMenu] = useState<string | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const groupTeams = teams.filter(t => t.groupId === group.id);
  const assignedMembers = groupTeams.flatMap(t => t.members);
  const availableMembers = allMembers.filter(m => !assignedMembers.includes(m));

  const handleStartRename = (teamId: string, name: string) => {
    setEditingTeamId(teamId);
    setTempName(name);
    setShowTeamMenu(null);
  };

  const handleSaveRename = (teamId: string) => {
    renameTeam(teamId, tempName);
    setEditingTeamId(null);
  };



  const renderTeamsTab = () => (
    <div className="admin-content-fade pb-60">
      <div className="flex-between mb-20 px-20">
        <h4 className="text-gray-700 font-12 bold uppercase tracking-widest">팀 관리 ({groupTeams.length})</h4>
        <button className="btn-add-team-v2" onClick={addTeam}>
          <Plus size={16} />
          팀 추가
        </button>
      </div>

      <div className="flex flex-col gap-16 px-16">
        {groupTeams.map(t => (
          <div key={t.id} className="card team-manage-card-v2 overflow-visible">
            <div className="flex-between mb-16">
              {editingTeamId === t.id ? (
                <div className="flex items-center gap-12 flex-1 admin-content-fade min-w-0">
                  <input
                    className="fit-input-premium-inline flex-1 min-w-0"
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(t.id)}
                    placeholder="팀 이름을 입력하세요"
                  />
                  <div className="flex items-center gap-6 shrink-0">
                    <button className="icon-btn-fit-green" title="저장" onClick={() => handleSaveRename(t.id)}>
                      <Check size={18} />
                    </button>
                    <button className="icon-btn-fit-red" title="취소" onClick={() => setEditingTeamId(null)}>
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-white text-20 bold truncate mr-12">{t.name}</h3>
                  <div className="relative">
                    <button className="icon-btn-fit-subtle" onClick={() => setShowTeamMenu(showTeamMenu === t.id ? null : t.id)}>
                      <MoreVertical size={18} className="text-white" />
                    </button>

                    {showTeamMenu === t.id && (
                      <div className="team-action-dropdown">
                        <button className="dropdown-item-fit" onClick={() => handleStartRename(t.id, t.name)}>
                          <Edit2 size={14} /> 팀 이름 변경
                        </button>
                        <div className="dropdown-divider-fit" />
                        <button className="dropdown-item-fit text-red" onClick={() => { deleteTeam(t.id); setShowTeamMenu(null); }}>
                          <Trash size={14} /> 팀 삭제
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex-between mb-16">
              <div className="flex items-center gap-12">
                <span className="text-gray-600 font-11 bold uppercase">Team Bonus Points</span>
                <div className="flex items-center gap-4">
                  <BonusPointsInput
                    initialValue={t.bonusPoints || 0}
                    onUpdate={(newPts) => updateTeamPoints(t.id, newPts)}
                  />
                  <span className="text-green font-11 bold">PTS</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 mb-20">

              <span className="text-gray-600 font-12 bold">{t.members.length}/4 명 참여 중</span>
              <div className="flex-1 h-3 bg-black rounded-full overflow-hidden border border-gray-900">
                <div className="h-full bg-green transition-all" style={{ width: `${(t.members.length / 4) * 100}% ` }} />
              </div>
            </div>

            <div className="member-grid-v2">
              {t.members.map(m => (
                <div key={m} className="member-chip-v2">
                  <span className="member-name">{m}</span>
                  <button className="member-remove-btn" onClick={() => removeMember(t.id, m)}>
                    <X size={12} />
                  </button>
                </div>
              ))}

              {t.members.length < 4 && (
                <div className="relative">
                  <button
                    className="btn-member-add-trigger"
                    onClick={() => setShowMemberSelect(showMemberSelect === t.id ? null : t.id)}
                  >
                    <Plus size={14} />
                    <span>멤버 추가</span>
                  </button>

                  {showMemberSelect === t.id && (
                    <div className="member-select-dropdown">
                      <div className="dropdown-header">멤버 선택</div>
                      <div className="dropdown-list scroll-hide">
                        {availableMembers.length > 0 ? (
                          availableMembers.map(m => (
                            <div
                              key={m}
                              className="dropdown-item"
                              onClick={() => {
                                addMember(t.id, m);
                                setShowMemberSelect(null);
                              }}
                            >
                              {m}
                            </div>
                          ))
                        ) : (
                          <div className="dropdown-empty">추가 가능한 멤버가 없습니다.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {groupTeams.length === 0 && (
          <div className="empty-teams-v2 py-40 border-dashed-fit flex-center flex-col">
            <p className="text-gray-800 font-13">등록된 팀이 없습니다.</p>
            <button className="btn-primary-sm mt-16" onClick={addTeam}>팀 추가하기</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderMembersTab = () => (
    <div className="admin-content-fade px-16 pb-60">
      <h4 className="text-gray-700 font-12 bold uppercase tracking-widest mb-16">전체 멤버 ({allMembers.length})</h4>
      <div className="flex flex-col gap-8">
        {allMembers.map((m: any) => {
          const memberTeam = groupTeams.find(t => t.members.includes(m));
          return (
            <div key={m} className="card member-info-card-v2 flex-between w-full">
              <div className="flex items-center gap-12 min-w-0">
                <div className="member-avatar-mini shrink-0">{m.substring(0, 1)}</div>
                <div className="min-w-0">
                  <p className="text-white font-15 bold truncate">{m}</p>
                  <div className="mt-4">
                    <span className={`font-10 bold px-6 py-2 rounded-4 ${memberTeam ? 'bg-white/5 text-gray-400' : 'bg-red-dim/10 text-red-dim'}`}>
                      {memberTeam ? memberTeam.name : '미배정'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="btn-kick-member-v2-sm shrink-0"
                onClick={() => kickMember(m)}
              >
                내보내기
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="px-16 mb-24 flex-between relative">
        <div>
          <h2 className="section-title-alt">그룹 관리</h2>
          <p className="text-green font-12 bold mt-4 uppercase tracking-widest">Invite: {group.inviteCode}</p>
        </div>
        <div className="relative">
          <button
            className="btn-secondary-sm p-8"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          >
            <MoreVertical size={20} />
          </button>

          <AnimatePresence>
            {showSettingsMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="admin-menu-dropdown"
              >
                <button
                  className="admin-menu-item"
                  onClick={() => {
                    navigator.clipboard.writeText(group.inviteCode);
                    alert(`초대코드(${group.inviteCode})가 복사되었습니다.`);
                    setShowSettingsMenu(false);
                  }}
                >
                  <Share2 size={16} className="text-green" /> 초대코드 복사
                </button>
                <button
                  className="admin-menu-item danger"
                  onClick={() => {
                    if (window.confirm('정말로 이 그룹을 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.')) {
                      onDeleteGroup(group.id);
                    }
                    setShowSettingsMenu(false);
                  }}
                >
                  <Trash size={16} /> 그룹 삭제
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="admin-sub-tabs px-16 mb-24">
        <button
          className={`admin-sub-tab-btn ${adminTab === 'teams' ? 'active' : ''}`}
          onClick={() => setAdminTab('teams')}
        >
          팀 관리
        </button>
        <button
          className={`admin-sub-tab-btn ${adminTab === 'members' ? 'active' : ''}`}
          onClick={() => setAdminTab('members')}
        >
          멤버 관리
        </button>
      </div>

      {adminTab === 'teams' && renderTeamsTab()}
      {adminTab === 'members' && renderMembersTab()}
    </div>
  );
};
const App: React.FC = () => {
  // --- Database module is now statically imported as 'db' ---

  const [activeTab, setActiveTab] = useState('home');
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'leader'>('user');
  const [userGroupId, setUserGroupId] = useState<string | null>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'individual' | 'group'>('individual');
  const [isInputView, setIsInputView] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile state - includes supabase profile ID
  const [profileId, setProfileId] = useState<string | null>(() => localStorage.getItem('profileId'));
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);
  const [allUserNames, setAllUserNames] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState({
    name: '',
    profilePic: null as string | null,
    statusMessage: '러닝 열정 폭발 🔥',
    monthlyDistance: '0',
    lastUpdatedMonth: new Date().getMonth() + 1,
    pbs: { '1KM': "00'00\"", '3KM': "00'00\"", '5KM': "00'00\"", '10KM': "00'00\"" },
    monthlyGoal: '100'
  });

  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [allGroupsState, setAllGroupsState] = useState<Group[]>([]);
  const [groupMemberMappings, setGroupMemberMappings] = useState<any[]>([]);

  // ============================================
  // Load data from Supabase on mount / login
  // ============================================
  const loadUserData = React.useCallback(async (pId: string, nickname: string) => {
    try {
      // Use Promise.all for parallel loading
      const [myGroups, challengeList, profile, allSystemGroups, allMappings] = await Promise.all([
        db.getMyGroups(pId),
        db.getChallenges(),
        db.getFullProfile(pId),
        db.getAllGroups(),
        db.getAllGroupMembers()
      ]);

      // 1. Process Groups
      const groupList: Group[] = myGroups.map((g: any) => ({
        id: g.id,
        name: g.name,
        leaderId: g.leader_id,
        inviteCode: g.invite_code,
        totalScore: g.total_score || 0,
        totalDistance: Number(g.total_distance) || 0,
        activeWeek: g.activeWeek || 1
      }));
      setGroups(groupList);
      setMyGroupIds(groupList.map(g => g.id));

      // 2. Process Challenges
      setChallenges(challengeList);
      setAllGroupsState(allSystemGroups);
      setGroupMemberMappings(allMappings);

      // 3. Process Profile & Refresh dependencies
      if (profile) {
        const currentMonth = new Date().getMonth() + 1;
        const dbMonth = profile.last_updated_month || currentMonth;

        if (dbMonth !== currentMonth) {
          console.log(`Month changed (${dbMonth} -> ${currentMonth}). Resetting distance.`);
          await db.updateProfile(pId, {
            monthly_distance: '0',
            last_updated_month: currentMonth
          });

          setUserInfo(prev => ({
            ...prev,
            name: profile.nickname,
            profilePic: profile.profile_pic,
            statusMessage: profile.status_message,
            monthlyDistance: '0',
            lastUpdatedMonth: currentMonth,
            monthlyGoal: profile.monthly_goal || '100',
            pbs: profile.pbs || prev.pbs
          }));
        } else {
          setUserInfo({
            name: profile.nickname,
            profilePic: profile.profile_pic,
            statusMessage: profile.status_message,
            monthlyDistance: profile.monthly_distance || '0',
            lastUpdatedMonth: profile.last_updated_month || currentMonth,
            monthlyGoal: profile.monthly_goal || '100',
            pbs: profile.pbs || { '1KM': "00'00\"", '3KM': "00'00\"", '5KM': "00'00\"", '10KM': "00'00\"" }
          });
        }
      } else {
        // Profile not found in database - likely a stale session from another DB
        console.warn("Profile not found in database. Logging out stale session.");
        setProfileId(null);
        setUserInfo({
          name: '',
          statusMessage: '러닝 열정 폭발 🔥',
          profilePic: null,
          monthlyDistance: '0',
          monthlyGoal: '100',
          lastUpdatedMonth: new Date().getMonth() + 1,
          pbs: { '1KM': "00'00\"", '3KM': "00'00\"", '5KM': "00'00\"", '10KM': "00'00\"" }
        });
        localStorage.clear();
        setLoading(false);
        return;
      }

      // 4. Load initial group data if applicable
      if (groupList.length > 0) {
        const firstGroup = groupList[0];
        const userGroupData = myGroups.find((g: any) => g.id === firstGroup.id);
        const role = userGroupData?.myRole === 'leader' ? 'leader' : 'user';

        setUserGroupId(firstGroup.id);
        setUserRole(role as 'user' | 'leader');
        setViewMode('group');

        // Parallel load for group specific data
        const [teamList, membersList, missionList, challengeList] = await Promise.all([
          db.getTeamsByGroup(firstGroup.id),
          db.getGroupMembers(firstGroup.id),
          db.getMissionsByGroup(firstGroup.id),
          db.getChallenges()
        ]);

        setTeams(teamList);
        const myTeam = teamList.find((t: any) => t.members.includes(nickname));
        setUserTeamId(myTeam ? myTeam.id : null);
        setGroupMembers(membersList.map((m: any) => m.nickname));
        setMissions(missionList);
        setChallenges(challengeList);
      } else {
        const indMissions = await db.getIndividualMissions(pId);
        setMissions(indMissions);
      }
      // 3. Process Missions (Show all missions in individual mode for global ranking)
      const allMissionList = await db.getAllMissions();
      setMissions(allMissionList);

      // 4. Set currentPeriod to the group's active week or latest challenge week
      const finalChallenges = challengeList && challengeList.length > 0 ? challengeList : [];
      if (finalChallenges.length > 0) {
        const latestWeek = Math.max(...finalChallenges.map((c: any) => c.week));
        const groupActiveWeek = groupList[0]?.activeWeek;
        setCurrentPeriod(groupActiveWeek || latestWeek);
      }

    } catch (e) {
      console.error('Data Loading Error:', e);
    } finally {
      setLoading(false);
    }
  }, []); // Only recreate if static imports change (never)

  const syncUserMileage = React.useCallback(async (pId: string, allMissions: Mission[]) => {
    if (!pId) return;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const userMissions = allMissions.filter(m => {
      const d = new Date(m.timestamp || new Date());
      return m.profileId === pId &&
        (d.getMonth() + 1) === currentMonth &&
        d.getFullYear() === currentYear;
    });

    const totalDist = userMissions.reduce((sum, m) => {
      if (m.status === 'approved' || m.type === '개인 러닝') {
        return sum + (m.distance || 0);
      }
      return sum;
    }, 0);

    const distStr = totalDist.toFixed(1);

    // Update State
    setUserInfo(prev => {
      const updated = { ...prev, monthlyDistance: distStr };
      localStorage.setItem('userInfo', JSON.stringify(updated));
      return updated;
    });

    // Update DB
    try {
      await db.updateProfile(pId, { monthly_distance: totalDist, last_updated_month: currentMonth });
    } catch (e) {
      console.error('Failed to sync mileage:', e);
    }
  }, []);


  // On mount: check if user was previously logged in
  useEffect(() => {
    if (profileId && !userInfo.name) {
      // Re-hydrate info from localStorage first for faster UI response
      const cached = localStorage.getItem('userInfo');
      if (cached) {
        const info = JSON.parse(cached);
        setUserInfo(info);
        loadUserData(profileId, info.name);
      } else {
        setLoading(false); // No data to load
      }
    } else if (!profileId) {
      setLoading(false);
    }
  }, [profileId, loadUserData]);

  // Load all user names for duplicate nickname check during signup
  useEffect(() => {
    db.getAllUserNames().then(names => setAllUserNames(names)).catch(console.error);
  }, []);

  const loadGroupData = React.useCallback(async (groupId: string) => {
    try {
      const [teamList, members, missionList, challengeList, allSystemGroups, allMappings] = await Promise.all([
        db.getTeamsByGroup(groupId),
        db.getGroupMembers(groupId),
        db.getAllMissions(), // Fetch all to include individual records for ranking
        db.getChallenges(),
        db.getAllGroups(),
        db.getAllGroupMembers()
      ]);
      setTeams(teamList);
      setGroupMembers(members.map((m: any) => m.nickname));
      setMissions(missionList);
      setChallenges(challengeList);
      setAllGroupsState(allSystemGroups);
      setGroupMemberMappings(allMappings);
    } catch (e) {
      console.error('Failed to load group data:', e);
    }
  }, []);

  // ============================================
  // Challenges (Supabase-backed)
  // ============================================
  const addChallenge = async () => {
    const nextWeek = challenges.length > 0 ? Math.max(...challenges.map((c: any) => c.week)) + 1 : 1;
    let title = '새로운 훈련';
    let desc = '훈련 내용을 입력해주세요.';
    let fields: any[] = [];

    if (nextWeek === 1) {
      title = '베이스 스트렝스 만들기!';
      desc = '1주차 미션\n\n개인 : 미션 2가지 수행 완료시 7점 / 1가지 완료시 3점\n스트렝스 : 미션 3가지 수동 완료시 10점\n팀 : 미션 45/20/4점';
      fields = [
        ...WEEK1_STRUCTURE.personal.map(f => ({ id: f.id, label: f.title, sub: f.sub, category: 'personal' as const })),
        ...WEEK1_STRUCTURE.strength.map(f => ({ id: f.id, label: f.title, sub: f.sub, category: 'strength' as const })),
        ...WEEK1_STRUCTURE.team.map(f => ({ id: f.id, label: f.title, sub: f.sub, category: 'team' as const }))
      ];
    }

    try {
      const created = await db.addChallengeDB(nextWeek, title, desc, fields);
      setChallenges(prev => [...prev, { id: created.id, week: created.week, title: created.title, description: created.description, recordFields: created.record_fields || [] }]);
    } catch (e) {
      console.error('Failed to add challenge:', e);
    }
  };

  const updateChallenge = async (id: string, title: string, desc: string, fields?: any[]) => {
    try {
      await db.updateChallengeDB(id, title, desc, fields);
      setChallenges((prev: any) => prev.map((c: any) => c.id === id ? { ...c, title, description: desc, recordFields: fields || c.recordFields } : c));
    } catch (e) {
      console.error('Failed to update challenge:', e);
    }
  };

  const deleteChallenge = async (id: string) => {
    if (window.confirm('이 주차의 챌린지를 삭제하시겠습니까?')) {
      try {
        await db.deleteChallengeDB(id);
        setChallenges((prev: any) => prev.filter((c: any) => c.id !== id));
      } catch (e) {
        console.error('Failed to delete challenge:', e);
      }
    }
  };

  // ============================================
  // Groups (Supabase-backed)
  // ============================================
  const handleCreateGroup = async (name: string) => {
    if (!profileId || isSubmitting) return;

    setIsSubmitting(true);
    const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      // 1. 그룹 생성
      const group = await db.createGroup(name, profileId, newInviteCode);
      if (!group) throw new Error('그룹 정보를 생성할 수 없습니다.');

      // 2. 기본 팀 생성
      const team = await db.createTeam(group.id, `${name} 01팀`);

      // 2.1 1주차 기본 챌린지 생성
      const w1Fields = [
        ...WEEK1_STRUCTURE.personal.map(f => ({ id: f.id, label: f.title, sub: f.sub, category: 'personal' as const })),
        ...WEEK1_STRUCTURE.strength.map(f => ({ id: f.id, label: f.title, sub: f.sub, category: 'strength' as const })),
        ...WEEK1_STRUCTURE.team.map(f => ({ id: f.id, label: f.title, sub: f.sub, category: 'team' as const }))
      ];
      const w1Title = '베이스 스트렝스 만들기!';
      const w1Desc = '1주차 미션\n\n개인 : 미션 2가지 수행 완료시 7점 / 1가지 완료시 3점\n스트렝스 : 미션 3가지 수동 완료시 10점\n팀 : 미션 45/20/4점';
      const w1Challenge = await db.addChallengeDB(1, w1Title, w1Desc, w1Fields);
      setChallenges([{ id: w1Challenge.id, week: 1, title: w1Title, description: w1Desc, recordFields: w1Fields }]);

      // 3. 팀 멤버 추가
      await db.addTeamMember(team.id, profileId);

      // 4. 로컬 상태 업데이트
      const newGroupObj: Group = {
        id: group.id,
        name: group.name,
        leaderId: group.leader_id,
        inviteCode: group.invite_code,
        totalScore: 0,
        totalDistance: 0
      };

      setGroups(prev => [...prev, newGroupObj]);
      setMyGroupIds(prev => [...prev, group.id]);
      setUserGroupId(group.id);
      setUserRole('leader');
      setTeams(prev => [...prev, {
        id: team.id,
        groupId: group.id,
        name: `${name} 01팀`,
        members: [userInfo.name],
        bonusPoints: 0
      }]);
      setUserTeamId(team.id);
      setGroupMembers([userInfo.name]);

      // 5. 뷰 전환
      setShowOnboarding(false);
      setShowGroupSelector(false);
      setViewMode('group');
      setActiveTab('leader');

    } catch (e: any) {
      console.error('Group Creation Error:', e);
      alert('그룹 생성 중 오류가 발생했습니다: ' + (e.message || '알 수 없는 오류'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGroup = async (code: string) => {
    if (!profileId) return;
    try {
      const group = await db.getGroupByInviteCode(code);
      if (!group) {
        alert('유효하지 않은 초대코드입니다.');
        return;
      }
      if (myGroupIds.includes(group.id)) {
        alert('이미 참여 중인 그룹입니다.');
        return;
      }

      await db.joinGroup(group.id, profileId);

      // Add to first team
      const teamList = await db.getTeamsByGroup(group.id);
      if (teamList.length > 0) {
        await db.addTeamMember(teamList[0].id, profileId);
      }

      const newGroup: Group = {
        id: group.id,
        name: group.name,
        leaderId: group.leader_id,
        inviteCode: group.invite_code,
        totalScore: group.total_score || 0,
        totalDistance: Number(group.total_distance) || 0
      };

      setGroups(prev => [...prev, newGroup]);
      setMyGroupIds(prev => [...prev, group.id]);
      setUserGroupId(group.id);
      setUserRole('user');

      // Reload group data
      await loadGroupData(group.id);

      setShowOnboarding(false);
      setShowGroupSelector(false);
      setViewMode('group');
      setActiveTab('home');
    } catch (e: any) {
      alert('그룹 참여 실패: ' + (e.message || ''));
    }
  };

  // ============================================
  // Profile (Supabase-backed)
  // ============================================
  const handleUpdateProfile = async (name: string, status: string, pic: string | null, dist: string, pbs: any, goal?: string) => {
    // Check if nickname changed and if it's already taken
    if (name !== userInfo.name && allUserNames.includes(name)) {
      alert('이미 사용 중인 닉네임입니다.');
      return;
    }

    let finalPic = pic;
    if (pic && pic.startsWith('blob:')) {
      try {
        const response = await fetch(pic);
        const blob = await response.blob();

        const compressionOptions = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: 'image/webp'
        };

        const compressedBlob = await imageCompression(new File([blob], 'profile.jpg', { type: blob.type }), compressionOptions);
        const file = new File([compressedBlob], `profile-${Date.now()}.webp`, { type: 'image/webp' });
        finalPic = await db.uploadFile(file);
      } catch (uploadErr) {
        console.error('Profile pic upload failed:', uploadErr);
        alert('프로필 사진 업로드에 실패했습니다. 사진을 제외하고 업데이트됩니다.');
        finalPic = userInfo.profilePic; // Revert to old pic
      }
    }

    setUserInfo((prev: any) => ({ ...prev, name, statusMessage: status, profilePic: finalPic, monthlyDistance: dist, pbs, monthlyGoal: goal || prev.monthlyGoal }));

    if (profileId) {
      try {
        await db.updateProfile(profileId, {
          nickname: name,
          status_message: status,
          profile_pic: finalPic,
          monthly_distance: parseFloat(dist) || 0,
          pbs,
          monthly_goal: parseFloat(goal || '100')
        });

        // Update allUserNames list
        if (name !== userInfo.name) {
          const oldName = userInfo.name;
          setAllUserNames(prev => [...prev.filter(n => n !== oldName), name]);
          // Sync missions state locally
          setMissions(prev => prev.map(m => m.profileId === profileId ? { ...m, userName: name } : m));
          // Sync teams state locally
          setTeams(prev => prev.map(t => ({
            ...t,
            members: t.members.map(m => m === oldName ? name : m)
          })));
          // Sync group members list
          setGroupMembers(prev => prev.map(m => m === oldName ? name : m));
          // Sync mappings 
          setGroupMemberMappings(prev => prev.map(m => m.userName === oldName ? { ...m, userName: name } : m));
        }



        localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, name, statusMessage: status, profilePic: finalPic, monthlyDistance: dist, pbs, monthlyGoal: goal || userInfo.monthlyGoal }));
      } catch (e: any) {
        console.error('Failed to update profile:', e);
        alert('프로필 업데이트에 실패했습니다: ' + (e.message || ''));
      }
    }
  };

  const submitMissionHandler = async (records: any, photos: string[], distance: string) => {
    if (!profileId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (editingMission) {
        const uploadedPhotos = await Promise.all(photos.map(async (url) => {
          if (url.startsWith('blob:')) {
            const rawUrl = url.split('#')[0];
            const isVid = url.includes('#vid');

            try {
              const response = await fetch(rawUrl);
              const blob = await response.blob();

              if (!isVid && blob.type.startsWith('image/')) {
                const compressionOptions = {
                  maxSizeMB: 1,
                  maxWidthOrHeight: 1280,
                  useWebWorker: true,
                  fileType: 'image/webp'
                };
                const compressedBlob = await imageCompression(new File([blob], 'mission.jpg', { type: blob.type }), compressionOptions);
                const file = new File([compressedBlob], `mission-${Date.now()}.webp`, { type: 'image/webp' });
                return (await db.uploadFile(file));
              }

              // Fallback for videos or if compression fails
              const ext = blob.type.split('/')[1] || (isVid ? 'mp4' : 'jpg');
              const file = new File([blob], `upload-${Date.now()}.${ext}`, { type: blob.type });
              const publicUrl = await db.uploadFile(file);
              return publicUrl + (isVid ? '#vid' : '');
            } catch (e) {
              console.error('Upload failed', e);
              return url;
            }
          }
          return url;
        }));

        await db.updateMission(editingMission.id, {
          records,
          images: uploadedPhotos,
          distance: parseFloat(distance) || 0
        });

        const newList = missions.map((m: any) => m.id === editingMission.id ? {
          ...m,
          records,
          images: uploadedPhotos,
          distance: parseFloat(distance) || 0
        } : m);
        setMissions(newList);
        if (profileId) await syncUserMileage(profileId, newList);
        setEditingMission(null);
        setIsInputView(false);
        return;
      }

      const isIndividual = viewMode === 'individual';
      const addedDist = parseFloat(distance) || 0;

      // 1. Upload files to Supabase Storage if they are local blob URLs
      const uploadedPhotos = await Promise.all(photos.map(async (url) => {
        if (url.startsWith('blob:')) {
          const rawUrl = url.split('#')[0];
          const isVid = url.includes('#vid');

          try {
            const response = await fetch(rawUrl);
            const blob = await response.blob();

            // Image compression
            if (!isVid && blob.type.startsWith('image/')) {
              try {
                const compressionOptions = {
                  maxSizeMB: 1,
                  maxWidthOrHeight: 1280,
                  useWebWorker: true,
                  fileType: 'image/webp'
                };
                const compressedBlob = await imageCompression(new File([blob], 'mission.jpg', { type: blob.type }), compressionOptions);
                const file = new File([compressedBlob], `mission-${Date.now()}.webp`, { type: 'image/webp' });
                const publicUrl = await db.uploadFile(file);
                return publicUrl;
              } catch (compErr) {
                console.error('Compression failed, falling back to original', compErr);
              }
            }

            // Fallback for videos or failed compression
            const ext = blob.type.split('/')[1] || (isVid ? 'mp4' : 'jpg');
            const file = new File([blob], `upload-${Date.now()}.${ext}`, { type: blob.type });
            const publicUrl = await db.uploadFile(file);
            return publicUrl + (isVid ? '#vid' : '');
          } catch (uploadErr) {
            console.error('File upload failed:', uploadErr);
            throw new Error('파일 업로드 중 오류가 발생했습니다.');
          }
        }
        return url; // Already a remote URL
      }));

      const created = await db.submitMission({
        groupId: isIndividual ? null : userGroupId,
        teamId: isIndividual ? null : userTeamId,
        profileId,
        userName: userInfo.name,
        week: currentPeriod,
        type: isIndividual ? '개인 러닝' : '챌린지 인증',
        status: 'approved',
        records,
        distance: addedDist,
        images: uploadedPhotos
      });

      const createdItem = {
        id: created.id,
        groupId: created.group_id,
        teamId: created.team_id,
        profileId: created.profile_id,
        userName: created.user_name,
        week: created.week,
        type: created.type,
        status: created.status,
        timestamp: created.created_at,
        records: created.records || {},
        distance: Number(created.distance) || 0,
        images: created.images || [],
        likedBy: [],
        comments: []
      };

      const newList = [createdItem, ...missions];
      setMissions(newList);
      if (profileId) await syncUserMileage(profileId, newList);
      setIsInputView(false);
    } catch (e: any) {
      console.error('Failed to submit/update mission:', e);
      alert('작업 실패: ' + (e.message || '알 수 없는 오류'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const likeMission = async (id: string) => {
    setMissions((prev: any) => prev.map((m: any) => {
      if (m.id !== id) return m;
      const isLiked = m.likedBy.includes(userInfo.name);
      return { ...m, likedBy: isLiked ? m.likedBy.filter((n: string) => n !== userInfo.name) : [...m.likedBy, userInfo.name] };
    }));
    try {
      await db.toggleLike(id, userInfo.name);
    } catch (e) {
      console.error('Failed to toggle like:', e);
    }
  };

  const addCommentHandler = async (missionId: string, text: string) => {
    if (!profileId) return;
    try {
      const created = await db.addComment(missionId, profileId, userInfo.name, text);
      const newComment: Comment = { id: created.id, userName: created.user_name, text: created.text, timestamp: created.created_at };
      setMissions((prev: any) => prev.map((m: any) => m.id === missionId ? { ...m, comments: [...m.comments, newComment] } : m));
    } catch (e) {
      console.error('Failed to add comment:', e);
    }
  };

  const deleteMission = async (id: string) => {
    if (window.confirm('인증 게시물을 삭제하시겠습니까?')) {
      const newList = missions.filter((m: any) => m.id !== id);
      setMissions(newList);
      try {
        await db.deleteMission(id);
        if (profileId) await syncUserMileage(profileId, newList);
      } catch (e) {
        console.error('Failed to delete mission:', e);
      }
    }
  };

  const deleteCommentHandler = async (missionId: string, commentId: string) => {
    if (window.confirm('댓글을 삭제하시겠습니까?')) {
      setMissions((prev: any) => prev.map((m: any) =>
        m.id === missionId ? { ...m, comments: m.comments.filter((c: any) => c.id !== commentId) } : m
      ));
      try {
        await db.deleteComment(commentId);
      } catch (e) {
        console.error('Failed to delete comment:', e);
      }
    }
  };

  const currentGroup = groups.find(g => g.id === userGroupId);
  const currentTeam = teams.find(t => t.id === userTeamId);

  // ============================================
  // Group switching / leaving
  // ============================================
  const switchGroup = async (groupId: string) => {
    setUserGroupId(groupId);
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setUserRole(group.leaderId === profileId ? 'leader' : 'user');
    }
    setShowGroupSelector(false);
    setViewMode('group');
    setActiveTab('home');

    // Reload group data from Supabase
    await loadGroupData(groupId);
    const myTeam = teams.find(t => t.groupId === groupId && t.members.includes(userInfo.name));
    setUserTeamId(myTeam ? myTeam.id : null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const leaveGroup = async (groupId: string) => {
    if (!profileId) return;

    // Check if the current user is the leader of this group
    const group = groups.find(g => g.id === groupId);
    const isLeader = group && group.leaderId === profileId;

    if (isLeader) {
      if (!confirm('그룹장이 탈퇴하면 그룹이 삭제됩니다. 정말 탈퇴하시겠습니까?')) return;
      try {
        await db.deleteGroup(groupId);
        showToast(`'${group.name}' 그룹이 삭제되었습니다.`);
      } catch (e) {
        console.error('Failed to delete group:', e);
        showToast('그룹 삭제 중 오류가 발생했습니다.');
        return;
      }
    } else {
      if (!confirm('정말 이 그룹을 탈퇴하시겠습니까?')) return;
      try {
        await db.leaveGroup(groupId, profileId);
        showToast('그룹에서 탈퇴했습니다.');
      } catch (e) {
        console.error('Failed to leave group:', e);
        showToast('그룹 탈퇴 중 오류가 발생했습니다.');
        return;
      }
    }

    const updatedIds = myGroupIds.filter(id => id !== groupId);
    setMyGroupIds(updatedIds);
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setTeams(prev => prev.filter((t: any) => t.groupId !== groupId));
    setMissions(prev => prev.filter((m: any) => m.groupId !== groupId));

    if (userGroupId === groupId) {
      if (updatedIds.length > 0) {
        switchGroup(updatedIds[0]);
      } else {
        setUserGroupId(null);
        setUserTeamId(null);
        setUserRole('user');
        setViewMode('individual');
        setActiveTab('home');
      }
    }
    if (updatedIds.length === 0) {
      setShowGroupSelector(false);
      setShowOnboarding(false);
    }
  };

  const handleGroupBtnClick = () => {
    if (viewMode === 'group') {
      setViewMode('individual');
      setActiveTab('home');
    } else {
      if (myGroupIds.length === 0) {
        setShowOnboarding(true);
      } else {
        setShowGroupSelector(true);
      }
    }
  };

  // ============================================
  // Teams (Supabase-backed)
  // ============================================
  const addTeam = async () => {
    if (!userGroupId) return;
    try {
      const newTeamCount = teams.filter((t: any) => t.groupId === userGroupId).length + 1;
      const team = await db.createTeam(userGroupId, `새 팀 ${newTeamCount}`);
      setTeams((prev: any) => [...prev, { id: team.id, groupId: userGroupId, name: team.name, members: [] }]);
    } catch (e) {
      console.error('Failed to add team:', e);
    }
  };

  const renameTeam = async (teamId: string, newName: string) => {
    setTeams((prev: any) => prev.map((t: any) => t.id === teamId ? { ...t, name: newName } : t));
    try {
      await db.renameTeam(teamId, newName);
    } catch (e) {
      console.error('Failed to rename team:', e);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (window.confirm('팀을 삭제하시겠습니까?')) {
      setTeams((prev: any) => prev.filter((t: any) => t.id !== teamId));
      try {
        await db.deleteTeam(teamId);
      } catch (e) {
        console.error('Failed to delete team:', e);
      }
    }
  };

  const addMember = async (teamId: string, memberName: string) => {
    if (!memberName.trim()) return;
    setTeams((prev: any) => prev.map((t: any) => t.id === teamId ? { ...t, members: [...t.members, memberName.trim()] } : t));
    try {
      const profile = await db.getProfileByNickname(memberName.trim());
      if (profile) await db.addTeamMember(teamId, profile.id);
    } catch (e) {
      console.error('Failed to add member:', e);
    }
  };

  const removeMember = async (teamId: string, memberName: string) => {
    setTeams((prev: any) => prev.map((t: any) => t.id === teamId ? { ...t, members: t.members.filter((m: any) => m !== memberName) } : t));
    try {
      const profile = await db.getProfileByNickname(memberName);
      if (profile) await db.removeTeamMember(teamId, profile.id);
    } catch (e) {
      console.error('Failed to remove member:', e);
    }
  };

  const kickMember = async (name: string) => {
    if (window.confirm(`${name} 멤버를 내보내시겠습니까?`)) {
      setGroupMembers((prev: any) => prev.filter((m: any) => m !== name));
      setTeams((prev: any) => prev.map((t: any) => ({ ...t, members: t.members.filter((m: any) => m !== name) })));
      if (name === userInfo.name && userGroupId) {
        setMyGroupIds(prev => prev.filter(id => id !== userGroupId));
        setUserGroupId(null);
        setUserTeamId(null);
        setUserRole('user');
        setViewMode('individual');
        setActiveTab('home');
      }
      try {
        if (userGroupId) {
          const profile = await db.getProfileByNickname(name);
          if (profile) await db.kickMemberFromGroup(userGroupId, profile.id);
        }
      } catch (e) {
        console.error('Failed to kick member:', e);
      }
    }
  };

  const handleUpdateTeamPoints = async (teamId: string, pts: number) => {
    setTeams((prev: any) => prev.map((t: any) => t.id === teamId ? { ...t, bonusPoints: pts } : t));
    try {
      await db.updateTeamPoints(teamId, pts);
    } catch (e) {
      console.error('Failed to update team points:', e);
    }
  };

  const deleteGroup = async (id: string) => {
    setGroups((prev: any) => prev.filter((g: any) => g.id !== id));
    setTeams((prev: any) => prev.filter((t: any) => t.groupId !== id));
    setMissions((prev: any) => prev.filter((m: any) => m.groupId !== id));
    setMyGroupIds(prev => prev.filter(gid => gid !== id));
    setUserGroupId(null);
    setUserTeamId(null);
    setUserRole('user');
    setViewMode('individual');
    setActiveTab('home');
    try {
      await db.deleteGroup(id);
    } catch (e) {
      console.error('Failed to delete group:', e);
    }
  };

  // ============================================
  // Auth (Supabase-backed)
  // ============================================
  const handleLoginSubmit = async (name: string, pass: string) => {
    try {
      const user = await db.loginUser(name, pass);
      if (user) {
        const info = {
          name: user.nickname,
          profilePic: user.profile_pic,
          statusMessage: user.status_message,
          monthlyDistance: String(user.monthly_distance || 0),
          lastUpdatedMonth: user.last_updated_month,
          pbs: user.pbs || { '1KM': "00'00\"", '3KM': "00'00\"", '5KM': "00'00\"", '10KM': "00'00\"" },
          monthlyGoal: String(user.monthly_goal || 100)
        };
        setProfileId(user.id);
        setUserInfo(info);
        localStorage.setItem('profileId', user.id);
        localStorage.setItem('userInfo', JSON.stringify(info));
        loadUserData(user.id, user.nickname);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login failed:', e);
      return false;
    }
  };

  const handleSignupSubmit = async (data: any) => {
    try {
      const user = await db.signupUser(data.name, data.password);
      const info = {
        name: user.nickname,
        profilePic: null,
        statusMessage: '러닝 열정 폭발 🔥',
        monthlyDistance: '0',
        lastUpdatedMonth: new Date().getMonth() + 1,
        pbs: { '1KM': "00'00\"", '3KM': "00'00\"", '5KM': "00'00\"", '10KM': "00'00\"" },
        monthlyGoal: data.monthlyGoal || '100'
      };
      setProfileId(user.id);
      setUserInfo(info);
      localStorage.setItem('profileId', user.id);
      localStorage.setItem('userInfo', JSON.stringify(info));
      setLoading(false);
    } catch (e: any) {
      alert('회원가입 실패: ' + (e.message || '중복된 닉네임일 수 있습니다.'));
    }
  };

  const renderContent = () => {
    if (!userInfo.name) return <AuthView onLogin={handleLoginSubmit} onSignup={handleSignupSubmit} allUserNames={allUserNames} />;

    if (showOnboarding) return <OnboardingView onCreate={handleCreateGroup} onJoin={handleJoinGroup} onBack={() => { setShowOnboarding(false); if (myGroupIds.length > 0) setShowGroupSelector(true); }} allGroupNames={groups.map(g => g.name)} />;

    if (showGroupSelector) return (
      <GroupSelectorView
        myGroups={groups.filter(g => myGroupIds.includes(g.id))}
        onSelect={switchGroup}
        onAddNew={() => { setShowGroupSelector(false); setShowOnboarding(true); }}
        onBack={() => setShowGroupSelector(false)}
      />
    );

    if (isInputView) return (
      <MissionInputView
        onBack={() => setIsInputView(false)}
        onSubmit={submitMissionHandler}
        onToast={showToast}
        isGroup={viewMode === 'group'}
        challenge={challenges.find(c => c.week === (editingMission?.week || currentPeriod))}
        initialMission={editingMission || undefined}
        currentWeek={editingMission?.week || currentPeriod}
        missions={missions}
        currentUserName={userInfo.name}
        isSubmitting={isSubmitting}
        teamMembers={currentTeam?.members || []}
      />
    );

    const isGroupCtx = viewMode === 'group' && userGroupId;
    switch (activeTab) {
      case 'home': return <HomeView
        group={isGroupCtx ? currentGroup || null : null}
        allGroups={allGroupsState}
        groupMemberMappings={groupMemberMappings}
        team={isGroupCtx ? currentTeam || null : null}
        missions={missions}
        userInfo={userInfo}
        onStartInput={() => setIsInputView(true)}
        currentWeek={currentPeriod}
        challenges={challenges}
      />;
      case 'challenge':
        return (
          <ChallengeView
            challenges={challenges}
            userRole={userRole}
            onAdd={addChallenge}
            onUpdate={updateChallenge}
            onDelete={deleteChallenge}
            currentWeek={currentPeriod}
            onActivate={async (w) => {
              setCurrentPeriod(w);
              if (userGroupId) {
                try {
                  await db.updateGroupActiveWeek(userGroupId, w);
                  // Optionally update the groups state locally too
                  setGroups(prev => prev.map(g => g.id === userGroupId ? { ...g, activeWeek: w } : g));
                } catch (e) {
                  console.error('Failed to sync active week to DB:', e);
                }
              }
            }}
          />
        );
      case 'community':
        const filteredMissions = missions.filter((m: any) => {
          // 1. 주차 필터링 (선택된 경우)
          if (viewWeek && m.week !== viewWeek) return false;

          // 2. 권한/상태 필터링: 승인된 게시물 OR 본인 게시물 OR 리더(승인용)
          const isMe = m.userName === userInfo.name;
          const isLeader = userRole === 'leader';
          const isApproved = m.status === 'approved';

          // 승인된 모든 게시물은 노출 (업데이트 전 기본 동작)
          // 리더는 소속 그룹의 승인 대기물 확인용 추가 노출
          const isRelevantPending = (isMe || (isLeader && m.groupId === userGroupId)) && m.status === 'pending';

          if (!(isApproved || isRelevantPending)) return false;

          return true;
        });
        return (
          <WeeklyFeedView
            week={viewWeek}
            missions={filteredMissions}
            currentUserName={userInfo.name}
            userRole={userRole}
            teams={teams}
            onLike={likeMission}
            onComment={addCommentHandler}
            onDeleteMission={deleteMission}
            onDeleteComment={deleteCommentHandler}
            challenges={challenges}
            groupMemberMappings={groupMemberMappings}
          />
        );

      case 'ranking': return <RankingView
        currentGroupId={isGroupCtx ? userGroupId : null}
        userInfo={userInfo}
        teams={teams}
        missions={missions}
        groups={groups}
        myGroupIds={myGroupIds}
        challenges={challenges}
        groupMembers={groupMembers}
        allUserNames={allUserNames}
        groupMemberMappings={groupMemberMappings}
      />;
      case 'profile': return (
        <ProfileView
          missions={missions}
          userInfo={userInfo}
          onUpdate={handleUpdateProfile}
          onEditMission={(m) => { setEditingMission(m); setIsInputView(true); }}
          onLeaveGroup={isGroupCtx ? () => leaveGroup(userGroupId as string) : undefined}
          currentGroupName={isGroupCtx ? (currentGroup?.name || '') : undefined}
          onLogout={() => {
            setProfileId(null);
            setUserInfo({
              name: '',
              statusMessage: '러닝 열정 폭발 🔥',
              profilePic: null,
              monthlyDistance: '0',
              monthlyGoal: '100',
              lastUpdatedMonth: new Date().getMonth() + 1,
              pbs: { '1KM': "00'00\"", '3KM': "00'00\"", '5KM': "00'00\"", '10KM': "00'00\"" }
            });
            setUserGroupId(null);
            setUserTeamId(null);
            setUserRole('user');
            setMyGroupIds([]);
            setGroups([]);
            setTeams([]);
            setMissions([]);
            setGroupMembers([]);
            setChallenges([]);
            setViewMode('individual');
            setActiveTab('home');
            localStorage.clear();
          }}
        />
      );
      case 'leader': return currentGroup ? (

        <LeaderView
          group={currentGroup}
          teams={teams}
          addTeam={addTeam}
          renameTeam={renameTeam}
          deleteTeam={deleteTeam}
          addMember={addMember}
          removeMember={removeMember}
          kickMember={kickMember}
          updateTeamPoints={handleUpdateTeamPoints}
          allMembers={groupMembers}
          onDeleteGroup={deleteGroup}
        />
      ) : <div className="empty-state-fit py-100 flex-center flex-col"><Shield size={48} className="text-gray-800 mb-16" /><p className="text-gray">그룹에 가입되어 있지 않습니다.</p><button className="btn-primary mt-20" onClick={() => setShowOnboarding(true)}>그룹 가입/생성하기</button></div>;
      default: return <HomeView
        group={isGroupCtx ? currentGroup || null : null}
        allGroups={allGroupsState}
        groupMemberMappings={groupMemberMappings}
        team={isGroupCtx ? currentTeam || null : null}
        missions={missions}
        userInfo={userInfo}
        onStartInput={() => setIsInputView(true)}
        currentWeek={currentPeriod}
        challenges={challenges}
      />;
    }
  };

  return (
    <div className="app-wrapper">
      {loading && (
        <div className="loading-overlay">
          <Zap size={64} fill="var(--fit-green)" color="var(--fit-green)" strokeWidth={0} className="loading-icon" />
          <p className="loading-text">데이터를 불러오는 중...</p>
        </div>
      )}

      {!isInputView && !showOnboarding && userInfo.name && !loading && (
        <header className="main-header">
          <h2 className="header-title">TT Challenge</h2>
          <button className="group-header-btn" onClick={handleGroupBtnClick}>{viewMode === 'group' ? 'INDIVIDUAL' : 'GROUP'}</button>
        </header>
      )}
      <AnimatePresence mode="wait">
        {!loading && (
          <motion.div key={isInputView ? 'input' : showOnboarding ? 'onboarding' : showGroupSelector ? 'selector' : (activeTab + (viewWeek ? `-week-${viewWeek}` : ''))} initial={{ opacity: 0, x: isInputView ? 50 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isInputView ? -50 : -20 }} transition={{ duration: 0.3 }} className="content-area">
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
      {!isInputView && !showOnboarding && userInfo.name && !loading && (
        <nav className="bottom-nav">
          <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}><Home size={22} /><span>홈</span></div>
          {viewMode === 'group' && (
            <div className={`nav-item ${activeTab === 'challenge' ? 'active' : ''}`} onClick={() => setActiveTab('challenge')}><Calendar size={22} /><span>챌린지</span></div>
          )}
          {viewMode === 'group' && (
            <div className={`nav-item ${activeTab === 'community' ? 'active' : ''}`} onClick={() => { setViewWeek(null); setActiveTab('community'); }}>
              <MessageSquare size={22} /><span>커뮤니티</span>
            </div>
          )}
          <div className={`nav-item ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => setActiveTab('ranking')}><Trophy size={22} /><span>랭킹</span></div>
          <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><User size={22} /><span>내 정보</span></div>
          {userRole === 'leader' && viewMode === 'group' && <div className={`nav-item ${activeTab === 'leader' ? 'active' : ''}`} onClick={() => setActiveTab('leader')}><Shield size={22} /><span>그룹 관리</span></div>}
        </nav>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="toast-notification"
            initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
            transition={{ duration: 0.2 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default App;
