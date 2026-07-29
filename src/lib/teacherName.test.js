import { describe, it, expect } from 'vitest';
import { splitTeacherName, joinTeacherName, cleanName } from './teacherName';

describe('splitTeacherName', () => {
  it('splits a canonical title from the name', () => {
    expect(splitTeacherName('Dr. Ahmed Khan')).toEqual({ title: 'Dr.', rest: 'Ahmed Khan' });
  });

  it('normalises case and a missing dot', () => {
    expect(splitTeacherName('dr ahmed')).toEqual({ title: 'Dr.', rest: 'ahmed' });
    expect(splitTeacherName('DR. ahmed')).toEqual({ title: 'Dr.', rest: 'ahmed' });
    expect(splitTeacherName('mrs Sara')).toEqual({ title: 'Mrs.', rest: 'Sara' });
  });

  it('maps informal titles to their canonical form', () => {
    expect(splitTeacherName('Sir Abrar').title).toBe('Mr.');
    expect(splitTeacherName('Miss Hina').title).toBe('Ms.');
    expect(splitTeacherName('Madam Noor').title).toBe('Ms.');
    expect(splitTeacherName("Ma'am Noor").title).toBe('Ms.');
    expect(splitTeacherName('Maam Noor').title).toBe('Ms.');
  });

  it('returns an empty title when none is present', () => {
    expect(splitTeacherName('  Ahmed Khan ')).toEqual({ title: '', rest: 'Ahmed Khan' });
    expect(splitTeacherName()).toEqual({ title: '', rest: '' });
  });

  it('does not treat a name that merely starts with a title as titled', () => {
    expect(splitTeacherName('Drake Smith').title).toBe('');
  });
});

describe('joinTeacherName', () => {
  it('joins title and name', () => {
    expect(joinTeacherName('Dr.', 'Ahmed Khan')).toBe('Dr. Ahmed Khan');
  });

  it('collapses stray whitespace', () => {
    expect(joinTeacherName('Ms.', '  Sara    Ali ')).toBe('Ms. Sara Ali');
  });

  it('strips a title typed into the name', () => {
    expect(joinTeacherName('Dr.', 'Mr. Ahmed')).toBe('Dr. Ahmed');
  });

  it('returns an empty string when there is no name', () => {
    expect(joinTeacherName('Dr.', '   ')).toBe('');
  });
});

describe('cleanName', () => {
  it('collapses whitespace and trims', () => {
    expect(cleanName('  Applied   Physics ')).toBe('Applied Physics');
    expect(cleanName()).toBe('');
  });
});
