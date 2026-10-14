import { useCallback } from 'react';
import { App } from 'antd';

// Returns copy(text): writes to the clipboard and confirms with a message.
const useCopy = () => {
  const { message } = App.useApp();
  return useCallback(
    text =>
      navigator.clipboard.writeText(text).then(
        () =>
          message.success({ content: 'Copied to clipboard', duration: 1.6 }),
        () => message.error('Could not copy to the clipboard')
      ),
    [message]
  );
};

export default useCopy;
