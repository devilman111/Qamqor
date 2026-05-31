'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Home, User, Settings, FileText, Send, Heart, Scale,
  TrendingUp, ChevronRight, ArrowLeft, Bell, Plus, Lock,
  Sparkles, Flame, CheckCircle, AlertCircle, LogOut,
  Stethoscope, Wallet, Crown, Shield, Moon, Droplet,
  Loader2, Paperclip, X, ChevronLeft
} from 'lucide-react';

import { AGENTS } from '../lib/agents';
import { initTelegram, getInitData, getTelegramUser, getTelegramWebApp, hapticFeedback, closeApp } from '../lib/telegram';

// Иконки маппинг (т.к. конфиг отдельно)
const ICONS = { Stethoscope, Scale, Wallet };

// ============================================================
// СТОРАДЖ (localStorage обёртка с try/catch)
// ============================================================
function saveData(key, value) {
  try {
    localStorage.setItem(`qamqor_${key}`, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {}
}

function loadData(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(`qamqor_${key}`);
    if (value === null) return defaultValue;
    try { return JSON.parse(value); } catch { return value; }
  } catch {
    return defaultValue;
  }
}

// ============================================================
// API ВЫЗОВЫ
// ============================================================
async function callAI(agentId, userMessage) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, message: userMessage, initData: getInitData() })
    });
    if (res.status === 401) {
      return { reply: 'Сессия истекла. Перезапустите приложение через Telegram.', sources: [] };
    }
    if (res.status === 429) {
      const data = await res.json();
      return { reply: `⏱ ${data.message || 'Слишком много запросов. Попробуйте позже.'}`, sources: [] };
    }
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return { reply: data.reply, sources: data.sources || [] };
  } catch {
    return { reply: 'Извините, не удалось получить ответ. Проверьте интернет и попробуйте ещё раз.', sources: [] };
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
    const data = await res.json();
    return data.history || [];
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
    const data = await res.json();
    if (data.verified) {
      // Регистрируем пользователя в БД для push-уведомлений (best effort)
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      }).catch(() => {});
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// ЭКРАН ОНБОРДИНГА
// ============================================================
function OnboardingScreen({ onComplete }) {
  const [slide, setSlide] = useState(0);
  const slides = [
    { icon: Sparkles, title: 'Qamqor', subtitle: 'Ваш персональный помощник', description: 'Три AI-ассистента по здоровью, праву и финансам', gradient: 'from-indigo-500 via-purple-500 to-pink-500' },
    { icon: Stethoscope, title: 'Здоровье', subtitle: 'Аружан — медассистент', description: 'Расшифровка анализов, советы по сну, питанию', gradient: 'from-rose-400 to-red-500' },
    { icon: Scale, title: 'Законы РК', subtitle: 'Дамир — правовой помощник', description: 'Справки по кодексам РК, проверка договоров', gradient: 'from-blue-500 to-violet-600' },
    { icon: Wallet, title: 'Финансы', subtitle: 'Ержан — финансовый помощник', description: 'Бюджет в тенге, налоги ИП, депозиты', gradient: 'from-emerald-400 to-cyan-600' }
  ];
  const current = slides[slide];
  const Icon = current.icon;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 mesh-bg">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className={`relative w-32 h-32 rounded-3xl bg-gradient-to-br ${current.gradient} flex items-center justify-center mb-8 shadow-2xl animate-scale-in`} key={slide}>
          <div className={`absolute inset-0 bg-gradient-to-br ${current.gradient} rounded-3xl blur-2xl opacity-50 -z-10`}></div>
          <Icon className="w-16 h-16 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-stone-900 mb-2 tracking-tight animate-fade-in" key={`title-${slide}`}>{current.title}</h1>
        <p className="text-lg text-stone-600 mb-6 animate-fade-in">{current.subtitle}</p>
        <p className="text-stone-500 max-w-sm leading-relaxed animate-fade-in">{current.description}</p>
      </div>
      <div className="px-6 pb-10">
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? 'w-8 bg-stone-900' : 'w-1.5 bg-stone-300'}`} />
          ))}
        </div>
        <button
          onClick={() => {
            hapticFeedback('light');
            if (slide < slides.length - 1) setSlide(slide + 1);
            else onComplete();
          }}
          className="btn-press w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold shadow-lg shadow-stone-900/20"
        >
          {slide < slides.length - 1 ? 'Далее' : 'Начать'}
        </button>
        {slide < slides.length - 1 && (
          <button onClick={onComplete} className="w-full mt-3 text-stone-500 py-2 text-sm">Пропустить</button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ЭКРАН АВТОРИЗАЦИИ (через Telegram)
// ============================================================
function AuthScreen({ onAuthSuccess, onSkip }) {
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState(null);

  const handleTelegramAuth = async () => {
    setAuthenticating(true);
    setError(null);
    const user = await verifyTelegramAuth();
    if (user) {
      onAuthSuccess({
        name: `${user.firstName} ${user.lastName}`.trim(),
        telegramId: user.id,
        username: user.username,
        joinedAt: new Date().toISOString(),
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        subscription: 'trial'
      });
    } else {
      setError('Не удалось авторизоваться через Telegram. Запустите приложение из чата с ботом.');
      setAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 mesh-bg">
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mb-6 mx-auto shadow-2xl shadow-purple-500/30 animate-scale-in">
          <Sparkles className="w-10 h-10 text-white" strokeWidth={2} />
        </div>
        <h2 className="text-3xl font-bold text-center text-stone-900 mb-2 tracking-tight">Добро пожаловать!</h2>
        <p className="text-stone-500 text-center mb-10">Войдите через Telegram — быстро и безопасно</p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 flex gap-2 animate-slide-up">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleTelegramAuth}
          disabled={authenticating}
          className="btn-press w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20"
        >
          {authenticating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Проверка...</>
          ) : (
            'Войти через Telegram'
          )}
        </button>

        <p className="text-xs text-stone-400 text-center mt-4 leading-relaxed">
          Используя Qamqor, вы соглашаетесь, что AI-агенты не заменяют профессионалов и не несут ответственности за решения, принятые на основе их ответов.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// ОСНОВНЫЕ ЭКРАНЫ
// ============================================================
function StatCard({ label, value, icon: Icon, color, sublabel }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <span className="text-xs font-medium text-stone-400">{sublabel}</span>
      </div>
      <div className="text-2xl font-bold text-stone-900 tracking-tight">{value}</div>
      <div className="text-xs text-stone-500 mt-1">{label}</div>
    </div>
  );
}

function HomeScreen({ user, streak, healthScore, financeScore, onSelectAgent, onOpenCheckin, onOpenProfile, onOpenSubscription, onOpenDocuments, daysLeftInTrial }) {
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="min-h-screen bg-stone-50 pb-24 mesh-bg">
      <div className="relative bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white px-6 pt-8 pb-8 rounded-b-3xl overflow-hidden">
        {/* Декоративные блёстки */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative flex justify-between items-start mb-6 animate-fade-in">
          <div>
            <p className="text-stone-400 text-sm">{greeting},</p>
            <h1 className="text-2xl font-bold mt-1 tracking-tight">{user.name}</h1>
          </div>
          <button onClick={() => { hapticFeedback('light'); onOpenProfile(); }} className="btn-press w-11 h-11 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center">
            <span className="font-semibold">{user.name[0]?.toUpperCase()}</span>
          </button>
        </div>
        {user.subscription === 'trial' && (
          <button onClick={() => { hapticFeedback('light'); onOpenSubscription(); }} className="btn-press relative w-full bg-amber-500/20 border border-amber-400/30 rounded-2xl px-4 py-3 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-300" />
              <span className="text-sm text-amber-100">Пробный период · осталось {daysLeftInTrial} дн.</span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-300" />
          </button>
        )}
      </div>

      <div className="px-4 -mt-4 mb-4">
        <button onClick={() => { hapticFeedback('light'); onOpenCheckin(); }} className="btn-press w-full bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-4 text-left shadow-sm animate-slide-up">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center animate-flame">
            <Flame className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-stone-900">{streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд</div>
            <div className="text-xs text-stone-500">Сделать ежедневный чек-ин</div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400" />
        </button>
      </div>

      <div className="px-4 mb-6 grid grid-cols-2 gap-3 stagger">
        <StatCard label="Здоровье" value={`${healthScore}/100`} icon={Heart} color="bg-gradient-to-br from-rose-400 to-red-500" sublabel="неделя" />
        <StatCard label="Финансы" value={`${financeScore}/100`} icon={TrendingUp} color="bg-gradient-to-br from-emerald-400 to-teal-500" sublabel="неделя" />
      </div>

      <div className="px-4">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3 px-2">Ваши помощники</h2>
        <div className="space-y-3 stagger">
          {Object.values(AGENTS).map(agent => {
            const Icon = ICONS[agent.iconName];
            return (
              <button key={agent.id} onClick={() => { hapticFeedback('medium'); onSelectAgent(agent.id); }} className="btn-press w-full bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-4 text-left shadow-sm">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <Icon className="w-7 h-7 text-white" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-semibold text-stone-900">{agent.name}</div>
                    <div className="text-xs text-stone-400">·</div>
                    <div className="text-xs text-stone-500">{agent.role}</div>
                  </div>
                  <div className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{agent.description}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 mt-6 animate-slide-up">
        <button
          onClick={() => { hapticFeedback('medium'); onOpenDocuments(); }}
          className="btn-press w-full bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-4 text-left shadow-sm"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-md flex-shrink-0">
            <FileText className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-stone-900 mb-1">Создать документ</div>
            <div className="text-xs text-stone-500 leading-relaxed">Договоры, заявления, расписки, доверенности</div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-300 flex-shrink-0" />
        </button>
      </div>

      <div className="px-4 mt-4 animate-slide-up">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/90">Совет дня</span>
            </div>
            <h3 className="font-bold text-white mb-2 text-lg">Депозиты застрахованы</h3>
            <p className="text-sm text-white/90 leading-relaxed">Депозиты в банках РК защищены КФГД на сумму до 20 млн ₸. Спросите Ержана о выгодных вкладах.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckInModal({ onClose, onSubmit }) {
  const [sleep, setSleep] = useState(7);
  const [water, setWater] = useState(5);
  const [mood, setMood] = useState(3);

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-end justify-center z-50">
      <div className="bg-stone-50 w-full max-w-md rounded-t-3xl p-6 pb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-stone-900">Чек-ин дня</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
            <X className="w-4 h-4 text-stone-600" />
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-3">
              <Moon className="w-4 h-4" /> Сколько спали? {sleep} часов
            </label>
            <input type="range" min="0" max="12" value={sleep} onChange={(e) => setSleep(parseInt(e.target.value))} className="w-full accent-indigo-600" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-3">
              <Droplet className="w-4 h-4" /> Стаканов воды: {water}
            </label>
            <input type="range" min="0" max="12" value={water} onChange={(e) => setWater(parseInt(e.target.value))} className="w-full accent-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700 mb-3 block">Как настроение?</label>
            <div className="flex justify-between gap-2">
              {['😞', '😐', '🙂', '😊', '🤩'].map((emoji, i) => (
                <button key={i} onClick={() => setMood(i + 1)} className={`flex-1 aspect-square rounded-2xl text-2xl flex items-center justify-center ${mood === i + 1 ? 'bg-stone-900 scale-105' : 'bg-white border border-stone-200'}`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => { hapticFeedback('success'); onSubmit({ sleep, water, mood, date: new Date().toISOString() }); }} className="w-full mt-6 bg-stone-900 text-white py-4 rounded-2xl font-semibold">
          Сохранить · +1 день
        </button>
      </div>
    </div>
  );
}

function AgentChat({ agent, messages, onSend, onBack, loading }) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const Icon = ICONS[agent.iconName];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = (text) => {
    const messageText = text || input;
    if (!messageText.trim() && !attachedFile) return;
    const fullText = attachedFile ? `[Прикреплён файл: ${attachedFile}]\n\n${messageText}` : messageText;
    hapticFeedback('light');
    onSend(fullText);
    setInput('');
    setAttachedFile(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <div className={`bg-gradient-to-br ${agent.gradient} text-white px-4 pt-8 pb-4 rounded-b-3xl`}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">{agent.name}</h2>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{agent.role}</span>
            </div>
            <div className="text-xs text-white/80">{agent.title}</div>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        </div>
      </div>
      <div className="px-4 mt-3">
        <div className={`${agent.softBg} border ${agent.softBorder} rounded-xl p-3 flex gap-2`}>
          <Shield className={`w-4 h-4 ${agent.textColor} flex-shrink-0 mt-0.5`} />
          <p className={`text-xs ${agent.textColor} leading-relaxed`}>{agent.disclaimer}</p>
        </div>
      </div>
      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-8 animate-scale-in">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center mx-auto mb-4 shadow-xl`}>
              <Icon className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-stone-900 mb-1 text-lg">Здравствуйте! Я {agent.name}</h3>
            <p className="text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">{agent.description}</p>
            <p className="text-xs text-stone-400 mt-3">Выберите вопрос ниже или задайте свой ↓</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-stone-900 text-white rounded-br-md' : 'bg-white text-stone-900 border border-stone-100 rounded-bl-md'}`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
              <div className="text-[10px] mt-1 text-stone-400">{formatTime(msg.time)}</div>
            </div>
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <div className="max-w-[85%] mt-2 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 px-1">📚 Источники</div>
                {msg.sources.map((src, idx) => (
                  <div key={idx} className={`${agent.softBg} border ${agent.softBorder} rounded-xl px-3 py-2`}>
                    <div className={`text-xs font-semibold ${agent.textColor}`}>{src.source}, {src.articles}</div>
                    <div className="text-[11px] text-stone-600 mt-0.5">{src.topic}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
              <span className="text-xs text-stone-500">{agent.name} печатает...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {messages.length === 0 && (
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {agent.suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSend(s)} className="flex-shrink-0 bg-white border border-stone-200 rounded-full px-4 py-2 text-xs text-stone-700">{s}</button>
            ))}
          </div>
        </div>
      )}
      {attachedFile && (
        <div className="px-4 pb-2">
          <div className="bg-stone-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-stone-500" />
            <span className="text-xs text-stone-700 flex-1 truncate">{attachedFile}</span>
            <button onClick={() => setAttachedFile(null)}><X className="w-4 h-4 text-stone-400" /></button>
          </div>
        </div>
      )}
      <div className="px-4 pb-6 pt-2 bg-stone-50">
        <div className="bg-white rounded-2xl border border-stone-200 p-2 flex items-end gap-2">
          <button onClick={() => {
            const filename = agent.id === 'doctor' ? 'analysis.pdf' : agent.id === 'lawyer' ? 'contract.pdf' : 'salary.pdf';
            setAttachedFile(filename);
          }} className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
            <Paperclip className="w-4 h-4 text-stone-600" />
          </button>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Напишите сообщение..." rows={1} className="flex-1 resize-none outline-none text-sm py-2 px-1 max-h-32 text-stone-900" />
          <button onClick={() => handleSend()} disabled={(!input.trim() && !attachedFile) || loading} className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center flex-shrink-0 disabled:opacity-30`}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({ user, onBack, onLogout, onOpenSubscription, daysLeftInTrial, totalChats, totalCheckins, onDeleteAccount }) {
  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="bg-gradient-to-br from-stone-900 to-stone-700 text-white px-4 pt-8 pb-12 rounded-b-3xl">
        <button onClick={onBack} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <span className="text-3xl font-bold">{user.name[0]?.toUpperCase()}</span>
          </div>
          <h2 className="text-xl font-bold">{user.name}</h2>
          {user.username && <p className="text-stone-400 text-sm mt-1">@{user.username}</p>}
        </div>
      </div>
      <div className="px-4 -mt-6">
        <button onClick={onOpenSubscription} className="w-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 text-white rounded-2xl p-5 mb-4 shadow-md text-left">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">{user.subscription === 'premium' ? 'Premium активен' : 'Пробный период'}</span>
          </div>
          {user.subscription === 'trial' && (
            <p className="text-sm text-white/90 mb-3">Осталось {daysLeftInTrial} дн. бесплатного доступа</p>
          )}
          <div className="bg-white/20 rounded-xl px-3 py-2 text-xs font-medium text-center">
            {user.subscription === 'premium' ? 'Управление подпиской →' : 'Активировать подписку →'}
          </div>
        </button>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-2xl p-3 text-center border border-stone-100">
            <div className="text-2xl font-bold text-stone-900">{totalChats}</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-1">Диалогов</div>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center border border-stone-100">
            <div className="text-2xl font-bold text-stone-900">{totalCheckins}</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-1">Чек-инов</div>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center border border-stone-100">
            <div className="text-2xl font-bold text-stone-900">3</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-1">Агентов</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden mb-4">
          {[
            { icon: FileText, label: 'Мои документы' },
            { icon: Bell, label: 'Уведомления' },
            { icon: Lock, label: 'Конфиденциальность' },
            { icon: Settings, label: 'Настройки' }
          ].map((item, i) => {
            const ItemIcon = item.icon;
            return (
              <button key={i} className="w-full px-4 py-4 flex items-center gap-3 border-b border-stone-100 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">
                  <ItemIcon className="w-4 h-4 text-stone-600" />
                </div>
                <span className="flex-1 text-left text-sm text-stone-900">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-stone-300" />
              </button>
            );
          })}
        </div>
        <button onClick={onLogout} className="w-full bg-white border border-stone-200 text-stone-700 py-3.5 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 mb-3">
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>
        <button
          onClick={() => {
            if (confirm('Удалить ВСЕ ваши данные? История чатов, профиль, чек-ины — всё будет безвозвратно стёрто.')) {
              onDeleteAccount();
            }
          }}
          className="w-full bg-white border border-rose-200 text-rose-600 py-3.5 rounded-2xl font-medium text-sm flex items-center justify-center gap-2"
        >
          🗑 Удалить все мои данные
        </button>
        <p className="text-[10px] text-stone-400 text-center mt-3 leading-relaxed">
          В соответствии с правом на забвение мы безвозвратно удалим: профиль, историю чатов со всеми агентами, чек-ины и статистику. Это действие нельзя отменить.
        </p>
      </div>
    </div>
  );
}

function SubscriptionScreen({ onBack, onSubscribe, daysLeftInTrial }) {
  const [plan, setPlan] = useState('monthly');
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white px-4 pt-8 pb-10 rounded-b-3xl">
        <button onClick={onBack} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mb-4">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Crown className="w-12 h-12 mb-3" strokeWidth={1.5} />
        <h2 className="text-2xl font-bold mb-2">Qamqor Premium</h2>
        <p className="text-white/80">Безлимитный доступ ко всем агентам</p>
      </div>
      <div className="px-4 -mt-4 pb-8">
        <div className="space-y-2 mb-6">
          <button onClick={() => setPlan('monthly')} className={`w-full bg-white rounded-2xl p-4 border-2 text-left ${plan === 'monthly' ? 'border-stone-900' : 'border-stone-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-stone-900">Месячная</div>
                <div className="text-xs text-stone-500 mt-1">Отменить можно в любой момент</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-stone-900">$1</div>
                <div className="text-xs text-stone-500">/мес</div>
              </div>
            </div>
          </button>
          <button onClick={() => setPlan('yearly')} className={`w-full bg-white rounded-2xl p-4 border-2 text-left relative ${plan === 'yearly' ? 'border-stone-900' : 'border-stone-200'}`}>
            <span className="absolute -top-2 right-3 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">−33%</span>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-stone-900">Годовая</div>
                <div className="text-xs text-stone-500 mt-1">$8 / год · экономия $4</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-stone-900">$0.67</div>
                <div className="text-xs text-stone-500">/мес</div>
              </div>
            </div>
          </button>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-100 mb-6">
          <h3 className="font-semibold text-stone-900 mb-3">Что входит:</h3>
          <div className="space-y-2.5">
            {['Безлимитный чат со всеми тремя AI-агентами', 'Загрузка документов и анализов', 'История чек-инов и аналитика', 'Ежедневные напоминания и советы', 'Приоритетная поддержка'].map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-stone-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => { hapticFeedback('success'); onSubscribe(); }} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold">
          Активировать за {plan === 'monthly' ? '$1/мес' : '$8/год'}
        </button>
        <p className="text-xs text-stone-400 text-center mt-3">
          Для оплаты подключите Telegram Stars или Kaspi Pay.
        </p>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-stone-50 pb-8">
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white px-4 pt-8 pb-8 rounded-b-3xl">
        <button onClick={onBack} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mb-4">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <FileText className="w-10 h-10 mb-3" strokeWidth={1.5} />
        <h2 className="text-2xl font-bold mb-1 tracking-tight">Документы</h2>
        <p className="text-white/80 text-sm">Готовые шаблоны договоров, заявлений и расписок</p>
      </div>

      <div className="px-4 -mt-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            Шаблоны — образцы. Для важных сделок проконсультируйтесь с юристом.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
          </div>
        ) : Object.entries(grouped).map(([catId, items]) => {
          const cat = data.categories[catId];
          if (!cat || items.length === 0) return null;
          return (
            <div key={catId} className="mb-5">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2 px-2">
                {cat.icon} {cat.label}
              </h3>
              <div className="space-y-2">
                {items.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { hapticFeedback('light'); onSelectTemplate(t); }}
                    className="btn-press w-full bg-white rounded-2xl p-4 border border-stone-100 text-left shadow-sm"
                  >
                    <div className="font-semibold text-stone-900 mb-1">{t.title}</div>
                    <div className="text-xs text-stone-500 leading-relaxed">{t.description}</div>
                    <div className="text-[10px] text-stone-400 mt-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {t.fields.length} {t.fields.length === 1 ? 'поле' : t.fields.length < 5 ? 'поля' : 'полей'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
        body: JSON.stringify({
          templateId: template.id,
          fields: values,
          initData: getInitData()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Ошибка генерации');
        setGenerating(false);
        return;
      }
      onGenerated(data);
    } catch (e) {
      setError('Не удалось сгенерировать документ');
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-8">
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white px-4 pt-8 pb-6 rounded-b-3xl">
        <button onClick={onBack} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mb-4">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-1 tracking-tight">{template.title}</h2>
        <p className="text-white/70 text-xs leading-relaxed">{template.description}</p>
      </div>

      <div className="px-4 -mt-2">
        {template.legalNotes && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 mt-4">
            <p className="text-xs text-blue-900 leading-relaxed">
              <strong>📖 Правовая основа:</strong> {template.legalNotes}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-stone-100 mb-4 mt-2">
          <div className="space-y-3">
            {template.fields.map(field => (
              <div key={field.name}>
                <label className="text-xs font-medium text-stone-700 mb-1 block">
                  {field.label}
                  {field.required && <span className="text-rose-500 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={values[field.name] || ''}
                    onChange={(e) => setValues({...values, [field.name]: e.target.value})}
                    placeholder={field.placeholder || ''}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:border-stone-900 focus:outline-none resize-none"
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={values[field.name] || ''}
                    onChange={(e) => setValues({...values, [field.name]: e.target.value})}
                    placeholder={field.placeholder || ''}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:border-stone-900 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={generating}
          className="btn-press w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
        >
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

function DocumentResultScreen({ document, onBack, onNew }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      // navigator.clipboard может не работать в Telegram WebView на старых девайсах
      const textarea = window.document.createElement('textarea');
      textarea.value = document.document;
      window.document.body.appendChild(textarea);
      textarea.select();
      window.document.execCommand('copy');
      window.document.body.removeChild(textarea);
      setCopied(true);
      hapticFeedback('success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      navigator.clipboard?.writeText(document.document);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const tg = getTelegramWebApp?.();
    if (tg?.openLink) {
      const text = encodeURIComponent(document.document.substring(0, 200) + '...');
      tg.openLink(`https://t.me/share/url?text=${text}`);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-8">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white px-4 pt-8 pb-6 rounded-b-3xl">
        <button onClick={onBack} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mb-4">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <CheckCircle className="w-10 h-10 mb-3" strokeWidth={1.5} />
        <h2 className="text-xl font-bold mb-1 tracking-tight">{document.title}</h2>
        <p className="text-white/80 text-xs">Документ готов</p>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
          <pre className="text-xs text-stone-800 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
{document.document}
          </pre>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong>⚠️ Важно:</strong> Перед использованием внимательно проверьте все данные. При необходимости — заверьте у нотариуса. По сложным сделкам — проконсультируйтесь с юристом.
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className="btn-press w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            {copied ? <><CheckCircle className="w-5 h-5" /> Скопировано!</> : <>📋 Скопировать текст</>}
          </button>
          <button
            onClick={onNew}
            className="btn-press w-full bg-white border border-stone-200 text-stone-700 py-3 rounded-2xl font-medium text-sm"
          >
            Создать другой документ
          </button>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ screen, onChange }) {
  if (!['home', 'profile'].includes(screen)) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-100 px-6 py-3 flex justify-around max-w-md mx-auto">
      <button onClick={() => onChange('home')} className={`flex flex-col items-center gap-1 px-4 py-1 ${screen === 'home' ? 'text-stone-900' : 'text-stone-400'}`}>
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-medium">Главная</span>
      </button>
      <button onClick={() => onChange('profile')} className={`flex flex-col items-center gap-1 px-4 py-1 ${screen === 'profile' ? 'text-stone-900' : 'text-stone-400'}`}>
        <User className="w-5 h-5" />
        <span className="text-[10px] font-medium">Профиль</span>
      </button>
    </div>
  );
}

// ============================================================
// ГЛАВНОЕ ПРИЛОЖЕНИЕ
// ============================================================
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

  // Инициализация Telegram и загрузка данных
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
      // Проверим, есть ли уже Telegram-данные
      const tgUser = getTelegramUser();
      if (tgUser) {
        // Можем сразу авторизовать
        setScreen('auth');
      } else {
        setScreen('onboarding');
      }
    }
  }, []);

  const daysLeftInTrial = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / (24 * 60 * 60 * 1000)))
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
    localStorage.clear();
    setScreen('onboarding');
  };

  const handleSendMessage = async (text) => {
    const newUserMsg = { role: 'user', content: text, time: new Date().toISOString() };
    const updated = { ...allMessages, [currentAgentId]: [...allMessages[currentAgentId], newUserMsg] };
    setAllMessages(updated);
    setLoading(true);

    const { reply, sources } = await callAI(currentAgentId, text);
    const newAiMsg = {
      role: 'assistant',
      content: reply,
      time: new Date().toISOString(),
      sources: sources && sources.length > 0 ? sources : undefined
    };
    const final = { ...updated, [currentAgentId]: [...updated[currentAgentId], newAiMsg] };
    setAllMessages(final);
    setLoading(false);
  };

  const handleSelectAgent = async (id) => {
    trackAnalytics('agent_open', { agent: id });
    setCurrentAgentId(id);
    setScreen('chat');
    // Загружаем зашифрованную историю с сервера
    const history = await fetchHistory(id);
    setAllMessages(prev => ({ ...prev, [id]: history }));
  };

  const handleClearHistory = async () => {
    if (!currentAgentId) return;
    await clearHistory(currentAgentId);
    setAllMessages(prev => ({ ...prev, [currentAgentId]: [] }));
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

  const handleCheckin = (data) => {
    const today = new Date().toDateString();
    const isNewDay = !lastCheckin || new Date(lastCheckin.date).toDateString() !== today;
    if (isNewDay) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setLastCheckin(data);
      setTotalCheckins(prev => prev + 1);
      const newHealthScore = Math.round(Math.min(100, (data.sleep / 8) * 50 + (data.water / 8) * 30 + (data.mood / 5) * 20));
      setHealthScore(newHealthScore);
      saveData('streak', newStreak);
      saveData('lastCheckin', data);
      saveData('healthScore', newHealthScore);
      saveData('totalCheckins', totalCheckins + 1);
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

  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (screen === 'onboarding') return <OnboardingScreen onComplete={() => setScreen('auth')} />;
  if (screen === 'auth') return <AuthScreen onAuthSuccess={handleLogin} />;

  return (
    <div className="max-w-md mx-auto bg-stone-50 min-h-screen relative">
      {screen === 'home' && (
        <HomeScreen user={user} streak={streak} healthScore={healthScore} financeScore={financeScore}
          onSelectAgent={handleSelectAgent}
          onOpenCheckin={() => setShowCheckin(true)}
          onOpenProfile={() => setScreen('profile')}
          onOpenSubscription={() => setScreen('subscription')}
          onOpenDocuments={() => setScreen('documents-list')}
          daysLeftInTrial={daysLeftInTrial} />
      )}

      {screen === 'documents-list' && (
        <DocumentsListScreen
          onBack={() => setScreen('home')}
          onSelectTemplate={(t) => { setDocTemplate(t); setScreen('documents-form'); }}
        />
      )}

      {screen === 'documents-form' && docTemplate && (
        <DocumentFormScreen
          template={docTemplate}
          onBack={() => setScreen('documents-list')}
          onGenerated={(doc) => { setGeneratedDoc(doc); setScreen('documents-result'); }}
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
        <AgentChat agent={AGENTS[currentAgentId]} messages={allMessages[currentAgentId]}
          onSend={handleSendMessage} onBack={() => setScreen('home')} loading={loading} />
      )}
      {screen === 'profile' && (
        <ProfileScreen user={user} onBack={() => setScreen('home')} onLogout={handleLogout}
          onOpenSubscription={() => setScreen('subscription')}
          daysLeftInTrial={daysLeftInTrial} totalChats={totalChats} totalCheckins={totalCheckins}
          onDeleteAccount={handleDeleteAccount} />
      )}
      {screen === 'subscription' && (
        <SubscriptionScreen onBack={() => setScreen(user.subscription === 'trial' ? 'home' : 'profile')}
          onSubscribe={handleSubscribe} daysLeftInTrial={daysLeftInTrial} />
      )}
      {showCheckin && <CheckInModal onClose={() => setShowCheckin(false)} onSubmit={handleCheckin} />}
      <BottomNav screen={screen} onChange={setScreen} />
    </div>
  );
}
