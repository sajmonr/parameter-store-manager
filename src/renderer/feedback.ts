import { useLayoutEffect } from 'react';
import { App } from 'antd';

type AppFeedback = ReturnType<typeof App.useApp>;

// antd's static message/notification functions can't read theme context.
// <FeedbackBridge /> is rendered inside antd's <App> and fills these in, so
// code outside components (such as the parameter loader) can still show
// feedback.
export const feedback: {
  message: AppFeedback['message'] | null;
  notification: AppFeedback['notification'] | null;
} = { message: null, notification: null };

export const FeedbackBridge = () => {
  const { message, notification } = App.useApp();
  // A layout effect runs before later siblings' componentDidMount.
  useLayoutEffect(() => {
    feedback.message = message;
    feedback.notification = notification;
  }, [message, notification]);
  return null;
};
