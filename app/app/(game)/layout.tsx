import { Alegreya } from "next/font/google";
import MusicProvider from "@/components/MusicProvider";
import ThemeProvider from "@/components/ThemeProvider";

const gameFont = Alegreya({ subsets: ["latin"] });

/** Shared by every game screen: menu, login, register and /play. */
export default function GameLayout({ children }: LayoutProps<"/">) {
  return (
    <ThemeProvider className={`${gameFont.className} flex min-h-dvh flex-1 flex-col bg-ink text-parchment`}>
      {/* In the layout so music keeps playing when moving between screens. */}
      <MusicProvider>{children}</MusicProvider>
    </ThemeProvider>
  );
}
