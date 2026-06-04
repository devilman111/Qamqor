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
   STICKY BACK BUTTON — фиксированная кнопка назад
   Всегда видна при скролле, поверх любого контента
   ============================================================ */
function StickyBack({ onClick, dark = false }) {
  return (
    <button
      onClick={() => { hapticFeedback('light'); onClick(); }}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '16px',
        zIndex: 9999,
      }}
      className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md border transition-all active:scale-95 ${
        dark
          ? 'bg-black/40 border-white/15 text-white'
          : 'bg-white/90 border-black/10 text-gray-800'
      }`}
    >
      <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );
}

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
function HomeScreen({ user, streak, healthScore, financeScore, onSelectAgent, onOpenCheckin, onOpenProfile, onOpenSubscription, onOpenDocuments, onOpenLegalBrowser, onOpenLegalNews, daysLeftInTrial }) {
  const h = new Date().getHours();
  const greeting = h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const firstName = user.name.split(' ')[0];

  return (
    <div className="min-h-screen pb-32 mesh-bg">
      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-b-[36px]"
           style={{ background: 'linear-gradient(160deg, #09090b 0%, #18181b 40%, #1c1427 80%, #0f0a1e 100%)' }}>
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-12 w-72 h-72 rounded-full blur-[80px] animate-spin-slow"
               style={{ background: 'conic-gradient(from 0deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2), rgba(99,102,241,0.3))' }} />
          <div className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full blur-[70px]"
               style={{ background: 'rgba(168,85,247,0.18)' }} />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full blur-[50px]"
               style={{ background: 'rgba(236,72,153,0.12)' }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.025]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-5 pt-14 pb-8">
          {/* Top row */}
          <div className="flex items-center justify-between mb-5 animate-fade-in">
            <div>
              <p className="text-stone-500 text-[12px] font-semibold uppercase tracking-widest">{greeting}</p>
              <h1 className="text-[30px] font-black text-white tracking-tight leading-tight mt-0.5">
                {firstName} <span className="animate-float inline-block">👋</span>
              </h1>
            </div>
            <button onClick={onOpenProfile}
                    className="btn-press relative w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden">
              {/* Avatar gradient bg */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-indigo-600/30" />
              <span className="relative text-white font-black text-lg">{user.name[0]?.toUpperCase()}</span>
            </button>
          </div>

          {/* Trial / premium badge */}
          {user.subscription === 'trial' && (
            <button onClick={onOpenSubscription}
                    className="btn-press relative w-full rounded-2xl px-4 py-3 mb-0 animate-slide-up overflow-hidden border border-amber-400/20"
                    style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.08))' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 premium-gradient rounded-xl flex items-center justify-center shadow-glow-amber">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-amber-300 text-[13px] font-bold">Пробный период</div>
                    <div className="text-amber-500/70 text-[11px]">{daysLeftInTrial} дней осталось</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-400 rounded-xl px-3 py-1.5">
                  <Zap className="w-3 h-3 text-stone-900" />
                  <span className="text-stone-900 text-[11px] font-black">Upgrade</span>
                </div>
              </div>
            </button>
          )}
          {user.subscription === 'premium' && (
            <div className="flex items-center gap-2 bg-emerald-500/12 border border-emerald-500/20 rounded-2xl px-4 py-3">
              <div className="status-dot" />
              <span className="text-emerald-300 text-[13px] font-bold">Premium · Полный доступ</span>
            </div>
          )}
        </div>
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
          <h2 className="text-[13px] font-black text-stone-400 uppercase tracking-widest">AI Помощники</h2>
          <div className="flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1 shadow-card">
            <div className="status-dot" style={{width:6,height:6}} />
            <span className="text-[11px] text-stone-500 font-semibold">3 онлайн</span>
          </div>
        </div>
        <div className="space-y-3 stagger">
          {Object.values(AGENTS).map(agent => {
            const Icon = ICONS[agent.iconName];
            return (
              <button key={agent.id}
                      onClick={() => { hapticFeedback('medium'); onSelectAgent(agent.id); }}
                      className="btn-press w-full bg-white rounded-3xl overflow-hidden shadow-card text-left group card-lift">
                {/* Gradient top strip — thicker */}
                <div className={`h-1.5 bg-gradient-to-r ${agent.gradient}`} />
                <div className="p-4 flex items-center gap-4">
                  {/* Icon with glow */}
                  <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center flex-shrink-0`}
                       style={{ boxShadow: `0 8px 20px rgba(99,102,241,0.25)` }}>
                    <Icon className="w-7 h-7 text-white" strokeWidth={1.75} />
                    {/* Online dot */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-stone-900 text-[15px]">{agent.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${agent.softBg} ${agent.textColor} uppercase tracking-wide`}>
                        {agent.role}
                      </span>
                    </div>
                    <p className="text-[13px] text-stone-500 leading-snug line-clamp-2">{agent.description}</p>
                  </div>

                  <div className="w-9 h-9 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── QUICK ACTIONS GRID ── */}
      <div className="px-4 mt-3 animate-slide-up">
        <div className="grid grid-cols-3 gap-2.5 mb-2.5">
          <button onClick={() => { hapticFeedback('medium'); onOpenDocuments(); }}
                  className="btn-press bg-white rounded-2xl overflow-hidden shadow-card text-left">
            <div className="h-0.5 bg-gradient-to-r from-slate-600 to-slate-800" />
            <div className="p-3 flex flex-col gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                <FileText className="w-4.5 h-4.5 text-white" style={{width:18,height:18}} strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-bold text-stone-900 text-[13px] leading-tight">Документы</div>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">25 шаблонов</p>
              </div>
            </div>
          </button>

          <button onClick={() => { hapticFeedback('medium'); onOpenLegalBrowser(); }}
                  className="btn-press bg-white rounded-2xl overflow-hidden shadow-card text-left">
            <div className="h-0.5 bg-gradient-to-r from-indigo-600 to-violet-600" />
            <div className="p-3 flex flex-col gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <BookOpen className="w-4.5 h-4.5 text-white" style={{width:18,height:18}} strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-bold text-stone-900 text-[13px] leading-tight">База законов</div>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">300+ норм</p>
              </div>
            </div>
          </button>

          <button onClick={() => { hapticFeedback('medium'); onOpenLegalNews(); }}
                  className="btn-press bg-white rounded-2xl overflow-hidden shadow-card text-left relative">
            <div className="h-0.5 bg-gradient-to-r from-rose-500 to-red-600" />
            {/* Live badge */}
            <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse-soft" />
            <div className="p-3 flex flex-col gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-white" style={{width:18,height:18}} strokeWidth={2} />
              </div>
              <div>
                <div className="font-bold text-stone-900 text-[13px] leading-tight">Новости</div>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">Новые законы</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ── FEATURED: LATEST LAW UPDATE ── */}
      <div className="px-4 mt-3 animate-slide-up">
        <button onClick={() => { hapticFeedback('medium'); onOpenLegalNews(); }}
                className="btn-press w-full relative overflow-hidden rounded-3xl p-5 noise text-left"
                style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-3xl"
               style={{ background: 'rgba(139,92,246,0.40)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-24 rounded-full blur-2xl"
               style={{ background: 'rgba(99,102,241,0.25)' }} />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                  <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">Свежие законы</span>
                </div>
              </div>
              <h3 className="font-black text-white text-[16px] mb-1.5 tracking-tight">
                МЗП 2025 = 85 000 ₸ <br/>Всеобщее декларирование — всем!
              </h3>
              <p className="text-white/60 text-[12px] leading-relaxed">
                25+ изменений в законах РК за 2024–2025 →
              </p>
            </div>
            <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
              <Zap className="w-5 h-5 text-white" />
            </div>
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
            <h3 className="font-black text-white text-[16px] mb-1 tracking-tight">
              Знаете ли вы свои права как работник?
            </h3>
            <p className="text-white/72 text-[13px] leading-relaxed">
              Спросите Дамира о трудовых правах: увольнение, зарплата, отпуск — ваши гарантии по ТК РК.
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
      <StickyBack onClick={onBack} dark />
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

      {/* Lawyer: latest law news ticker */}
      {agent.id === 'lawyer' && (
        <div className="mx-4 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-3 py-2 flex items-center gap-2 overflow-hidden">
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-soft" />
            <span className="text-[10px] font-black text-white/90 uppercase tracking-widest whitespace-nowrap">Свежие законы</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="ticker-content text-[11px] text-white/80 whitespace-nowrap">
              🆕 МЗП 2025 = 85 000 ₸ &nbsp;·&nbsp; Всеобщее декларирование всех граждан РК с 2025 &nbsp;·&nbsp; Мошенничество в мессенджерах — новая ст. 185-1 УК &nbsp;·&nbsp; КСК → ОСИ: переход обязателен &nbsp;·&nbsp; ЭЦП теперь действует 3 года &nbsp;·&nbsp; Банкротство физлиц: лимит 4,9 млн ₸ &nbsp;·&nbsp; Скриншоты WhatsApp — допустимы в суде
            </div>
          </div>
        </div>
      )}

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
          <div key={i} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}
               style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
            <div className={`max-w-[85%] px-4 py-3 ${
              msg.role === 'user'
                ? 'chat-bubble-user'
                : 'chat-bubble-ai'
            }`}>
              <div className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              <div className="text-[10px] mt-1.5 opacity-50">
                {formatTime(msg.time)}
              </div>
            </div>

            {/* Sources — premium styled */}
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <div className="max-w-[85%] space-y-1.5 animate-fade-in">
                <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400 px-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Источники из базы законов РК
                </div>
                {msg.sources.map((src, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl px-3 py-2">
                    <div className="text-[11px] font-black text-indigo-700 leading-snug">{src.source}</div>
                    <div className="text-[11px] text-stone-600 mt-0.5 leading-snug">{src.articles} · {src.topic}</div>
                    {src.score > 0 && (
                      <div className="text-[10px] text-indigo-400 mt-0.5">релевантность: {src.score}</div>
                    )}
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
      <StickyBack onClick={onBack} dark />
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
      <StickyBack onClick={onBack} dark />
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
      <StickyBack onClick={onBack} dark />
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
      onGenerated({ ...d, _templateId: template.id, _fields: values, _initData: getInitData() });
    } catch { setError('Не удалось сгенерировать документ'); setGenerating(false); }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F0] pb-10">
      <StickyBack onClick={onBack} dark />
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
function DocumentResultScreen({ document, onBack, onNew, templateId, fields, initData }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadErr, setDownloadErr] = useState('');

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

  const handleDownloadDocx = async () => {
    setDownloading(true);
    setDownloadErr('');
    try {
      const res = await fetch('/api/documents/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, fields, initData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка генерации');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      const cd = res.headers.get('content-disposition') || '';
      const match = cd.match(/filename\*=UTF-8''(.+)/);
      a.download = match ? decodeURIComponent(match[1]) : 'document.docx';
      a.click();
      URL.revokeObjectURL(url);
      hapticFeedback('success');
    } catch (e) {
      setDownloadErr(e.message);
    } finally {
      setDownloading(false);
    }
  };

  // Рендер документа как A4-страница
  const renderDocumentPreview = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-4" />;

      // Главный заголовок (первые 6 строк, всё заглавное)
      const isTitle = i < 8 && trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 120
        && /^(ДОГОВОР|РАСПИСКА|ДОВЕРЕННОСТЬ|ЗАЯВЛЕНИЕ|ПРЕТЕНЗИЯ|АКТ|СОГЛАШЕНИЕ|ТРУДОВОЙ|ИСКОВОЕ|ПРИКАЗ)/.test(trimmed);

      // Заголовок раздела: "1. ПРЕДМЕТ ДОГОВОРА"
      const isSection = /^\d+\.\s+[А-ЯA-Z\s]+$/.test(trimmed) && trimmed.length < 80;

      // Строка подписи
      const isSign = trimmed.includes('___') || trimmed.includes('(подпись') || trimmed.includes('(печать');

      // Колонтитул (г. Город ... дата)
      const isHeader = /^г\.\s/.test(trimmed) && i < 12;

      if (isTitle) {
        return (
          <p key={i} style={{ fontFamily: 'Times New Roman, serif', fontSize: '16pt', fontWeight: 'bold', textAlign: 'center', margin: '8px 0 4px' }}>
            {trimmed}
          </p>
        );
      }
      if (isSection) {
        return (
          <p key={i} style={{ fontFamily: 'Times New Roman, serif', fontSize: '14pt', fontWeight: 'bold', margin: '10px 0 4px' }}>
            {trimmed}
          </p>
        );
      }
      if (isHeader) {
        return (
          <p key={i} style={{ fontFamily: 'Times New Roman, serif', fontSize: '14pt', margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>{trimmed.split(/\s{3,}/)[0]}</span>
            <span>{trimmed.split(/\s{3,}/)[1] || ''}</span>
          </p>
        );
      }
      if (isSign) {
        return (
          <p key={i} style={{ fontFamily: 'Times New Roman, serif', fontSize: '13pt', margin: '3px 0', whiteSpace: 'pre' }}>
            {line}
          </p>
        );
      }
      // Пункт с номером — жирный номер
      if (/^\d+\.\d+\./.test(trimmed)) {
        return (
          <p key={i} style={{ fontFamily: 'Times New Roman, serif', fontSize: '14pt', textAlign: 'justify', margin: '3px 0', paddingLeft: '16px' }}>
            {trimmed}
          </p>
        );
      }
      // Подпункт со "—"
      if (trimmed.startsWith('—') || trimmed.startsWith('-')) {
        return (
          <p key={i} style={{ fontFamily: 'Times New Roman, serif', fontSize: '14pt', margin: '2px 0', paddingLeft: '24px' }}>
            {trimmed}
          </p>
        );
      }
      return (
        <p key={i} style={{ fontFamily: 'Times New Roman, serif', fontSize: '14pt', textAlign: 'justify', textIndent: '36px', margin: '3px 0', lineHeight: '1.5' }}>
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F3F0] pb-10">
      <StickyBack onClick={onBack} dark />
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
          <p className="text-white/70 text-[13px]">Документ готов — просмотр и скачивание</p>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* A4 preview */}
        <div className="mb-3">
          <p className="text-[12px] text-stone-500 font-medium mb-2 ml-1">📄 Предпросмотр документа</p>
          <div className="overflow-x-auto">
            <div style={{
              background: '#fff',
              width: '210mm',
              minWidth: '210mm',
              maxWidth: '210mm',
              margin: '0 auto',
              padding: '30mm 20mm 20mm 30mm',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              borderRadius: '2px',
              lineHeight: '1.5',
            }}>
              {renderDocumentPreview(document.document)}
            </div>
          </div>
        </div>

        {document.legalNotes && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
            <p className="text-[12px] text-amber-800 leading-relaxed">
              <strong>⚠️ Важно:</strong> {document.legalNotes}
            </p>
          </div>
        )}

        {downloadErr && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-3">
            <p className="text-[12px] text-red-700">{downloadErr}</p>
          </div>
        )}

        <div className="space-y-2">
          <button onClick={handleDownloadDocx} disabled={downloading}
                  className="btn-press w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-elevated bg-stone-900 text-white disabled:opacity-60">
            {downloading
              ? <><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></>
              : <>⬇️ Скачать Word (.docx)</>
            }
          </button>
          <button onClick={handleCopy}
                  className={`btn-press w-full py-3.5 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-2 shadow-card transition-colors ${
                    copied ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-700'
                  }`}>
            {copied ? <><CheckCircle className="w-4 h-4" /> Скопировано!</> : <>📋 Скопировать текст</>}
          </button>
          <button onClick={onNew}
                  className="btn-press w-full bg-white border border-stone-200 text-stone-500 py-3.5 rounded-2xl font-medium text-[14px] shadow-card">
            Создать другой документ
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LEGAL NEWS SCREEN — Kazakhstan law updates in real time
   ============================================================ */
const NEWS_BADGE_STYLES = {
  red:    'bg-red-50 text-red-700 border border-red-200',
  blue:   'bg-blue-50 text-blue-700 border border-blue-200',
  green:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  orange: 'bg-orange-50 text-orange-700 border border-orange-200',
  purple: 'bg-violet-50 text-violet-700 border border-violet-200',
  pink:   'bg-pink-50 text-pink-700 border border-pink-200',
  teal:   'bg-teal-50 text-teal-700 border border-teal-200',
};

const NEWS_CATS = [
  { id: 'all',       label: 'Все',        icon: '📰' },
  { id: 'tax',       label: 'Налоги',     icon: '💰' },
  { id: 'labor',     label: 'Труд',       icon: '👷' },
  { id: 'criminal',  label: 'УК',         icon: '⚖️' },
  { id: 'housing',   label: 'Жильё',      icon: '🏠' },
  { id: 'finance',   label: 'Финансы',    icon: '🏦' },
  { id: 'digital',   label: 'Цифровые',   icon: '💻' },
  { id: 'business',  label: 'Бизнес',     icon: '💼' },
  { id: 'social',    label: 'Соцзащита',  icon: '👶' },
  { id: 'constitutional', label: 'Суды',  icon: '🏛️' },
];

function formatNewsDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7)  return `${diffDays} дней назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function LegalNewsScreen({ onBack }) {
  const [news, setNews]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const catRef = useRef(null);

  const fetchNews = async (cat = 'all') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/legal/news?category=${cat}&limit=50`);
      const d = await res.json();
      setNews(d.news || []);
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews('all'); }, []);

  const handleCat = (cat) => {
    setCategory(cat);
    setExpanded(null);
    fetchNews(cat);
    hapticFeedback('light');
  };

  const highPriority = news.filter(n => n.priority === 'high');

  return (
    <div className="min-h-screen bg-[#F4F2EF] pb-10">
      <StickyBack onClick={onBack} dark />
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-b-[36px]"
           style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}>
        {/* Orb decorations */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px]"
             style={{ background: 'rgba(99,102,241,0.35)' }} />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full blur-[60px]"
             style={{ background: 'rgba(168,85,247,0.25)' }} />

        <div className="relative px-5 pt-14 pb-6">
          <button onClick={onBack}
                  className="w-10 h-10 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-5 btn-press">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Live indicator */}
          <div className="flex items-center gap-2 mb-3">
            <div className="status-dot" />
            <span className="text-emerald-400 text-[12px] font-bold uppercase tracking-widest">
              Обновляется в реальном времени
            </span>
          </div>

          <h1 className="text-[28px] font-black text-white tracking-tight leading-tight mb-1">
            Изменения законов РК
          </h1>
          <p className="text-white/55 text-[14px]">
            Новые законы, поправки, решения судов
          </p>

          {/* Stat strip */}
          <div className="flex gap-4 mt-5 pt-4 border-t border-white/10">
            {[
              { val: news.length || '25+', label: 'Обновлений' },
              { val: highPriority.length || '8',  label: 'Важных' },
              { val: '2025',               label: 'Актуально' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-white font-black text-[20px] leading-none">{s.val}</div>
                <div className="text-white/45 text-[11px] font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div className="pb-5 px-5">
          <div ref={catRef}
               className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {NEWS_CATS.map(c => (
              <button key={c.id}
                onClick={() => handleCat(c.id)}
                className={`btn-press flex-shrink-0 flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-2xl transition-all ${
                  category === c.id
                    ? 'bg-white text-indigo-700 shadow-md'
                    : 'bg-white/12 text-white/75 border border-white/15'
                }`}>
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-3xl p-5 shadow-card">
                <div className="skeleton h-4 w-24 rounded-full mb-3" />
                <div className="skeleton h-5 w-full rounded-xl mb-2" />
                <div className="skeleton h-4 w-3/4 rounded-xl" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-stone-500 font-semibold">Нет новостей в этой категории</p>
          </div>
        ) : (
          <div className="space-y-3 stagger">
            {news.map((item) => {
              const isOpen   = expanded === item.id;
              const badgeCls = NEWS_BADGE_STYLES[item.badgeColor] || NEWS_BADGE_STYLES.blue;

              return (
                <button key={item.id}
                        onClick={() => { setExpanded(isOpen ? null : item.id); hapticFeedback('light'); }}
                        className={`btn-press w-full bg-white rounded-3xl p-5 text-left shadow-card border border-stone-100/80 transition-all overflow-hidden ${
                          item.priority === 'high' ? 'priority-high' : item.priority === 'medium' ? 'priority-medium' : 'priority-low'
                        }`}>

                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-xl ${badgeCls}`}>
                        {item.badge}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium self-center">
                        {formatNewsDate(item.date)}
                      </span>
                    </div>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      isOpen ? 'bg-indigo-600 rotate-180' : 'bg-stone-100'
                    }`}>
                      <ChevronDown className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-stone-400'}`} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-stone-900 text-[15px] leading-snug mb-2">
                    {item.title}
                  </h3>

                  {/* Summary always visible */}
                  <p className={`text-[13px] text-stone-600 leading-relaxed ${isOpen ? '' : 'line-clamp-2'}`}>
                    {item.summary}
                  </p>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-stone-100 animate-fade-in">
                      <p className="text-[13px] text-stone-700 leading-relaxed mb-4">
                        {item.details}
                      </p>

                      {/* Source */}
                      <div className="flex items-start gap-2 bg-indigo-50 rounded-2xl px-4 py-3 mb-3">
                        <BookOpen className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-indigo-700 mb-0.5">Источник</p>
                          <p className="text-[12px] text-indigo-600">{item.source}</p>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.tags?.map(tag => (
                          <span key={tag}
                                className="text-[11px] bg-stone-50 border border-stone-200 text-stone-500 px-2.5 py-1 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Adilet link */}
                      <div className="flex items-center gap-2 text-[12px] text-stone-400">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Проверить актуальность: <strong className="text-indigo-600">adilet.zan.kz</strong></span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 glass-card rounded-3xl p-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-[12px] text-stone-600 leading-relaxed">
              Информация носит справочный характер. Для точных данных проверяйте первоисточники на{' '}
              <strong className="text-indigo-600">adilet.zan.kz</strong> и{' '}
              <strong className="text-indigo-600">parlam.kz</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LEGAL BROWSER SCREEN — Search 400+ Kazakhstan legal norms
   ============================================================ */
function LegalBrowserScreen({ onBack }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [sources, setSources]   = useState([]);
  const [srcFilter, setSrcFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [expanded, setExpanded] = useState(null);
  const inputRef = useRef(null);
  const LIMIT = 12;

  // Load source list once
  useEffect(() => {
    fetch('/api/legal/search?sources=1')
      .then(r => r.json())
      .then(d => setSources(d.sources || []))
      .catch(() => {});
    // Show all on mount
    doSearch('', '', 1);
  }, []); // eslint-disable-line

  const doSearch = async (q, src, pg) => {
    setLoading(true);
    try {
      const res = await fetch('/api/legal/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, source: src || null, page: pg, limit: LIMIT }),
      });
      const d = await res.json();
      setResults(d.results || []);
      setTotal(d.total || 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (q = query, src = srcFilter, pg = 1) => {
    setPage(pg);
    setExpanded(null);
    doSearch(q, src, pg);
  };

  // Short source name for badge
  const shortSource = (s) => s
    .replace('Гражданский кодекс РК', 'ГК')
    .replace('Трудовой кодекс РК', 'ТК')
    .replace('Уголовный кодекс РК', 'УК')
    .replace('Налоговый кодекс РК', 'НК')
    .replace('Жилищный кодекс РК', 'ЖК')
    .replace('Земельный кодекс РК', 'ЗемК')
    .replace('Экологический кодекс РК', 'ЭкК')
    .replace('КоАП РК', 'КоАП')
    .replace('ГПК РК', 'ГПК')
    .replace('УПК РК', 'УПК')
    .replace('Кодекс О браке и семье РК', 'СемК')
    .replace('Конституция РК', 'Конст.')
    .replace(/Закон РК .+/, 'Закон')
    .slice(0, 20);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-[#F5F3F0] pb-10">
      <StickyBack onClick={onBack} dark />
      {/* Header */}
      <div className="relative bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 text-white px-5 pt-14 pb-8 rounded-b-[32px] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        </div>
        <button onClick={onBack}
                className="relative w-10 h-10 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-4">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="relative mb-5">
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mb-3 border border-white/20">
            <BookOpen className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-[24px] font-black tracking-tight mb-0.5">База законов РК</h2>
          <p className="text-white/65 text-[13px]">{total > 0 ? `${total} норм найдено` : '400+ норм из всех кодексов'}</p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(query); }}
            placeholder="Найти норму... (увольнение, алименты, ДТП...)"
            className="w-full bg-white/15 border border-white/25 rounded-2xl px-4 py-3 pr-12 text-white placeholder-white/50 text-[14px] outline-none focus:bg-white/20 focus:border-white/40 transition-all"
          />
          <button onClick={() => handleSearch(query)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Source filter */}
        {sources.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <button
              onClick={() => { setSrcFilter(''); handleSearch(query, '', 1); }}
              className={`flex-shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all ${
                !srcFilter ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600'
              }`}>
              Все
            </button>
            {sources.map(s => (
              <button key={s}
                onClick={() => { setSrcFilter(s); handleSearch(query, s, 1); }}
                className={`flex-shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  srcFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-stone-200 text-stone-600'
                }`}>
                {shortSource(s)}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 skeleton h-24" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-stone-500 font-medium">Ничего не найдено</p>
            <p className="text-stone-400 text-sm mt-1">Попробуйте другой запрос</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <button key={r.id}
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="btn-press w-full bg-white rounded-2xl p-4 text-left shadow-card border border-stone-100 transition-all">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                        {shortSource(r.source)}
                      </span>
                      <span className="text-[10px] text-stone-400">{r.articles}</span>
                      {r.score > 0 && (
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {Math.round(r.score * 10) / 10}★
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-stone-900 leading-snug">{r.topic}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-stone-400 flex-shrink-0 mt-1 transition-transform ${expanded === r.id ? 'rotate-180' : ''}`} />
                </div>

                {/* Keywords preview */}
                {!expanded || expanded !== r.id ? (
                  <p className="text-[12px] text-stone-500 leading-relaxed line-clamp-2">
                    {r.keywords?.split(' ').slice(0, 8).join(' · ')}
                  </p>
                ) : (
                  <div className="mt-2 pt-3 border-t border-stone-100">
                    <p className="text-[13px] text-stone-700 leading-relaxed">{r.content}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {r.keywords?.split(' ').filter(k => k.length > 2).map((k, i) => (
                        <span key={i} className="text-[11px] bg-stone-50 border border-stone-200 text-stone-500 px-2 py-0.5 rounded-full">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              disabled={page <= 1}
              onClick={() => handleSearch(query, srcFilter, page - 1)}
              className="flex items-center gap-1 text-[13px] font-semibold text-stone-600 disabled:opacity-30 bg-white rounded-xl px-3 py-2 shadow-card">
              <ChevronLeft className="w-4 h-4" /> Назад
            </button>
            <span className="text-[13px] text-stone-500">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => handleSearch(query, srcFilter, page + 1)}
              className="flex items-center gap-1 text-[13px] font-semibold text-stone-600 disabled:opacity-30 bg-white rounded-xl px-3 py-2 shadow-card">
              Вперёд <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-[11px] text-amber-800 leading-relaxed">
            📚 База включает нормы из Трудового, Гражданского, Налогового, Уголовного, Жилищного, Земельного кодексов, КоАП, ГПК, УПК и других законов РК. Актуальность проверяйте на <strong>adilet.zan.kz</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BOTTOM NAVIGATION
   ============================================================ */
function BottomNav({ screen, onChange }) {
  if (!['home', 'profile', 'legal-browser', 'legal-news'].includes(screen)) return null;
  const items = [
    { id: 'home',          icon: Home,    label: 'Главная' },
    { id: 'legal-browser', icon: BookOpen, label: 'Законы' },
    { id: 'legal-news',    icon: Zap,     label: 'Новости' },
    { id: 'profile',       icon: User,    label: 'Профиль' },
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
          onOpenLegalBrowser={() => setScreen('legal-browser')}
          onOpenLegalNews={() => setScreen('legal-news')}
          daysLeftInTrial={daysLeftInTrial}
        />
      )}
      {screen === 'legal-browser' && (
        <LegalBrowserScreen onBack={() => setScreen('home')} />
      )}
      {screen === 'legal-news' && (
        <LegalNewsScreen onBack={() => setScreen('home')} />
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
          templateId={generatedDoc._templateId}
          fields={generatedDoc._fields}
          initData={generatedDoc._initData}
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
