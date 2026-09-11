import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import {
  buildPalette,
  DEFAULT_SCHEME_PREF,
  DEFAULT_THEME,
  THEMES,
  type Palette,
  type Scheme,
  type SchemePref,
  type ThemeKey,
} from '@/constants/themes';
import {
  classLabel,
  DEMO_NOW,
  INITIAL_EVENTS,
  INITIAL_THREADS,
  STUDENT,
  TEACHER,
  type Message,
  type Role,
  type SchoolEvent,
  type Subject,
  type Thread,
} from '@/data/mock';

type AppContextValue = {
  role: Role | null;
  setRole: (role: Role | null) => void;
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  /** 사용자가 고른 밝기 ('system'이면 폰 설정을 따라가요) */
  schemePref: SchemePref;
  setSchemePref: (pref: SchemePref) => void;
  /** 지금 실제로 적용된 밝기 */
  scheme: Scheme;
  palette: Palette;
  now: Date;
  /** 내 역할에서 보이는 일정 (학생은 내 학년/반 일정만) */
  events: SchoolEvent[];
  addEvent: (event: Omit<SchoolEvent, 'id'>) => void;
  removeEvent: (id: string) => void;
  /** 내 역할에서 보이는 쪽지 (학생은 내 질문, 선생님은 내 과목 쪽지) */
  threads: Thread[];
  askQuestion: (subject: Subject, text: string) => void;
  sendMessage: (threadId: string, text: string) => void;
  markRead: (threadId: string) => void;
  /** 탭 배지 숫자 (학생: 새 답변, 선생님: 답변 대기) */
  badgeCount: number;
};

const AppContext = createContext<AppContextValue | null>(null);

const readSystemScheme = (): Scheme => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');

export const isPending = (t: Thread) => t.messages[t.messages.length - 1]?.from === 'student';

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [themeKey, setThemeKey] = useState<ThemeKey>(DEFAULT_THEME);
  const [schemePref, setSchemePref] = useState<SchemePref>(DEFAULT_SCHEME_PREF);
  const [allEvents, setAllEvents] = useState<SchoolEvent[]>(INITIAL_EVENTS);
  const [allThreads, setAllThreads] = useState<Thread[]>(INITIAL_THREADS);
  const now = DEMO_NOW;

  const [systemScheme, setSystemScheme] = useState<Scheme>(readSystemScheme);
  // 웹으로 미리 만들어 둔 화면은 첫 그림이 밝은 화면으로 굳어 있어요.
  // 화면이 뜬 뒤 한 번 더 확인하고, 그 뒤로는 폰 설정이 바뀔 때마다 따라가요.
  useEffect(() => {
    setSystemScheme(readSystemScheme());
    const sub = Appearance.addChangeListener(() => setSystemScheme(readSystemScheme()));
    return () => sub.remove();
  }, []);
  const scheme: Scheme = schemePref === 'system' ? systemScheme : schemePref;

  const palette = useMemo(() => {
    const theme = THEMES.find((t) => t.key === themeKey) ?? THEMES[0];
    return buildPalette(theme.accent, scheme);
  }, [themeKey, scheme]);

  const addEvent = useCallback((event: Omit<SchoolEvent, 'id'>) => {
    setAllEvents((prev) => [...prev, { ...event, id: `e${Date.now()}` }]);
  }, []);

  const removeEvent = useCallback((id: string) => {
    setAllEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const askQuestion = useCallback((subject: Subject, text: string) => {
    const message: Message = { id: `m${Date.now()}`, from: 'student', author: STUDENT.name, text, time: '방금' };
    setAllThreads((prev) => [
      {
        id: `t${Date.now()}`,
        subject,
        student: { name: STUDENT.name, cls: STUDENT.cls },
        messages: [message],
        unreadStudent: false,
        unreadTeacher: true,
      },
      ...prev,
    ]);
  }, []);

  const sendMessage = useCallback(
    (threadId: string, text: string) => {
      if (!role) return;
      setAllThreads((prev) => {
        const thread = prev.find((t) => t.id === threadId);
        if (!thread) return prev;
        const message: Message = {
          id: `m${Date.now()}`,
          from: role,
          author: role === 'teacher' ? TEACHER.name : thread.student.name,
          text,
          time: '방금',
        };
        const updated: Thread = {
          ...thread,
          messages: [...thread.messages, message],
          unreadStudent: role === 'teacher' ? true : thread.unreadStudent,
          unreadTeacher: role === 'student' ? true : thread.unreadTeacher,
        };
        return [updated, ...prev.filter((t) => t.id !== threadId)];
      });
    },
    [role],
  );

  const markRead = useCallback(
    (threadId: string) => {
      if (!role) return;
      const key = role === 'student' ? 'unreadStudent' : 'unreadTeacher';
      setAllThreads((prev) => {
        const thread = prev.find((t) => t.id === threadId);
        if (!thread || !thread[key]) return prev;
        return prev.map((t) => (t.id === threadId ? { ...t, [key]: false } : t));
      });
    },
    [role],
  );

  const value = useMemo<AppContextValue>(() => {
    const studentTargets = ['전체', classLabel(STUDENT.cls).split(' ')[0], classLabel(STUDENT.cls)];
    const events =
      role === 'teacher' ? allEvents : allEvents.filter((e) => studentTargets.includes(e.target));
    const threads =
      role === 'teacher'
        ? allThreads.filter((t) => TEACHER.subjects.includes(t.subject))
        : allThreads.filter((t) => t.student.name === STUDENT.name);
    const badgeCount =
      role === 'teacher' ? threads.filter(isPending).length : threads.filter((t) => t.unreadStudent).length;
    return {
      role,
      setRole,
      themeKey,
      setThemeKey,
      schemePref,
      setSchemePref,
      scheme,
      palette,
      now,
      events,
      addEvent,
      removeEvent,
      threads,
      askQuestion,
      sendMessage,
      markRead,
      badgeCount,
    };
  }, [
    role,
    themeKey,
    schemePref,
    scheme,
    palette,
    now,
    allEvents,
    allThreads,
    addEvent,
    removeEvent,
    askQuestion,
    sendMessage,
    markRead,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp은 AppProvider 안에서만 쓸 수 있어요.');
  return ctx;
}
