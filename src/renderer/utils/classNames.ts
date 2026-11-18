// Joins the class names that are set: cx(styles.row, selected && styles.selected).
export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');
