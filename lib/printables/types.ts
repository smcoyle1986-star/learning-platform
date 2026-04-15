export type PrintableCard = {
  id: string;
  word: string;
  image: string;
  type?: string;
};

export type PrintableContentOption = "picture+word" | "picture-only";

export type PrintableBuildOptions = {
  pages: PrintableCard[][];
  contentOption: PrintableContentOption;
  inkSaving: boolean;
  siteHeaderHtml: string;
};
