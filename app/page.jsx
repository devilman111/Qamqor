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
import { initTelegram, getInitData, getTelegramUser, hapticFeedback, closeApp } from '../lib/telegram';

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
async function callAI(agentId, history, userMessage) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, history, message: userMessage })
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.reply;
  } catch (error) {
    return 'Извините, не удалось получить ответ. Проверьте интернет и попробуйте ещё раз.';
  }
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
    return data.verified ? data.user : null;
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
    <div className="min-h-screen flex flex-col bg-stone-50">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${current.gradient} flex items-center justify-center mb-8 shadow-xl`}>
          <Icon className="w-16 h-16 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-stone-900 mb-2 tracking-tight">{current.title}</h1>
        <p className="text-lg text-stone-600 mb-6">{current.subtitle}</p>
        <p className="text-stone-500 max-w-sm leading-relaxed">{current.description}</p>
      </div>
      <div className="px-6 pb-10">
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-8 bg-stone-900' : 'w-1.5 bg-stone-300'}`} />
          ))}
        </div>
        <button
          onClick={() => {
            hapticFeedback('light');
            if (slide < slides.length - 1) setSlide(slide + 1);
            else onComplete();
          }}
          className="w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold"
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
    <div className="min-h-screen flex flex-col bg-stone-50">
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 mx-auto shadow-lg">
          <Sparkles className="w-8 h-8 text-white" strokeWidth={2} />
        </div>
        <h2 className="text-3xl font-bold text-center text-stone-900 mb-2">Добро пожаловать!</h2>
        <p className="text-stone-500 text-center mb-10">Войдите через Telegram — это безопасно и быстро</p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 flex gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleTelegramAuth}
          disabled={authenticating}
          className="w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
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
    <div className="bg-white rounded-2xl p-4 border border-stone-100">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <span className="text-xs font-medium text-stone-400">{sublabel}</span>
      </div>
      <div className="text-2xl font-bold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500 mt-1">{label}</div>
    </div>
  );
}

function HomeScreen({ user, streak, healthScore, financeScore, onSelectAgent, onOpenCheckin, onOpenProfile, onOpenSubscription, daysLeftInTrial }) {
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white px-6 pt-8 pb-8 rounded-b-3xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-stone-400 text-sm">{greeting},</p>
            <h1 className="text-2xl font-bold mt-1">{user.name}</h1>
          </div>
          <button onClick={() => { hapticFeedback('light'); onOpenProfile(); }} className="w-11 h-11 bg-stone-700 rounded-full flex items-center justify-center">
            <span className="font-semibold">{user.name[0]?.toUpperCase()}</span>
          </button>
        </div>
        {user.subscription === 'trial' && (
          <button onClick={() => { hapticFeedback('light'); onOpenSubscription(); }} className="w-full bg-amber-500/20 border border-amber-400/30 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-300" />
              <span className="text-sm text-amber-100">Пробный период · осталось {daysLeftInTrial} дн.</span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-300" />
          </button>
        )}
      </div>

      <div className="px-4 -mt-4 mb-4">
        <button onClick={() => { hapticFeedback('light'); onOpenCheckin(); }} className="w-full bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-stone-900">{streak} дней подряд</div>
            <div className="text-xs text-stone-500">Сделать ежедневный чек-ин</div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400" />
        </button>
      </div>

      <div className="px-4 mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Здоровье" value={`${healthScore}/100`} icon={Heart} color="bg-gradient-to-br from-rose-400 to-red-500" sublabel="неделя" />
        <StatCard label="Финансы" value={`${financeScore}/100`} icon={TrendingUp} color="bg-gradient-to-br from-emerald-400 to-teal-500" sublabel="неделя" />
      </div>

      <div className="px-4">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3 px-2">Ваши помощники</h2>
        <div className="space-y-3">
          {Object.values(AGENTS).map(agent => {
            const Icon = ICONS[agent.iconName];
            return (
              <button key={agent.id} onClick={() => { hapticFeedback('medium'); onSelectAgent(agent.id); }} className="w-full bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-4 text-left">
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

      <div className="px-4 mt-6">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Совет дня</span>
          </div>
          <h3 className="font-semibold text-stone-900 mb-2">Депозит или ОФЗ?</h3>
          <p className="text-sm text-stone-600 leading-relaxed">Депозиты в РК застрахованы на сумму до 20 млн ₸ Казахстанским фондом гарантирования депозитов.</p>
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
          <div className="text-center py-8">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-stone-900 mb-1">Здравствуйте! Я {agent.name}</h3>
            <p className="text-sm text-stone-500 max-w-xs mx-auto">{agent.description}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-stone-900 text-white rounded-br-md' : 'bg-white text-stone-900 border border-stone-100 rounded-bl-md'}`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
              <div className="text-[10px] mt-1 text-stone-400">{formatTime(msg.time)}</div>
            </div>
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

function ProfileScreen({ user, onBack, onLogout, onOpenSubscription, daysLeftInTrial, totalChats, totalCheckins }) {
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
        <button onClick={onLogout} className="w-full bg-white border border-rose-200 text-rose-600 py-3.5 rounded-2xl font-medium text-sm flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>
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

    const aiResponse = await callAI(currentAgentId, allMessages[currentAgentId], text);
    const newAiMsg = { role: 'assistant', content: aiResponse, time: new Date().toISOString() };
    const final = { ...updated, [currentAgentId]: [...updated[currentAgentId], newAiMsg] };
    setAllMessages(final);
    saveData('messages', final);
    setLoading(false);
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
    }
    setShowCheckin(false);
  };

  const handleSubscribe = () => {
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
          onSelectAgent={(id) => { setCurrentAgentId(id); setScreen('chat'); }}
          onOpenCheckin={() => setShowCheckin(true)}
          onOpenProfile={() => setScreen('profile')}
          onOpenSubscription={() => setScreen('subscription')}
          daysLeftInTrial={daysLeftInTrial} />
      )}
      {screen === 'chat' && currentAgentId && (
        <AgentChat agent={AGENTS[currentAgentId]} messages={allMessages[currentAgentId]}
          onSend={handleSendMessage} onBack={() => setScreen('home')} loading={loading} />
      )}
      {screen === 'profile' && (
        <ProfileScreen user={user} onBack={() => setScreen('home')} onLogout={handleLogout}
          onOpenSubscription={() => setScreen('subscription')}
          daysLeftInTrial={daysLeftInTrial} totalChats={totalChats} totalCheckins={totalCheckins} />
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
