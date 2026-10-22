import styles from './EnvironmentDot.module.css';

// An environment's colour, next to its name.
const EnvironmentDot = ({
  color,
  className
}: {
  color: string;
  className?: string;
}) => (
  <span
    className={className ? `${styles.dot} ${className}` : styles.dot}
    style={{ background: color }}
    aria-hidden
  />
);

export default EnvironmentDot;
