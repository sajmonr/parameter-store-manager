import { useState } from 'react';

// Keeps the last non-null `value` while a modal fades out after it became
// null, so the modal doesn't go blank as it closes. `clear` drops it once
// the modal has closed (its afterClose).
const useRetainWhileClosing = <T>(value: T | null) => {
  const [shown, setShown] = useState(value);
  if (value !== null && value !== shown) setShown(value);
  return [shown, () => setShown(null)] as const;
};

export default useRetainWhileClosing;
