// Shown above every private preview Locker and room while previews are used
// as demos. It makes no rights claim about the media shown.
export default function PrototypeBanner() {
  return (
    <div role="note" aria-label="Prototype notice" className="relative z-[60] w-full border-b-2 border-black bg-[#ffbb00] px-4 py-3 text-center text-black sm:py-4">
      <p className="text-sm font-black uppercase tracking-[0.18em] sm:text-base">Prototype / Demo — Private preview</p>
      <p className="mx-auto mt-1 max-w-4xl text-xs font-medium leading-snug sm:text-sm">
        Not available for public view. BLTZ does not claim or guarantee any rights to the photos or media shown, pending an agreement with the rights holders.
      </p>
    </div>
  );
}
