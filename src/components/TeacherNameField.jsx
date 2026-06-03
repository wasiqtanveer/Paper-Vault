import CustomSelect from './CustomSelect';
import { TEACHER_TITLES } from '../lib/teacherName';
import { departmentOptions } from '../lib/departments';
import './TeacherNameField.css';

/**
 * Title (Mr./Ms./Mrs./Dr.) + name, with an optional department picker beneath.
 *
 * The title dropdown starts empty so it can't be skipped by a silently-assumed
 * default; callers validate that one was chosen. Departments come from the
 * official KUST list (lib/departments.js) rather than free text, so the same
 * department can't fork into "CS", "Comp Sci" and "Computer Science".
 */
export default function TeacherNameField({
  title, name, onTitleChange, onNameChange,
  department, onDepartmentChange,
  onKeyDown, autoFocus, compact = false, placeholder = 'Full name…',
}) {
  const withDept = typeof onDepartmentChange === 'function';
  return (
    <div className={'tnf' + (compact ? ' tnf-compact' : '')}>
      <div className="tnf-row">
        <div className="tnf-title">
          <CustomSelect
            value={title}
            onChange={onTitleChange}
            placeholder="Title"
            ariaLabel="Title"
            options={TEACHER_TITLES.map(t => ({ value: t, label: t }))}
          />
        </div>
        <input
          className="tnf-name"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Teacher name"
          maxLength={80}
        />
      </div>
      {withDept && (
        <CustomSelect
          value={department ?? ''}
          onChange={onDepartmentChange}
          placeholder="Select department…"
          ariaLabel="Department"
          options={departmentOptions(department)}
          searchable
        />
      )}
    </div>
  );
}
