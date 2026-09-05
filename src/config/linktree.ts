export const profile = {
  teacherName: "최윤리",
  title: "최윤리의 미니홈피",
  introTitle: "최윤리의 미니홈피",
  introDescription: "윤리를 가르칩니다.",
  catalogTitle: "윤리고수",
  catalogDescription: "윤리를 가르칩니다.",
  /* 왼쪽 프로필 사진입니다. public/assets/ 안에 파일을 넣고 경로를 적으세요. */
  photo: { src: "/assets/profile.svg", alt: "최윤리 프로필 사진" },
  /* 홈 탭 위쪽 미니룸 이미지입니다. public/assets/ 안에 파일을 넣고 경로를 적으세요. */
  miniroom: { src: "/assets/miniroom.svg", alt: "최윤리의 미니룸" },
  /* 아래는 탭 이름표입니다. 나만의 이름으로 바꿔도 되고, 안 바꾸면 기본값 그대로 나옵니다. */
  storyLabel: "윤리툰",
  boardLabel: "윤리고수",
  boardSubtitle: "앱과 게시글",
  boardEmptyText: "아직 올린 글이 없습니다.",
  photoLabel: "사진첩",
  photoSubtitlePrefix: "사진",
  /* 오른쪽 위, 옛날 싸이월드 주소창을 흉내 낸 문구입니다. */
  displayUrl: "ethics.minihompy.com"
};

/* 프로필 탭에 들어가는 소개 글입니다. 문구만 바꿔서 쓰세요. */
export type ProfileBlock =
  | { kind: "text"; lines: string[] }
  | { kind: "list"; heading: string; items: string[] }
  | { kind: "contact"; items: { label: string; value: string; href: string }[] };

export type ProfileSection = {
  id: string;
  title: string;
  /* 제목 옆 작은 글씨입니다. 생략하면 제목만 나옵니다. */
  subtitle?: string;
  blocks: ProfileBlock[];
};

export const profileSections: ProfileSection[] = [
  {
    id: "intro",
    title: "최윤리의 여러가지 실험실",
    subtitle: "about me",
    blocks: [
      {
        kind: "text",
        lines: [
          "윤리를 가르칩니다.",
          "수업에서 쓸 도구를 직접 만들어 보며 이것저것 실험하고 있습니다."
        ]
      },
      {
        kind: "list",
        heading: "하고 있는 일들",
        items: ["윤리 수업 도구 설계 및 개발"]
      },
      {
        kind: "contact",
        items: [
          { label: "이메일", value: "moonflow@sen.go.kr", href: "mailto:moonflow@sen.go.kr" }
        ]
      }
    ]
  }
];

/* 미요툰 회차는 src/config/miyotoon.ts 에 있습니다. */
export { episodes, type Episode } from "./miyotoon";

/* 미요앱 탭입니다. 앱과 게시글 링크를 여기에 추가하세요.
   preview 는 화면 미리보기 이미지입니다. public/assets/apps 에 넣고 경로를 적으세요.
   생략하면 썸네일 없이 제목만 나옵니다. */
export type BoardPost = {
  id: string;
  category: "앱" | "글";
  title: string;
  summary?: string;
  date: string;
  href: string;
  preview?: { src: string; alt: string };
};

export const boardPosts: BoardPost[] = [];

/* 사진첩 탭입니다. */
export type PhotoItem = {
  id: string;
  name: string;
  src: string;
};

export const photos: PhotoItem[] = [];

/* 왼쪽 아래 파도타기 목록입니다.
   고정 규칙: 첫 번째 항목은 반드시 "도름스 커뮤니티 나의 활동" 링크입니다. 지우지 마세요. */
export type WaveLink = {
  id: string;
  label: string;
  href: string;
};

export const waveLinks: WaveLink[] = [
  { id: "dorms-activity", label: "도름스 커뮤니티 나의 활동", href: "" }
];

/* 미니홈피 BGM 입니다. 유튜브 영상을 음원으로 씁니다.
   videoId 는 https://www.youtube.com/watch?v=abcd1234XYZ 에서 v= 뒤에 오는 값입니다.
   배열을 비우면 플레이어가 아예 표시되지 않습니다.

   여러 곡이 이어진 플레이리스트 영상이라면, 같은 videoId 를 쓰면서 startAt 에
   각 곡이 시작하는 지점을 초 단위로 적으세요. 제목을 누르면 그 지점부터 재생됩니다.
   startAt 은 secondsAt("3:21") 처럼 적으면 편합니다. */
export type BgmTrack = {
  id: string;
  title: string;
  artist?: string;
  videoId: string;
  /* 영상 안에서 이 곡이 시작하는 지점입니다. 초 단위이고, 생략하면 처음부터입니다. */
  startAt?: number;
};

/* "3:21" 이나 "1:02:30" 을 초로 바꿔 줍니다. */
export function secondsAt(timestamp: string): number {
  return timestamp
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

export const bgmTracks: BgmTrack[] = [
  {
    id: "cyworld-bgm",
    title: "도토리 쓴 싸이월드 BGM 플레이리스트",
    artist: "1132 PLAYLIST",
    videoId: "ShxagKy3CHQ"
  }
];

/* 홈 탭 아래쪽 한마디입니다. */
export type GuestbookEntry = {
  id: number;
  author: string;
  text: string;
  date: string;
};

export const guestbook: GuestbookEntry[] = [
  { id: 1, author: "익명의 세화여고인", text: "윤리 사랑해요.", date: "2026.09.01" },
  { id: 2, author: "익명의 세화여고인 2", text: "윤리 배우고 멋진 사람 되자!", date: "2026.09.02" },
  { id: 3, author: "익명의 세화여고인 3", text: "쌤 수업 들으면 하루가 좀 착해지는 기분이에요 ☺", date: "2026.09.02" },
  { id: 4, author: "익명의 세화여고인 4", text: "오늘 배운 정의론 계속 생각나요… 저 요즘 철학 좋아하나 봐요!", date: "2026.09.03" },
  { id: 5, author: "익명의 세화여고인 5", text: "쌤 미니홈피 감성 무슨 일이야ㅠㅠ 도토리 드리고 싶다", date: "2026.09.03" },
  { id: 6, author: "익명의 세화여고인 6", text: "시험 잘 보고 올게요! 지켜봐 주세요 :)", date: "2026.09.04" },
  { id: 7, author: "익명의 세화여고인 7", text: "일촌 신청합니다~ 방명록 자주 놀러 올게요!", date: "2026.09.04" }
];
