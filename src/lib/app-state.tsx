import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';

import { loadMySchool, saveMySchool, type MySchool } from '@/lib/my-school';
import { subjectGroup } from '@/lib/subject';
import { getMe } from '@/lib/api';
import { signOut as authSignOut, watchSession, type Me } from '@/lib/auth';
import {
  loadAllergies,
  loadMyEvents,
  loadSwaps,
  newEventId,
  saveAllergies,
  saveMyEvents,
  saveSwaps,
  type Allergies,
  type MyEvent,
  type SubjectSwaps,
} from '@/lib/my-settings';
import { addAssessment, ApiError, getAssessments, removeAssessment, type Assessment } from '@/lib/api';

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
  type Message,
  type Role,
  type SchoolEvent,
  type Subject,
  type Thread,
} from '@/data/mock';

type AppContextValue = {
  /** 로그인한 계정의 역할. 로그인 안 했으면 null이에요. */
  role: Role | null;
  /** 로그인한 계정. 로그인 안 했으면 null이에요. */
  me: Me | null;
  /** 로그인 상태를 아직 확인하는 중인지 */
  authLoading: boolean;
  /** 서버에서 내 정보를 다시 읽어요. 선생님으로 올린 뒤에 불러요. */
  reloadMe: () => void;
  signOut: () => Promise<void>;
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
  /** 수행평가를 서버에 등록해요. 실패하면 왜 안 됐는지 문구를 돌려줘요. */
  addEvent: (event: Omit<SchoolEvent, 'id'>) => Promise<string | null>;
  /** 수행평가를 서버에서 지워요. 실패하면 왜 안 됐는지 문구를 돌려줘요. */
  removeEvent: (id: string) => Promise<string | null>;
  /** 서버에 담긴 수행평가를 다시 읽어요. */
  reloadEvents: () => void;

  /** NEIS 시간표 과목 -> 내가 실제로 듣는 과목 */
  swaps: SubjectSwaps;
  setSwap: (from: string, to: string) => void;
  /** 내가 못 먹는 알레르기 번호들 */
  allergies: Allergies;
  setAllergies: (list: Allergies) => void;
  /** 나만 보는 일정 */
  myEvents: MyEvent[];
  addMyEvent: (date: string, title: string) => void;
  removeMyEvent: (id: string) => void;
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

/** 서버가 준 수행평가를 화면이 쓰는 모양으로 바꿔요. */
function fromAssessment(a: Assessment): SchoolEvent {
  return {
    id: a.id,
    date: a.date,
    title: a.title,
    kind: 'assessment',
    subject: (a.subject ?? undefined) as SchoolEvent['subject'],
    grades: a.grades,
    classes: a.classes,
  };
}

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
  // 로그인 상태. 역할은 계정에 붙어 있어서 앱에서 마음대로 바꿀 수 없어요.
  const [me, setMe] = useState<Me | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [meNonce, setMeNonce] = useState(0);
  const role: Role | null = me?.role ?? null;
  const [themeKey, setThemeKey] = useState<ThemeKey>(DEFAULT_THEME);
  const [schemePref, setSchemePref] = useState<SchemePref>(DEFAULT_SCHEME_PREF);
  const [allEvents, setAllEvents] = useState<SchoolEvent[]>(INITIAL_EVENTS);
  const [swaps, setSwapsState] = useState<SubjectSwaps>({});
  const [allergies, setAllergiesState] = useState<Allergies>([]);
  const [myEvents, setMyEventsState] = useState<MyEvent[]>([]);
  // 달력을 다시 읽게 만드는 값이에요. 등록·삭제 뒤에 올려요.
  const [eventsNonce, setEventsNonce] = useState(0);
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

  const reloadEvents = useCallback(() => setEventsNonce((n) => n + 1), []);

  // 학교가 정해지면 그 학교 수행평가를 받아와요. 등록·삭제 뒤에도 다시 읽어요.
  // 한 해치를 한 번에 받아둬요. 달을 넘길 때마다 부르면 느려요.
  const year = now.getFullYear();
  useEffect(() => {
    if (!school) return;
    let alive = true;
    getAssessments(`${year}-01-01`, `${year}-12-31`, school)
      .then((list) => {
        if (alive) setAllEvents(list.map(fromAssessment));
      })
      .catch(() => {
        // 못 읽어도 앱은 돌아가야 해요. 달력이 비어 보일 뿐이에요.
        if (alive) setAllEvents([]);
      });
    return () => {
      alive = false;
    };
  }, [school, year, eventsNonce]);

  // 나만의 설정을 한 번에 읽어와요.
  useEffect(() => {
    let alive = true;
    Promise.all([loadSwaps(), loadAllergies(), loadMyEvents()]).then(([s, a, e]) => {
      if (!alive) return;
      setSwapsState(s);
      setAllergiesState(a);
      setMyEventsState(e);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** 바꿀 과목을 정해요. 원래 이름과 같게 하면 바꾸기를 지워요. */
  const setSwap = useCallback((from: string, to: string) => {
    setSwapsState((prev) => {
      const next = { ...prev };
      if (!to || to === from) delete next[from];
      else next[from] = to;
      void saveSwaps(next);
      return next;
    });
  }, []);

  const setAllergies = useCallback((list: Allergies) => {
    const sorted = [...new Set(list)].sort((a, b) => a - b);
    setAllergiesState(sorted);
    void saveAllergies(sorted);
  }, []);

  const addMyEvent = useCallback((date: string, title: string) => {
    setMyEventsState((prev) => {
      const next = [...prev, { id: newEventId(), date, title: title.trim() }];
      void saveMyEvents(next);
      return next;
    });
  }, []);

  const removeMyEvent = useCallback((id: string) => {
    setMyEventsState((prev) => {
      const next = prev.filter((e) => e.id !== id);
      void saveMyEvents(next);
      return next;
    });
  }, []);

  /**
   * 로그인 상태를 따라가요.
   *
   * 로그인하면 서버에 "나 누구야?" 하고 물어봐요. 역할은 서버가 알려주는
   * 것만 믿어요. 앱이 "나 선생님이야" 라고 정할 수 있으면 의미가 없어요.
   */
  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      try {
        const who = await getMe();
        if (alive) setMe(who);
      } catch {
        // 못 물어봐도 앱은 돌아가야 해요. 로그인 안 한 것으로 봐요.
        if (alive) setMe(null);
      } finally {
        if (alive) setAuthLoading(false);
      }
    };

    void refresh();
    // 로그인하거나 로그아웃하면 다시 물어봐요.
    // 물어보는 동안 authLoading을 다시 켜요. 안 그러면 로그인 직후
    // "아직 로그인 안 함"으로 잠깐 보여서 시작 화면으로 되돌아가요.
    const stop = watchSession(() => {
      setAuthLoading(true);
      void refresh();
    });
    return () => {
      alive = false;
      stop();
    };
  }, [meNonce]);

  const reloadMe = useCallback(() => setMeNonce((n) => n + 1), []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setMe(null);
  }, []);

  const setSchool = useCallback((next: MySchool) => {
    setSchoolState(next);
    void saveMySchool(next);
  }, []);

  /*
   * 폰 설정의 밝기예요. 이건 React 밖에 있는 값이라 useSyncExternalStore로 읽어요.
   *
   * 웹으로 미리 만들어 둔 화면은 첫 그림이 밝은 화면으로 굳어 있어요. 그래서
   * 세 번째 인자로 '미리 만들 때는 밝게'를 따로 알려줘요. 화면이 뜨면 React가
   * 진짜 값과 견줘보고 다르면 알아서 다시 그려요.
   */
  const systemScheme = useSyncExternalStore(
    (onChange) => {
      const sub = Appearance.addChangeListener(onChange);
      return () => sub.remove();
    },
    readSystemScheme,
    () => 'light' as Scheme,
  );
  const scheme: Scheme = schemePref === 'system' ? systemScheme : schemePref;

  const palette = useMemo(() => {
    const theme = THEMES.find((t) => t.key === themeKey) ?? THEMES[0];
    return buildPalette(theme.accent, scheme);
  }, [themeKey, scheme]);

  /**
   * 수행평가를 서버에 등록해요.
   *
   * 예전에는 앱 안에만 담았어요. 그러면 등록한 선생님 기기에만 남고 학생은
   * 못 봐요. 이제 서버에 담아서 같은 학교 사람 모두가 봐요.
   *
   * 잘 되면 null, 안 되면 화면에 보여줄 문구를 돌려줘요.
   */
  const addEvent = useCallback(
    async (event: Omit<SchoolEvent, 'id'>): Promise<string | null> => {
      if (!school) return '학교를 먼저 골라주세요';
      if (role !== 'teacher') return '선생님만 등록할 수 있어요';
      try {
        const saved = await addAssessment(
          {
            date: event.date,
            title: event.title,
            subject: event.subject ?? null,
            grades: event.grades,
            classes: event.classes,
          },
          school,
        );
        // 서버가 준 id로 바로 화면에 올려요. 다시 받아오지 않아도 돼요.
        setAllEvents((prev) => [...prev, fromAssessment(saved)]);
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : '등록하지 못했어요';
      }
    },
    [school, role],
  );

  const removeEvent = useCallback(
    async (id: string): Promise<string | null> => {
      if (!school) return '학교를 먼저 골라주세요';
      if (role !== 'teacher') return '선생님만 지울 수 있어요';
      try {
        await removeAssessment(id, school);
        setAllEvents((prev) => prev.filter((e) => e.id !== id));
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : '지우지 못했어요';
      }
    },
    [school, role],
  );

  const askQuestion = useCallback(
    (subject: Subject, text: string) => {
      if (!me || !school) return;
      const message: Message = { id: `m${Date.now()}`, from: 'student', author: me.name, text, time: '방금' };
      setAllThreads((prev) => [
        {
          id: `t${Date.now()}`,
          subject,
          student: { name: me.name, cls: `${school.grade}-${school.cls}` },
          messages: [message],
          unreadStudent: false,
          unreadTeacher: true,
        },
        ...prev,
      ]);
    },
    [me, school],
  );

  const sendMessage = useCallback(
    (threadId: string, text: string) => {
      if (!role || !me) return;
      setAllThreads((prev) => {
        const thread = prev.find((t) => t.id === threadId);
        if (!thread) return prev;
        const message: Message = {
          id: `m${Date.now()}`,
          from: role,
          author: role === 'teacher' ? (me?.name ?? '') : thread.student.name,
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
    [role, me],
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
      const mine = new Set((me?.subjects ?? []).map((s) => subjectGroup(s)));
      return mine.has(subjectGroup(event.subject));
    },
    [role, me],
  );

  const value = useMemo<AppContextValue>(() => {
    // 학생은 자기 학년·반 일정만 봐요. 선생님은 전부 봐요.
    // 학교를 아직 안 골랐으면 맞는 게 하나도 없어요. 그게 맞아요.
    const myGrade = school?.grade ?? 0;
    const myClass = school?.cls ?? '';
    const events =
      role === 'teacher' ? allEvents : allEvents.filter((e) => showsTo(e, myGrade, myClass));
    // 선생님은 담당 과목으로 온 쪽지만, 학생은 자기가 보낸 쪽지만 봐요.
    const mySubjects = me?.subjects ?? [];
    const threads =
      role === 'teacher'
        ? allThreads.filter((t) => mySubjects.includes(t.subject))
        : allThreads.filter((t) => !!me && t.student.name === me.name);
    const badgeCount =
      role === 'teacher' ? threads.filter(isPending).length : threads.filter((t) => t.unreadStudent).length;
    return {
      role,
      me,
      authLoading,
      reloadMe,
      signOut,
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
      reloadEvents,
      swaps,
      setSwap,
      allergies,
      setAllergies,
      myEvents,
      addMyEvent,
      removeMyEvent,
      canDelete,
      threads,
      askQuestion,
      sendMessage,
      markRead,
      badgeCount,
    };
  }, [
    role,
    me,
    authLoading,
    reloadMe,
    signOut,
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
    reloadEvents,
    swaps,
    setSwap,
    allergies,
    setAllergies,
    myEvents,
    addMyEvent,
    removeMyEvent,
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
