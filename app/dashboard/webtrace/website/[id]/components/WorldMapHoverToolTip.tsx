import { ReactNode, useEffect, useState } from 'react';
import { Tooltip } from 'react-basics';
import styles from './WorldMap.module.css';

export function HoverTooltip({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: { clientX: any; clientY: any }) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handler);

    return () => {
      document.removeEventListener('mousemove', handler);
    };
  }, []);

  return (
    <Tooltip
      className={styles.tooltip}
      style={{ left: position.x, top: position.y }}>
      {children}
    </Tooltip>
  );
}

export default HoverTooltip;
