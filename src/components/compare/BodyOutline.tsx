// Clean side-view outline used when no free photo of the car is available.
const PATHS: Record<string, string> = {
  sedan: "M20 70 L40 70 Q40 58 52 58 Q64 58 64 70 L136 70 Q136 58 148 58 Q160 58 160 70 L182 70 L182 58 Q180 50 160 47 L130 44 L108 30 Q100 26 88 26 L66 27 Q56 28 48 34 L36 44 Q22 46 20 54 Z",
  coupe: "M20 70 L40 70 Q40 58 52 58 Q64 58 64 70 L136 70 Q136 58 148 58 Q160 58 160 70 L182 70 L182 58 Q180 50 160 46 L126 43 L104 30 Q96 27 86 28 L66 30 Q56 32 46 40 L34 46 Q22 48 20 56 Z",
  convertible: "M20 70 L40 70 Q40 58 52 58 Q64 58 64 70 L136 70 Q136 58 148 58 Q160 58 160 70 L182 70 L182 58 Q180 50 160 46 L118 44 L100 38 L96 44 L50 44 L36 46 Q22 48 20 56 Z",
  hatchback: "M24 70 L42 70 Q42 58 54 58 Q66 58 66 70 L130 70 Q130 58 142 58 Q154 58 154 70 L172 70 L172 40 Q170 30 160 28 L104 26 Q94 26 86 32 L62 44 Q34 46 26 52 Z",
  wagon: "M18 70 L40 70 Q40 58 52 58 Q64 58 64 70 L136 70 Q136 58 148 58 Q160 58 160 70 L182 70 L182 36 Q180 29 170 28 L106 27 Q96 27 88 32 L64 44 Q34 46 22 52 Z",
  suv: "M20 72 L40 72 Q40 58 53 58 Q66 58 66 72 L134 72 Q134 58 147 58 Q160 58 160 72 L182 72 L182 34 Q181 24 170 23 L104 22 Q94 22 86 28 L64 42 Q30 44 22 50 Z",
  van: "M20 72 L40 72 Q40 58 53 58 Q66 58 66 72 L134 72 Q134 58 147 58 Q160 58 160 72 L182 72 L182 26 Q182 18 172 18 L74 18 Q64 18 56 26 L36 44 Q22 46 20 54 Z",
  truck: "M14 72 L36 72 Q36 58 49 58 Q62 58 62 72 L138 72 Q138 58 151 58 Q164 58 164 72 L186 72 L186 46 L112 46 L112 26 Q112 20 104 20 L74 20 Q66 20 60 28 L48 42 Q22 44 16 50 Z",
};

export function BodyOutline({ body, className = "" }: { body: string; className?: string }) {
  const d = PATHS[body] ?? PATHS.sedan;
  return (
    <svg viewBox="0 0 200 90" className={className} role="img" aria-label={`${body} outline (no photo available)`}>
      <path d={d} fill="#f4f4f5" stroke="#a1a1aa" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="52" cy="72" r="9" fill="#fff" stroke="#a1a1aa" strokeWidth="1.5" />
      <circle cx="148" cy="72" r="9" fill="#fff" stroke="#a1a1aa" strokeWidth="1.5" />
    </svg>
  );
}
