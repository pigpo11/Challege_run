import React, { useState, useRef, useEffect } from 'react';
import { Home, Trophy, Calendar, Settings, ChevronLeft, Camera, Check, Plus, ArrowRight, Activity, Zap, Share2, UserPlus, Shield, User, Trash2, Edit2, X, MoreVertical, Heart, MessageCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

type Group = {
  id: string;
  name: string;
  leaderId: string;
  inviteCode: string;
  totalScore: number;
  totalDistance: number;
};

type Team = {
  id: string;
  groupId: string;
  name: string;
  members: string[];
};

type Mission = {
  id: string;
  groupId: string;
  teamId: string;
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
  recordFields?: { id: string; label: string; placeholder: string; unit: string }[];
};

const OnboardingView = ({ onCreate, onJoin, onBack }: { onCreate: (n: string) => void, onJoin: (c: string) => void, onBack: () => void }) => {
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [value, setValue] = useState('');

  return (
    <div className="page-container flex flex-col justify-center h-full px-24 bg-black">
      <div className="text-center mb-48">
        <div className="onboarding-icon-box mx-auto mb-20">
          <Activity size={36} className="text-green" />
        </div>
        <h1 className="text-white text-32 bold tracking-tight">10km TT 릴레이</h1>
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
                <button className="btn-dark-lg flex-1" onClick={() => { setMode('choice'); setValue(''); }}>뒤로가기</button>
                <button className="btn-primary-lg flex-1" onClick={() => onCreate(value)}>그룹 생성</button>
              </div>
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
                placeholder="6자리 초대코드 (예: RUN-123)"
                value={value}
                onChange={e => setValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-16 mt-24">
                <button className="btn-dark-lg flex-1" onClick={() => { setMode('choice'); setValue(''); }}>뒤로가기</button>
                <button className="btn-primary-lg flex-1" onClick={() => onJoin(value.toUpperCase())}>그룹 참가</button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const AuthView = ({ onLogin, onSignup, allUserNames }: { onLogin: (name: string, pass: string) => boolean, onSignup: (data: any) => void, allUserNames: string[] }) => {
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

  const handleLogin = () => {
    if (!onLogin(loginName, loginPass)) {
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

  const renderPinInput = (value: string, onChange: (v: string) => void) => {
    return (
      <div className="pin-input-container">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`pin-box ${value.length === i ? 'active' : ''} ${value.length > i ? 'filled' : ''}`}>
            {value[i] || '-'}
          </div>
        ))}
        <input
          type="tel"
          pattern="[0-9]*"
          maxLength={6}
          className="auth-hidden-input"
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
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
            <button className="auth-back-btn" onClick={() => setSignupStep(1)}><ChevronLeft size={28} /></button>
            <div className="auth-header">
              <h1 className="auth-title">로그인 시 사용할<br />숫자 6자리를 입력해주세요</h1>
            </div>
            {renderPinInput(newPass, setNewPass)}
            <button className="auth-btn-primary" disabled={newPass.length < 6} onClick={nextSignupStep}>다음</button>
          </div>
        );
      case 3: // Password Confirm
        return (
          <div className="auth-container relative">
            <button className="auth-back-btn" onClick={() => setSignupStep(2)}><ChevronLeft size={28} /></button>
            <div className="auth-header">
              <h1 className="auth-title">비밀번호를<br />한 번 더 입력해 주세요</h1>
            </div>
            {renderPinInput(confirmPass, setConfirmPass)}
            {signupError && <p className="error-msg-premium text-center">{signupError}</p>}
            <button className="auth-btn-primary" disabled={confirmPass.length < 6} onClick={nextSignupStep}>다음</button>
          </div>
        );
      case 4: // Monthly Goal
        return (
          <div className="auth-container relative">
            <button className="auth-back-btn" onClick={() => setSignupStep(3)}><ChevronLeft size={28} /></button>
            <div className="auth-header">
              <h1 className="auth-title">이번 달 목표 러닝 마일리지를<br />설정해 주세요</h1>
              <p className="auth-subtitle">내 속도에 맞는 목표를 정해보세요</p>
            </div>
            <div className="auth-input-wrapper">
              <input
                type="number"
                className="auth-input text-24 font-bold text-center"
                placeholder="100"
                value={newGoal}
                onChange={e => setNewGoal(e.target.value)}
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

const HomeView = ({ group, allGroups, team, missions, userInfo, onStartInput, currentWeek, challenges }: { group: Group | null, allGroups: Group[], team: Team | null, missions: Mission[], userInfo: any, onStartInput: () => void, currentWeek: number, challenges: WeeklyChallenge[] }) => {
  const myMissions = missions.filter(m => (team ? m.teamId === team.id : m.teamId === 'individual') && m.week === currentWeek && m.userName === userInfo.name);
  const currentChallenge = challenges.find(c => c.week === currentWeek);

  const aggregateStatus = myMissions.length === 0 ? 'none' :
    myMissions.some(m => m.status === 'pending') ? 'pending' : 'approved';

  const myPoints = missions.filter(m => m.userName === userInfo.name && m.status === 'approved' && m.type === '챌린지 인증').length * 10;
  const teamMissions = team ? missions.filter(m => team.members.includes(m.userName) && m.status === 'approved' && m.type === '챌린지 인증') : [];
  const teamPoints = teamMissions.length * 10;

  const sortedGroupsByDistance = [...allGroups].sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0));
  const myGroupRank = group ? sortedGroupsByDistance.findIndex(g => g.id === group.id) + 1 : null;

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
          <div className="px-16 mt-32">
            <div className="distance-hero-card">
              <div className="flex-between">
                <div className="flex items-center gap-12">
                  <Activity size={20} className="text-green" />
                  <p className="text-gray-400 font-16 bold">{new Date().getMonth() + 1}월 러닝 마일리지</p>
                </div>
                <div className="mileage-goal-wrap mt-0">
                  <span className="mileage-goal-txt">목표 {userInfo.monthlyGoal}km 대비</span>
                </div>
              </div>

              <div className="stat-card-distance">
                <div className="mileage-card-v2">
                  <span className="mileage-current" style={{ fontSize: '42px' }}>
                    {userInfo.monthlyDistance}<span className="font-18 text-gray-600 ml-4 font-normal">km</span>
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
                <p className="text-gray-500 font-13">러닝 기록을 남기고 성장을 확인하세요 🔥</p>
              </div>
              <button className="camera-action-btn" onClick={onStartInput}>
                <Camera size={24} />
              </button>
            </div>
          </div>

          <div className="section-header flex-between px-16 mt-40">
            <h3 className="section-title-alt">그룹 랭킹</h3>
          </div>

          <div className="group-mini-ranking mt-12 px-16">
            {(sortedGroupsByDistance as Group[]).slice(0, 10).map((g: Group, i: number) => (
              <div key={g.id} className="mini-rank-item">
                <span className="rank-num">{i + 1}</span>
                <span className="group-name">{g.name}</span>
                <span className="group-score">{(g.totalDistance || 0).toLocaleString()} km</span>
              </div>
            ))}
          </div>

          <div className="section-header flex-between px-16 mt-40">
            <h3 className="section-title-alt">활동 퍼포먼스</h3>
          </div>

          <div className="mt-12 px-16">
            <div className="stat-card" style={{ width: '100%' }}>
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
            <div className="flex-between">
              <div>
                <h3 className="text-white">{currentWeek}주차 미션</h3>
                <p className="text-gray font-14">{currentChallenge ? `${currentChallenge.title} (${currentChallenge.description.substring(0, 15)}...)` : '진행 중인 미션이 없습니다.'}</p>
              </div>
              <div className={`status-pill ${aggregateStatus}`}>
                {aggregateStatus === 'approved' ? '승인완료' : aggregateStatus === 'pending' ? '승인대기' : '미제출'}
              </div>
            </div>

            <button className="btn-primary w-full mt-24 flex-center gap-8 py-20" onClick={onStartInput}>
              <Camera size={20} /> {myMissions.length === 0 ? '오늘의 챌린지 인증하기' : '추가 인증하기'}
            </button>

            {aggregateStatus === 'pending' && (
              <div className="info-box-alt mt-24">
                <Zap size={18} className="text-green" />
                <p className="font-14 text-white">그룹장이 미션을 확인 중입니다.</p>
              </div>
            )}
          </div>

          <div className="section-header flex-between px-16 mt-40">
            <h3 className="section-title-alt">{new Date().getMonth() + 1}월 그룹 랭킹</h3>
          </div>

          <div className="group-mini-ranking mt-12 px-16">
            {(sortedGroupsByDistance as Group[]).slice(0, 5).map((g: Group, i: number) => (
              <div key={g.id} className={`mini-rank-item ${group && g.id === group.id ? 'active' : ''}`}>
                <span className="rank-num">{i + 1}</span>
                <span className="group-name">{g.name}</span>
                <span className="group-score">{(g.totalDistance || 0).toLocaleString()} km</span>
              </div>
            ))}
            {group && myGroupRank && myGroupRank > 5 && (
              <>
                <div className="rank-divider my-8 border-t border-gray-800" />
                <div className="mini-rank-item active">
                  <span className="rank-num">{myGroupRank}</span>
                  <span className="group-name">{group.name}</span>
                  <span className="group-score">{(group.totalDistance || 0).toLocaleString()} km</span>
                </div>
              </>
            )}
          </div>

          <div className="section-header flex-between px-16 mt-40">
            <h3 className="section-title-alt">활동 퍼포먼스</h3>
            <ArrowRight size={18} color="#48484A" />
          </div>

          <div className="stats-grid mt-12 px-16">
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
        </>
      )}
    </div>
  );
};

const RankingView = ({ currentGroupId, userInfo, teams, missions }: { currentGroupId: string | null, userInfo: any, teams: Team[], missions: Mission[] }) => {
  const [rankTab, setRankTab] = useState<'team' | 'individual'>('team');

  const isGroupMode = !!currentGroupId;

  // Calculate real team rankings based on challenge points
  const teamRankings = isGroupMode
    ? teams.filter(t => t.groupId === currentGroupId).map(t => {
      const points = missions.filter(m => t.members.includes(m.userName) && m.status === 'approved' && m.type === '챌린지 인증').length * 10;
      return { name: t.name, pts: points, members: t.members.length };
    }).sort((a, b) => b.pts - a.pts)
    : [];

  // Individual rankings within group
  // Individual rankings derived from missions (mocked for demo, but should use real user data in production)
  // For now, we only show the current user in a clean start
  const individualRankings = [
    {
      name: userInfo.name,
      distance: parseFloat(userInfo.monthlyDistance),
      team: isGroupMode ? (teams.find(t => t.members.includes(userInfo.name))?.name || '-') : '-',
      pic: userInfo.profilePic,
      isMe: true,
      status: userInfo.statusMessage
    }
  ];

  const renderPersonRow = (p: any, i: number) => (
    <div key={i} className={`ranking-row-v2 ${p.isMe ? 'active-user-row' : ''}`}>
      <div className="rank-num-v2">{i + 1}</div>
      <div className="avatar-v2-wrap">
        {p.pic ? (
          <img src={p.pic} alt={p.name} className="avatar-v2" />
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
          <span className="rank-team-text-v2">{p.team}</span>
        </div>
        {p.status && (
          <p className="rank-status-v2-new mt-4">{p.status}</p>
        )}
      </div>
      <div className="rank-pts-right">
        <span className="rank-pts-num">{p.distance.toLocaleString()}</span>
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
          <span className="ranking-refresh-label">매월 1일 갱신</span>
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


const ProfileView = ({ team, missions, userInfo, onUpdate, onEditMission, onLogout }: { team: Team | null, missions: Mission[], userInfo: any, onUpdate: (n: string, s: string, p: string | null, d: string, pbs: any, goal?: string) => void, onEditMission: (m: Mission) => void, onLogout: () => void }) => {


  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userInfo.name);
  const [editStatus, setEditStatus] = useState(userInfo.statusMessage);
  const [editPic, setEditPic] = useState<string | null>(userInfo.profilePic);
  const [editGoal, setEditGoal] = useState(userInfo.monthlyGoal);

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




  const myHistory = missions.filter(m => m.teamId === (team ? team.id : 'individual') && m.status !== 'none');

  return (
    <div className="page-container pb-60 px-16">
      {/* Clean Profile Header */}
      <div className="profile-header-wrap-v3 px-20 pt-40 pb-32">
        {isEditing ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card profile-edit-card-v2">
            <div className="flex-center flex-col mb-24">
              <div className="profile-pic-uploader" onClick={handlePicUpload}>
                <input type="file" ref={picInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                {editPic ? (
                  <img src={editPic} alt="Profile" className="profile-pic-preview" />
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
              <input type="number" className="no-spinner" value={editGoal} onChange={(e) => setEditGoal(e.target.value)} onFocus={(e) => e.target.select()} />
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
                {userInfo.profilePic ? (
                  <img src={userInfo.profilePic} alt="Profile" className="avatar-ref-img" />
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
      <div className="-mt-16 px-16">
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
        <div className="px-20 mb-20 flex-between">
          <h3 className="section-title-alt">인증 히스토리</h3>
        </div>

        <div className="history-container-visual">
          {myHistory.length > 0 ? (() => {
            const grouped = myHistory.reduce((acc: any, m) => {
              const date = (m.timestamp || '').split('오전')[0].split('오후')[0].trim() || '날짜 미상';
              if (!acc[date]) acc[date] = [];
              acc[date].push(m);
              return acc;
            }, {});


            const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

            return sortedDates.map(date => (
              <div key={date} className="history-date-group">
                <h4 className="history-date-header-v2">{date}</h4>
                <div className="history-visual-grid">
                  {grouped[date].map((m: Mission) => {
                    const firstImage = m.images && m.images.length > 0 ? m.images[0] : null;
                    const recordEntries = Object.entries(m.records || {}).filter(([_, v]) => v);
                    let recordSummary = '';
                    if (m.type === '개인 러닝') {
                      recordSummary = `${m.distance}km`;
                    } else if (recordEntries.length > 0) {
                      const [key, val] = recordEntries[0];
                      recordSummary = `${key} ${val}`;
                    }

                    return (
                      <div key={m.id} className={`history-visual-tile ${m.status}`} onClick={() => m.status === 'pending' && onEditMission(m)}>
                        {firstImage ? (
                          <img src={firstImage} alt="History" className="history-tile-img" />
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

                    );
                  })}
                </div>
              </div>
            ));
          })() : (
            <div className="empty-history-premium py-40">
              <p className="text-gray-700 font-14">아직 인증된 기록이 없습니다.</p>
            </div>
          )}
        </div>


        <div className="px-20 mt-40">
          <button className="btn-logout-premium" onClick={() => {
            if (window.confirm('로그아웃 하시겠습니까?')) {
              onLogout();
            }
          }}>
            <X size={18} /> 로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

import { createWorker } from 'tesseract.js';

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
              onChange={(e) => setDistance(e.target.value)}
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



const MissionInputView = ({ onBack, onSubmit, isGroup, challenge, initialMission }: { onBack: () => void, onSubmit: (r: any, p: string[], d: string) => void, isGroup: boolean, challenge?: WeeklyChallenge, initialMission?: Mission }) => {
  const [records, setRecords] = useState<any>(initialMission?.records || {});
  const [photos, setPhotos] = useState<string[]>(initialMission?.images || []);
  const [runDistance, setRunDistance] = useState<string>(initialMission ? String(initialMission.distance) : '0');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize records based on challenge fields if not editing
  useEffect(() => {
    if (initialMission) return;

    if (challenge?.recordFields) {
      const initialRecords: any = {};
      challenge.recordFields.forEach(f => initialRecords[f.id] = '');
      setRecords(initialRecords);
    } else {
      // Fallback for when there is no specific challenge
      setRecords({ '1KM': '' });
    }

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


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const remainingSlots = 7 - photos.length;
      const filesToAdd = newFiles.slice(0, remainingSlots);

      const newPhotos = filesToAdd.map(file => URL.createObjectURL(file));
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index]);
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


  return (
    <div className="page-container flex flex-col h-full bg-black">
      <div className="cert-guide-box">
        <div className="flex items-center gap-12 mb-12 cursor-pointer" onClick={onBack}>
          <ChevronLeft size={24} className="text-white" />
          <h2 className="text-white font-24 bold tracking-tight">기록 인증하기</h2>
        </div>
        <p className="text-gray-500 font-14 leading-relaxed">
          {isGroup
            ? <>챌린지 인증 사진을 추가해 주세요.<br />그룹장의 승인 후에 커뮤니티에 업로드 됩니다.⚡️</>
            : <>거리가 포함된 러닝 인증 사진을 추가해 주세요.<br />인식된 거리는 마일리지에 즉시 반영됩니다.⚡️</>
          }

        </p>

      </div>

      <div className="flex-1 overflow-y-auto pb-40 no-scrollbar">
        {!isGroup && (
          <DistanceExtractor onExtract={handleExtractedDistance} onImageSelect={handleExtractedImage} distance={runDistance} setDistance={setRunDistance} isGroup={isGroup} />
        )}

        <div className={!isGroup ? "mt-8" : "mt-0"}>
          <div className="flex-between mb-16">
            <h3 className="text-white font-18 bold">인증 사진 <span className="text-gray-600 font-13 font-normal ml-8">{photos.length}/7</span></h3>
          </div>

          <div className="photo-upload-area">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            <div className="photo-upload-grid">
              {photos.map((p, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={i}
                  className="photo-preview shadow-lg"
                >
                  <img src={p} alt="Certification" className="w-full h-full object-cover rounded-20" />
                  <button className="btn-remove-photo" onClick={() => removePhoto(i)}>
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
              {photos.length < 7 && (
                <div onClick={() => fileInputRef.current?.click()} className="photo-add-btn">
                  <Camera size={24} className="text-gray-500" />
                </div>
              )}

            </div>

            {!isGroup && photos.length === 0 && (
              <div className="cert-photo-empty">
                <div className="w-48 h-48 bg-gray-900 rounded-full flex-center mx-auto mb-16">
                  <Camera size={20} className="text-gray-700" />
                </div>
                <p className="text-gray-600 font-14">분석된 인증 사진이 나타납니다.</p>
              </div>
            )}
          </div>
        </div>





        {isGroup && (
          <div className="animate-fadeIn mt-80 mb-40">
            <h3 className="text-white font-18 bold mb-24">챌린지 기록</h3>

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
                              // Auto focus next input (seconds)
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

          </div>
        )}

      </div>

      <div className="px-20 pb-32 pt-16">
        <button className="btn-primary-lg" onClick={() => onSubmit(records, photos, runDistance)}>제출하기</button>
      </div>
    </div>
  );
};

const MissionCard = ({ mission, currentUserName, userRole, teams, onLike, onComment, onDeleteMission, onDeleteComment }: {
  mission: Mission,
  currentUserName: string,
  userRole: string,
  teams: Team[],
  onLike: (id: string) => void,
  onComment: (id: string, text: string) => void,
  onDeleteMission?: (id: string) => void,
  onDeleteComment?: (mId: string, cId: string) => void
}) => {
  const [commentText, setCommentText] = useState('');
  const isLiked = mission.likedBy.includes(currentUserName);
  const isAdmin = userRole === 'leader';
  const isAuthor = mission.userName === currentUserName;

  const authorTeam = teams.find(t => t.id === mission.teamId) || teams.find(t => t.members.includes(mission.userName));

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
          <div className="mission-user-avatar">{mission.userName.substring(0, 1)}</div>
          <div className="mission-user-info">
            <div className="flex items-center gap-6">
              <p className="name">{mission.userName}</p>
              {authorTeam && <span className="font-12 text-gray-500 bg-gray-900 px-6 py-2 rounded-4">{authorTeam.name}</span>}
            </div>
            <p className="meta">{mission.timestamp} · {mission.type === '개인 러닝' ? '개인 러닝' : `${mission.week}주차 인증`}</p>
          </div>
        </div>
        {(isAdmin || isAuthor) && (
          <button className="icon-btn-fit-subtle opacity-60 hover:opacity-100" onClick={() => onDeleteMission?.(mission.id)}>
            <Trash2 size={16} className="text-red-dim" />
          </button>
        )}
      </div>

      <div className="mission-photo-container">
        {mission.images && mission.images.length > 0 ? (
          <img src={mission.images[0]} alt="Certification" className="mission-photo" />
        ) : (
          <div className="flex-center flex-col text-gray-800">
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
                    <Trash2 size={12} />
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
  onDeleteComment
}: {
  week: number | null,
  missions: Mission[],
  currentUserName: string,
  userRole: string,
  teams: Team[],
  onLike: (id: string) => void,
  onComment: (id: string, text: string) => void,
  onDeleteMission?: (id: string) => void,
  onDeleteComment?: (mId: string, cId: string) => void
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
  const [editFields, setEditFields] = useState<{ id: string; label: string; placeholder: string; unit: string }[]>([]);
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
    onUpdate(id, editTitle, editDesc, editFields);
    setEditingId(null);
  };

  const addField = () => {
    setEditFields([...editFields, { id: `f${Date.now()}`, label: '기록 항목', placeholder: '00:00', unit: '' }]);
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
                  <div className="flex-between mb-12">
                    <span className="text-gray-400 font-12 bold uppercase tracking-wider">기록 항목 설정 (예: 1km, 페이스)</span>
                    <button className="btn-add-field-v2" onClick={addField}>+ 항목 추가</button>
                  </div>

                  <div className="challenge-fields-list-v2">
                    {editFields.map((field, idx) => (
                      <div key={field.id} className="challenge-field-row-v2">
                        <input
                          className="field-input-premium"
                          value={field.label}
                          onChange={(e) => updateField(idx, 'label', e.target.value)}
                          placeholder="항목 이름을 입력하세요"
                        />
                        <button className="btn-delete-subtle" onClick={() => removeField(idx)}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                    ))}
                  </div>
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
                              <Trash2 size={14} /> 삭제
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

const LeaderView = ({
  group,
  teams,
  missions,
  approveMission,
  addTeam,
  renameTeam,
  deleteTeam,
  addMember,
  removeMember,
  kickMember,
  allMembers
}: {
  group: Group,
  teams: Team[],
  missions: Mission[],
  approveMission: (id: string) => void,
  addTeam: () => void,
  renameTeam: (teamId: string, newName: string) => void,
  deleteTeam: (teamId: string) => void,
  addMember: (teamId: string, name: string) => void,
  removeMember: (teamId: string, name: string) => void,
  kickMember: (name: string) => void,
  allMembers: string[]
}) => {
  const [adminTab, setAdminTab] = useState<'approval' | 'teams' | 'members'>('approval');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [showMemberSelect, setShowMemberSelect] = useState<string | null>(null);
  const [showTeamMenu, setShowTeamMenu] = useState<string | null>(null);

  const pendingMissions = missions.filter(m => m.status === 'pending' && m.groupId === group.id);
  const groupTeams = teams.filter(t => t.groupId === group.id);
  const assignedMembers = groupTeams.flatMap(t => t.members);
  const availableMembers = allMembers.filter(m => !assignedMembers.includes(m));

  // Mock records for members (for Member Management)
  const memberRecordsMap: { [key: string]: string } = {
    '김토스': '1K 03:45 / 5K 21:10',
    '이러닝': '1K 04:10 / 5K 22:30',
    '박스프린트': '1K 03:30 / 5K 19:45',
    '최파워': '1K 04:20 / 5K 23:15',
    '강속도': '1K 03:15 / 5K 18:50',
  };

  const handleStartRename = (teamId: string, name: string) => {
    setEditingTeamId(teamId);
    setTempName(name);
    setShowTeamMenu(null);
  };

  const handleSaveRename = (teamId: string) => {
    renameTeam(teamId, tempName);
    setEditingTeamId(null);
  };

  const renderApprovalTab = () => (
    <div className="admin-content-fade">
      <h4 className="text-gray-700 font-12 bold uppercase tracking-widest mb-16 px-16">미션 승인 대기 ({pendingMissions.length})</h4>
      <div className="flex flex-col gap-12 px-16">
        {pendingMissions.map(m => {
          const missionTeam = teams.find(t => t.id === m.teamId);
          const teamName = missionTeam ? missionTeam.name : '개인';

          return (
            <div key={m.id} className="card admin-approve-card-v2 overflow-hidden shadow-2xl border-green/20">
              <div className="flex-between mb-12 px-2">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-6">
                    <span className="text-gray-500 font-10 bold uppercase tracking-widest">{m.type}</span>
                  </div>
                  <h3 className="text-white font-18 bold tracking-tight">[{teamName}] <span className="text-green">{m.userName}</span></h3>
                </div>
                <button className="btn-approve-v2 shrink-0 py-8 px-16 bg-green hover:bg-green-light transition-colors" onClick={() => approveMission(m.id)}>
                  <Check size={18} strokeWidth={3} />
                  <span className="font-14 bold">승인</span>
                </button>
              </div>

              <div className="flex grid-horizontal-records py-18 border-t border-b border-gray-800 bg-white/5 mx--16">
                {Object.entries(m.records || {}).map(([key, val]) => (
                  <div key={key} className="record-display-item border-r last:border-r-0 border-gray-800/50">
                    <span className="text-gray-500 font-11 bold uppercase tracking-widest mb-6">{key}</span>
                    <span className="text-white font-20 bold tracking-tighter">{String(val) || '00\'00"'}</span>
                  </div>
                ))}
              </div>




              {m.images && m.images.length > 0 && (
                <div className="mt-16 flex flex-col gap-12">
                  {m.images.map((img, i) => (
                    <img key={i} src={img} alt="Mission" className="mission-approve-img-square shadow-lg" />
                  ))}
                </div>
              )}

            </div>
          );
        })}

        {pendingMissions.length === 0 && (
          <div className="empty-state-card py-40">
            <Shield size={32} className="text-gray-800 mb-12" />
            <p className="text-gray-800 font-13">대기 중인 미션이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );

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
                          <Trash2 size={14} /> 팀 삭제
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
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
            <div key={m} className="card member-info-card-v2">
              <div className="flex-between">
                <div className="flex items-center gap-12">
                  <div className="member-avatar-mini">{m.substring(0, 1)}</div>
                  <div>
                    <p className="text-white font-15 bold">{m}</p>
                    <p className="text-gray-600 font-12 mt-2">
                      {memberTeam ? <span>{memberTeam.name} 소속</span> : <span className="text-red-dim">미배정</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-12">
                  <div className="text-right">
                    <p className="text-green font-11 bold uppercase tracking-tighter">최근 기록</p>
                    <p className="text-gray-300 font-12 mt-2">{memberRecordsMap[m] || '기록 없음'}</p>
                  </div>
                  <button
                    className="btn-kick-member-v2"
                    onClick={() => kickMember(m)}
                  >
                    <span>내보내기</span>
                  </button>


                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="px-16 mb-24 flex-between">
        <div>
          <h2 className="section-title-alt">그룹 관리</h2>
          <p className="text-green font-12 bold mt-4 uppercase tracking-widest">Invite: {group.inviteCode}</p>
        </div>
        <button className="btn-secondary-sm flex-center gap-4"><Share2 size={14} /> 초대</button>
      </div>

      {/* Sub-Tabs Navigation */}
      {/* Sub-Tabs Navigation */}
      <div className="admin-sub-tabs px-16 mb-24">
        <button
          className={`admin-sub-tab-btn ${adminTab === 'approval' ? 'active' : ''}`}
          onClick={() => setAdminTab('approval')}
        >
          승인 대기
        </button>
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

      {adminTab === 'approval' && renderApprovalTab()}
      {adminTab === 'teams' && renderTeamsTab()}
      {adminTab === 'members' && renderMembersTab()}
    </div>
  );
};
const App: React.FC = () => {

  const [activeTab, setActiveTab] = useState('home');
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'leader'>(() => (localStorage.getItem('userRole') as any) || 'user');
  const [userGroupId, setUserGroupId] = useState<string | null>(() => localStorage.getItem('userGroupId'));
  const [userTeamId, setUserTeamId] = useState<string | null>(() => localStorage.getItem('userTeamId'));
  const [viewMode, setViewMode] = useState<'individual' | 'group'>(() => (localStorage.getItem('viewMode') as any) || 'individual');
  const [isInputView, setIsInputView] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [allUsers, setAllUsers] = useState<any[]>(() => {
    const saved = localStorage.getItem('allUsers');
    return saved ? JSON.parse(saved) : [];
  });

  const [userInfo, setUserInfo] = useState(() => {
    const saved = localStorage.getItem('userInfo');
    return saved ? JSON.parse(saved) : {
      name: '',
      profilePic: null as string | null,
      statusMessage: '러닝 열정 폭발 🔥',
      monthlyDistance: '0',
      lastUpdatedMonth: new Date().getMonth() + 1,
      pbs: {
        '1KM': "00'00\"",
        '3KM': "00'00\"",
        '5KM': "00'00\"",
        '10KM': "00'00\""
      },
      monthlyGoal: '100'
    };
  });

  const [currentPeriod, setCurrentPeriod] = useState(1);

  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem('groups');
    return saved ? JSON.parse(saved) : [];
  });

  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem('teams');
    return saved ? JSON.parse(saved) : [];
  });

  const [missions, setMissions] = useState<Mission[]>(() => {
    const saved = localStorage.getItem('missions');
    return saved ? JSON.parse(saved) : [];
  });

  const [groupMembers, setGroupMembers] = useState<string[]>(() => {
    const saved = localStorage.getItem('groupMembers');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
    localStorage.setItem('groups', JSON.stringify(groups));
    localStorage.setItem('teams', JSON.stringify(teams));
    localStorage.setItem('missions', JSON.stringify(missions));
    localStorage.setItem('groupMembers', JSON.stringify(groupMembers));
    if (userGroupId) localStorage.setItem('userGroupId', userGroupId);
    else localStorage.removeItem('userGroupId');
    if (userTeamId) localStorage.setItem('userTeamId', userTeamId);
    else localStorage.removeItem('userTeamId');
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('viewMode', viewMode);
  }, [userInfo, allUsers, groups, teams, missions, groupMembers, userGroupId, userTeamId, userRole, viewMode]);

  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([
    { id: 'c1', week: 1, title: '베이스라인 설정', description: '1/3/5km 개인 TT 측정 및 목표 설정', recordFields: [{ id: '1KM', label: '1KM', placeholder: '00:00', unit: '' }, { id: '3KM', label: '3KM', placeholder: '00:00', unit: '' }, { id: '5KM', label: '5KM', placeholder: '00:00', unit: '' }] },

    { id: 'c2', week: 2, title: '심폐 & 파워 강화', description: '트레드밀 업힐 인터벌 및 러닝 파워 집중', recordFields: [{ id: 'power', label: '파워', placeholder: '250W', unit: 'W' }, { id: 'hr', label: '심박', placeholder: '165bpm', unit: 'bpm' }] },
    { id: 'c3', week: 3, title: '스피드 개발', description: '스프린트 훈련을 통한 최고속도 향상', recordFields: [{ id: 'sprint', label: '100m', placeholder: '15s', unit: 's' }] },
    { id: 'c4', week: 4, title: '팀 실전 테스트', description: '팀 5km 릴레이 TT 및 실전 점검', recordFields: [{ id: 'relay', label: '5KM', placeholder: '20:00', unit: '' }] },
    { id: 'c5', week: 5, title: '디로드 & 회복', description: '저강도 러닝 및 리커버리 세션', recordFields: [{ id: 'recovery', label: '회복', placeholder: '느낌', unit: '' }] },
    { id: 'c6', week: 6, title: '레이스 준비', description: '영양 관리 및 최상의 컨디션 조절', recordFields: [] },
  ]);

  const addChallenge = () => {
    const nextWeek = challenges.length > 0 ? Math.max(...challenges.map((c: any) => c.week)) + 1 : 1;
    const newChallenge: WeeklyChallenge = {
      id: `c${Date.now()}`,
      week: nextWeek,
      title: '새로운 훈련',
      description: '훈련 내용을 입력해주세요.'
    };
    setChallenges((prev: any) => [...prev, newChallenge]);
  };

  const updateChallenge = (id: string, title: string, desc: string, fields?: any[]) => {
    setChallenges((prev: any) => prev.map((c: any) => c.id === id ? { ...c, title, description: desc, recordFields: fields || c.recordFields } : c));
  };

  const deleteChallenge = (id: string) => {
    if (window.confirm('이 주차의 챌린지를 삭제하시겠습니까?')) {
      setChallenges((prev: any) => prev.filter((c: any) => c.id !== id));
    }
  };

  const handleCreateGroup = (name: string) => {
    const newGroupId = `g${Date.now()}`;
    setGroups((prev: any) => [...prev, { id: newGroupId, name, leaderId: 'me', inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(), totalScore: 0, totalDistance: 0 }]);
    setUserGroupId(newGroupId);
    setUserRole('leader');
    const newTeamId = `t${Date.now()}`;
    setTeams((prev: any) => [...prev, { id: newTeamId, groupId: newGroupId, name: `${name} 01팀`, members: [userInfo.name] }]);
    setUserTeamId(newTeamId);
    setShowOnboarding(false);
    setViewMode('group');
    setActiveTab('leader');
  };

  const handleJoinGroup = (code: string) => {
    const group = groups.find(g => g.inviteCode === code);
    if (group) {
      setUserGroupId(group.id);
      setUserRole('user');
      const groupTeams = teams.filter((t: any) => t.groupId === group.id);
      if (groupTeams.length > 0) {
        const targetTeamId = groupTeams[0].id;
        setUserTeamId(targetTeamId);
        setTeams((prev: any) => prev.map((t: any) => t.id === targetTeamId ? { ...t, members: t.members.includes(userInfo.name) ? t.members : [...t.members, userInfo.name] } : t));
      }
      setShowOnboarding(false);
      setViewMode('group');
      setActiveTab('home');
    } else alert('유효하지 않은 초대코드입니다.');
  };

  const handleUpdateProfile = (name: string, status: string, pic: string | null, dist: string, pbs: any, goal?: string) => {
    setUserInfo((prev: any) => ({ ...prev, name, statusMessage: status, profilePic: pic, monthlyDistance: dist, pbs, monthlyGoal: goal || prev.monthlyGoal }));
  };

  const approveMission = (missionId: string) => setMissions((prev: any) => prev.map((m: any) => m.id === missionId ? { ...m, status: 'approved' } : m));

  const submitMission = (records: any, photos: string[], distance: string) => {
    if (editingMission) {
      setMissions((prev: any) => prev.map((m: any) => m.id === editingMission.id ? {
        ...m,
        records,
        images: photos,
        distance: parseFloat(distance) || 0
      } : m));
      setEditingMission(null);
      setIsInputView(false);
      return;
    }

    const isIndividual = viewMode === 'individual';

    const targetTeamId = (viewMode === 'group' && userTeamId) ? userTeamId : 'individual';
    const targetGroupId = (viewMode === 'group' && userGroupId) ? userGroupId : 'none';

    const currentMonth = new Date().getMonth() + 1;
    const addedDist = parseFloat(distance) || 0;

    // 1. 개인 마일리지는 개인 화면에서 제출할 때만 OCR 거리만큼 추가됨
    if (isIndividual) {
      setUserInfo((prev: any) => {
        const isNewMonth = prev.lastUpdatedMonth !== currentMonth;
        const baseDist = isNewMonth ? 0 : parseFloat(prev.monthlyDistance);
        return {
          ...prev,
          monthlyDistance: (baseDist + addedDist).toFixed(1),
          lastUpdatedMonth: currentMonth
        };
      });
    }

    // 2. 그룹 활동은 그룹 인증일 때만 추가 (승인 전에도 누적할지 여부는 비즈니스 로직에 따름, 일단 기존 유지)
    if (!isIndividual && userGroupId) {
      setGroups((prev: any) => prev.map((g: any) => g.id === userGroupId ? { ...g, totalDistance: (g.totalDistance || 0) + addedDist } : g));
    }

    setMissions((prev: any) => {
      // 주차별로 여러 번 인증이 가능하도록 필터링 로직 제거
      const missionTypeTag = isIndividual ? '개인 러닝' : '챌린지 인증';

      return [...prev, {
        id: `m${Date.now()}`,
        groupId: targetGroupId,
        teamId: targetTeamId,
        userName: userInfo.name,
        week: currentPeriod,
        type: missionTypeTag, // 구분 명확화
        status: isIndividual ? 'approved' : 'pending', // 개인은 즉시 승인, 그룹은 대기
        timestamp: new Date().toLocaleString(),
        records,
        distance: addedDist,
        images: photos,
        likedBy: [],
        comments: []
      }];
    });

    setIsInputView(false);
  };


  const likeMission = (id: string) => {
    setMissions((prev: any) => prev.map((m: any) => {
      if (m.id !== id) return m;
      const isLiked = m.likedBy.includes(userInfo.name);
      return {
        ...m,
        likedBy: isLiked
          ? m.likedBy.filter((name: string) => name !== userInfo.name)
          : [...m.likedBy, userInfo.name]
      };
    }));
  };

  const addComment = (missionId: string, text: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userName: userInfo.name,
      text,
      timestamp: '방금 전'
    };
    setMissions((prev: any) => prev.map((m: any) => m.id === missionId ? { ...m, comments: [...m.comments, newComment] } : m));
  };

  const deleteMission = (id: string) => {
    if (window.confirm('인증 게시물을 삭제하시겠습니까?')) {
      setMissions((prev: any) => prev.filter((m: any) => m.id !== id));
    }
  };

  const deleteComment = (missionId: string, commentId: string) => {
    if (window.confirm('댓글을 삭제하시겠습니까?')) {
      setMissions((prev: any) => prev.map((m: any) =>
        m.id === missionId
          ? { ...m, comments: m.comments.filter((c: any) => c.id !== commentId) }
          : m
      ));
    }
  };


  const currentGroup = groups.find(g => g.id === userGroupId);
  const currentTeam = teams.find(t => t.id === userTeamId);

  const handleGroupBtnClick = () => {
    if (!userGroupId) setShowOnboarding(true);
    else if (viewMode === 'group') {
      setViewMode('individual');
      setActiveTab('home');
    } else {
      setViewMode('group');
      setActiveTab('home');
    }
  };

  const addTeam = () => {
    if (!userGroupId) return;
    const newTeamId = `t${Date.now()}`;
    const newTeamCount = teams.filter((t: any) => t.groupId === userGroupId).length + 1;
    setTeams((prev: any) => [...prev, { id: newTeamId, groupId: userGroupId, name: `새 팀 ${newTeamCount}`, members: [] }]);
  };

  const renameTeam = (teamId: string, newName: string) => {
    setTeams((prev: any) => prev.map((t: any) => t.id === teamId ? { ...t, name: newName } : t));
  };

  const deleteTeam = (teamId: string) => {
    if (window.confirm('팀을 삭제하시겠습니까?')) {
      setTeams((prev: any) => prev.filter((t: any) => t.id !== teamId));
    }
  };

  const addMember = (teamId: string, memberName: string) => {
    if (!memberName.trim()) return;
    setTeams((prev: any) => prev.map((t: any) => t.id === teamId ? { ...t, members: [...t.members, memberName.trim()] } : t));
  };

  const removeMember = (teamId: string, memberName: string) => {
    setTeams((prev: any) => prev.map((t: any) => t.id === teamId ? { ...t, members: t.members.filter((m: any) => m !== memberName) } : t));
  };

  const kickMember = (name: string) => {
    if (window.confirm(`${name} 멤버를 내보내시겠습니까?`)) {
      setGroupMembers((prev: any) => prev.filter((m: any) => m !== name));
      setTeams((prev: any) => prev.map((t: any) => ({ ...t, members: t.members.filter((m: any) => m !== name) })));
    }
  };

  const handleLoginSubmit = (name: string, pass: string) => {
    const user = allUsers.find(u => u.name === name && u.password === pass);
    if (user) {
      setUserInfo(user);
      return true;
    }
    return false;
  };

  const handleSignupSubmit = (data: any) => {
    const newUser = {
      name: data.name,
      password: data.password,
      profilePic: null,
      statusMessage: '러닝 열정 폭발 🔥',
      monthlyDistance: '0',
      lastUpdatedMonth: new Date().getMonth() + 1,
      pbs: { '1KM': "00'00\"", '3KM': "00'00\"", '5KM': "00'00\"", '10KM': "00'00\"" },
      monthlyGoal: data.monthlyGoal
    };
    setAllUsers((prev: any[]) => [...prev, newUser]);
    setGroupMembers((prev: string[]) => [...prev, newUser.name]);
    setUserInfo(newUser);
  };

  const renderContent = () => {
    if (!userInfo.name) return <AuthView onLogin={handleLoginSubmit} onSignup={handleSignupSubmit} allUserNames={allUsers.map(u => u.name)} />;
    if (showOnboarding) return <OnboardingView onCreate={handleCreateGroup} onJoin={handleJoinGroup} onBack={() => setShowOnboarding(false)} />;
    if (isInputView) return <MissionInputView onBack={() => setIsInputView(false)} onSubmit={submitMission} isGroup={viewMode === 'group'} challenge={challenges.find(c => c.week === currentPeriod)} />;

    const isGroupCtx = viewMode === 'group' && userGroupId;
    switch (activeTab) {
      case 'home': return <HomeView group={isGroupCtx ? currentGroup || null : null} allGroups={groups} team={isGroupCtx ? currentTeam || null : null} missions={missions} userInfo={userInfo} onStartInput={() => setIsInputView(true)} currentWeek={currentPeriod} challenges={challenges} />;
      case 'challenge':
        return (
          <ChallengeView
            challenges={challenges}
            userRole={userRole}
            onAdd={addChallenge}
            onUpdate={updateChallenge}
            onDelete={deleteChallenge}
            currentWeek={currentPeriod}
            onActivate={(w) => setCurrentPeriod(w)}
          />
        );
      case 'community':
        const filteredMissions = viewWeek
          ? missions.filter((m: any) => m.week === viewWeek && m.status === 'approved')
          : missions.filter((m: any) => m.status === 'approved');
        return (
          <WeeklyFeedView
            week={viewWeek}
            missions={filteredMissions}
            currentUserName={userInfo.name}
            userRole={userRole}
            teams={teams}
            onLike={likeMission}
            onComment={addComment}
            onDeleteMission={deleteMission}
            onDeleteComment={deleteComment}
          />
        );

      case 'ranking': return <RankingView currentGroupId={isGroupCtx ? userGroupId : null} userInfo={userInfo} teams={teams} missions={missions} />;
      case 'profile': return (
        <ProfileView
          team={isGroupCtx ? currentTeam || null : null}
          missions={missions}
          userInfo={userInfo}
          onUpdate={handleUpdateProfile}
          onEditMission={(m) => { setEditingMission(m); setIsInputView(true); }}
          onLogout={() => {
            setUserInfo({
              name: '',
              statusMessage: '오늘도 즐겁게 달려요! 🏃‍♂️',
              profilePic: null,
              monthlyDistance: '42.1',
              monthlyGoal: '100',
              lastUpdatedMonth: new Date().getMonth() + 1,
              pbs: { '1KM': "03'45\"", '3KM': "12'20\"", '5KM': "21'10\"", '10KM': "44'30\"" }
            });
            setUserGroupId(null);
            setUserTeamId(null);
            setUserRole('user');
            setActiveTab('home');
            localStorage.clear();
          }}
        />
      );
      case 'leader': return currentGroup ? (

        <LeaderView
          group={currentGroup}
          teams={teams}
          missions={missions}
          approveMission={approveMission}
          addTeam={addTeam}
          renameTeam={renameTeam}
          deleteTeam={deleteTeam}
          addMember={addMember}
          removeMember={removeMember}
          kickMember={kickMember}
          allMembers={groupMembers}
        />
      ) : <div className="empty-state-fit py-100 flex-center flex-col"><Shield size={48} className="text-gray-800 mb-16" /><p className="text-gray">그룹에 가입되어 있지 않습니다.</p><button className="btn-primary mt-20" onClick={() => setShowOnboarding(true)}>그룹 가입/생성하기</button></div>;
      default: return <HomeView group={isGroupCtx ? currentGroup || null : null} allGroups={groups} team={isGroupCtx ? currentTeam || null : null} missions={missions} userInfo={userInfo} onStartInput={() => setIsInputView(true)} currentWeek={currentPeriod} challenges={challenges} />;
    }
  };

  return (
    <div className="app-wrapper">
      {!isInputView && !showOnboarding && userInfo.name && (
        <header className="main-header">
          <h2 className="header-title">10km 릴레이 TT</h2>
          <button className="group-header-btn" onClick={handleGroupBtnClick}>{viewMode === 'group' ? 'INDIVIDUAL' : 'GROUP'}</button>
        </header>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={isInputView ? 'input' : showOnboarding ? 'onboarding' : (activeTab + (viewWeek ? `-week-${viewWeek}` : ''))} initial={{ opacity: 0, x: isInputView ? 50 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isInputView ? -50 : -20 }} transition={{ duration: 0.3 }} className="content-area">
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      {!isInputView && !showOnboarding && userInfo.name && (
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
    </div>
  );
};


export default App;
