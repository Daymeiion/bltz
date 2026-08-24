import { useId } from "react";

export type SparklineProps = {
  values: readonly number[];
  label: string;
  summary: string;
  width?: number;
  height?: number;
};

export function Sparkline({ values, label, summary, width = 128, height = 44 }: SparklineProps) {
  const titleId = useId();
  const descriptionId = useId();
  const finite = values.filter(Number.isFinite);
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 0;
  const spread = max - min || 1;
  const points = finite.map((value, index) => {
    const x = finite.length <= 1 ? width / 2 : (index / (finite.length - 1)) * width;
    const y = height - 4 - ((value - min) / spread) * (height - 8);
    return `${x},${y}`;
  }).join(" ");

  return (
    <figure className="crm-sparkline">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>{label}</title><desc id={descriptionId}>{summary}</desc>
        {points ? <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
