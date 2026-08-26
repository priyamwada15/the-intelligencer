export function Header() {
  return (
    <header
      className="flex items-center justify-center px-6"
      style={{ paddingTop: "var(--pad-header-top)", paddingBottom: "var(--pad-header-bottom)" }}
    >
      <h1 className="text-center text-title font-bold uppercase text-text-primary">
        The Intelligencer
      </h1>
    </header>
  );
}
