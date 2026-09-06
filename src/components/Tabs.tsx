"use client";

/* 오른쪽 화면에 들어가는 탭 내용들입니다.
   탭 종류(board / photos / text / guest)에 따라 다른 모양을 그립니다. */

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import { profile, guestbook } from "@/config/linktree";
import {
  GUESTBOOK_LIMITS,
  PHOTO_LIMITS,
  addGuestbookEntry,
  addPhoto,
  deletePhoto,
  isGuestbookEnabled,
  subscribeGuestbook,
  subscribePhotos,
  type RemoteEntry,
  type RemotePhoto,
  type SiteUser
} from "@/lib/firebase";
import type { SiteConfig, SitePost, SiteSection, SiteTab } from "@/lib/content";
import {
  PostAdmin,
  PostForm,
  SectionAdmin,
  SectionForm,
  SignInButton,
  VisitsTab
} from "@/components/Editor";

export function SectionTitle({ title, sub }: { title: React.ReactNode; sub?: string }) {
  return (
    <div className="cy-section-title">
      {title}
      {sub ? <span className="cy-sub-text">{sub}</span> : null}
    </div>
  );
}

/* ---------------------------------------------------------------
   홈 탭 : 미니룸 + 익명 한줄평
   --------------------------------------------------------------- */

function GuestbookForm() {
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setMessage(null);
    try {
      await addGuestbookEntry(author, text);
      setAuthor("");
      setText("");
      setMessage({ kind: "ok", text: "한줄평을 남겼어요. 고맙습니다!" });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "남기지 못했어요. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="cy-guestbook-form" onSubmit={submit}>
      <input
        className="cy-gb-author"
        value={author}
        onChange={e => setAuthor(e.target.value)}
        placeholder="이름"
        maxLength={GUESTBOOK_LIMITS.author}
        aria-label="이름"
      />
      <input
        className="cy-gb-text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="한줄평을 남겨주세요"
        maxLength={GUESTBOOK_LIMITS.text}
        aria-label="한줄평"
      />
      <button className="cy-gb-submit" type="submit" disabled={sending}>
        {sending ? "전송중" : "남기기"}
      </button>
      {message ? (
        <span className={`cy-gb-message${message.kind === "error" ? " is-error" : ""}`}>{message.text}</span>
      ) : null}
    </form>
  );
}

const GUESTBOOK_FETCH_LIMIT = 30;
const GUESTBOOK_PAGE_SIZE = 5;

function GuestbookList() {
  const [remote, setRemote] = useState<RemoteEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!isGuestbookEnabled) return;
    return subscribeGuestbook(GUESTBOOK_FETCH_LIMIT, setRemote, () => setFailed(true));
  }, []);

  const live = isGuestbookEnabled && !failed;
  const entries = live && remote
    ? remote.map(e => ({ key: e.id, ...e }))
    : guestbook.map(e => ({ key: String(e.id), ...e }));

  const pageCount = Math.max(1, Math.ceil(entries.length / GUESTBOOK_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageEntries = entries.slice(
    currentPage * GUESTBOOK_PAGE_SIZE,
    currentPage * GUESTBOOK_PAGE_SIZE + GUESTBOOK_PAGE_SIZE
  );

  return (
    <>
      {live && remote === null ? <div className="cy-gb-loading">한줄평을 불러오는 중…</div> : null}

      <div className="cy-guestbook-list">
        {entries.length === 0 ? (
          <div className="cy-gb-loading">아직 한줄평이 없어요. 첫 줄을 남겨 주세요!</div>
        ) : (
          pageEntries.map(c => (
            <div key={c.key} className="cy-guestbook-item">
              <span className="cg-author">
                {c.author} <span className="cg-colon">:</span>{" "}
              </span>
              <span className="cg-text">{c.text}</span>
              <span className="cg-date">({c.date})</span>
            </div>
          ))
        )}
      </div>

      {pageCount > 1 ? (
        <div className="cy-gb-pagination">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`cy-gb-page${i === currentPage ? " is-active" : ""}`}
              onClick={() => setPage(i)}
              aria-current={i === currentPage ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}

      {live ? <GuestbookForm /> : null}
    </>
  );
}

export function HomeTab() {
  return (
    <>
      <div className="cy-content-box cy-miniroom-box">
        <SectionTitle title="Mini Room" sub="미니룸" />
        <div className="cy-miniroom-inner">
          <img src={asset(profile.miniroom.src)} alt={profile.miniroom.alt} />
        </div>
      </div>

      <div className="cy-content-box">
        <SectionTitle title="What friends say" sub="한마디로 표현한다면~" />
        <GuestbookList />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------
   글 목록 탭
   --------------------------------------------------------------- */

export function BoardTabView({
  tab,
  posts,
  canEdit,
  subtitle
}: {
  tab: SiteTab;
  posts: SitePost[];
  canEdit: boolean;
  subtitle?: string;
}) {
  const [adding, setAdding] = useState(false);
  /* 날짜가 최신인 글이 위로 오게 정렬합니다. */
  const mine = posts
    .filter(p => p.tabId === tab.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="cy-content-box">
      <SectionTitle title={tab.label} sub={subtitle} />

      {canEdit ? (
        adding ? (
          <PostForm tabId={tab.id} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" className="cy-auth-btn" onClick={() => setAdding(true)}>새 글 쓰기</button>
        )
      ) : null}

      {mine.length === 0 ? (
        <div className="cy-empty-box">{profile.boardEmptyText}</div>
      ) : (
        <ul className="cy-board-list">
          {mine.map(post => (
            <li key={post.id} className="cy-board-item">
              {post.href ? (
                <a className="cy-board-link" href={post.href} target="_blank" rel="noopener noreferrer">
                  <span className="cy-board-body">
                    <span className="cy-board-title">{post.title}</span>
                    {post.summary ? <span className="cy-board-summary">{post.summary}</span> : null}
                    <span className="cy-board-date">{post.date}</span>
                  </span>
                </a>
              ) : (
                <span className="cy-board-link">
                  <span className="cy-board-body">
                    <span className="cy-board-title">{post.title}</span>
                    {post.summary ? <span className="cy-board-summary">{post.summary}</span> : null}
                    <span className="cy-board-date">{post.date}</span>
                  </span>
                </span>
              )}
              {post.body ? <div className="cy-board-text">{post.body}</div> : null}
              {canEdit ? <PostAdmin post={post} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   소개 글 탭
   --------------------------------------------------------------- */

export function TextTabView({
  tab,
  sections,
  canEdit
}: {
  tab: SiteTab;
  sections: SiteSection[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const mine = sections.filter(s => s.tabId === tab.id);
  const nextOrder = mine.reduce((m, s) => Math.max(m, s.order), 0) + 10;

  return (
    <>
      {canEdit ? (
        adding ? (
          <SectionForm tabId={tab.id} order={nextOrder} onDone={() => setAdding(false)} />
        ) : (
          <div className="cy-content-box">
            <button type="button" className="cy-auth-btn" onClick={() => setAdding(true)}>새 글 쓰기</button>
          </div>
        )
      ) : null}

      {mine.length === 0 && !canEdit ? (
        <div className="cy-content-box">
          <div className="cy-empty-box">아직 쓴 글이 없습니다.</div>
        </div>
      ) : null}

      {mine.map(section => (
        <div key={section.id} className="cy-content-box">
          <SectionTitle title={section.title} />
          <div className="cy-text-block cy-pre">{section.body}</div>
          {canEdit ? <SectionAdmin section={section} /> : null}
        </div>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------
   사진첩 탭
   --------------------------------------------------------------- */

async function shrinkImage(file: File): Promise<string> {
  const source = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_LIMITS.maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 사진을 줄일 수 없어요.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();

  for (const quality of [0.78, 0.66, 0.55, 0.45, 0.35]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= PHOTO_LIMITS.chars) return dataUrl;
  }
  throw new Error("사진이 너무 커요. 더 작은 사진으로 올려 주세요.");
}

const PHOTO_FETCH_LIMIT = 60;

function PhotoUploader({ user }: { user: SiteUser | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  if (!user) {
    return (
      <div className="cy-auth-bar">
        <span className="cy-auth-hint">구글 계정으로 로그인하면 사진을 올릴 수 있어요.</span>
        <SignInButton label="구글로 로그인" />
      </div>
    );
  }

  const pick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;

    setBusy(true);
    setMessage(null);
    try {
      const dataUrl = await shrinkImage(file);
      await addPhoto(file.name.replace(/\.[^.]+$/, ""), dataUrl);
      setMessage({ kind: "ok", text: "사진을 올렸어요!" });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "올리지 못했어요." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cy-auth-bar">
      <span className="cy-gb-me">{user.name}</span>
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} hidden aria-label="사진 고르기" />
      <button type="button" className="cy-auth-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? "올리는 중…" : "사진 올리기"}
      </button>
      {message ? (
        <span className={`cy-gb-message${message.kind === "error" ? " is-error" : ""}`}>{message.text}</span>
      ) : null}
    </div>
  );
}

export function PhotosTabView({ tab, user }: { tab: SiteTab; user: SiteUser | null }) {
  const [remote, setRemote] = useState<RemotePhoto[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isGuestbookEnabled) return;
    return subscribePhotos(PHOTO_FETCH_LIMIT, setRemote, () => setFailed(true));
  }, []);

  const live = isGuestbookEnabled && !failed;
  const items = live && remote ? remote : [];

  return (
    <div className="cy-content-box">
      <SectionTitle title={tab.label} sub={`사진 ${items.length}컷`} />

      {live ? <PhotoUploader user={user} /> : null}
      {live && remote === null ? <div className="cy-gb-loading">사진을 불러오는 중…</div> : null}

      {items.length === 0 && !(live && remote === null) ? (
        <div className="cy-gb-loading">아직 사진이 없어요. 첫 사진을 올려 주세요!</div>
      ) : (
        <ul className="cy-photo-grid">
          {items.map(photo => (
            <li key={photo.id} className="cy-photo-item">
              <div className="cy-photo-frame">
                <img src={photo.src} alt={photo.name} loading="lazy" />
                {user && photo.uid === user.uid ? (
                  <button
                    type="button"
                    className="cy-photo-del"
                    onClick={() => deletePhoto(photo.id).catch(() => {})}
                    title="내 사진 지우기"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              {photo.name || photo.author ? (
                <div className="cy-photo-caption">
                  <span className="cy-photo-name">{photo.name}</span>
                  {photo.author ? <span className="cy-photo-author">{photo.author}</span> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   탭 하나를 종류에 맞게 그립니다.
   --------------------------------------------------------------- */

export function TabContent({
  tab,
  config,
  posts,
  sections,
  user,
  canEdit
}: {
  tab: SiteTab;
  config: SiteConfig;
  posts: SitePost[];
  sections: SiteSection[];
  user: SiteUser | null;
  canEdit: boolean;
}) {
  if (tab.kind === "photos") return <PhotosTabView tab={tab} user={user} />;
  if (tab.kind === "text") return <TextTabView tab={tab} sections={sections} canEdit={canEdit} />;
  if (tab.kind === "guest") {
    return (
      <div className="cy-content-box">
        <SectionTitle title={tab.label} sub="로그인하고 남겨 주세요" />
        <VisitsTab user={user} />
      </div>
    );
  }
  return <BoardTabView tab={tab} posts={posts} canEdit={canEdit} subtitle={config.boardSubtitle} />;
}
