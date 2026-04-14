/**
 * 依存ゼロの小型スパークライン (SVG bars)。
 *
 * ウォッチリストのカード内に 3〜5 期分の推移を詰め込むために、
 * recharts を読み込まずに済む軽量版として実装する。
 *
 * - 負値は 0 基準線より下に描く (赤系)
 * - 最新期は強調色 (濃)
 * - すべて null のときは何も描かない
 */

interface Point {
  year: number;
  value: number | null;
}

interface Props {
  data: Point[];
  color?: string;
  /** 負値バーの色 (省略時は赤系) */
  negativeColor?: string;
  width?: number;
  height?: number;
  /** 下部に年度ラベルを表示するか */
  showYears?: boolean;
}

export default function MiniSparkline({
  data,
  color = "#3b82f6",
  negativeColor = "#ef4444",
  width = 160,
  height = 44,
  showYears = true,
}: Props) {
  const n = data.length;
  if (n === 0) return null;

  const values = data.map((d) => d.value);
  const hasAnyValue = values.some((v) => v != null);
  if (!hasAnyValue) {
    return (
      <div
        className="text-[10px] text-slate-400 flex items-center justify-center"
        style={{ height }}
      >
        データなし
      </div>
    );
  }

  const max = Math.max(0, ...values.map((v) => v ?? 0));
  const min = Math.min(0, ...values.map((v) => v ?? 0));
  const range = Math.max(1, max - min);
  const zeroY = (max / range) * height;

  const barGap = 2;
  const barW = Math.max(2, (width - barGap * (n - 1)) / n);

  return (
    <div className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="経年推移スパークライン"
        className="block"
      >
        {/* 0 基準線 (max と min が 0 を跨ぐときだけ薄く引く) */}
        {min < 0 && (
          <line
            x1={0}
            x2={width}
            y1={zeroY}
            y2={zeroY}
            stroke="#e2e8f0"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {data.map((d, i) => {
          const x = i * (barW + barGap);
          if (d.value == null) {
            return (
              <line
                key={i}
                x1={x + barW / 2}
                x2={x + barW / 2}
                y1={zeroY - 2}
                y2={zeroY + 2}
                stroke="#cbd5e1"
                vectorEffect="non-scaling-stroke"
              />
            );
          }
          const h = (Math.abs(d.value) / range) * height;
          const y = d.value >= 0 ? zeroY - h : zeroY;
          const fill = d.value >= 0 ? color : negativeColor;
          const isLast = i === n - 1;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(1, h)}
              fill={fill}
              opacity={isLast ? 1 : 0.5}
              rx={1}
            >
              <title>
                FY{d.year}: {d.value.toLocaleString()}
              </title>
            </rect>
          );
        })}
      </svg>
      {showYears && n > 1 && (
        <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 leading-none">
          <span>FY{data[0].year}</span>
          <span>FY{data[n - 1].year}</span>
        </div>
      )}
    </div>
  );
}
