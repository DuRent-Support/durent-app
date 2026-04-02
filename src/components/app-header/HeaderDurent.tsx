import Image from "next/image";

export default function HeaderDurent() {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground">
        <Image
          src="/durent-black.webp"
          alt="DuRent"
          width={30}
          height={30}
          priority
        />
      </div>
      <span className="font-display text-sm font-semibold tracking-wide text-foreground">
        DuRent
      </span>
    </div>
  );
}
