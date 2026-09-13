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
import { toYmd } from '@/lib/time';
import { clearRemoteCache, primeRemote } from '@/lib/use-remote';
import type { TeachSettings } from '@/lib/teacher-week';
import { getMe } from '@/lib/api';
import { signOut as authSignOut, watchSession, type Me } from '@/lib/auth';
import {
  loadAccent,
  loadAllergies,
  loadSetupSeen,
  loadMyEvents,
  loadSchemePref,
  loadSwaps,
  newEventId,
  saveAccent,
  saveAllergies,
  saveMyEvents,
  saveSchemePref,
  saveSetupSeen,
  saveSwaps,
  slotKey,
  type Allergies,
  type MyEvent,
  type SubjectSwaps,
} from '@/lib/my-settings';
import {
  addAssessment,
  ApiError,
  askTeacher,
  demoteToStudent,
  editAssessment,
  getAssessments,
  getEvents,
  getThreads,
  saveMySettings,
  removeAssessment,
  removeThread,
  replyTo,
  saveSchoolToAccount,
  type Assessment,
  type Thread,
} from '@/lib/api';

import {
  buildPalette,
  DEFAULT_SCHEME_PREF,
  DEFAULT_THEME,
  readAccent,
  type Palette,
  type Scheme,
  type SchemePref,
} from '@/constants/themes';
import {
  showsTo,
  INITIAL_EVENTS,
  type Role,
  type SchoolEvent,
} from '@/data/mock';

type AppContextValue = {
  /** 로그인한 계정의 역할. 로그인 안 했으면 null이에요. */
  role: Role | null;
  /** 로그인한 계정. 로그인 안 했으면 null이에요. */
  me: Me | null;
  /** 가입하고 나서 처음 설정 안내를 봤는지. 건너뛰었어도 true예요. */
  setupSeen: boolean;
  /** 로그인 상태를 아직 확인하는 중인지 */
  authLoading: boolean;
  /** 서버에서 내 정보를 다시 읽어요. 선생님으로 올린 뒤에 불러요. */
  reloadMe: () => void;
  signOut: () => Promise<void>;
  /** 고른 테마 색. '#f97316' 처럼 색 그 자체예요. */
  accent: string;
  setAccent: (hex: string) => void;
  /** 사용자가 고른 밝기 ('system'이면 폰 설정을 따라가요) */
  schemePref: SchemePref;
  setSchemePref: (pref: SchemePref) => void;
  /** 지금 실제로 적용된 밝기 */
  scheme: Scheme;
  palette: Palette;
  /**
   * 밝기를 바꾸는 중이면 그 내용이 들어 있어요. 아니면 null이에요.
   * 화면 맨 위를 이 색으로 덮어서 색이 갈리는 순간을 가려요.
   * 실제로 덮고 걷는 건 _layout.tsx의 SchemeFade가 해요.
   */
  schemeSwap: { to: Scheme; color: string } | null;
  /** 다 덮였을 때 불러요. 그때 색을 갈아요. */
  commitScheme: () => void;
  /** 막을 다 걷었을 때 불러요. */
  endScheme: () => void;
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
  /** 교시 열쇠('월-6') 여럿을 한 번에 바꿔요. 빈 글자면 되돌려요. */
  setSwap: (slots: string[], to: string) => void;
  /** 내가 못 먹는 알레르기 번호들 */
  allergies: Allergies;
  setAllergies: (list: Allergies) => void;
  /** 나만 보는 일정 */
  myEvents: MyEvent[];
  addMyEvent: (date: string, title: string) => void;
  removeMyEvent: (id: string) => void;
  /** 이 일정을 내가 지울 수 있는지 */
  canDelete: (event: SchoolEvent) => boolean;
  /** 이미 올린 일정을 고쳐요. 잘 되면 null이에요. */
  updateEvent: (id: string, event: Omit<SchoolEvent, 'id'>) => Promise<string | null>;
  /** 내 역할에서 보이는 쪽지 (학생은 내 질문, 선생님은 내 과목 쪽지) */
  threads: Thread[];
  /** 쪽지 목록을 아직 받아오는 중인지 */
  threadsLoading: boolean;
  /** 서버에서 쪽지를 다시 읽어요. 보내거나 읽은 뒤에 불러요. */
  reloadThreads: () => void;
  /** 잘 되면 null, 안 되면 화면에 보여줄 문구를 돌려줘요. */
  /** 교과군 이름이에요. subject.ts 의 TEACHABLE 에서 골라요. */
  askQuestion: (subject: string, text: string, teacher?: string) => Promise<string | null>;
  /** 선생님을 다시 학생으로 되돌려요. 잘 되면 null이에요. */
  becomeStudent: () => Promise<string | null>;
  /**
   * 선생님 시간표 설정이에요.
   *   classes  내가 들어가는 반. 비어 있으면 전체예요.
   *   edits    칸을 직접 고친 것. 빈 글자는 "내 수업 아님" 이에요.
   */
  teach: TeachSettings;
  setTeachClasses: (classes: string[]) => void;
  /** 칸 하나를 고쳐요. to가 빈 글자면 "내 수업 아님", null이면 원래대로요. */
  setTeachEdit: (day: string, period: number, to: string | null) => void;
  sendMessage: (threadId: string, text: string, photo?: { uri: string }) => Promise<string | null>;
  /** 내가 보낸 질문을 거둬들여요. 잘 되면 null이에요. */
  dropThread: (threadId: string) => Promise<string | null>;
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
    detail: a.detail ?? undefined,
    grades: a.grades,
    classes: a.classes,
    by: a.by ?? undefined,
  };
}

/** 선생님 답변이 아직 없는 쪽지. 서버가 계산해서 보내줘요. */
export const isPending = (t: Thread) => t.pending;

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
  const [accent, setAccentState] = useState<string>(DEFAULT_THEME);
  const [schemePref, setSchemePrefState] = useState<SchemePref>(DEFAULT_SCHEME_PREF);
  const [allEvents, setAllEvents] = useState<SchoolEvent[]>(INITIAL_EVENTS);
  const [swaps, setSwapsState] = useState<SubjectSwaps>({});
  const [teach, setTeachState] = useState<TeachSettings>({ classes: [], edits: {} });
  const [allergies, setAllergiesState] = useState<Allergies>([]);
  const [myEvents, setMyEventsState] = useState<MyEvent[]>([]);
  // 달력을 다시 읽게 만드는 값이에요. 등록·삭제 뒤에 올려요.
  const [eventsNonce, setEventsNonce] = useState(0);
  // 받아온 쪽지와 "언제 것인지" 표예요. 아래에서 계산으로 꺼내 써요.
  const [fetchedThreads, setFetchedThreads] = useState<{ stamp: string; list: Thread[] } | null>(null);
  // 쪽지를 다시 읽게 만드는 값이에요. 보내거나 읽은 뒤에 올려요.
  const [threadsNonce, setThreadsNonce] = useState(0);
  const [setupSeen, setSetupSeen] = useState(true); // 읽기 전에는 안 띄워요
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

  /*
   * 이번 달 학사일정을 미리 받아둬요.
   *
   * 달력은 들어가야 받아오기 시작해요. 그래서 들어가면 잠깐 빈 달력이었다가
   * 일정이 뿅 하고 나타났어요. 학교가 정해진 순간 뒤에서 받아두면 들어갈 때
   * 이미 차 있어요. 못 받아도 그만이에요. 달력이 다시 물어봐요.
   *
   * 달력 화면과 똑같은 이름(key)으로 담아야 서로 알아봐요.
   */
  const monthStart = toYmd(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = toYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  useEffect(() => {
    if (!school) return;
    primeRemote(`schedule:${school.code}:${monthStart}`, () =>
      getEvents(monthStart, monthEnd, school),
    );
  }, [school, monthStart, monthEnd]);

  /*
   * 쪽지를 서버에서 받아와요.
   *
   * 누가 무엇을 볼 수 있는지는 서버가 정해요. 학생은 자기가 보낸 것,
   * 선생님은 우리 학교 + 내 담당 과목으로 온 것만 와요.
   * 로그인 안 했으면 아예 안 물어봐요.
   */
  const threadStamp = me ? `${me.id}#${threadsNonce}` : '';
  useEffect(() => {
    if (!threadStamp) return; // 로그인 안 했으면 물어보지 않아요
    let alive = true;
    getThreads()
      .then((list) => {
        if (alive) setFetchedThreads({ stamp: threadStamp, list });
      })
      .catch(() => {
        // 못 읽어도 앱은 돌아가야 해요. 쪽지함이 비어 보일 뿐이에요.
        if (alive) setFetchedThreads({ stamp: threadStamp, list: [] });
      });
    return () => {
      alive = false;
    };
  }, [threadStamp]);

  // 지금 것이 맞을 때만 써요. 로그아웃했거나 다시 읽는 중이면 비어 있어요.
  // useMemo로 감싸요. 매번 새 배열을 만들면 화면이 괜히 다시 그려져요.
  const fresh = fetchedThreads?.stamp === threadStamp ? fetchedThreads : null;
  const threads = useMemo(() => (threadStamp ? (fresh?.list ?? []) : []), [threadStamp, fresh]);
  const threadsLoading = !!threadStamp && fresh === null;

  /*
   * 이 기기에만 있는 설정을 읽어와요.
   *
   * 교시 바꾸기와 "안내 봤음"은 여기서 안 읽어요. 그 둘은 계정에도 있어서
   * 누가 이기는지 정해야 하거든요. 여기서 읽으면 로그인 확인과 경쟁이 붙어요.
   * 새 기기에서 로그인하면 이 effect가 빈 값을 먼저 읽고, 그 뒤에 계정에서
   * 내려온 값을 덮어쓰거나 반대로 덮여요. 어느 쪽이 이길지 모르는 거예요.
   * 그래서 그 둘은 로그인 확인이 끝난 뒤 한 곳에서만 정해요 (아래 pull).
   */
  useEffect(() => {
    let alive = true;
    Promise.all([loadAllergies(), loadMyEvents(), loadAccent(), loadSchemePref()]).then(
      ([a, e, color, pref]) => {
        if (!alive) return;
        setAllergiesState(a);
        setMyEventsState(e);
        // 예전에 '토마토' 같은 이름으로 저장해둔 것도 색으로 바꿔 읽어요.
        if (color) setAccentState(readAccent(color));
        // 앱을 켤 때는 덮지 않아요. 처음 그리는 화면이라 바뀌는 게 아니에요.
        if (pref === 'system' || pref === 'light' || pref === 'dark') setSchemePrefState(pref);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  /**
   * 어느 교시를 내가 듣는 과목으로 바꿀지 정해요.
   *
   * 열쇠는 "월-6" 처럼 요일과 교시예요. 한 번에 여러 교시를 넘길 수 있어요.
   * 빈 글자를 주면 그 교시의 바꾸기를 지워요.
   */
  const setSwap = useCallback(
    (slots: string[], to: string) => {
      setSwapsState((prev) => {
        const next = { ...prev };
        for (const slot of slots) {
          if (!to.trim()) delete next[slot];
          else next[slot] = to.trim();
        }
        void saveSwaps(next);
        // 계정에도 올려요. 폰을 바꿔도 따라오게요. 로그인 안 했으면 기기에만요.
        if (me) saveMySettings({ swaps: next }).catch(() => {});
        return next;
      });
    },
    [me],
  );

  /*
   * 선생님 시간표 설정이에요.
   *
   * 계정에만 담아요. 기기에는 안 둬요. 학생의 교시 바꾸기와 달리 이건
   * 로그인한 선생님만 쓰는 값이고, 로그인 전에는 만들 일이 아예 없어요.
   */
  const pushTeach = useCallback(
    (next: TeachSettings) => {
      setTeachState(next);
      if (me) saveMySettings({ teach: next }).catch(() => {});
    },
    [me],
  );

  const setTeachClasses = useCallback(
    (classes: string[]) => {
      pushTeach({ classes: [...new Set(classes)].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true })), edits: teach.edits });
    },
    [pushTeach, teach.edits],
  );

  const setTeachEdit = useCallback(
    (day: string, period: number, to: string | null) => {
      const edits = { ...teach.edits };
      // null은 "고친 걸 취소" 예요. 빈 글자는 "이 칸은 내 수업 아님" 이고요.
      if (to === null) delete edits[slotKey(day, period)];
      else edits[slotKey(day, period)] = to.trim();
      pushTeach({ classes: teach.classes, edits });
    },
    [pushTeach, teach.classes, teach.edits],
  );

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

  /*
   * 계정에 담긴 것을 기기로 내려요. 로그인할 때마다 한 번이에요.
   *
   * 이게 없으면 다른 기기에서 로그인했을 때 앱이 처음 쓰는 사람처럼 굴어요.
   * 학교도 반도 번호도 이미 적어뒀는데 또 물어봐요. 그 값들이 기기 저장소에만
   * 있었거든요.
   *
   * 방향이 한쪽만은 아니에요. 이 기능이 생기기 전에 기기에서 고쳐둔 게
   * 있을 수 있어요. 계정이 비어 있고 기기에 있으면 올려 보내요. 한 번만요.
   *
   * 교시 바꾸기와 "안내 봤음"은 여기서만 정해요. 기기 저장소를 읽는 다른
   * effect와 나눠 가지면 누가 나중에 끝나느냐에 따라 값이 달라져요.
   */
  /** 로그인 안 했을 때. 기기에 있는 것만 써요. */
  const pullLocal = useCallback(async () => {
    setSwapsState(await loadSwaps());
    setSetupSeen(await loadSetupSeen());
    setTeachState({ classes: [], edits: {} });
  }, []);

  const pull = useCallback(async (who: Me) => {
    if (who.school) {
      const fromAccount: MySchool = {
        office: who.school.office,
        code: who.school.code,
        name: who.school.name,
        officeName: who.school.officeName,
        grade: Number(who.cls?.split('-')[0] ?? 1),
        cls: who.cls?.split('-')[1] ?? '1',
        number: who.no ?? undefined,
      };
      // 이름까지 있을 때만 써요. 이름이 없으면 화면에 학교를 못 적어요.
      // (이 기능 전에 저장된 계정이 그래요. 다음에 학교를 고르면 채워져요.)
      if (fromAccount.name && who.cls) {
        setSchoolState((cur) => cur ?? fromAccount);
        const saved = await loadMySchool();
        if (!saved) void saveMySchool(fromAccount);
      }
    }

    const localSwaps = await loadSwaps();
    const hasAccount = Object.keys(who.swaps).length > 0;
    const hasLocal = Object.keys(localSwaps).length > 0;
    if (hasAccount) {
      setSwapsState(who.swaps);
      void saveSwaps(who.swaps);
    } else if (hasLocal) {
      // 기기에만 있던 걸 계정으로 올려요. 예전에 고쳐둔 것을 안 버리려고요.
      setSwapsState(localSwaps);
      saveMySettings({ swaps: localSwaps }).catch(() => {});
    } else {
      setSwapsState({});
    }

    setTeachState(who.teach);

    // 계정과 기기 중 한쪽이라도 봤으면 본 거예요. 다시 물어볼 이유가 없어요.
    const seen = who.setupSeen || (await loadSetupSeen());
    setSetupSeen(seen);
    if (seen && !who.setupSeen) saveMySettings({ setupSeen: true }).catch(() => {});
    if (seen) void saveSetupSeen();
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
        if (!alive) return;
        setMe(who);
        // 로그인했으면 계정 것을, 안 했으면 기기 것을 써요. 한 곳에서만 정해요.
        if (who) await pull(who);
        else await pullLocal();
      } catch {
        // 못 물어봐도 앱은 돌아가야 해요. 로그인 안 한 것으로 봐요.
        if (alive) {
          setMe(null);
          await pullLocal();
        }
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
  }, [meNonce, pull, pullLocal]);

  const reloadMe = useCallback(() => setMeNonce((n) => n + 1), []);

  /**
   * 선생님을 다시 학생으로 되돌려요.
   *
   * 담당 과목이 비워지고, 나를 콕 집어 보낸 쪽지는 지정이 풀려요. 안 풀면
   * 그 쪽지가 아무에게도 안 보여요. 규칙은 서버에 있어요.
   */
  const becomeStudent = useCallback(async (): Promise<string | null> => {
    try {
      const who = await demoteToStudent();
      setMe(who);
      // 쪽지함이 바뀌어요. 담아둔 것을 버리고 다시 읽어요.
      clearRemoteCache();
      setThreadsNonce((n) => n + 1);
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : '되돌리지 못했어요';
    }
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setMe(null);
    // 담아둔 것을 전부 버려요. 다른 사람으로 들어왔는데 앞사람 것이
    // 남아 있으면 안 돼요.
    clearRemoteCache();
  }, []);

  const setSchool = useCallback(
    (next: MySchool) => {
      setSchoolState(next);
      void saveMySchool(next);
      /*
       * 계정에도 같이 적어요.
       *
       * 기기에만 두면 쪽지가 누구에게 갈지 서버가 알 수 없어요. 선생님이
       * 설정에서 학교만 바꿔 남의 학교 질문을 읽는 것도 막아야 하고요.
       * 로그인 전에 고를 수도 있어서, 그때는 넘어가고 로그인 뒤에 적어요.
       */
      if (!me) return;
      saveSchoolToAccount({
        office: next.office,
        code: next.code,
        name: next.name,
        officeName: next.officeName,
        grade: next.grade,
        cls: next.cls,
        no: next.number,
      })
        .then(() => reloadMe())
        .catch(() => {
          // 못 적어도 앱은 돌아가요. 쪽지를 보낼 때 서버가 다시 알려줘요.
        });
    },
    [me, reloadMe],
  );

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

  const palette = useMemo(() => buildPalette(accent, scheme), [accent, scheme]);

  /*
   * 밝기를 바꿀 때 스르르 넘어가게 해요.
   *
   * 색을 갈아끼우면 화면이 한 프레임에 통째로 뒤집혀요. 어두운 데서 쓰다가
   * 밝게로 바꾸면 눈이 한 번 놀라요.
   *
   * 색을 천천히 바꾸는 건 방법이 없어요. 팔레트는 그냥 색 문자열이고, 화면
   * 수십 군데가 그걸 그대로 style에 넣어 쓰거든요. 전부 애니메이션 값으로
   * 바꾸는 건 앱을 다시 쓰는 일이에요.
   *
   * 그래서 바뀌는 순간만 가려요. 바뀔 색으로 칠한 막을 화면 위에 깔고
   *   1. 막을 덮어요      — 화면이 바뀔 색으로 잠기고
   *   2. 그 밑에서 색을 갈아요 — 보이지 않아요
   *   3. 막을 걷어요      — 새 화면이 떠올라요
   * 눈에는 한 번 저물고 다시 밝아지는 것처럼 보여요.
   *
   * 여기는 "무슨 색으로 덮을지"만 들고 있어요. 덮고 걷는 건 화면 쪽 일이라
   * _layout.tsx의 SchemeFade가 맡아요.
   */
  const [schemeSwap, setSchemeSwap] = useState<{ to: Scheme; color: string; pref: SchemePref } | null>(
    null,
  );

  const setSchemePref = useCallback(
    (pref: SchemePref) => {
      void saveSchemePref(pref);
      const next: Scheme = pref === 'system' ? readSystemScheme() : pref;
      // 실제로 보이는 밝기가 그대로면 덮을 이유가 없어요.
      // ('시스템'에서 '밝게'로 옮겼는데 폰도 밝은 화면이던 경우요.)
      if (next === scheme) {
        setSchemePrefState(pref);
        return;
      }
      setSchemeSwap({ to: next, color: buildPalette(accent, next).bg, pref });
    },
    [accent, scheme],
  );

  const commitScheme = useCallback(() => {
    if (schemeSwap) setSchemePrefState(schemeSwap.pref);
  }, [schemeSwap]);

  const endScheme = useCallback(() => setSchemeSwap(null), []);

  const setAccent = useCallback((hex: string) => {
    setAccentState(hex);
    void saveAccent(hex);
  }, []);

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
            detail: event.detail ?? null,
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

  /**
   * 이미 올린 일정을 고쳐요. 올린 사람만 돼요 (서버에서도 걸러요).
   * 새로 담는 게 아니라 그 줄을 고치는 거라, 학생 달력에서 사라졌다
   * 다시 생기지 않아요.
   */
  const updateEvent = useCallback(
    async (id: string, event: Omit<SchoolEvent, 'id'>): Promise<string | null> => {
      if (!school) return '학교를 먼저 골라주세요';
      if (role !== 'teacher') return '선생님만 고칠 수 있어요';
      try {
        const saved = await editAssessment(
          id,
          {
            date: event.date,
            title: event.title,
            subject: event.subject ?? null,
            detail: event.detail ?? null,
            grades: event.grades,
            classes: event.classes,
          },
          school,
        );
        setAllEvents((prev) => prev.map((e) => (e.id === id ? fromAssessment(saved) : e)));
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : '고치지 못했어요';
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

  const reloadThreads = useCallback(() => setThreadsNonce((n) => n + 1), []);

  const askQuestion = useCallback(
    async (subject: string, text: string, teacher?: string): Promise<string | null> => {
      if (!me) return '로그인이 필요해요';
      try {
        await askTeacher(subject, text, teacher);
        reloadThreads();
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : '보내지 못했어요';
      }
    },
    [me, reloadThreads],
  );

  const sendMessage = useCallback(
    async (threadId: string, text: string, photo?: { uri: string }): Promise<string | null> => {
      if (!me) return '로그인이 필요해요';
      try {
        await replyTo(threadId, text, photo);
        reloadThreads();
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : '보내지 못했어요';
      }
    },
    [me, reloadThreads],
  );

  const dropThread = useCallback(
    async (threadId: string): Promise<string | null> => {
      if (!me) return '로그인이 필요해요';
      try {
        await removeThread(threadId);
        reloadThreads();
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : '지우지 못했어요';
      }
    },
    [me, reloadThreads],
  );

  /**
   * 누가 무엇을 지울 수 있는지 한 곳에서 정해요.
   *
   * 올린 사람만 지울 수 있어요. 예전에는 "같은 과목 선생님이면"이었는데,
   * 그러면 수학 선생님 여섯 분이 서로의 수행평가를 지울 수 있어요. 실수로
   * 지우면 학생 달력에서 그냥 사라져요.
   *
   * NEIS에서 온 학사일정은 우리가 만든 게 아니라 아무도 못 지워요.
   */
  const canDelete = useCallback(
    (event: SchoolEvent) => {
      if (role !== 'teacher') return false;
      if (event.id.startsWith('neis:')) return false;
      // 주인을 아는 일정은 올린 사람만 지워요. 서버에서도 같은 규칙으로 막아요.
      // 여기서만 막으면 주소를 직접 부르는 건 못 막거든요.
      if (event.by) return event.by.id === me?.id;
      // 이 칸이 생기기 전에 올라간 일정이에요. 주인을 알 수가 없어요.
      // 아무도 못 지우게 두면 영영 남으니 선생님이면 지울 수 있게 둬요.
      return true;
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
    // 누가 무엇을 보는지는 서버가 이미 걸러줬어요. 여기서 또 거르지 않아요.
    // 두 군데에서 거르면 규칙이 어긋났을 때 알아채기 어려워요.
    const badgeCount =
      role === 'teacher' ? threads.filter(isPending).length : threads.filter((t) => t.unread).length;
    return {
      role,
      me,
      authLoading,
      setupSeen,
      reloadMe,
      signOut,
      accent,
      setAccent,
      schemePref,
      setSchemePref,
      scheme,
      schemeSwap,
      commitScheme,
      endScheme,
      palette,
      now,
      school,
      setSchool,
      schoolLoading,
      events,
      addEvent,
      removeEvent,
      updateEvent,
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
      threadsLoading,
      reloadThreads,
      askQuestion,
      becomeStudent,
      teach,
      setTeachClasses,
      setTeachEdit,
      sendMessage,
      dropThread,
      badgeCount,
    };
  }, [
    role,
    me,
    authLoading,
    setupSeen,
    reloadMe,
    signOut,
    accent,
    setAccent,
    schemePref,
    setSchemePref,
    scheme,
    schemeSwap,
    commitScheme,
    endScheme,
    palette,
    now,
    school,
    setSchool,
    schoolLoading,
    allEvents,
    threads,
    threadsLoading,
    reloadThreads,
    addEvent,
    removeEvent,
    updateEvent,
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
    becomeStudent,
    teach,
    setTeachClasses,
    setTeachEdit,
    sendMessage,
    dropThread,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp은 AppProvider 안에서만 쓸 수 있어요.');
  return ctx;
}
