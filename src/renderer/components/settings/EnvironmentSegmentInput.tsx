import { segmentError } from '../../../shared/structure';
import { usePathDelimiter } from '../../state/settings';
import { updateStructure } from '../../state/settingsChanges';
import { addEnvironment, renameEnvironment } from '../../utils/structureEdits';
import SegmentInput from './SegmentInput';

// An environment's path segment, renamed on save; or, with no `segment`,
// the one being added, with `color`. `segments` are every configured one.
const EnvironmentSegmentInput = ({
  segment,
  color,
  segments,
  onAdded
}: {
  segment: string | null;
  color: string;
  segments: string[];
  // The added environment was saved, or its input cancelled.
  onAdded: () => void;
}) => {
  const delimiter = usePathDelimiter();
  if (segment === null) {
    return (
      <SegmentInput
        label="New environment"
        value=""
        autoFocus
        validate={value => segmentError(value, delimiter, segments)}
        onSave={added =>
          updateStructure(current =>
            addEnvironment(current, added, color)
          ).then(onAdded)
        }
        onCancel={onAdded}
      />
    );
  }
  return (
    <SegmentInput
      label={`Environment ${segment}`}
      value={segment}
      validate={value =>
        segmentError(
          value,
          delimiter,
          segments.filter(s => s !== segment)
        )
      }
      onSave={renamed =>
        updateStructure(current => renameEnvironment(current, segment, renamed))
      }
    />
  );
};

export default EnvironmentSegmentInput;
