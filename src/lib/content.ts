/* 미니홈피 내용을 Firestore 에 담아 두고 화면에서 바로 고치는 계층입니다.

   지금까지는 글과 설정이 src/config/linktree.ts 안에 있어서 GitHub 에서 고쳐야 했습니다.
   여기서부터는 같은 값을 Firestore 에 두고, 주인(OWNER_UID)이 로그인하면
   화면에서 고쳐 바로 저장합니다. 아직 저장된 값이 없으면 linktree.ts 값이 그대로 보입니다.

   컬렉션 구조
   - site/config      : 왼쪽 패널과 머리말 문구 한 덩어리
   - tabs/{id}        : 탭 목록 (이름, 종류, 순서). 홈 탭은 코드에 고정입니다.
   - posts/{id}       : 게시판형 탭에 들어가는 글
   - photos/{id}      : 사진첩형 탭 사진 (기존 컬렉션을 그대로 씁니다)
   - guestbook        : 홈 화면 익명 한줄평 (기존 그대로)
   - visits           : 방명록 탭 글 (로그인 필요, 비밀글 가능) */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp
} from "firebase/firestore";
import { getDb, getCurrentUser, isGuestbookEnabled } from "@/lib/firebase";
import { profile, boardPosts, profileSections, waveLinks } from "@/config/linktree";

/* 미니홈피 주인입니다. 이 계정으로 로그인했을 때만 편집 버튼이 보입니다.
   Firebase 콘솔 > Authentication > 사용자 에서 확인한 UID 입니다.
   UID 는 이메일과 달리 그 자체로 누구인지 알 수 없는 값이라 공개 저장소에 두어도 됩니다. */
export const OWNER_UID = "RonqdDorXSZgDOSFafu9Rf7w5383";

export const isEditableSite = isGuestbookEnabled;

export function isOwner(uid: string | null | undefined) {
  return Boolean(uid) && uid === OWNER_UID;
}

/* ---------------------------------------------------------------
   1) 왼쪽 패널과 머리말 문구
   --------------------------------------------------------------- */

export type SiteConfig = {
  teacherName: string;
  catalogDescription: string;
  photoCaption: string;
  catalogTitle: string;
  displayUrl: string;
  boardSubtitle: string;
};

/* Firestore 에 아직 아무것도 없을 때 보여 줄 기본값입니다. */
export const defaultConfig: SiteConfig = {
  teacherName: profile.teacherName,
  catalogDescription: profile.catalogDescription,
  photoCaption: profile.photoCaption,
  catalogTitle: profile.catalogTitle,
  displayUrl: profile.displayUrl,
  boardSubtitle: profile.boardSubtitle
};

export const CONFIG_LIMITS = { short: 40, long: 300 } as const;

export function subscribeConfig(
  onData: (config: SiteConfig) => void,
  onError: (error: Error) => void
) {
  const store = getDb();
  if (!store) return () => {};

  return onSnapshot(
    doc(store, "site", "config"),
    snapshot => {
      const data = snapshot.data() ?? {};
      onData({
        teacherName: String(data.teacherName ?? defaultConfig.teacherName),
        catalogDescription: String(data.catalogDescription ?? defaultConfig.catalogDescription),
        photoCaption: String(data.photoCaption ?? defaultConfig.photoCaption),
        catalogTitle: String(data.catalogTitle ?? defaultConfig.catalogTitle),
        displayUrl: String(data.displayUrl ?? defaultConfig.displayUrl),
        boardSubtitle: String(data.boardSubtitle ?? defaultConfig.boardSubtitle)
      });
    },
    error => onError(error as Error)
  );
}

function requireOwner() {
  const current = getCurrentUser();
  if (!current || !isOwner(current.uid)) throw new Error("주인 계정으로 로그인해야 고칠 수 있어요.");
  return current;
}

export async function saveConfigField(field: keyof SiteConfig, value: string) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();

  const trimmed = value.trim();
  const cap = field === "photoCaption" ? CONFIG_LIMITS.long : CONFIG_LIMITS.short;
  if (trimmed.length > cap) throw new Error(`${cap}자까지 쓸 수 있어요.`);

  /* merge 로 저장해야 다른 항목이 지워지지 않습니다. */
  await setDoc(doc(store, "site", "config"), { [field]: trimmed }, { merge: true });
}

/* ---------------------------------------------------------------
   2) 탭
   --------------------------------------------------------------- */

/* board  : 제목·설명·날짜·링크를 목록으로 (지금의 윤리고수)
   photos : 사진첩
   text   : 소개 글처럼 문단만 있는 탭 (지금의 프로필)
   links  : 링크만 모아 두는 탭
   guest  : 방명록 (로그인 후 작성, 비밀글 가능) */
export type TabKind = "board" | "photos" | "text" | "links" | "guest";

export type SiteTab = {
  id: string;
  label: string;
  kind: TabKind;
  order: number;
};

export const TAB_KIND_LABELS: Record<TabKind, string> = {
  board: "글·링크 목록",
  photos: "사진첩",
  text: "소개 글",
  links: "링크 모음",
  guest: "방명록"
};

/* Firestore 에 탭이 하나도 없을 때 쓰는 기본 탭입니다.
   지금 화면과 똑같이 보이도록 기존 이름을 그대로 씁니다. */
export const defaultTabs: SiteTab[] = [
  { id: "profile", label: "프로필", kind: "text", order: 10 },
  { id: "board", label: profile.boardLabel, kind: "board", order: 20 },
  { id: "photo", label: profile.photoLabel, kind: "photos", order: 30 }
];

export function subscribeTabs(
  onData: (tabs: SiteTab[]) => void,
  onError: (error: Error) => void
) {
  const store = getDb();
  if (!store) return () => {};

  return onSnapshot(
    query(collection(store, "tabs"), orderBy("order", "asc")),
    snapshot => {
      if (snapshot.empty) {
        onData(defaultTabs);
        return;
      }
      onData(
        snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            label: String(data.label ?? "이름 없는 탭"),
            kind: (String(data.kind ?? "board") as TabKind),
            order: Number(data.order ?? 0)
          };
        })
      );
    },
    error => onError(error as Error)
  );
}

/* 처음 한 번, 기본 탭을 Firestore 에 심어 둡니다.
   이걸 해야 이름 변경·삭제·순서 변경이 가능해집니다. */
export async function seedTabs() {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();

  for (const tab of defaultTabs) {
    await setDoc(doc(store, "tabs", tab.id), {
      label: tab.label,
      kind: tab.kind,
      order: tab.order
    });
  }
}

export async function saveTab(id: string, patch: Partial<Omit<SiteTab, "id">>) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();

  if (patch.label !== undefined) {
    const label = patch.label.trim();
    if (!label) throw new Error("탭 이름을 적어 주세요.");
    if (label.length > 12) throw new Error("탭 이름은 12자까지 쓸 수 있어요.");
    patch = { ...patch, label };
  }
  await setDoc(doc(store, "tabs", id), patch, { merge: true });
}

export async function addTab(label: string, kind: TabKind, order: number) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();

  const trimmed = label.trim();
  if (!trimmed) throw new Error("탭 이름을 적어 주세요.");
  if (trimmed.length > 12) throw new Error("탭 이름은 12자까지 쓸 수 있어요.");

  await addDoc(collection(store, "tabs"), { label: trimmed, kind, order });
}

/* 탭을 지우면 그 안의 글도 같이 지웁니다. 사진은 남겨 둡니다. */
export async function deleteTab(id: string) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await deleteDoc(doc(store, "tabs", id));
}

/* ---------------------------------------------------------------
   3) 글 (게시판형·링크형 탭)
   --------------------------------------------------------------- */

export type SitePost = {
  id: string;
  tabId: string;
  title: string;
  summary: string;
  href: string;
  date: string;
  body: string;
};

export const POST_LIMITS = { title: 60, summary: 120, body: 2000 } as const;

/* linktree.ts 에 적혀 있던 글입니다. Firestore 가 비어 있을 때 그대로 보여 줍니다. */
export const defaultPosts: SitePost[] = boardPosts.map(post => ({
  id: post.id,
  tabId: "board",
  title: post.title,
  summary: post.summary ?? "",
  href: post.href,
  date: post.date,
  body: ""
}));

export function subscribePosts(
  onData: (posts: SitePost[]) => void,
  onError: (error: Error) => void
) {
  const store = getDb();
  if (!store) return () => {};

  return onSnapshot(
    query(collection(store, "posts"), orderBy("date", "desc")),
    snapshot => {
      onData(
        snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            tabId: String(data.tabId ?? "board"),
            title: String(data.title ?? ""),
            summary: String(data.summary ?? ""),
            href: String(data.href ?? ""),
            date: String(data.date ?? ""),
            body: String(data.body ?? "")
          };
        })
      );
    },
    error => onError(error as Error)
  );
}

function checkPost(input: Omit<SitePost, "id">) {
  const title = input.title.trim();
  if (!title) throw new Error("제목을 적어 주세요.");
  if (title.length > POST_LIMITS.title) throw new Error(`제목은 ${POST_LIMITS.title}자까지 쓸 수 있어요.`);
  if (input.summary.length > POST_LIMITS.summary) throw new Error(`설명은 ${POST_LIMITS.summary}자까지 쓸 수 있어요.`);
  if (input.body.length > POST_LIMITS.body) throw new Error(`본문은 ${POST_LIMITS.body}자까지 쓸 수 있어요.`);
  if (input.href && !/^https?:\/\//.test(input.href.trim())) {
    throw new Error("링크는 https:// 로 시작해야 해요.");
  }
  return {
    tabId: input.tabId,
    title,
    summary: input.summary.trim(),
    href: input.href.trim(),
    date: input.date.trim(),
    body: input.body.trim()
  };
}

export async function addPost(input: Omit<SitePost, "id">) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await addDoc(collection(store, "posts"), { ...checkPost(input), createdAt: serverTimestamp() });
}

export async function savePost(id: string, input: Omit<SitePost, "id">) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await updateDoc(doc(store, "posts", id), checkPost(input));
}

export async function deletePost(id: string) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await deleteDoc(doc(store, "posts", id));
}

/* 지금 linktree.ts 에 있는 글을 Firestore 로 한 번에 옮깁니다.
   옮긴 뒤부터는 화면에서 고칠 수 있습니다. */
export async function seedPosts() {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();

  for (const post of defaultPosts) {
    await setDoc(doc(store, "posts", post.id), {
      tabId: post.tabId,
      title: post.title,
      summary: post.summary,
      href: post.href,
      date: post.date,
      body: post.body,
      createdAt: serverTimestamp()
    });
  }
}

/* ---------------------------------------------------------------
   4) 소개 글 탭 (지금의 프로필)
   --------------------------------------------------------------- */

export type SiteSection = {
  id: string;
  tabId: string;
  title: string;
  body: string;
  order: number;
};

export const SECTION_LIMITS = { title: 40, body: 2000 } as const;

/* linktree.ts 의 profileSections 를 문단 글로 펼쳐 둔 기본값입니다. */
export const defaultSections: SiteSection[] = profileSections.map((section, i) => ({
  id: section.id,
  tabId: "profile",
  title: section.title,
  body: section.blocks
    .map(block => {
      if (block.kind === "text") return block.lines.join("\n");
      if (block.kind === "list") return `${block.heading}\n` + block.items.map(item => `- ${item}`).join("\n");
      return block.items.map(item => `${item.label}: ${item.value}`).join("\n");
    })
    .join("\n\n"),
  order: (i + 1) * 10
}));

export function subscribeSections(
  onData: (sections: SiteSection[]) => void,
  onError: (error: Error) => void
) {
  const store = getDb();
  if (!store) return () => {};

  return onSnapshot(
    query(collection(store, "sections"), orderBy("order", "asc")),
    snapshot => {
      onData(
        snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            tabId: String(data.tabId ?? "profile"),
            title: String(data.title ?? ""),
            body: String(data.body ?? ""),
            order: Number(data.order ?? 0)
          };
        })
      );
    },
    error => onError(error as Error)
  );
}

function checkSection(input: Omit<SiteSection, "id">) {
  const title = input.title.trim();
  if (!title) throw new Error("제목을 적어 주세요.");
  if (title.length > SECTION_LIMITS.title) throw new Error(`제목은 ${SECTION_LIMITS.title}자까지 쓸 수 있어요.`);
  if (input.body.length > SECTION_LIMITS.body) throw new Error(`본문은 ${SECTION_LIMITS.body}자까지 쓸 수 있어요.`);
  return { tabId: input.tabId, title, body: input.body.trim(), order: input.order };
}

export async function addSection(input: Omit<SiteSection, "id">) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await addDoc(collection(store, "sections"), checkSection(input));
}

export async function saveSection(id: string, input: Omit<SiteSection, "id">) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await setDoc(doc(store, "sections", id), checkSection(input), { merge: true });
}

export async function deleteSection(id: string) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await deleteDoc(doc(store, "sections", id));
}

export async function seedSections() {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();

  for (const section of defaultSections) {
    await setDoc(doc(store, "sections", section.id), {
      tabId: section.tabId,
      title: section.title,
      body: section.body,
      order: section.order
    });
  }
}

/* ---------------------------------------------------------------
   5) 파도타기 링크
   --------------------------------------------------------------- */

export type SiteLink = {
  id: string;
  label: string;
  href: string;
  order: number;
};

export const defaultLinks: SiteLink[] = waveLinks.map((link, i) => ({
  id: link.id,
  label: link.label,
  href: link.href,
  order: (i + 1) * 10
}));

export function subscribeLinks(
  onData: (links: SiteLink[]) => void,
  onError: (error: Error) => void
) {
  const store = getDb();
  if (!store) return () => {};

  return onSnapshot(
    query(collection(store, "links"), orderBy("order", "asc")),
    snapshot => {
      if (snapshot.empty) {
        onData(defaultLinks);
        return;
      }
      onData(
        snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            label: String(data.label ?? ""),
            href: String(data.href ?? ""),
            order: Number(data.order ?? 0)
          };
        })
      );
    },
    error => onError(error as Error)
  );
}

function checkLink(label: string, href: string) {
  const trimmedLabel = label.trim();
  const trimmedHref = href.trim();
  if (!trimmedLabel) throw new Error("이름을 적어 주세요.");
  if (trimmedLabel.length > 30) throw new Error("이름은 30자까지 쓸 수 있어요.");
  if (!/^https?:\/\//.test(trimmedHref)) throw new Error("링크는 https:// 로 시작해야 해요.");
  return { label: trimmedLabel, href: trimmedHref };
}

export async function addLink(label: string, href: string, order: number) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await addDoc(collection(store, "links"), { ...checkLink(label, href), order });
}

export async function saveLink(id: string, label: string, href: string) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await setDoc(doc(store, "links", id), checkLink(label, href), { merge: true });
}

export async function deleteLink(id: string) {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();
  await deleteDoc(doc(store, "links", id));
}

export async function seedLinks() {
  const store = getDb();
  if (!store) throw new Error("편집 기능이 설정되지 않았습니다.");
  requireOwner();

  for (const link of defaultLinks) {
    await setDoc(doc(store, "links", link.id), {
      label: link.label,
      href: link.href,
      order: link.order
    });
  }
}

/* ---------------------------------------------------------------
   6) 방명록 탭 (로그인 후 작성, 비밀글 가능)

   비밀글은 쓴 사람과 주인만 볼 수 있습니다.
   Firestore 는 목록을 가져올 때 규칙을 조건에 맞춰 검사하므로,
   공개글 목록과 내 비밀글 목록을 따로 불러와 화면에서 합칩니다.
   --------------------------------------------------------------- */

export type VisitEntry = {
  id: string;
  author: string;
  uid: string;
  text: string;
  secret: boolean;
  date: string;
};

export const VISIT_LIMITS = { text: 500 } as const;

function toDate(value: unknown) {
  const date = value && typeof (value as Timestamp).toDate === "function"
    ? (value as Timestamp).toDate()
    : new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function mapVisit(d: { id: string; data: () => Record<string, unknown> }): VisitEntry {
  const data = d.data();
  return {
    id: d.id,
    author: String(data.author ?? ""),
    uid: String(data.uid ?? ""),
    text: String(data.text ?? ""),
    secret: Boolean(data.secret),
    date: toDate(data.createdAt)
  };
}

/* 주인이면 전부, 아니면 공개글만 구독합니다. */
export function subscribeVisits(
  viewerUid: string | null,
  onData: (entries: VisitEntry[]) => void,
  onError: (error: Error) => void
) {
  const store = getDb();
  if (!store) return () => {};

  const base = collection(store, "visits");
  const q = isOwner(viewerUid)
    ? query(base, orderBy("createdAt", "desc"))
    : query(base, where("secret", "==", false), orderBy("createdAt", "desc"));

  return onSnapshot(q, snap => onData(snap.docs.map(mapVisit)), error => onError(error as Error));
}

/* 로그인한 사람이 자기가 쓴 비밀글을 볼 수 있게 따로 구독합니다. */
export function subscribeMySecretVisits(
  viewerUid: string | null,
  onData: (entries: VisitEntry[]) => void,
  onError: (error: Error) => void
) {
  const store = getDb();
  if (!store || !viewerUid || isOwner(viewerUid)) return () => {};

  /* 같음 조건만 두 개 쓰면 Firestore 가 기본 색인만으로 처리합니다.
     정렬은 화면에서 하므로 orderBy 를 넣지 않습니다. */
  const q = query(
    collection(store, "visits"),
    where("uid", "==", viewerUid),
    where("secret", "==", true)
  );
  return onSnapshot(q, snap => onData(snap.docs.map(mapVisit)), error => onError(error as Error));
}

export async function addVisit(text: string, secret: boolean) {
  const store = getDb();
  if (!store) throw new Error("방명록 기능이 설정되지 않았습니다.");

  const current = getCurrentUser();
  if (!current) throw new Error("구글 로그인 후에 남길 수 있어요.");

  const trimmed = text.trim();
  if (!trimmed) throw new Error("내용을 적어 주세요.");
  if (trimmed.length > VISIT_LIMITS.text) throw new Error(`${VISIT_LIMITS.text}자까지 쓸 수 있어요.`);

  await addDoc(collection(store, "visits"), {
    author: (current.displayName?.trim() || "이름 없는 방문자").slice(0, 20),
    uid: current.uid,
    text: trimmed,
    secret,
    createdAt: serverTimestamp()
  });
}

/* 쓴 사람과 주인이 지울 수 있습니다. */
export async function deleteVisit(id: string) {
  const store = getDb();
  if (!store) throw new Error("방명록 기능이 설정되지 않았습니다.");
  if (!getCurrentUser()) throw new Error("로그인이 필요해요.");
  await deleteDoc(doc(store, "visits", id));
}
