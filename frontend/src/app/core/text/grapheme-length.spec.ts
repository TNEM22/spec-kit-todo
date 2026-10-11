import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { cleanText, graphemeLength, optionalText, requiredText } from './grapheme-length';

const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}';

describe('grapheme-length', () => {
  it('counts a family emoji as one character although it has five code points', () => {
    expect(graphemeLength(FAMILY)).toBe(1);
    expect(FAMILY.length).toBe(8); // UTF-16 units: why `.length` is the wrong counter
  });

  it('accepts 200 emoji and rejects 201 (same rule as the server)', () => {
    const control = (value: string) => new FormControl(value, [requiredText(200, 'Title')]);
    expect(control(FAMILY.repeat(200)).valid).toBe(true);
    expect(control(FAMILY.repeat(201)).errors?.['text']).toBe(
      'Title is too long. Enter 1 to 200 characters.',
    );
  });

  it('trims tabs, line breaks and non-breaking spaces and treats whitespace-only as empty', () => {
    expect(cleanText('\t  Hello \n')).toBe('Hello');
    const control = new FormControl(' \t \n', [requiredText(200, 'Title')]);
    expect(control.errors?.['text']).toBe('Title is required. Enter 1 to 200 characters.');
  });

  it('normalises to NFC', () => {
    expect(cleanText('é')).toBe('é');
  });

  it('optional text allows empty and enforces the maximum', () => {
    const control = (value: string) => new FormControl(value, [optionalText(5, 'Note')]);
    expect(control('').valid).toBe(true);
    expect(control('12345').valid).toBe(true);
    expect(control('123456').errors?.['text']).toBe('Note is too long. Enter up to 5 characters.');
  });
});
