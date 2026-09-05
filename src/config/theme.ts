export type PillColor = {
  bg: string;
  fg: string;
};

export type LinkTreeTheme = {
  colors: {
    cream: string;
    ink: string;
    dim: string;
    rose: string;
    brown: string;
    denim: string;
    latte: string;
    border: string;
    scrollTrack: string;
    scrollThumb: string;
    scrollThumbHover: string;
    spiralFront: string;
  };
  pillColors: PillColor[];
};

export const theme: LinkTreeTheme = {
  colors: {
    cream: "#F7F5FB",
    ink: "#4A4468",
    dim: "#9C93B8",
    rose: "#E8DFF5",
    brown: "#7C6FA6",
    denim: "#B8AED9",
    latte: "#EFEBF7",
    border: "rgba(124,111,166,0.25)",
    scrollTrack: "rgba(239,235,247,0.5)",
    scrollThumb: "linear-gradient(180deg, rgba(124,111,166,0.68), rgba(184,174,217,0.58))",
    scrollThumbHover: "linear-gradient(180deg, rgba(74,68,104,0.78), rgba(184,174,217,0.74))",
    spiralFront: "#9B7FD4"
  },
  pillColors: [
    { bg: "#E8DFF5", fg: "#4A4468" },
    { bg: "#7C6FA6", fg: "#F7F5FB" },
    { bg: "#B8AED9", fg: "#F7F5FB" },
    { bg: "#EFEBF7", fg: "#4A4468" }
  ]
};
