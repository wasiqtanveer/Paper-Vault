import { describe, it, expect } from 'vitest';
import { teacherLabel, departmentsOf } from './teacherName';

describe('teacherLabel', () => {
  it('appends the department', () => {
    expect(teacherLabel({ name: 'Dr. Rabia Khan', department: 'Physics' })).toBe('Dr. Rabia Khan · Physics');
  });

  it('shows just the name without a department', () => {
    expect(teacherLabel({ name: 'Mr. Ali', department: null })).toBe('Mr. Ali');
    expect(teacherLabel({ name: 'Mr. Ali', department: '' })).toBe('Mr. Ali');
  });
});

describe('departmentsOf', () => {
  it('returns distinct, sorted, trimmed departments', () => {
    const teachers = [
      { department: 'Physics' },
      { department: ' Maths ' },
      { department: 'Physics' },
      { department: 'Chemistry' },
    ];
    expect(departmentsOf(teachers)).toEqual(['Chemistry', 'Maths', 'Physics']);
  });

  it('skips missing and blank departments', () => {
    expect(departmentsOf([{ department: null }, {}, { department: '   ' }])).toEqual([]);
  });

  it('defaults to an empty list', () => {
    expect(departmentsOf()).toEqual([]);
  });
});
