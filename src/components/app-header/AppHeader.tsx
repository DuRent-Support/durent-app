import HeaderProfile from "./HeaderProfile";
import HeaderDurent from "./HeaderDurent";

export default function AppHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 hidden h-16 items-center border-b border-border/60 bg-background/95 px-4 backdrop-blur md:flex md:px-6">
      <div className="flex items-center justify-between w-full">
        <HeaderDurent />
        <HeaderProfile />
      </div>
    </header>
  );
}
