// A Parameter Store kept in a JSON file. The first use copies the checked-in
// fixture to a working file; changes are written there, so they last across
// restarts and never show up in git. Deleting the working file starts over.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname } from 'node:path';
import type {
  DeleteParameterCommandInput,
  DescribeParametersCommandInput,
  DescribeParametersCommandOutput,
  GetParametersCommandInput,
  GetParametersCommandOutput,
  Parameter,
  ParameterMetadata,
  ParameterType,
  PutParameterCommandInput
} from '@aws-sdk/client-ssm';

export interface FakeParameter {
  Name: string;
  Type: ParameterType;
  Value: string;
  Description?: string;
  // SecureString only.
  KeyId?: string;
  Version: number;
  // ISO date.
  LastModifiedDate: string;
  LastModifiedUser?: string;
}

export interface FakeAlias {
  AliasName: string;
  TargetKeyId: string;
}

export interface FakeDataset {
  accountId: string;
  aliases: FakeAlias[];
  parameters: FakeParameter[];
}

// Errors carry the names AWS uses, so the app handles them the same way.
export const awsError = (name: string, message: string) =>
  Object.assign(new Error(message), { name });

const ARN_PREFIX = 'arn:aws:ssm:fake-region:000000000000:parameter';

const metadataOf = ({
  Value: _value,
  ...rest
}: FakeParameter): ParameterMetadata => ({
  ...rest,
  LastModifiedDate: new Date(rest.LastModifiedDate),
  Tier: 'Standard',
  DataType: 'text'
});

const parameterOf = (parameter: FakeParameter): Parameter => ({
  Name: parameter.Name,
  Type: parameter.Type,
  Value: parameter.Value,
  Version: parameter.Version,
  LastModifiedDate: new Date(parameter.LastModifiedDate),
  ARN: `${ARN_PREFIX}${parameter.Name.startsWith('/') ? '' : '/'}${parameter.Name}`,
  DataType: 'text'
});

const beginsWithOf = (input: DescribeParametersCommandInput) => {
  const filter = input.ParameterFilters?.find(
    f => f.Key === 'Name' && f.Option === 'BeginsWith'
  );
  return filter?.Values?.[0] ?? '';
};

export class FakeParameterStore {
  private data: FakeDataset | null = null;

  constructor(
    private readonly fixturePath: string,
    private readonly workingPath: string,
    // The most parameters a describe page returns.
    private readonly pageSize = 50
  ) {}

  private load(): FakeDataset {
    if (!this.data) {
      if (!existsSync(this.workingPath)) {
        mkdirSync(dirname(this.workingPath), { recursive: true });
        copyFileSync(this.fixturePath, this.workingPath);
      }
      this.data = JSON.parse(
        readFileSync(this.workingPath, 'utf8')
      ) as FakeDataset;
    }
    return this.data;
  }

  private save() {
    writeFileSync(this.workingPath, `${JSON.stringify(this.data, null, 2)}\n`);
  }

  private find(name: string) {
    return this.load().parameters.find(p => p.Name === name);
  }

  get accountId() {
    return this.load().accountId;
  }

  get aliases() {
    return this.load().aliases;
  }

  // Sorted by name, like a stable SSM listing. The token is the offset.
  describe(
    input: DescribeParametersCommandInput
  ): DescribeParametersCommandOutput {
    const prefix = beginsWithOf(input);
    const matching = this.load()
      .parameters.filter(p => p.Name.startsWith(prefix))
      .sort((a, b) => (a.Name < b.Name ? -1 : a.Name > b.Name ? 1 : 0));
    const start = Number(input.NextToken ?? 0);
    if (!Number.isInteger(start) || start < 0) {
      throw awsError('InvalidNextToken', 'The specified token is not valid.');
    }
    const size = Math.min(input.MaxResults ?? this.pageSize, this.pageSize);
    const end = start + size;
    return {
      Parameters: matching.slice(start, end).map(metadataOf),
      NextToken: end < matching.length ? String(end) : undefined,
      $metadata: {}
    };
  }

  get(input: GetParametersCommandInput): GetParametersCommandOutput {
    const names = input.Names ?? [];
    const found = names.flatMap(name => {
      const parameter = this.find(name);
      return parameter ? [parameter] : [];
    });
    return {
      Parameters: found.map(parameterOf),
      InvalidParameters: names.filter(name => !this.find(name)),
      $metadata: {}
    };
  }

  // Creates a parameter, or with Overwrite saves a new version of it.
  put(input: PutParameterCommandInput) {
    const { Name, Value, Type, Description, KeyId, Overwrite } = input;
    if (!Name || Value === undefined) {
      throw awsError('ValidationException', 'Name and Value are required.');
    }
    const existing = this.find(Name);
    if (existing && !Overwrite) {
      throw awsError(
        'ParameterAlreadyExists',
        'The parameter already exists. To overwrite this value, set the overwrite option in the request to true.'
      );
    }
    const type = Type ?? existing?.Type ?? 'String';
    const parameter: FakeParameter = {
      Name,
      Type: type,
      Value,
      Description: Description ?? existing?.Description,
      KeyId: type === 'SecureString' ? (KeyId ?? 'alias/aws/ssm') : undefined,
      Version: (existing?.Version ?? 0) + 1,
      LastModifiedDate: new Date().toISOString(),
      LastModifiedUser: 'arn:aws:iam::000000000000:user/fake-developer'
    };
    const { parameters } = this.load();
    if (existing) parameters[parameters.indexOf(existing)] = parameter;
    else parameters.push(parameter);
    this.save();
    return { Version: parameter.Version, Tier: 'Standard' as const };
  }

  delete({ Name }: DeleteParameterCommandInput) {
    const data = this.load();
    const index = data.parameters.findIndex(p => p.Name === Name);
    if (index < 0)
      throw awsError('ParameterNotFound', `Parameter ${Name} not found.`);
    data.parameters.splice(index, 1);
    this.save();
  }

  // Back to the fixture: the working file is copied again on next use.
  reset() {
    rmSync(this.workingPath, { force: true });
    this.data = null;
  }
}
