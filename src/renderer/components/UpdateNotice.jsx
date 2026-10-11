import React, { useEffect } from 'react';
import { App, Button } from 'antd';
import * as api from '../clients/api';

// Asks the main process whether a newer release exists and, if so, shows a
// non-blocking notice. The main process memoises the check, so remounting
// (for example after a reload) neither re-fetches nor shows a second notice.
const UpdateNotice = () => {
  const { notification } = App.useApp();

  useEffect(() => {
    let cancelled = false;

    api
      .checkForUpdates()
      .then(result => {
        if (cancelled || !result || result.status !== 'available') return;
        notification.info({
          key: 'update-available',
          message: `Version ${result.version} is available`,
          description:
            'Download it from the release page, then replace the app in /Applications.',
          duration: 0,
          btn: (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                notification.destroy('update-available');
                api.openReleasePage().catch(console.error);
              }}
            >
              Open release page
            </Button>
          )
        });
      })
      .catch(error => {
        // The check is best effort; never bother the user about it failing.
        console.warn('Update check failed:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [notification]);

  return null;
};

export default UpdateNotice;
