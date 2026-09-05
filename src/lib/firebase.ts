/* Firestore 한줄평 저장소입니다.
   설정값은 빌드 시 NEXT_PUBLIC_FIREBASE_* 환경변수로 주입됩니다.
   Firebase 웹 설정값은 비밀키가 아니라 프로젝트 식별자이며, 배포된 JS 에 그대로 들어가는 것이
   정상적인 사용법입니다. 실제 접근 제어는 firestore.rules 가 담당합니다. */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Firestore,
  type Timestamp
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

/* 설정이 없으면 Firestore 를 쓰지 않고, 화면은 linktree.ts 의 예시 한줄평으로 대체됩니다. */
export const isGuestbookEnabled = Boolean(config.apiKey && config.projectId);

export const GUESTBOOK_LIMITS = { author: 20, text: 100 } as const;

export type RemoteEntry = {
  id: string;
  author: string;
  text: string;
  date: string;
  uid?: string;
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

function getDb() {
  if (!isGuestbookEnabled) return null;
  if (!db) {
    app = getApps()[0] ?? initializeApp(config as Record<string, string>);
    db = getFirestore(app);
  }
  return db;
}

/* ---------------------------------------------------------------
   구글 로그인입니다.
   한줄평과 사진첩은 로그인한 사람만 남길 수 있고,
   자기가 올린 것만 지울 수 있습니다(규칙은 firestore.rules 에 있습니다).
   --------------------------------------------------------------- */
export const isAuthEnabled = isGuestbookEnabled;

export type SiteUser = {
  uid: string;
  name: string;
  photo: string | null;
};

let auth: Auth | null = null;

function getAuthInstance() {
  if (!isAuthEnabled) return null;
  if (!auth) {
    app = getApps()[0] ?? initializeApp(config as Record<string, string>);
    auth = getAuth(app);
  }
  return auth;
}

/* 로그인 상태가 바뀔 때마다 알려 줍니다. 정리 함수를 돌려줍니다. */
export function subscribeUser(onChange: (user: SiteUser | null) => void) {
  const instance = getAuthInstance();
  if (!instance) return () => {};

  return onAuthStateChanged(instance, current => {
    onChange(
      current
        ? {
            uid: current.uid,
            name: current.displayName?.trim() || "이름 없는 방문자",
            photo: current.photoURL
          }
        : null
    );
  });
}

export async function signInWithGoogle() {
  const instance = getAuthInstance();
  if (!instance) throw new Error("로그인 기능이 설정되지 않았습니다.");
  await signInWithPopup(instance, new GoogleAuthProvider());
}

export async function signOutUser() {
  const instance = getAuthInstance();
  if (instance) await signOut(instance);
}

function requireUser() {
  const current = getAuthInstance()?.currentUser;
  if (!current) throw new Error("구글 로그인 후에 남길 수 있어요.");
  return current;
}

function formatDate(value: unknown) {
  const date = value && typeof (value as Timestamp).toDate === "function"
    ? (value as Timestamp).toDate()
    : new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

/* ---------------------------------------------------------------
   미니홈피 왼쪽 위 TODAY / TOTAL 방문 수입니다.
   counters/site 문서 하나에 total, today, day 를 담아 둡니다.
   --------------------------------------------------------------- */

/* 한줄평과 같은 Firebase 설정을 씁니다. */
export const isCounterEnabled = isGuestbookEnabled;

export type VisitCounts = { total: number; today: number };

/* 하루 경계를 방문자 시간대가 아니라 한국 시간으로 맞춥니다. 2026-08-14 형태입니다. */
function seoulDay() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

/* 방문 한 번을 기록하고 갱신된 값을 돌려줍니다.
   읽기와 쓰기를 한 트랜잭션으로 처리해서 동시에 들어와도 숫자가 어긋나지 않습니다. */
export async function recordVisit(): Promise<VisitCounts> {
  const store = getDb();
  if (!store) throw new Error("방문 수 기능이 설정되지 않았습니다.");

  const ref = doc(store, "counters", "site");
  const day = seoulDay();

  return runTransaction(store, async transaction => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      const first = { total: 1, today: 1, day };
      transaction.set(ref, first);
      return { total: first.total, today: first.today };
    }

    const data = snapshot.data();
    const total = Number(data.total ?? 0) + 1;
    /* 날짜가 바뀐 뒤 첫 방문이면 오늘 수를 다시 1부터 셉니다. */
    const today = data.day === day ? Number(data.today ?? 0) + 1 : 1;

    transaction.update(ref, { total, today, day });
    return { total, today };
  });
}

/* 한줄평을 실시간으로 구독합니다. 정리 함수를 돌려줍니다. */
export function subscribeGuestbook(
  count: number,
  onData: (entries: RemoteEntry[]) => void,
  onError: (error: Error) => void
) {
  const store = getDb();
  if (!store) return () => {};

  const q = query(collection(store, "guestbook"), orderBy("createdAt", "desc"), fsLimit(count));
  return onSnapshot(
    q,
    snapshot => {
      onData(
        snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            author: String(data.author ?? ""),
            text: String(data.text ?? ""),
            date: formatDate(data.createdAt),
            uid: data.uid ? String(data.uid) : undefined
          };
        })
      );
    },
    error => onError(error as Error)
  );
}

export async function addGuestbookEntry(text: string) {
  const store = getDb();
  if (!store) throw new Error("한줄평 기능이 설정되지 않았습니다.");

  const current = requireUser();
  const author = (current.displayName?.trim() || "이름 없는 방문자").slice(0, GUESTBOOK_LIMITS.author);
  const trimmedText = text.trim();

  if (!trimmedText) throw new Error("한줄평을 적어 주세요.");
  if (trimmedText.length > GUESTBOOK_LIMITS.text) throw new Error(`한줄평은 ${GUESTBOOK_LIMITS.text}자까지 쓸 수 있어요.`);

  /* approved 는 지금은 항상 true 입니다. 나중에 승인제로 바꾸려면
     이 값을 false 로 두고 firestore.rules 의 read 조건만 바꾸면 됩니다. */
  await addDoc(collection(store, "guestbook"), {
    author,
    text: trimmedText,
    approved: true,
    uid: current.uid,
    createdAt: serverTimestamp()
  });
}

/* 자기가 남긴 한줄평만 지울 수 있습니다. */
export async function deleteGuestbookEntry(id: string) {
  const store = getDb();
  if (!store) throw new Error("한줄평 기능이 설정되지 않았습니다.");
  requireUser();
  await deleteDoc(doc(store, "guestbook", id));
}

/* ---------------------------------------------------------------
   사진첩입니다. Firebase Storage 는 유료(Blaze) 요금제가 필요해서,
   사진을 브라우저에서 줄인 뒤 문서 안에 data URL 로 담아 Firestore 에 저장합니다.
   문서 하나가 1MB 를 넘을 수 없으므로 업로드 전에 반드시 줄여야 합니다.
   --------------------------------------------------------------- */
export const PHOTO_LIMITS = { name: 40, chars: 900_000, maxSide: 1000 } as const;

export type RemotePhoto = {
  id: string;
  name: string;
  src: string;
  author: string;
  date: string;
  uid?: string;
};

export function subscribePhotos(
  count: number,
  onData: (photos: RemotePhoto[]) => void,
  onError: (error: Error) => void
) {
  const store = getDb();
  if (!store) return () => {};

  const q = query(collection(store, "photos"), orderBy("createdAt", "desc"), fsLimit(count));
  return onSnapshot(
    q,
    snapshot => {
      onData(
        snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: String(data.name ?? ""),
            src: String(data.data ?? ""),
            author: String(data.author ?? ""),
            date: formatDate(data.createdAt),
            uid: data.uid ? String(data.uid) : undefined
          };
        })
      );
    },
    error => onError(error as Error)
  );
}

export async function addPhoto(name: string, dataUrl: string) {
  const store = getDb();
  if (!store) throw new Error("사진첩 기능이 설정되지 않았습니다.");

  const current = requireUser();
  const trimmedName = name.trim().slice(0, PHOTO_LIMITS.name);

  if (!dataUrl.startsWith("data:image/")) throw new Error("이미지 파일만 올릴 수 있어요.");
  if (dataUrl.length > PHOTO_LIMITS.chars) throw new Error("사진 용량이 너무 커요. 더 작은 사진으로 올려 주세요.");

  await addDoc(collection(store, "photos"), {
    name: trimmedName,
    data: dataUrl,
    author: (current.displayName?.trim() || "이름 없는 방문자").slice(0, GUESTBOOK_LIMITS.author),
    approved: true,
    uid: current.uid,
    createdAt: serverTimestamp()
  });
}

/* 자기가 올린 사진만 지울 수 있습니다. */
export async function deletePhoto(id: string) {
  const store = getDb();
  if (!store) throw new Error("사진첩 기능이 설정되지 않았습니다.");
  requireUser();
  await deleteDoc(doc(store, "photos", id));
}
