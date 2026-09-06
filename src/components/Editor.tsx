"use client";

/* 미니홈피 주인이 화면에서 직접 고치는 도구 모음입니다.
   주인으로 로그인했을 때만 연필 버튼과 편집 상자가 보입니다. */

import { useEffect, useState } from "react";
import {
  signInWithGoogle,
  signOutUser,
  subscribeUser,
  type SiteUser
} from "@/lib/firebase";
import {
  TAB_KIND_LABELS,
  addLink,
  addPost,
  addSection,
  addTab,
  addVisit,
  deleteLink,
  deletePost,
  deleteSection,
  deleteTab,
  deleteVisit,
  isOwner,
  saveLink,
  savePost,
  saveSection,
  saveTab,
  seedLinks,
  seedPosts,
  seedSections,
  seedTabs,
  subscribeMySecretVisits,
  subscribeVisits,
  type SiteLink,
  type SitePost,
  type SiteSection,
  type SiteTab,
  type TabKind,
  type VisitEntry
} from "@/lib/content";

/* ---------------------------------------------------------------
   로그인 상태
   --------------------------------------------------------------- */

export function useSiteUser() {
  const [user, setUser] = useState<SiteUser | null>(null);
  useEffect(() => subscribeUser(setUser), []);
  return user;
}

export function SignInButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const click = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("로그인 창이 닫혔거나 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="cy-auth-btn" onClick={click} disabled={busy}>
        {busy ? "로그인 중…" : label}
      </button>
      {error ? <span className="cy-gb-message is-error">{error}</span> : null}
    </>
  );
}

/* ---------------------------------------------------------------
   글자 하나를 고치는 상자
   --------------------------------------------------------------- */

export function EditText({
  value,
  onSave,
  canEdit,
  multiline = false,
  label
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  canEdit: boolean;
  multiline?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);

  if (!canEdit) return <>{value}</>;

  if (!open) {
    return (
      <>
        {value}
        <button
          type="button"
          className="cy-edit-pencil"
          onClick={() => setOpen(true)}
          title={`${label} 고치기`}
          aria-label={`${label} 고치기`}
        >
          ✎
        </button>
      </>
    );
  }

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(draft);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="cy-edit-box">
      {multiline ? (
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} aria-label={label} />
      ) : (
        <input value={draft} onChange={e => setDraft(e.target.value)} aria-label={label} />
      )}
      <span className="cy-edit-actions">
        <button type="button" className="cy-edit-save" onClick={save} disabled={busy}>
          {busy ? "저장 중…" : "저장"}
        </button>
        <button type="button" className="cy-edit-cancel" onClick={() => setOpen(false)}>
          취소
        </button>
      </span>
      {error ? <span className="cy-gb-message is-error">{error}</span> : null}
    </span>
  );
}

/* ---------------------------------------------------------------
   주인용 위쪽 막대
   --------------------------------------------------------------- */

export function OwnerBar({
  user,
  editing,
  onToggle,
  needsSetup
}: {
  user: SiteUser | null;
  editing: boolean;
  onToggle: () => void;
  needsSetup: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user || !isOwner(user.uid)) return null;

  const setup = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await seedTabs();
      await seedSections();
      await seedPosts();
      await seedLinks();
      setMessage("옮겼어요. 이제 화면에서 고칠 수 있습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "옮기지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cy-owner-bar">
      <span className="cy-owner-me">{user.name} 님, 안녕하세요</span>
      <button type="button" className="cy-auth-btn" onClick={onToggle}>
        {editing ? "편집 끝내기" : "고치기"}
      </button>
      {editing && needsSetup ? (
        <button type="button" className="cy-auth-btn" onClick={setup} disabled={busy}>
          {busy ? "옮기는 중…" : "지금 내용을 편집 가능하게 옮기기"}
        </button>
      ) : null}
      <button type="button" className="cy-auth-out" onClick={() => signOutUser()}>
        로그아웃
      </button>
      {message ? <span className="cy-gb-message">{message}</span> : null}
    </div>
  );
}

/* ---------------------------------------------------------------
   탭 관리
   --------------------------------------------------------------- */

const ADDABLE_KINDS: TabKind[] = ["board", "photos", "text", "guest"];

export function TabsAdmin({ tabs }: { tabs: SiteTab[] }) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<TabKind>("board");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const move = (tab: SiteTab, delta: number) => {
    const sorted = [...tabs].sort((a, b) => a.order - b.order);
    const at = sorted.findIndex(t => t.id === tab.id);
    const other = sorted[at + delta];
    if (!other) return;
    run(async () => {
      await saveTab(tab.id, { order: other.order });
      await saveTab(other.id, { order: tab.order });
    });
  };

  return (
    <div className="cy-admin-box">
      <div className="cy-admin-title">탭 관리</div>

      <ul className="cy-admin-list">
        {[...tabs].sort((a, b) => a.order - b.order).map((tab, i, all) => (
          <li key={tab.id} className="cy-admin-row">
            <span className="cy-admin-kind">{TAB_KIND_LABELS[tab.kind]}</span>
            <span className="cy-admin-name">
              <EditText
                value={tab.label}
                canEdit
                label="탭 이름"
                onSave={next => saveTab(tab.id, { label: next })}
              />
            </span>
            <button type="button" onClick={() => move(tab, -1)} disabled={i === 0} title="위로">▲</button>
            <button type="button" onClick={() => move(tab, 1)} disabled={i === all.length - 1} title="아래로">▼</button>
            <button
              type="button"
              className="cy-admin-del"
              onClick={() => {
                if (!window.confirm(`"${tab.label}" 탭을 지울까요? 안에 있던 글도 함께 사라집니다.`)) return;
                run(() => deleteTab(tab.id));
              }}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>

      <div className="cy-admin-add">
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="새 탭 이름"
          aria-label="새 탭 이름"
        />
        <select value={kind} onChange={e => setKind(e.target.value as TabKind)} aria-label="탭 종류">
          {ADDABLE_KINDS.map(k => (
            <option key={k} value={k}>{TAB_KIND_LABELS[k]}</option>
          ))}
        </select>
        <button
          type="button"
          className="cy-auth-btn"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const max = tabs.reduce((m, t) => Math.max(m, t.order), 0);
              await addTab(label, kind, max + 10);
              setLabel("");
            })
          }
        >
          탭 추가
        </button>
      </div>

      {error ? <span className="cy-gb-message is-error">{error}</span> : null}
    </div>
  );
}

/* ---------------------------------------------------------------
   글 목록 탭 (게시판형)
   --------------------------------------------------------------- */

const emptyPost = (tabId: string): Omit<SitePost, "id"> => ({
  tabId,
  title: "",
  summary: "",
  href: "",
  date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
  body: ""
});

export function PostForm({
  tabId,
  initial,
  onDone
}: {
  tabId: string;
  initial?: SitePost;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<Omit<SitePost, "id">>(
    initial ? { ...initial } : emptyPost(tabId)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Omit<SitePost, "id">>) => setDraft(d => ({ ...d, ...patch }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (initial) await savePost(initial.id, draft);
      else await addPost(draft);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="cy-admin-box" onSubmit={submit}>
      <div className="cy-admin-title">{initial ? "글 고치기" : "새 글 쓰기"}</div>
      <input value={draft.title} onChange={e => set({ title: e.target.value })} placeholder="제목" aria-label="제목" />
      <input value={draft.summary} onChange={e => set({ summary: e.target.value })} placeholder="한 줄 설명 (없어도 됩니다)" aria-label="한 줄 설명" />
      <input value={draft.href} onChange={e => set({ href: e.target.value })} placeholder="링크 주소 (없어도 됩니다)" aria-label="링크 주소" />
      <input value={draft.date} onChange={e => set({ date: e.target.value })} placeholder="2026.09.06" aria-label="날짜" />
      <textarea value={draft.body} onChange={e => set({ body: e.target.value })} rows={4} placeholder="본문 (없어도 됩니다)" aria-label="본문" />
      <div className="cy-edit-actions">
        <button type="submit" className="cy-edit-save" disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
        <button type="button" className="cy-edit-cancel" onClick={onDone}>취소</button>
      </div>
      {error ? <span className="cy-gb-message is-error">{error}</span> : null}
    </form>
  );
}

export function PostAdmin({ post }: { post: SitePost }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <PostForm tabId={post.tabId} initial={post} onDone={() => setEditing(false)} />;
  return (
    <span className="cy-inline-admin">
      <button type="button" onClick={() => setEditing(true)}>고치기</button>
      <button
        type="button"
        className="cy-admin-del"
        onClick={() => {
          if (window.confirm(`"${post.title}" 글을 지울까요?`)) deletePost(post.id).catch(() => {});
        }}
      >
        삭제
      </button>
    </span>
  );
}

/* ---------------------------------------------------------------
   소개 글 탭
   --------------------------------------------------------------- */

export function SectionForm({
  tabId,
  initial,
  order,
  onDone
}: {
  tabId: string;
  initial?: SiteSection;
  order: number;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = { tabId, title, body, order: initial?.order ?? order };
      if (initial) await saveSection(initial.id, payload);
      else await addSection(payload);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="cy-admin-box" onSubmit={submit}>
      <div className="cy-admin-title">{initial ? "글 고치기" : "새 글 쓰기"}</div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" aria-label="제목" />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder="내용" aria-label="내용" />
      <div className="cy-edit-actions">
        <button type="submit" className="cy-edit-save" disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
        <button type="button" className="cy-edit-cancel" onClick={onDone}>취소</button>
      </div>
      {error ? <span className="cy-gb-message is-error">{error}</span> : null}
    </form>
  );
}

export function SectionAdmin({ section }: { section: SiteSection }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <SectionForm
        tabId={section.tabId}
        initial={section}
        order={section.order}
        onDone={() => setEditing(false)}
      />
    );
  }
  return (
    <span className="cy-inline-admin">
      <button type="button" onClick={() => setEditing(true)}>고치기</button>
      <button
        type="button"
        className="cy-admin-del"
        onClick={() => {
          if (window.confirm(`"${section.title}" 을 지울까요?`)) deleteSection(section.id).catch(() => {});
        }}
      >
        삭제
      </button>
    </span>
  );
}

/* ---------------------------------------------------------------
   파도타기 링크 관리
   --------------------------------------------------------------- */

export function LinksAdmin({ links }: { links: SiteLink[] }) {
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cy-admin-box">
      <div className="cy-admin-title">파도타기 링크</div>
      <ul className="cy-admin-list">
        {links.map(link => (
          <li key={link.id} className="cy-admin-row">
            <span className="cy-admin-name">
              <EditText
                value={link.label}
                canEdit
                label="링크 이름"
                onSave={next => saveLink(link.id, next, link.href)}
              />
            </span>
            <span className="cy-admin-url">
              <EditText
                value={link.href}
                canEdit
                label="링크 주소"
                onSave={next => saveLink(link.id, link.label, next)}
              />
            </span>
            <button
              type="button"
              className="cy-admin-del"
              onClick={() => {
                if (window.confirm(`"${link.label}" 링크를 지울까요?`)) run(() => deleteLink(link.id));
              }}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
      <div className="cy-admin-add">
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="이름" aria-label="링크 이름" />
        <input value={href} onChange={e => setHref(e.target.value)} placeholder="https://" aria-label="링크 주소" />
        <button
          type="button"
          className="cy-auth-btn"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const max = links.reduce((m, l) => Math.max(m, l.order), 0);
              await addLink(label, href, max + 10);
              setLabel("");
              setHref("");
            })
          }
        >
          추가
        </button>
      </div>
      {error ? <span className="cy-gb-message is-error">{error}</span> : null}
    </div>
  );
}

/* ---------------------------------------------------------------
   방명록 탭
   --------------------------------------------------------------- */

export function VisitsTab({ user }: { user: SiteUser | null }) {
  const [entries, setEntries] = useState<VisitEntry[]>([]);
  const [mine, setMine] = useState<VisitEntry[]>([]);
  const [text, setText] = useState("");
  const [secret, setSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const uid = user?.uid ?? null;
  const owner = isOwner(uid);

  useEffect(() => subscribeVisits(uid, setEntries, () => {}), [uid]);
  useEffect(() => subscribeMySecretVisits(uid, setMine, () => {}), [uid]);

  /* 공개글 + (주인이 아니면) 내 비밀글을 합쳐 최신순으로 보여 줍니다. */
  const all = [...entries, ...mine]
    .filter((entry, i, list) => list.findIndex(e => e.id === entry.id) === i)
    .sort((a, b) => b.date.localeCompare(a.date));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await addVisit(text, secret);
      setText("");
      setSecret(false);
      setMessage({ kind: "ok", text: "남겼어요. 고맙습니다!" });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "남기지 못했어요." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {user ? (
        <form className="cy-visit-form" onSubmit={submit}>
          <span className="cy-gb-me">{user.name}</span>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="방명록을 남겨 주세요"
            aria-label="방명록 내용"
          />
          <label className="cy-visit-secret">
            <input type="checkbox" checked={secret} onChange={e => setSecret(e.target.checked)} />
            비밀글 (나와 주인만 볼 수 있어요)
          </label>
          <div className="cy-edit-actions">
            <button type="submit" className="cy-edit-save" disabled={busy}>
              {busy ? "남기는 중…" : "남기기"}
            </button>
            <button type="button" className="cy-auth-out" onClick={() => signOutUser()}>로그아웃</button>
          </div>
          {message ? (
            <span className={`cy-gb-message${message.kind === "error" ? " is-error" : ""}`}>{message.text}</span>
          ) : null}
        </form>
      ) : (
        <div className="cy-auth-bar">
          <span className="cy-auth-hint">구글 계정으로 로그인하면 방명록을 남길 수 있어요.</span>
          <SignInButton label="구글로 로그인" />
        </div>
      )}

      {all.length === 0 ? (
        <div className="cy-gb-loading">아직 방명록이 없어요. 첫 글을 남겨 주세요!</div>
      ) : (
        <ul className="cy-visit-list">
          {all.map(entry => (
            <li key={entry.id} className="cy-visit-item">
              <div className="cy-visit-head">
                <span className="cy-visit-author">{entry.author}</span>
                {entry.secret ? <span className="cy-visit-lock">🔒 비밀글</span> : null}
                <span className="cy-visit-date">{entry.date}</span>
                {uid && (entry.uid === uid || owner) ? (
                  <button
                    type="button"
                    className="cy-mine-del"
                    onClick={() => deleteVisit(entry.id).catch(() => {})}
                    title="지우기"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              <div className="cy-visit-text">{entry.text}</div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
