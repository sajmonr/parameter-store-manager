import { useEffect } from 'react';
import { App, Button } from 'antd';
import { updatesService } from '../services';

// Asks the main process whether a newer release exists and, if so, shows a
// non-blocking notice. The main process hands out an 'available' result only
// once per process, so remounting (for example after a reload) neither
// re-fetches nor shows a second notice.
const UpdateNotice = () => {
  const { notification } = App.useApp();

  useEffect(() => {
    let cancelled = false;

    updatesService
      .check()
      .then(result => {
        if (cancelled || !result || result.status !== 'available') return;
        notification.info({
          key: 'update-available',
          message: `Version ${result.version} is available`,
          description:
            result.instructions || 'Download it from the release page.',
          duration: 0,
          btn: (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                notification.destroy('update-available');
                updatesService.openReleasePage().catch(console.error);
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
