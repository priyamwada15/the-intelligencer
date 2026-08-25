import { IntelligencerScreen } from "@/components/IntelligencerScreen";
import { placeholderArticle } from "@/data/placeholder-article";

export default function Home() {
  return (
    <IntelligencerScreen
      article={placeholderArticle}
      date="Thursday, August 20"
      activeCategory="MODELS"
      index={0}
      total={3}
    />
  );
}
