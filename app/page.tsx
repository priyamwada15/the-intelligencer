import { Header } from "@/components/Header";
import { EditionDateBar } from "@/components/EditionDateBar";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-[560px] pb-10 pt-12">
      <Header />
      <EditionDateBar date="Thursday, August 20" />
    </main>
  );
}
