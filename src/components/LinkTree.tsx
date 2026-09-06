"use client";

import { useEffect, useRef, useState } from "react";
import { Spiral, type SpiralProps } from "@paper-design/shaders-react";
import { asset } from "@/lib/asset";
import BgmPlayer, { type BgmHandle } from "@/components/BgmPlayer";
import {
  isCounterEnabled,
  recordVisit,
  type VisitCounts
} from "@/lib/firebase";
import {
  defaultConfig,
  defaultLinks,
  defaultPosts,
  defaultSections,
  defaultTabs,
  isOwner,
  saveConfigField,
  subscribeConfig,
  subscribeLinks,
  subscribePosts,
  subscribeSections,
  subscribeTabs,
  type SiteConfig,
  type SiteLink,
  type SitePost,
  type SiteSection,
  type SiteTab
} from "@/lib/content";
import {
  EditText,
  LinksAdmin,
  OwnerBar,
  TabsAdmin,
  useSiteUser
} from "@/components/Editor";
import { HomeTab, TabContent } from "@/components/Tabs";
import { profile } from "@/config/linktree";
import { theme } from "@/config/theme";

/* 진입 화면 셰이더 배경 설정입니다. 색은 theme.ts 를 따릅니다. */
const spiralProps = {
  fit: "none",
  scale: 1.3,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  originX: 0.5,
  originY: 0.5,
  worldWidth: 0,
  worldHeight: 0,
  density: 0.5,
  colorBack: theme.colors.cream,
  colorFront: theme.colors.spiralFront,
  distortion: 0,
  strokeWidth: 0.5,
  strokeTaper: 0,
  strokeCap: 0,
  noise: 1,
  noiseFrequency: 0.25,
  softness: 0,
  speed: 0.75,
  frame: 0,
  maxPixelCount: 1_500_000
} satisfies Partial<SpiralProps>;

const introStyle = {
  "--cream": theme.colors.cream,
  "--ink": theme.colors.ink,
  "--brown": theme.colors.brown,
  "--display": "'Pretendard', 'Noto Sans KR', system-ui, sans-serif",
  "--body": "'Pretendard', 'Noto Sans KR', system-ui, sans-serif"
} as React.CSSProperties;

function ChevronDown({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IntroOverlay({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="lt-intro" style={introStyle}>
      <Spiral className="lt-intro-spiral" {...spiralProps} />
      <div className="lt-intro-card">
        <span className="lt-intro-title">{profile.introTitle}</span>
        <p className="lt-intro-copy">{profile.introDescription}</p>
        <button type="button" className="lt-intro-cta" onClick={onBrowse}>
          모든 활동 구경하기
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
  );
}

/* 미니홈피 왼쪽 위 방문 수입니다. */
function VisitCounter() {
  const [counts, setCounts] = useState<VisitCounts | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!isCounterEnabled || sentRef.current) return;
    sentRef.current = true;
    recordVisit().then(setCounts).catch(() => setCounts(null));
  }, []);

  const show = (value: number | undefined) =>
    typeof value === "number" ? value.toLocaleString() : "-";

  return (
    <span className="cy-today-count">
      TODAY <span className="text-orange">{show(counts?.today)}</span>
      {" | "}
      TOTAL <span className="text-black">{show(counts?.total)}</span>
    </span>
  );
}

export default function LinkTree() {
  const [intro, setIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [editing, setEditing] = useState(false);

  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const [tabs, setTabs] = useState<SiteTab[]>(defaultTabs);
  const [posts, setPosts] = useState<SitePost[] | null>(null);
  const [sections, setSections] = useState<SiteSection[] | null>(null);
  const [links, setLinks] = useState<SiteLink[]>(defaultLinks);

  const user = useSiteUser();
  const owner = isOwner(user?.uid);
  const canEdit = owner && editing;

  const bgmRef = useRef<BgmHandle>(null);

  useEffect(() => subscribeConfig(setConfig, () => {}), []);
  useEffect(() => subscribeTabs(setTabs, () => {}), []);
  useEffect(() => subscribePosts(setPosts, () => {}), []);
  useEffect(() => subscribeSections(setSections, () => {}), []);
  useEffect(() => subscribeLinks(setLinks, () => {}), []);

  useEffect(() => {
    document.body.classList.toggle("lt-intro-open", intro);
    return () => document.body.classList.remove("lt-intro-open");
  }, [intro]);

  /* Firestore 가 아직 비어 있으면 linktree.ts 값을 그대로 보여 줍니다.
     주인이 "옮기기" 를 누르면 그때부터 화면에서 고칠 수 있습니다. */
  const needsSetup = posts !== null && posts.length === 0;
  const shownPosts = posts && posts.length > 0 ? posts : defaultPosts;
  const shownSections = sections && sections.length > 0 ? sections : defaultSections;

  const sortedTabs = [...tabs].sort((a, b) => a.order - b.order);
  const current = sortedTabs.find(t => t.id === activeTab);
  const headerTitle = activeTab === "home" ? config.catalogTitle : current?.label ?? "";

  return (
    <>
      {intro ? (
        <IntroOverlay
          onBrowse={() => {
            setIntro(false);
            bgmRef.current?.start();
          }}
        />
      ) : null}

      <div className="cy-root">
        <div className="cy-background-pattern" />

        <div className="cy-book-wrapper">
          <div className="cy-book-outer">
            <div className="cy-bindings">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="cy-ring" />
              ))}
            </div>

            <div className="cy-book-inner">
              {/* 좌측 패널 */}
              <div className="cy-left-panel">
                <div className="cy-left-header">
                  <VisitCounter />
                </div>

                <div className="cy-left-content">
                  <div className="cy-today-is">
                    TODAY IS.. <span className="text-orange">맑음</span> ☀️
                  </div>

                  <div className="cy-profile-pic">
                    <img src={asset(profile.photo.src)} alt={profile.photo.alt} />
                  </div>

                  <div className="cy-intro-text">
                    <EditText
                      value={config.photoCaption}
                      canEdit={canEdit}
                      multiline
                      label="사진 아래 소개"
                      onSave={next => saveConfigField("photoCaption", next)}
                    />
                  </div>

                  <BgmPlayer ref={bgmRef} />

                  <div className="cy-profile-name">
                    <div className="name-bold">
                      <EditText
                        value={config.teacherName}
                        canEdit={canEdit}
                        label="이름"
                        onSave={next => saveConfigField("teacherName", next)}
                      />
                    </div>
                    <div className="title-sub">
                      <EditText
                        value={config.catalogDescription}
                        canEdit={canEdit}
                        label="이름 아래 소속"
                        onSave={next => saveConfigField("catalogDescription", next)}
                      />
                    </div>
                  </div>

                  <div className="cy-left-dropdown">
                    <select
                      value=""
                      onChange={event => {
                        const target = links.find(w => w.id === event.target.value);
                        if (target?.href) window.open(target.href, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <option value="" disabled>파도타기</option>
                      {links.map(wave => (
                        <option key={wave.id} value={wave.id}>{wave.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 우측 패널 */}
              <div className="cy-right-panel">
                <div className="cy-right-header">
                  <span className="cy-title">{headerTitle}</span>
                  <span className="cy-url">
                    <EditText
                      value={config.displayUrl}
                      canEdit={canEdit}
                      label="주소 표시줄"
                      onSave={next => saveConfigField("displayUrl", next)}
                    />
                  </span>
                </div>

                <div className="cy-right-content">
                  <OwnerBar
                    user={user}
                    editing={editing}
                    onToggle={() => setEditing(v => !v)}
                    needsSetup={needsSetup}
                  />

                  {canEdit && activeTab === "home" ? (
                    <>
                      <div className="cy-content-box">
                        <SectionTitleRow
                          label="미니룸 위 제목"
                          value={config.catalogTitle}
                          onSave={next => saveConfigField("catalogTitle", next)}
                        />
                      </div>
                      <TabsAdmin tabs={sortedTabs} />
                      <LinksAdmin links={links} />
                    </>
                  ) : null}

                  {activeTab === "home" ? <HomeTab /> : null}

                  {current ? (
                    <TabContent
                      tab={current}
                      config={config}
                      posts={shownPosts}
                      sections={shownSections}
                      user={user}
                      canEdit={canEdit}
                    />
                  ) : null}
                </div>
              </div>

              {/* 탭 영역 */}
              <div className="cy-tabs">
                <button
                  type="button"
                  className={"cy-tab-btn " + (activeTab === "home" ? "active" : "")}
                  onClick={() => setActiveTab("home")}
                >
                  <span className="cy-tab-line">홈</span>
                </button>
                {sortedTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={"cy-tab-btn " + (activeTab === tab.id ? "active" : "")}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="cy-tab-line">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* 제목 하나를 이름표와 함께 고치는 줄입니다. */
function SectionTitleRow({
  label,
  value,
  onSave
}: {
  label: string;
  value: string;
  onSave: (next: string) => Promise<void>;
}) {
  return (
    <div className="cy-admin-row">
      <span className="cy-admin-kind">{label}</span>
      <span className="cy-admin-name">
        <EditText value={value} canEdit label={label} onSave={onSave} />
      </span>
    </div>
  );
}
