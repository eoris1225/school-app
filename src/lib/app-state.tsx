import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import { loadMySchool, saveMySchool, type MySchool } from '@/lib/my-school';
import { subjectGroup } from '@/lib/subject';

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
  showsTo,
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
  /** 내가 고른 학교와 반. 아직 안 골랐으면 null */
  school: MySchool | null;
  setSchool: (school: MySchool) => void;
  /** 저장해둔 학교를 읽어오는 중인지. 다 읽기 전엔 시작 화면을 보여주지 않아요. */
  schoolLoading: boolean;
  /** 내 역할에서 보이는 일정 (학생은 내 학년/반 일정만) */
  events: SchoolEvent[];
  addEvent: (event: Omit<SchoolEvent, 'id'>) => void;
  removeEvent: (id: string) => void;
  /** 이 일정을 내가 지울 수 있는지 */
  canDelete: (event: SchoolEvent) => boolean;
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

/**
 * 지금 시각이에요. 앱이 열려 있는 동안 1분마다 새로 봐요.
 * 쉬는 시간에 앱을 켜두면 다음 교시로 저절로 넘어가요.
 */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [themeKey, setThemeKey] = useState<ThemeKey>(DEFAULT_THEME);
  const [schemePref, setSchemePref] = useState<SchemePref>(DEFAULT_SCHEME_PREF);
  const [allEvents, setAllEvents] = useState<SchoolEvent[]>(INITIAL_EVENTS);
  const [allThreads, setAllThreads] = useState<Thread[]>(INITIAL_THREADS);
  const now = useNow();

  // 저장해둔 학교를 한 번 읽어와요. 읽는 동안엔 schoolLoading이 true예요.
  const [school, setSchoolState] = useState<MySchool | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    loadMySchool().then((saved) => {
      if (!alive) return;
      setSchoolState(saved);
      setSchoolLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setSchool = useCallback((next: MySchool) => {
    setSchoolState(next);
    void saveMySchool(next);
  }, []);

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

  /**
   * 누가 무엇을 지울 수 있는지 한 곳에서 정해요.
   *
   * 수행평가는 그 과목 선생님만 지울 수 있어요. 국어 선생님이 수학 수행평가를
   * 지우면 안 되니까요. 과목 이름이 '미적분Ⅰ' 처럼 와도 맞도록 교과군으로 봐요.
   *
   * NEIS에서 온 학사일정은 우리가 만든 게 아니라 아무도 못 지워요.
   * 선생님이 직접 올린 학사일정은 선생님이면 지울 수 있어요.
   */
  const canDelete = useCallback(
    (event: SchoolEvent) => {
      if (role !== 'teacher') return false;
      if (event.id.startsWith('neis:')) return false;
      if (event.kind !== 'assessment') return true;
      if (!event.subject) return false;
      const mine = new Set(TEACHER.subjects.map((s) => subjectGroup(s)));
      return mine.has(subjectGroup(event.subject));
    },
    [role],
  );

  const value = useMemo<AppContextValue>(() => {
    // 학생은 자기 학년·반 일정만 봐요. 선생님은 전부 봐요.
    const myGrade = school ? school.grade : Number(STUDENT.cls.split('-')[0]);
    const myClass = school ? school.cls : STUDENT.cls.split('-')[1];
    const events =
      role === 'teacher' ? allEvents : allEvents.filter((e) => showsTo(e, myGrade, myClass));
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
      school,
      setSchool,
      schoolLoading,
      events,
      addEvent,
      removeEvent,
      canDelete,
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
    school,
    setSchool,
    schoolLoading,
    allEvents,
    allThreads,
    addEvent,
    removeEvent,
    canDelete,
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
