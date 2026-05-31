'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Home, User, FileText, Send, Heart, Scale, TrendingUp,
  ChevronRight, ArrowLeft, Bell, Lock, Sparkles, Flame,
  CheckCircle, AlertCircle, LogOut, Stethoscope, Wallet,
  Crown, Shield, Moon, Droplet, Loader2, Paperclip, X,
  ChevronLeft, Settings, Star, Zap, BookOpen, MessageCircle,
  BarChart3, Clock, ChevronDown
} from 'lucide-react';

import { AGENTS } from '../lib/agents';
import {
  initTelegram, getInitData, getTelegramUser,
  getTelegramWebApp, hapticFeedback
} from '../lib/telegram';

const ICONS = { Stethoscope, Scale, Wallet };

/* ============================================================
   STORAGE
   ============================================================ */
function saveData(key, value) {
  try {
    localStorage.setItem(`qamqor_${key}`, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {}
}
function loadData(key, defaultValue = null) {
  try {
    const v = localStorage.getItem(`qamqor_${key}`);
    if (v === null) return defaultValue;
    try { return JSON.parse(v); } catch { return v; }
  } catch { return defaultValue; }
}

/* ============================================================
   API
   ============================================================ */
async function callAI(agentId, userMessage) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, message: userMessage, initData: getInitData() })
    });
    if (res.status === 401) return { reply: 'Сессия истекла. Перезапустите приложение через Telegram.', sources: [] };
    if (res.status === 429) {
      const d = await res.json();
      return { reply: `⏱ ${d.message || 'Слишком много запросов. Подождите немного.'}`, sources: [] };
    }
    if (!res.ok) throw new Error('API error');
    const d = await res.json();
    return { reply: d.reply, sources: d.sources || [] };
  } catch {
    return { reply: 'Нет ответа. Проверьте интернет и попробуйте ещё раз.', sources: [] };
  }
}

async function fetchHistory(agentId) {
  try {
    const res = await fetch('/api/user/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, initData: getInitData() })
    });
    if (!res.ok) return [];
    const d = await res.json();
    return d.history || [];
  } catch { return []; }
}

async function clearHistory(agentId) {
  try {
    await fetch('/api/user/history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, initData: getInitData() })
    });
  } catch {}
}

async function deleteAllUserData() {
  try {
    const res = await fetch('/api/user/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: getInitData(), confirmation: 'DELETE_MY_DATA' })
    });
    return res.ok;
  } catch { return false; }
}

async function trackAnalytics(event, data = {}) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, initData: getInitData(), data })
    });
  } catch {}
}

async function verifyTelegramAuth() {
  try {
    const initData = getInitData();
    if (!initData) return null;
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.verified) {
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      }).catch(() => {});
      return d.user;
    }
    return null;
  } catch { return null; }
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/* ============================================================
   ONBOARDING
   ============================================================ */
const ONBOARDING_SLIDES = [
  {
    id: 0,
    bg: 'from-violet-600 via-indigo-600 to-indigo-800',
    glowColor: 'rgba(139,92,246,0.6)',
    icon: Sparkles,
    emoji: '✨',
    title: 'Qamqor',
    subtitle: 'Ваш личный помощник',
    description: 'Три AI-эксперта по здоровью, праву и финансам — всегда под рукой',
  },
  {
    id: 1,
    bg: 'from-rose-500 via-pink-500 to-red-600',
    glowColor: 'rgba(244,63,94,0.55)',
    icon: Stethoscope,
    emoji: '🩺',
    title: 'Аружан',
    subtitle: 'Медицинский ассистент',
    description: 'Расшифровка анализов, советы по питанию и сну, объяснение диагнозов',
  },
  {
    id: 2,
    bg: 'from-blue-600 via-indigo-600 to-violet-700',
    glowColor: 'rgba(59,130,246,0.55)',
    icon: Scale,
    emoji: '⚖️',
    title: 'Дамир',
    subtitle: 'Правовой ассистент',
    description: 'Законы Казахстана, трудовые споры, договоры, ваши права',
  },
  {
    id: 3,
    bg: 'from-emerald-500 via-teal-500 to-cyan-600',
    glowColor: 'rgba(16,185,129,0.55)',
    icon: Wallet,
    emoji: '💰',
    title: 'Ержан',
    subtitle: 'Финансовый ассистент',
    description: 'Бюджет в тенге, налоги ИП, вклады, финансовая грамотность',
  },
];

function OnboardingScreen({ onComplete }) {
  const [slide, setSlide] = useState(0);
  const s = ONBOARDING_SLIDES[slide];
  const Icon = s.icon;
  const isLast = slide === ONBOARDING_SLIDES.length - 1;

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br ${s.bg} relative overflow-hidden`}
         key={slide}>
      {/* Background glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-16 w-80 h-80 rounded-full blur-[80px] opacity-40"
             style={{ background: s.glowColor }} />
        <div className="absolute -bottom-24 -right-16 w-72 h-72 rounded-full blur-[80px] opacity-30"
             style={{ background: s.glowColor }} />
      </div>

      {/* Top bar */}
      <div className="relative flex justify-end px-6 pt-14">
        {!isLast && (
          <button onClick={onComplete}
                  className="text-white/60 text-sm font-medium px-4 py-2 rounded-full hover:text-white/90 transition-colors">
            Пропустить
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Icon container */}
        <div className="relative mb-10 animate-scale-in">
          <div className="w-36 h-36 rounded-[40px] bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-2xl">
            <Icon className="w-20 h-20 text-white" strokeWidth={1.5} />
          </div>
          {/* Emoji badge */}
          <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg text-2xl animate-float">
            {s.emoji}
          </div>
        </div>

        <h1 className="text-[42px] font-black text-white tracking-tight leading-none mb-3 animate-fade-in">
          {s.title}
        </h1>
        <p className="text-lg font-semibold text-white/80 mb-4 animate-fade-in">
          {s.subtitle}
        </p>
        <p className="text-white/65 text-[15px] leading-relaxed max-w-[300px] animate-fade-in">
          {s.description}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="relative px-6 pb-14">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {ONBOARDING_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === slide ? 'w-7 h-2.5 bg-white' : 'w-2.5 h-2.5 bg-white/35'
                    }`} />
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={() => {
            hapticFeedback('light');
            if (!isLast) setSlide(slide + 1);
            else onComplete();
          }}
          className="btn-press w-full bg-white text-stone-900 py-4 rounded-2xl font-bold text-[15px] shadow-elevated"
        >
          {isLast ? 'Начать бесплатно' : 'Далее'}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   AUTH
   ============================================================ */
function AuthScreen({ onAuthSuccess }) {
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState(null);

  const handleTelegramAuth = async () => {
    setAuthenticating(true);
    setError(null);
    hapticFeedback('light');
    const user = await verifyTelegramAuth();
    if (user) {
      onAuthSuccess({
        name: `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || 'Пользователь',
        telegramId: user.id,
        username: user.username,
        joinedAt: new Date().toISOString(),
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        subscription: 'trial'
      });
    } else {
      setError('Не удалось авторизоваться. Запустите приложение из чата с ботом.');
      setAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F0] flex flex-col">
      {/* Top illustration area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16">
        {/* Logo mark */}
        <div className="relative mb-8 animate-scale-in">
          <div className="w-28 h-28 rounded-[32px] bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-glow-purple">
            <Sparkles className="w-14 h-14 text-white" strokeWidth={1.75} />
          </div>
          {/* Orbit decorations */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-md text-sm">
            ✦
          </div>
        </div>

        <h1 className="text-[32px] font-black text-stone-900 tracking-tight text-center mb-2 animate-fade-in">
          Добро пожаловать!
        </h1>
        <p className="text-stone-500 text-center text-[15px] leading-relaxed max-w-xs animate-fade-in">
          Войдите через Telegram — быстро, безопасно, без паролей
        </p>

        {/* Feature pills */}
        <div className="flex gap-2 mt-6 flex-wrap justify-center animate-slide-up">
          {['🩺 Здоровье', '⚖️ Законы РК', '💰 Финансы'].map(f => (
            <span key={f} className="bg-white border border-stone-200 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-card">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-5 pb-12 animate-slide-up">
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700 leading-relaxed">{error}</p>
          </div>
        )}

        <button
          onClick={handleTelegramAuth}
          disabled={authenticating}
          className="btn-press w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-[15px] shadow-elevated flex items-center justify-center gap-2.5"
        >
          {authenticating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Авторизация...</>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Войти через Telegram
            </>
          )}
        </button>

        <p className="text-[11px] text-stone-400 text-center mt-4 leading-relaxed px-4">
          Используя Qamqor, вы подтверждаете, что AI-агенты носят информационный характер и не заменяют профессионалов.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   HOME — STAT CARD
   ============================================================ */
function StatCard({ label, value, max = 100, icon: Icon, gradient, glow }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`bg-white rounded-3xl p-5 shadow-card flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center ${glow}`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <span className="text-xs text-stone-400 font-medium">7 дней</span>
      </div>
      <div>
        <div className="text-[28px] font-black text-stone-900 leading-none tracking-tight">{value}</div>
        <div className="text-xs text-stone-500 font-medium mt-0.5">{label}</div>
      </div>
      <div className="progress-bar">
        <div className={`progress-fill bg-gradient-to-r ${gradient}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ============================================================
   HOME SCREEN
   ============================================================ */
function HomeScreen({ user, streak, healthScore, financeScore, onSelectAgent, onOpenCheckin, onOpenProfile, onOpenSubscription, onOpenDocuments, daysLeftInTrial }) {
  const h = new Date().getHours();
  const greeting = h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const firstName = user.name.split(' ')[0];

  return (
    <div className="min-h-screen pb-28 mesh-bg">
      {/* ── HERO HEADER ── */}
      <div className="relative bg-stone-950 overflow-hidden px-5 pt-14 pb-10 rounded-b-[32px]">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-16 w-80 h-80 rounded-full blur-[90px]"
               style={{ background: 'rgba(99,102,241,0.22)' }} />
          <div className="absolute -bottom-16 -left-8 w-64 h-64 rounded-full blur-[80px]"
               style={{ background: 'rgba(168,85,247,0.15)' }} />
        </div>

        {/* Top row */}
        <div className="relative flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <p className="text-stone-500 text-[13px] font-medium">{greeting},</p>
            <h1 className="text-[28px] font-black text-white tracking-tight leading-tight mt-0.5">
              {firstName} 👋
            </h1>
          </div>
          <button onClick={onOpenProfile}
                  className="btn-press w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{user.name[0]?.toUpperCase()}</span>
          </button>
        </div>

        {/* Trial / premium badge */}
        {user.subscription === 'trial' && (
          <button onClick={onOpenSubscription}
                  className="btn-press relative flex items-center justify-between w-full bg-amber-400/15 border border-amber-400/25 rounded-2xl px-4 py-3 animate-slide-up">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-400 rounded-xl flex items-center justify-center">
                <Crown className="w-4 h-4 text-stone-900" />
              </div>
              <div>
                <span className="text-amber-200 text-[13px] font-semibold">Пробный период</span>
                <span className="text-amber-400/80 text-[11px] ml-2">· {daysLeftInTrial} дн. осталось</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-amber-400 rounded-xl px-3 py-1">
              <Zap className="w-3 h-3 text-stone-900" />
              <span className="text-stone-900 text-[11px] font-bold">Premium</span>
            </div>
          </button>
        )}
        {user.subscription === 'premium' && (
          <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300 text-[13px] font-semibold">Premium активен</span>
          </div>
        )}
      </div>

      {/* ── STREAK CARD ── */}
      <div className="px-4 mt-4">
        <button onClick={onOpenCheckin}
                className="btn-press w-full bg-white rounded-3xl p-4 shadow-card flex items-center gap-4 animate-slide-up">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-glow-amber flex-shrink-0">
            <Flame className="w-7 h-7 text-white animate-flame" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-stone-900 text-[16px]">
              {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд 🔥
            </div>
            <div className="text-[13px] text-stone-500 mt-0.5">Сделать ежедневный чек-ин</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </div>
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="px-4 mt-3 grid grid-cols-2 gap-3 stagger">
        <StatCard label="Здоровье" value={healthScore} icon={Heart}
                  gradient="from-rose-400 to-red-500" glow="shadow-glow-rose" />
        <StatCard label="Финансы" value={financeScore} icon={TrendingUp}
                  gradient="from-emerald-400 to-teal-500" glow="shadow-glow-emerald" />
      </div>

      {/* ── AGENTS SECTION ── */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[13px] font-bold text-stone-400 uppercase tracking-widest">Помощники</h2>
          <span className="text-[11px] text-stone-400 font-medium">3 агента</span>
        </div>
        <div className="space-y-3 stagger">
          {Object.values(AGENTS).map(agent => {
            const Icon = ICONS[agent.iconName];
            return (
              <button key={agent.id}
                      onClick={() => { hapticFeedback('medium'); onSelectAgent(agent.id); }}
                      className="btn-press w-full bg-white rounded-3xl overflow-hidden shadow-card text-left group">
                {/* Gradient top strip */}
                <div className={`h-1.5 bg-gradient-to-r ${agent.gradient}`} />
                <div className="p-4 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <Icon className="w-7 h-7 text-white" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-stone-900 text-[15px]">{agent.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${agent.softBg} ${agent.textColor} uppercase tracking-wide`}>
                        {agent.role}
                      </span>
                    </div>
                    <p className="text-[13px] text-stone-500 leading-relaxed line-clamp-2">{agent.description}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center flex-shrink-0 opacity-0 group-active:opacity-100 transition-opacity`}>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 flex-shrink-0 group-active:hidden" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DOCUMENTS SHORTCUT ── */}
      <div className="px-4 mt-3 animate-slide-up">
        <button onClick={() => { hapticFeedback('medium'); onOpenDocuments(); }}
                className="btn-press w-full bg-white rounded-3xl overflow-hidden shadow-card text-left">
          <div className="h-1.5 bg-gradient-to-r from-slate-600 to-slate-800" />
          <div className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 shadow-md">
              <FileText className="w-7 h-7 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-stone-900 text-[15px] mb-0.5">Документы</div>
              <p className="text-[13px] text-stone-500">Договоры, заявления, расписки, доверенности</p>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-300 flex-shrink-0" />
          </div>
        </button>
      </div>

      {/* ── DAILY TIP ── */}
      <div className="px-4 mt-3 mb-2 animate-slide-up">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-5 noise">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-yellow-400 rounded-lg flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-stone-900 fill-stone-900" />
              </div>
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Совет дня</span>
            </div>
            <h3 className="font-black text-white text-[17px] mb-1 tracking-tight">Депозиты застрахованы</h3>
            <p className="text-white/75 text-[13px] leading-relaxed">
              Вклады в банках РК защищены КФГД до 20 млн ₸. Спросите Ержана о лучших депозитах.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CHECK-IN MODAL
   ============================================================ */
function CheckInModal({ onClose, onSubmit }) {
  const [sleep, setSleep] = useState(7);
  const [water, setWater] = useState(5);
  const [mood, setMood] = useState(3);
  const MOODS = ['😞', '😐', '🙂', '😊', '🤩'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] px-6 pt-6 pb-10 animate-slide-up shadow-elevated">
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-stone-200 rounded-full" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[22px] font-black text-stone-900 tracking-tight">Чек-ин дня</h2>
            <p className="text-[13px] text-stone-400 mt-0.5">Как прошёл ваш день?</p>
          </div>
          <button onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">
            <X className="w-4 h-4 text-stone-600" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Sleep */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Moon className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-[15px] font-semibold text-stone-800">Сон</span>
              </div>
              <span className="text-[22px] font-black text-stone-900 tabular-nums">{sleep}<span className="text-stone-400 text-sm font-medium ml-1">ч</span></span>
            </div>
            <input type="range" min="0" max="12" value={sleep}
                   onChange={e => setSleep(parseInt(e.target.value))}
                   className="w-full h-2 rounded-full accent-indigo-600 cursor-pointer" />
          </div>

          {/* Water */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Droplet className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-[15px] font-semibold text-stone-800">Вода</span>
              </div>
              <span className="text-[22px] font-black text-stone-900 tabular-nums">{water}<span className="text-stone-400 text-sm font-medium ml-1">ст</span></span>
            </div>
            <input type="range" min="0" max="12" value={water}
                   onChange={e => setWater(parseInt(e.target.value))}
                   className="w-full h-2 rounded-full accent-blue-500 cursor-pointer" />
          </div>

          {/* Mood */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-sm">
                ✨
              </div>
              <span className="text-[15px] font-semibold text-stone-800">Настроение</span>
            </div>
            <div className="flex gap-2">
              {MOODS.map((emoji, i) => (
                <button key={i} onClick={() => setMood(i + 1)}
                        className={`flex-1 aspect-square rounded-2xl text-2xl flex items-center justify-center transition-all duration-150 ${
                          mood === i + 1
                            ? 'bg-stone-900 scale-110 shadow-elevated'
                            : 'bg-stone-100 active:scale-95'
                        }`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={() => { hapticFeedback('success'); onSubmit({ sleep, water, mood, date: new Date().toISOString() }); }}
                className="btn-press w-full mt-7 bg-stone-900 text-white py-4 rounded-2xl font-bold text-[15px] shadow-elevated">
          Сохранить · +1 🔥 к серии
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   AGENT CHAT
   ============================================================ */
function AgentChat({ agent, messages, onSend, onBack, loading }) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const Icon = ICONS[agent.iconName];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0) setShowSuggestions(false);
  }, [messages, loading]);

  const handleSend = (text) => {
    const msg = text || input;
    if (!msg.trim() && !attachedFile) return;
    const full = attachedFile ? `[📎 ${attachedFile}]\n\n${msg}` : msg;
    hapticFeedback('light');
    onSend(full);
    setInput('');
    setAttachedFile(null);
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3F0]">
      {/* Header */}
      <div className={`bg-gradient-to-br ${agent.gradient} text-white px-4 pt-12 pb-5 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <button onClick={onBack}
                  className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-[17px] truncate">{agent.name}</h2>
              <span className="text-[10px] bg-white/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                {agent.role}
              </span>
            </div>
            <p className="text-white/70 text-[12px] truncate">{agent.title}</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-4 pt-3">
        <div className={`${agent.softBg} border ${agent.softBorder} rounded-2xl px-3 py-2.5 flex gap-2`}>
          <Shield className={`w-4 h-4 ${agent.textColor} flex-shrink-0 mt-0.5`} />
          <p className={`text-[12px] ${agent.textColor} leading-relaxed`}>{agent.disclaimer}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto pb-2">
        {messages.length === 0 && (
          <div className="py-8 flex flex-col items-center text-center animate-scale-in">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center mb-4 shadow-elevated`}>
              <Icon className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h3 className="font-black text-stone-900 text-[18px] tracking-tight mb-1">Привет, я {agent.name}!</h3>
            <p className="text-[13px] text-stone-500 max-w-[260px] leading-relaxed">{agent.description}</p>
            <p className="text-[12px] text-stone-400 mt-3">Выберите вопрос ниже или задайте свой ↓</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-3xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-stone-900 text-white rounded-br-lg'
                : 'bg-white text-stone-900 shadow-card rounded-bl-lg'
            }`}>
              <div className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-stone-400' : 'text-stone-400'}`}>
                {formatTime(msg.time)}
              </div>
            </div>

            {/* Sources */}
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <div className="max-w-[85%] space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400 px-1">
                  📚 Источники
                </div>
                {msg.sources.map((src, idx) => (
                  <div key={idx} className={`${agent.softBg} border ${agent.softBorder} rounded-2xl px-3 py-2`}>
                    <div className={`text-[12px] font-bold ${agent.textColor}`}>{src.source}</div>
                    <div className="text-[11px] text-stone-600 mt-0.5">{src.articles} · {src.topic}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start">
            <div className="bg-white rounded-3xl rounded-bl-lg px-4 py-3.5 shadow-card flex items-center gap-1.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions (only when empty) */}
      {messages.length === 0 && showSuggestions && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {agent.suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSend(s)}
                      className={`btn-press flex-shrink-0 ${agent.softBg} border ${agent.softBorder} ${agent.textColor} rounded-full px-4 py-2 text-[13px] font-semibold`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attached file chip */}
      {attachedFile && (
        <div className="px-4 pb-2">
          <div className="bg-white border border-stone-200 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-card">
            <Paperclip className="w-4 h-4 text-stone-500 flex-shrink-0" />
            <span className="text-[13px] text-stone-700 flex-1 truncate">{attachedFile}</span>
            <button onClick={() => setAttachedFile(null)}
                    className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center">
              <X className="w-3 h-3 text-stone-500" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 pb-8 pt-2 bg-[#F5F3F0]">
        <div className="bg-white rounded-3xl shadow-card border border-stone-100 px-3 py-2 flex items-end gap-2">
          <button
            onClick={() => {
              const filename = agent.id === 'doctor' ? 'анализы.pdf' : agent.id === 'lawyer' ? 'договор.pdf' : 'зарплата.pdf';
              setAttachedFile(filename);
            }}
            className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center flex-shrink-0 mb-0.5">
            <Paperclip className="w-4 h-4 text-stone-500" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(e); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Напишите сообщение..."
            rows={1}
            className="flex-1 resize-none outline-none bg-transparent text-[15px] py-2 text-stone-900 placeholder-stone-400 max-h-32"
          />
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && !attachedFile) || loading}
            className={`btn-press w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mb-0.5 transition-all ${
              (input.trim() || attachedFile) && !loading
                ? `bg-gradient-to-br ${agent.gradient} shadow-md`
                : 'bg-stone-100'
            }`}>
            <Send className={`w-4 h-4 ${(input.trim() || attachedFile) && !loading ? 'text-white' : 'text-stone-400'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROFILE SCREEN
   ============================================================ */
function ProfileScreen({ user, onBack, onLogout, onOpenSubscription, daysLeftInTrial, totalChats, totalCheckins, onDeleteAccount }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F3F0] pb-28">
      {/* Hero */}
      <div className="relative bg-stone-950 overflow-hidden px-5 pt-14 pb-14 rounded-b-[32px]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-[80px]"
               style={{ background: 'rgba(139,92,246,0.20)' }} />
        </div>
        <button onClick={onBack}
                className="relative w-10 h-10 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center mb-6">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="relative flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-3 shadow-glow-purple">
            <span className="text-[40px] font-black text-white">{user.name[0]?.toUpperCase()}</span>
          </div>
          <h2 className="text-[22px] font-black text-white tracking-tight">{user.name}</h2>
          {user.username && <p className="text-stone-500 text-[13px] mt-1">@{user.username}</p>}
        </div>
      </div>

      {/* Subscription card */}
      <div className="px-4 -mt-6">
        <button onClick={onOpenSubscription}
                className="btn-press w-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-3xl p-5 text-left mb-4 shadow-glow-amber overflow-hidden relative noise">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/15 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-white" />
                <span className="font-bold text-white text-[15px]">
                  {user.subscription === 'premium' ? 'Premium активен' : 'Пробный период'}
                </span>
              </div>
              {user.subscription === 'trial' && (
                <p className="text-white/80 text-[13px]">Осталось {daysLeftInTrial} дней бесплатно</p>
              )}
            </div>
            <div className="bg-white/25 rounded-2xl px-4 py-2 text-white text-[12px] font-bold">
              {user.subscription === 'premium' ? 'Активен ✓' : 'Upgrade →'}
            </div>
          </div>
        </button>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Диалогов', value: totalChats, icon: MessageCircle },
            { label: 'Чек-инов', value: totalCheckins, icon: Flame },
            { label: 'Агентов', value: 3, icon: Sparkles }
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-card">
              <div className="text-[24px] font-black text-stone-900 leading-none">{value}</div>
              <div className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden mb-4">
          {[
            { icon: FileText, label: 'Мои документы', sub: 'Сохранённые шаблоны' },
            { icon: Bell, label: 'Уведомления', sub: 'Напоминания и push' },
            { icon: Lock, label: 'Конфиденциальность', sub: 'Данные и безопасность' },
            { icon: Settings, label: 'Настройки', sub: 'Язык, тема' }
          ].map(({ icon: Icon, label, sub }, i) => (
            <button key={i} className="w-full flex items-center gap-4 px-5 py-4 border-b border-stone-100 last:border-0 active:bg-stone-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-stone-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[14px] font-semibold text-stone-900">{label}</div>
                <div className="text-[12px] text-stone-400 mt-0.5">{sub}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={onLogout}
                className="btn-press w-full bg-white border border-stone-200 text-stone-700 py-4 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-2 shadow-card mb-3">
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>

        {/* Delete account */}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
                  className="w-full text-rose-500 py-3 text-[14px] font-medium text-center">
            Удалить аккаунт и данные
          </button>
        ) : (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
            <p className="text-[13px] text-rose-700 font-semibold mb-1">Удалить все данные?</p>
            <p className="text-[12px] text-rose-600 mb-3 leading-relaxed">
              История чатов, профиль, чек-ины — всё будет безвозвратно стёрто.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 bg-white border border-rose-200 text-rose-600 py-2.5 rounded-xl text-[13px] font-semibold">
                Отмена
              </button>
              <button onClick={onDeleteAccount}
                      className="flex-1 bg-rose-500 text-white py-2.5 rounded-xl text-[13px] font-bold">
                Удалить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SUBSCRIPTION SCREEN
   ============================================================ */
function SubscriptionScreen({ onBack, onSubscribe, daysLeftInTrial }) {
  const [plan, setPlan] = useState('monthly');

  const FEATURES = [
    { icon: MessageCircle, text: 'Безлимитный чат со всеми тремя AI-агентами' },
    { icon: FileText, text: 'Загрузка документов и анализов' },
    { icon: BarChart3, text: 'История чек-инов и аналитика' },
    { icon: Bell, text: 'Ежедневные напоминания и советы' },
    { icon: Zap, text: 'Приоритетная поддержка' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F3F0]">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 text-white px-5 pt-14 pb-12 rounded-b-[32px] overflow-hidden noise">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl" />
        </div>
        <button onClick={onBack}
                className="relative w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center mb-5">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="relative text-center">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-glow-purple border border-white/25">
            <Crown className="w-10 h-10 text-yellow-300" strokeWidth={1.5} />
          </div>
          <h2 className="text-[28px] font-black tracking-tight mb-2">Qamqor Premium</h2>
          <p className="text-white/70 text-[15px]">Безлимитный доступ · Все агенты</p>
        </div>
      </div>

      <div className="px-4 mt-5 pb-10">
        {/* Plans */}
        <div className="space-y-3 mb-6">
          {[
            { id: 'monthly', label: 'Ежемесячно', sub: 'Отменить в любой момент', price: '$1', period: '/мес', badge: null },
            { id: 'yearly', label: 'Ежегодно', sub: '$8 / год · экономия $4', price: '$0.67', period: '/мес', badge: 'ЭКОНОМИЯ 33%' },
          ].map(p => (
            <button key={p.id} onClick={() => setPlan(p.id)}
                    className={`btn-press w-full bg-white rounded-3xl p-5 text-left relative transition-all duration-150 ${
                      plan === p.id
                        ? 'border-2 border-stone-900 shadow-elevated'
                        : 'border-2 border-transparent shadow-card'
                    }`}>
              {p.badge && (
                <div className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                  {p.badge}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    plan === p.id ? 'border-stone-900 bg-stone-900' : 'border-stone-300'
                  }`}>
                    {plan === p.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div>
                    <div className="font-bold text-stone-900 text-[15px]">{p.label}</div>
                    <div className="text-[12px] text-stone-500 mt-0.5">{p.sub}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[24px] font-black text-stone-900">{p.price}</span>
                  <span className="text-[12px] text-stone-400 ml-1">{p.period}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="bg-white rounded-3xl p-5 shadow-card mb-6">
          <h3 className="font-bold text-stone-900 text-[15px] mb-4">Что входит в Premium:</h3>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[14px] text-stone-700">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button onClick={() => { hapticFeedback('success'); onSubscribe(); }}
                className="btn-press w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-[15px] shadow-elevated mb-3">
          Активировать {plan === 'monthly' ? '$1/мес' : '$8/год'}
        </button>
        <p className="text-[12px] text-stone-400 text-center leading-relaxed">
          Оплата через Telegram Stars или Kaspi Pay
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   DOCUMENTS LIST
   ============================================================ */
function DocumentsListScreen({ onBack, onSelectTemplate }) {
  const [data, setData] = useState({ categories: {}, templates: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents/list')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const grouped = {};
  for (const t of (data.templates || [])) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  return (
    <div className="min-h-screen bg-[#F5F3F0] pb-10">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-700 to-slate-900 text-white px-5 pt-14 pb-10 rounded-b-[32px] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        </div>
        <button onClick={onBack}
                className="relative w-10 h-10 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center mb-5">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="relative">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mb-3 border border-white/20">
            <FileText className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-[26px] font-black tracking-tight mb-1">Документы</h2>
          <p className="text-white/65 text-[14px]">Готовые шаблоны по законам РК</p>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-3 mb-5">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-800 leading-relaxed">
            Шаблоны — образцы. Для важных сделок проконсультируйтесь с юристом.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl p-4 skeleton h-20" />
            ))}
          </div>
        ) : (
          Object.entries(grouped).map(([catId, items]) => {
            const cat = data.categories[catId];
            if (!cat || items.length === 0) return null;
            return (
              <div key={catId} className="mb-5">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-xl">{cat.icon}</span>
                  <h3 className="text-[13px] font-bold text-stone-500 uppercase tracking-widest">{cat.label}</h3>
                </div>
                <div className="space-y-2">
                  {items.map(t => (
                    <button key={t.id}
                            onClick={() => { hapticFeedback('light'); onSelectTemplate(t); }}
                            className="btn-press w-full bg-white rounded-3xl p-4 shadow-card text-left">
                      <div className="font-bold text-stone-900 text-[15px] mb-1">{t.title}</div>
                      <div className="text-[13px] text-stone-500 leading-relaxed">{t.description}</div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-4 h-4 bg-stone-100 rounded-md flex items-center justify-center">
                          <FileText className="w-2.5 h-2.5 text-stone-500" />
                        </div>
                        <span className="text-[11px] text-stone-400 font-medium">
                          {t.fields.length} {t.fields.length === 1 ? 'поле' : t.fields.length < 5 ? 'поля' : 'полей'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ============================================================
   DOCUMENT FORM
   ============================================================ */
function DocumentFormScreen({ template, onBack, onGenerated }) {
  const [values, setValues] = useState(() => {
    const init = {};
    for (const f of template.fields) {
      if (f.default !== undefined) init[f.name] = f.default;
    }
    return init;
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, fields: values, initData: getInitData() })
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Ошибка генерации'); setGenerating(false); return; }
      onGenerated(d);
    } catch { setError('Не удалось сгенерировать документ'); setGenerating(false); }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F0] pb-10">
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white px-5 pt-14 pb-8 rounded-b-[32px]">
        <button onClick={onBack}
                className="w-10 h-10 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center mb-4">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-[22px] font-black tracking-tight mb-1">{template.title}</h2>
        <p className="text-white/60 text-[13px] leading-relaxed">{template.description}</p>
      </div>

      <div className="px-4 mt-4">
        {template.legalNotes && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-4">
            <p className="text-[12px] text-blue-800 leading-relaxed">
              <span className="font-bold">📖 Правовая основа: </span>{template.legalNotes}
            </p>
          </div>
        )}

        <div className="bg-white rounded-3xl p-5 shadow-card mb-4">
          <div className="space-y-4">
            {template.fields.map(field => (
              <div key={field.name}>
                <label className="text-[12px] font-bold text-stone-600 uppercase tracking-wider mb-1.5 block">
                  {field.label}{field.required && <span className="text-rose-500 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={values[field.name] || ''}
                    onChange={e => setValues({ ...values, [field.name]: e.target.value })}
                    placeholder={field.placeholder || ''}
                    rows={3}
                    className="w-full px-4 py-3 text-[14px] bg-stone-50 border border-stone-200 rounded-2xl input-focus resize-none text-stone-900 placeholder-stone-400"
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={values[field.name] || ''}
                    onChange={e => setValues({ ...values, [field.name]: e.target.value })}
                    placeholder={field.placeholder || ''}
                    className="w-full px-4 py-3 text-[14px] bg-stone-50 border border-stone-200 rounded-2xl input-focus text-stone-900 placeholder-stone-400"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4 flex gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-rose-700">{error}</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={generating}
                className="btn-press w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-[15px] shadow-elevated flex items-center justify-center gap-2">
          {generating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Создаю документ...</>
          ) : (
            <>📄 Сгенерировать документ</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   DOCUMENT RESULT
   ============================================================ */
function DocumentResultScreen({ document, onBack, onNew }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      const ta = window.document.createElement('textarea');
      ta.value = document.document;
      window.document.body.appendChild(ta);
      ta.select();
      window.document.execCommand('copy');
      window.document.body.removeChild(ta);
    } catch {
      navigator.clipboard?.writeText(document.document);
    }
    setCopied(true);
    hapticFeedback('success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F5F3F0] pb-10">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-5 pt-14 pb-8 rounded-b-[32px] overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <button onClick={onBack}
                className="relative w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center mb-4">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="relative">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3 border border-white/25">
            <CheckCircle className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-[22px] font-black tracking-tight mb-1">{document.title}</h2>
          <p className="text-white/70 text-[13px]">Документ готов</p>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-3xl shadow-card p-4 mb-4 overflow-hidden">
          <pre className="text-[12px] text-stone-800 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
            {document.document}
          </pre>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <p className="text-[12px] text-amber-800 leading-relaxed">
            <strong>⚠️ Важно:</strong> Проверьте все данные перед использованием. При необходимости — заверьте у нотариуса.
          </p>
        </div>

        <div className="space-y-2">
          <button onClick={handleCopy}
                  className={`btn-press w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-elevated transition-colors ${
                    copied ? 'bg-emerald-500 text-white' : 'bg-stone-900 text-white'
                  }`}>
            {copied ? <><CheckCircle className="w-5 h-5" /> Скопировано!</> : <>📋 Скопировать текст</>}
          </button>
          <button onClick={onNew}
                  className="btn-press w-full bg-white border border-stone-200 text-stone-700 py-4 rounded-2xl font-semibold text-[14px] shadow-card">
            Создать другой документ
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BOTTOM NAVIGATION
   ============================================================ */
function BottomNav({ screen, onChange }) {
  if (!['home', 'profile'].includes(screen)) return null;
  const items = [
    { id: 'home', icon: Home, label: 'Главная' },
    { id: 'profile', icon: User, label: 'Профиль' },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-6 px-4 pointer-events-none">
      <div className="glass-nav rounded-[28px] px-3 py-2.5 flex gap-1 shadow-elevated border border-white/60 pointer-events-auto">
        {items.map(item => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button key={item.id}
                    onClick={() => onChange(item.id)}
                    className={`btn-press flex items-center gap-2 px-5 py-2.5 rounded-[20px] transition-all duration-200 ${
                      active ? 'bg-stone-900 text-white' : 'text-stone-500'
                    }`}>
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              {active && <span className="text-[13px] font-bold">{item.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [currentAgentId, setCurrentAgentId] = useState(null);
  const [docTemplate, setDocTemplate] = useState(null);
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [allMessages, setAllMessages] = useState({ doctor: [], lawyer: [], financier: [] });
  const [streak, setStreak] = useState(0);
  const [lastCheckin, setLastCheckin] = useState(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [healthScore, setHealthScore] = useState(72);
  const [financeScore, setFinanceScore] = useState(65);
  const [loading, setLoading] = useState(false);
  const [totalCheckins, setTotalCheckins] = useState(0);

  useEffect(() => {
    initTelegram();
    const savedUser = loadData('user');
    if (savedUser) {
      setUser(savedUser);
      const savedMessages = loadData('messages');
      if (savedMessages) setAllMessages(savedMessages);
      setStreak(loadData('streak', 0));
      setLastCheckin(loadData('lastCheckin'));
      setHealthScore(loadData('healthScore', 72));
      setFinanceScore(loadData('financeScore', 65));
      setTotalCheckins(loadData('totalCheckins', 0));
      setScreen('home');
    } else {
      const tgUser = getTelegramUser();
      setScreen(tgUser ? 'auth' : 'onboarding');
    }
  }, []);

  const daysLeftInTrial = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / 86400000))
    : 0;
  const totalChats = Object.values(allMessages).reduce((s, m) => s + m.filter(x => x.role === 'user').length, 0);

  const handleLogin = (userData) => {
    setUser(userData);
    saveData('user', userData);
    trackAnalytics('login');
    setScreen('home');
  };

  const handleLogout = () => {
    setUser(null);
    setAllMessages({ doctor: [], lawyer: [], financier: [] });
    setStreak(0);
    try { localStorage.clear(); } catch {}
    setScreen('onboarding');
  };

  const handleSendMessage = async (text) => {
    const newUserMsg = { role: 'user', content: text, time: new Date().toISOString() };
    const updated = { ...allMessages, [currentAgentId]: [...allMessages[currentAgentId], newUserMsg] };
    setAllMessages(updated);
    saveData('messages', updated);
    setLoading(true);

    const { reply, sources } = await callAI(currentAgentId, text);
    const newAiMsg = { role: 'assistant', content: reply, time: new Date().toISOString(), sources: sources?.length > 0 ? sources : undefined };
    const final = { ...updated, [currentAgentId]: [...updated[currentAgentId], newAiMsg] };
    setAllMessages(final);
    saveData('messages', final);
    setLoading(false);
  };

  const handleSelectAgent = async (id) => {
    trackAnalytics('agent_open', { agent: id });
    setCurrentAgentId(id);
    setScreen('chat');
    const history = await fetchHistory(id);
    if (history.length > 0) {
      setAllMessages(prev => ({ ...prev, [id]: history }));
    }
  };

  const handleCheckin = (data) => {
    const today = new Date().toDateString();
    const isNewDay = !lastCheckin || new Date(lastCheckin.date).toDateString() !== today;
    if (isNewDay) {
      const newStreak = streak + 1;
      const newCheckins = totalCheckins + 1;
      const newHealth = Math.round(Math.min(100, (data.sleep / 8) * 50 + (data.water / 8) * 30 + (data.mood / 5) * 20));
      setStreak(newStreak);
      setLastCheckin(data);
      setTotalCheckins(newCheckins);
      setHealthScore(newHealth);
      saveData('streak', newStreak);
      saveData('lastCheckin', data);
      saveData('healthScore', newHealth);
      saveData('totalCheckins', newCheckins);
      trackAnalytics('checkin');
    }
    setShowCheckin(false);
  };

  const handleSubscribe = () => {
    trackAnalytics('subscription_clicked');
    const newUser = { ...user, subscription: 'premium' };
    setUser(newUser);
    saveData('user', newUser);
    setScreen('home');
  };

  const handleDeleteAccount = async () => {
    const ok = await deleteAllUserData();
    if (ok) {
      setUser(null);
      setAllMessages({ doctor: [], lawyer: [], financier: [] });
      setStreak(0);
      try { localStorage.clear(); } catch {}
      setScreen('onboarding');
    } else {
      alert('Не удалось удалить данные. Попробуйте ещё раз.');
    }
  };

  /* Loading spinner */
  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F3F0] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-glow-purple animate-pulse-soft">
          <Sparkles className="w-8 h-8 text-white" strokeWidth={2} />
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (screen === 'onboarding') return <OnboardingScreen onComplete={() => setScreen('auth')} />;
  if (screen === 'auth') return <AuthScreen onAuthSuccess={handleLogin} />;

  return (
    <div className="max-w-md mx-auto min-h-screen relative">
      {screen === 'home' && (
        <HomeScreen
          user={user} streak={streak} healthScore={healthScore} financeScore={financeScore}
          onSelectAgent={handleSelectAgent}
          onOpenCheckin={() => setShowCheckin(true)}
          onOpenProfile={() => setScreen('profile')}
          onOpenSubscription={() => setScreen('subscription')}
          onOpenDocuments={() => setScreen('documents-list')}
          daysLeftInTrial={daysLeftInTrial}
        />
      )}
      {screen === 'documents-list' && (
        <DocumentsListScreen
          onBack={() => setScreen('home')}
          onSelectTemplate={t => { setDocTemplate(t); setScreen('documents-form'); }}
        />
      )}
      {screen === 'documents-form' && docTemplate && (
        <DocumentFormScreen
          template={docTemplate}
          onBack={() => setScreen('documents-list')}
          onGenerated={doc => { setGeneratedDoc(doc); setScreen('documents-result'); }}
        />
      )}
      {screen === 'documents-result' && generatedDoc && (
        <DocumentResultScreen
          document={generatedDoc}
          onBack={() => setScreen('documents-form')}
          onNew={() => { setGeneratedDoc(null); setDocTemplate(null); setScreen('documents-list'); }}
        />
      )}
      {screen === 'chat' && currentAgentId && (
        <AgentChat
          agent={AGENTS[currentAgentId]}
          messages={allMessages[currentAgentId]}
          onSend={handleSendMessage}
          onBack={() => setScreen('home')}
          loading={loading}
        />
      )}
      {screen === 'profile' && (
        <ProfileScreen
          user={user} onBack={() => setScreen('home')} onLogout={handleLogout}
          onOpenSubscription={() => setScreen('subscription')}
          daysLeftInTrial={daysLeftInTrial} totalChats={totalChats} totalCheckins={totalCheckins}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
      {screen === 'subscription' && (
        <SubscriptionScreen
          onBack={() => setScreen(user?.subscription === 'trial' ? 'home' : 'profile')}
          onSubscribe={handleSubscribe}
          daysLeftInTrial={daysLeftInTrial}
        />
      )}
      {showCheckin && <CheckInModal onClose={() => setShowCheckin(false)} onSubmit={handleCheckin} />}
      <BottomNav screen={screen} onChange={setScreen} />
    </div>
  );
}
