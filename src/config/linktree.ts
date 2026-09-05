export const profile = {
  teacherName: "최윤리",
  title: "윤리고수의 윤리실험실",
  introTitle: "최윤리의 미니홈피",
  introDescription: "윤리를 가르칩니다.",
  /* 홈 탭 오른쪽 위, 미니룸 바로 위에 나오는 제목입니다. */
  catalogTitle: "윤리고수의 윤리실험실",
  /* 이름 바로 아래 작은 글씨입니다. */
  catalogDescription: "세화여자고등학교",
  /* 프로필 사진 바로 아래 소개입니다. 줄바꿈(\n)은 그대로 줄이 나뉘어 보입니다. */
  photoCaption: "윤리를 사랑하고 가르칩니다.\n디지털 AI로 학생들이 더욱 재미있게 접근할 수 있도록 실험합니다.",
  /* 왼쪽 프로필 사진입니다. public/assets/ 안에 파일을 넣고 경로를 적으세요. */
  photo: { src: "/assets/f685b148cc81d77507d107e1f8262906.jpg", alt: "최윤리 프로필 사진" },
  /* 홈 탭 위쪽 미니룸 이미지입니다. public/assets/ 안에 파일을 넣고 경로를 적으세요. */
  miniroom: { src: "/assets/2bdc65f5af88d1b7f7b243b59efaa17b.jpg", alt: "최윤리의 미니룸" },
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

/* 한 편의 플레이리스트 영상(1132 PLAYLIST, 도토리 쓰던 싸이월드 BGM) 안의 곡들입니다.
   videoId 는 모두 같고 startAt 만 다릅니다. 제목을 누르면 그 곡부터 재생됩니다. */
const CYWORLD_BGM = "ShxagKy3CHQ";

export const bgmTracks: BgmTrack[] = [
  { id: "bgm-01", title: "프리스타일 - Y", videoId: CYWORLD_BGM, startAt: secondsAt("0:01") },
  { id: "bgm-02", title: "샵(S#arp) - 내 입술 따뜻한 커피처럼", videoId: CYWORLD_BGM, startAt: secondsAt("4:35") },
  { id: "bgm-03", title: "윤미래 - Memories", videoId: CYWORLD_BGM, startAt: secondsAt("8:19") },
  { id: "bgm-04", title: "박명호 - 사진 (하늘만 바라봐)", videoId: CYWORLD_BGM, startAt: secondsAt("12:30") },
  { id: "bgm-05", title: "에픽하이 - 우산 (feat. 윤하)", videoId: CYWORLD_BGM, startAt: secondsAt("16:27") },
  { id: "bgm-06", title: "리쌍 - Ballerino", videoId: CYWORLD_BGM, startAt: secondsAt("21:22") },
  { id: "bgm-07", title: "키네틱플로우 - 몽환의 숲 (feat. 이루마)", videoId: CYWORLD_BGM, startAt: secondsAt("25:44") },
  { id: "bgm-08", title: "MC몽 - 너에게 쓰는 편지 (feat. 린)", videoId: CYWORLD_BGM, startAt: secondsAt("29:49") },
  { id: "bgm-09", title: "브라운 아이즈 - 벌써 일년", videoId: CYWORLD_BGM, startAt: secondsAt("33:15") },
  { id: "bgm-10", title: "김동률 - 다시 사랑한다 말할까", videoId: CYWORLD_BGM, startAt: secondsAt("36:41") },
  { id: "bgm-11", title: "프리스타일 - 수취인불명", videoId: CYWORLD_BGM, startAt: secondsAt("41:27") },
  { id: "bgm-12", title: "싸이 - 낙원 (feat. 이재훈)", videoId: CYWORLD_BGM, startAt: secondsAt("45:25") },
  { id: "bgm-13", title: "MC 스나이퍼 - BK Love", videoId: CYWORLD_BGM, startAt: secondsAt("49:07") },
  { id: "bgm-14", title: "타우 - 우리들의 행복한 시간", videoId: CYWORLD_BGM, startAt: secondsAt("53:28") },
  { id: "bgm-15", title: "넬 - 기억을 걷는 시간", videoId: CYWORLD_BGM, startAt: secondsAt("57:15") },
  { id: "bgm-16", title: "다이나믹 듀오 - Ring My Bell", videoId: CYWORLD_BGM, startAt: secondsAt("1:02:27") },
  { id: "bgm-17", title: "바이브 - Promise U", videoId: CYWORLD_BGM, startAt: secondsAt("1:06:15") },
  { id: "bgm-18", title: "포맨 - 다시 사랑할 수 있을까", videoId: CYWORLD_BGM, startAt: secondsAt("1:10:19") },
  { id: "bgm-19", title: "Brown Eyed Girls - Far Away (feat. MC몽)", videoId: CYWORLD_BGM, startAt: secondsAt("1:14:59") },
  { id: "bgm-20", title: "키네틱플로우 - 헤어지던 밤 (feat. 혜란)", videoId: CYWORLD_BGM, startAt: secondsAt("1:18:41") },
  { id: "bgm-21", title: "리쌍 - 헤어지지 못하는 여자, 떠나가지 못하는 남자", videoId: CYWORLD_BGM, startAt: secondsAt("1:23:04") },
  { id: "bgm-22", title: "임정희 - 눈물이 안 났어", videoId: CYWORLD_BGM, startAt: secondsAt("1:27:47") },
  { id: "bgm-23", title: "씨야 - 사랑의 인사", videoId: CYWORLD_BGM, startAt: secondsAt("1:31:24") },
  { id: "bgm-24", title: "izi - 응급실", videoId: CYWORLD_BGM, startAt: secondsAt("1:35:56") },
  { id: "bgm-25", title: "버즈 - 남자를 몰라", videoId: CYWORLD_BGM, startAt: secondsAt("1:39:38") },
  { id: "bgm-26", title: "에이트 - 사랑을 잃고 나 노래하네", videoId: CYWORLD_BGM, startAt: secondsAt("1:43:47") },
  { id: "bgm-27", title: "리쌍 - Rush (feat. 정인)", videoId: CYWORLD_BGM, startAt: secondsAt("1:47:47") },
  { id: "bgm-28", title: "나얼 - 귀로", videoId: CYWORLD_BGM, startAt: secondsAt("1:51:38") },
  { id: "bgm-29", title: "김종국 & SG워너비 - 바람만 바람만", videoId: CYWORLD_BGM, startAt: secondsAt("1:56:03") },
  { id: "bgm-30", title: "마골피 - 비행소녀", videoId: CYWORLD_BGM, startAt: secondsAt("2:00:23") },
  { id: "bgm-31", title: "버즈 - 가시", videoId: CYWORLD_BGM, startAt: secondsAt("2:05:59") },
  { id: "bgm-32", title: "MC 스나이퍼 - 봄이여 오라", videoId: CYWORLD_BGM, startAt: secondsAt("2:08:58") },
  { id: "bgm-33", title: "리즈 - 그댄 행복에 살텐데", videoId: CYWORLD_BGM, startAt: secondsAt("2:12:42") },
  { id: "bgm-34", title: "바이브 - 사진을 보다가", videoId: CYWORLD_BGM, startAt: secondsAt("2:17:21") },
  { id: "bgm-35", title: "클래지콰이 - She Is", videoId: CYWORLD_BGM, startAt: secondsAt("2:21:56") },
  { id: "bgm-36", title: "더 넛츠 - 잔소리", videoId: CYWORLD_BGM, startAt: secondsAt("2:25:40") },
  { id: "bgm-37", title: "임정희 - 시계태엽", videoId: CYWORLD_BGM, startAt: secondsAt("2:29:36") },
  { id: "bgm-38", title: "배치기 - 현관을 열면", videoId: CYWORLD_BGM, startAt: secondsAt("2:33:05") },
  { id: "bgm-39", title: "이루 - 까만안경", videoId: CYWORLD_BGM, startAt: secondsAt("2:37:48") }
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
