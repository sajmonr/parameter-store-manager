import { Button, Flex, Typography } from 'antd';
import { uiActions } from '../../state/ui';
import { submitShortcutLabel } from '../../utils/keys';
import PartialFailureAlert from '../common/PartialFailureAlert';
import styles from './ParameterForm.module.css';

// What a partly failed create did, and the buttons.
const FormFooter = ({
  targets,
  failed,
  ready,
  submitting
}: {
  // How many parameters the form creates, and how many failed last time.
  targets: number;
  failed: number;
  ready: boolean;
  submitting: boolean;
}) => (
  <>
    {failed > 0 && (
      <PartialFailureAlert
        verb="Created"
        done={targets - failed}
        total={targets}
        className={styles.alert}
      />
    )}
    <Flex align="center" gap="small">
      <Typography.Text type="secondary" className={styles.hint}>
        {submitShortcutLabel} to create
      </Typography.Text>
      <Button onClick={uiActions.closePane}>Cancel</Button>
      <Button
        type="primary"
        htmlType="submit"
        disabled={!ready}
        loading={submitting}
      >
        {failed > 0 && 'Retry failed'}
        {!failed &&
          (targets > 1
            ? `Create in ${targets} environments`
            : 'Create parameter')}
      </Button>
    </Flex>
  </>
);

export default FormFooter;
