import { Card, Flex, Typography } from 'antd';
import { plural } from '../../utils/plural';
import FormatCards from './FormatCards';
import DecryptOption from './export/DecryptOption';
import ExportContentsSection from './export/ExportContentsSection';
import ExportFooter from './export/ExportFooter';
import ExportSection from './export/ExportSection';
import ScopeOptions from './export/ScopeOptions';
import useExportForm from './export/useExportForm';

// Exports parameters to a file. The count is a preview from the loaded
// parameters; the export itself reads AWS and keeps running when the page is
// left.
const ExportPanel = () => {
  const form = useExportForm();
  const { format, exporting, selected, counted } = form;

  return (
    <Flex vertical gap="middle">
      <Card title="Format">
        <FormatCards
          mode="export"
          value={format.id}
          onChange={form.setFormatId}
          disabled={exporting}
        />
      </Card>
      <Card
        title="What to export"
        extra={
          counted ? (
            <Typography.Text type="secondary" role="status">
              {plural(selected.length, 'parameter')}
            </Typography.Text>
          ) : null
        }
      >
        <Flex vertical gap="var(--ant-margin-md)">
          <ExportSection label="Parameters">
            <ScopeOptions
              scope={form.scope}
              onScope={form.setScope}
              path={form.path}
              onPath={form.setPath}
              suggestions={form.suggestions}
              matched={counted ? form.matched.map(p => p.Name) : null}
              total={form.exportable.length}
              disabled={exporting}
            />
          </ExportSection>
          <ExportContentsSection format={format} />
          <DecryptOption
            checked={form.includeSecureValues}
            onChange={form.setIncludeSecureValues}
            canImport={format.canImport}
            disabled={exporting}
          />
        </Flex>
      </Card>
      <ExportFooter
        progress={form.progress}
        status={form.status}
        exporting={exporting}
        canExport={form.canExport}
        count={selected.length}
        formatLabel={format.label}
        onExport={form.start}
      />
    </Flex>
  );
};

export default ExportPanel;
