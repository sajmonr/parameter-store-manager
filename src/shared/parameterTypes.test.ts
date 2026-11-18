import { describe, expect, it } from 'vitest';
import {
  ALL_PARAMETER_TYPES,
  PARAMETER_TYPES,
  isEditableType,
  isSecure,
  isSecureType,
  listTypes
} from './parameterTypes';

describe('parameter types', () => {
  it('tells editable types apart', () => {
    expect(isEditableType('String')).toBe(true);
    expect(isEditableType('SecureString')).toBe(true);
    expect(isEditableType('StringList')).toBe(false);
    expect(isEditableType(undefined)).toBe(false);
  });

  it('tells secure types and parameters apart', () => {
    expect(isSecureType('SecureString')).toBe(true);
    expect(isSecureType('String')).toBe(false);
    expect(isSecureType(undefined)).toBe(false);
    expect(isSecure({ Type: 'SecureString' })).toBe(true);
    expect(isSecure({})).toBe(false);
    expect(isSecure(null)).toBe(false);
  });

  it('lists types for messages', () => {
    expect(listTypes(ALL_PARAMETER_TYPES)).toBe(
      'String, SecureString or StringList'
    );
    expect(listTypes(PARAMETER_TYPES)).toBe('String or SecureString');
    expect(listTypes(['String'])).toBe('String');
  });
});
