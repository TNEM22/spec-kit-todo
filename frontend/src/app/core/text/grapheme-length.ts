import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Text rules shared with the server (FR-020, research R14): input is NFC-normalised and trimmed,
 * and lengths count user-perceived characters, so an emoji counts as one.
 */

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

/** Normalise to NFC and trim spaces, tabs, line breaks and non-breaking spaces. */
export function cleanText(value: string): string {
  return value.normalize('NFC').trim();
}

/** Count user-perceived characters (grapheme clusters) in `value`. */
export function graphemeLength(value: string): number {
  if (!segmenter) {
    return Array.from(value).length;
  }
  return Array.from(segmenter.segment(value)).length;
}

/** Validator for required text of 1..`max` characters; mirrors the server message. */
export function requiredText(max: number, label: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cleaned = cleanText(String(control.value ?? ''));
    if (!cleaned) {
      return { text: `${label} is required. Enter 1 to ${max} characters.` };
    }
    if (graphemeLength(cleaned) > max) {
      return { text: `${label} is too long. Enter 1 to ${max} characters.` };
    }
    return null;
  };
}

/** Validator for optional text of up to `max` characters; mirrors the server message. */
export function optionalText(max: number, label: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cleaned = cleanText(String(control.value ?? ''));
    if (graphemeLength(cleaned) > max) {
      return { text: `${label} is too long. Enter up to ${max} characters.` };
    }
    return null;
  };
}
