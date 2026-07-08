import { MEASURE_COLOR, MEASURE_HATCH } from "../core/types";
import type { MeasureBand } from "../core/types";
import styles from "../styles/inspector.module.css";

export function MeasureOverlay({ bands }: { bands: MeasureBand[] }) {
  return (
    <>
      {bands.map((b, i) => (
        <div
          key={i}
          className={styles.measureBand}
          style={{
            top: b.top,
            left: b.left,
            width: b.width,
            height: b.height,
            backgroundImage: MEASURE_HATCH,
            outline: `1px dashed ${MEASURE_COLOR}80`,
          }}
        >
          <span className={styles.measureBandLabel}>
            {Math.round(b.distance)}
          </span>
        </div>
      ))}
    </>
  );
}
