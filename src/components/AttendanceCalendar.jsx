import { useState } from 'react';

/**
 * Attendance Calendar Component
 * Shows monthly calendar with color-coded attendance:
 * - Green: Present (checked in)
 * - Red: Absent (no check-in)
 * - Grey: Future dates or before joining
 * 
 * @param {Array} attendanceRecords - Array of attendance records with date and checkin_time
 * @param {string} joiningDate - Staff joining date (YYYY-MM-DD)
 * @param {number} currentMonth - Current month offset (0 = current, -1 = last month, etc)
 * @param {function} onMonthChange - Callback when month changes
 */
export default function AttendanceCalendar({
    attendanceRecords = [],
    joiningDate = null,
    currentMonth = 0,
    onMonthChange = null
}) {
    const [monthOffset, setMonthOffset] = useState(currentMonth);

    // Get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate the month to display
    const displayDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Create attendance lookup map (date string -> record)
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
        const dateStr = record.date || (record.checkin_time ? record.checkin_time.split('T')[0] : null);
        if (dateStr) {
            attendanceMap[dateStr] = record;
        }
    });

    // Parse joining date
    const joiningDateTime = joiningDate ? new Date(joiningDate).getTime() : null;

    // Month navigation
    const handlePrevMonth = () => {
        const newOffset = monthOffset - 1;
        setMonthOffset(newOffset);
        if (onMonthChange) onMonthChange(newOffset);
    };

    const handleNextMonth = () => {
        // Don't allow navigating to future months
        if (monthOffset >= 0) return;
        const newOffset = monthOffset + 1;
        setMonthOffset(newOffset);
        if (onMonthChange) onMonthChange(newOffset);
    };

    const handleToday = () => {
        setMonthOffset(0);
        if (onMonthChange) onMonthChange(0);
    };

    // Get day status
    const getDayStatus = (day) => {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);
        // Use local date string to avoid timezone issues
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateTime = date.getTime();
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

        // Future date
        if (dateTime > today.getTime()) {
            return { status: 'future', color: '#f3f4f6', textColor: '#d1d5db', label: '' };
        }

        // Before joining
        if (joiningDateTime && dateTime < joiningDateTime) {
            return { status: 'before-joining', color: '#f9fafb', textColor: '#d1d5db', label: '' };
        }

        // Weekend (Saturday or Sunday) - Off days
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return {
                status: 'weekend',
                color: '#dbeafe',
                textColor: '#1e40af',
                label: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
                isWeekend: true
            };
        }

        // Check attendance
        const record = attendanceMap[dateStr];
        if (record && record.checkin_time) {
            // Present
            const isLate = record.is_late || record.status === 'LATE';
            return {
                status: 'present',
                color: isLate ? '#fef3c7' : '#d1fae5',
                textColor: isLate ? '#92400e' : '#065f46',
                label: isLate ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
                record
            };
        } else {
            // Absent
            return {
                status: 'absent',
                color: '#fee2e2',
                textColor: '#991b1b',
                label: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
                record: null
            };
        }
    };

    // Generate calendar grid
    const calendarDays = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push({ type: 'empty', key: `empty-${i}` });
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStatus = getDayStatus(day);
        calendarDays.push({
            type: 'day',
            day,
            ...dayStatus,
            key: `day-${day}`
        });
    }

    // Month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const displayMonthName = `${monthNames[month]} ${year}`;

    // Day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20
            }}>
                <button
                    onClick={handlePrevMonth}
                    style={{
                        padding: '8px 12px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    ← Prev
                </button>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                        {displayMonthName}
                    </div>
                    {monthOffset !== 0 && (
                        <button
                            onClick={handleToday}
                            style={{
                                marginTop: 4,
                                padding: '4px 12px',
                                background: 'transparent',
                                color: '#3b82f6',
                                border: 'none',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            Go to Today
                        </button>
                    )}
                </div>

                <button
                    onClick={handleNextMonth}
                    disabled={monthOffset >= 0}
                    style={{
                        padding: '8px 12px',
                        background: monthOffset >= 0 ? '#e5e7eb' : '#f3f4f6',
                        color: monthOffset >= 0 ? '#9ca3af' : '#374151',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: monthOffset >= 0 ? 'not-allowed' : 'pointer'
                    }}
                >
                    Next →
                </button>
            </div>

            {/* Day names header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4,
                marginBottom: 8
            }}>
                {dayNames.map(name => (
                    <div
                        key={name}
                        style={{
                            textAlign: 'center',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#6b7280',
                            padding: '8px 0'
                        }}
                    >
                        {name}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4
            }}>
                {calendarDays.map(cell => {
                    if (cell.type === 'empty') {
                        return <div key={cell.key} />;
                    }

                    return (
                        <div
                            key={cell.key}
                            style={{
                                aspectRatio: '1',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: cell.color,
                                color: cell.textColor,
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 600,
                                position: 'relative',
                                cursor: cell.status === 'present' || cell.status === 'absent' ? 'pointer' : 'default'
                            }}
                            title={
                                cell.status === 'present'
                                    ? `Present${cell.record?.is_late ? ' (Late)' : ''} - ${new Date(cell.record?.checkin_time).toLocaleTimeString()}`
                                    : cell.status === 'absent'
                                        ? 'Absent - No check-in'
                                        : cell.status === 'weekend'
                                            ? 'Weekend - Off Day'
                                            : ''
                            }
                        >
                            <div style={{ fontSize: 16 }}>{cell.day}</div>
                            {cell.label && (
                                <div style={{ fontSize: 10, marginTop: 2 }}>{cell.label}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 20,
                marginTop: 20,
                flexWrap: 'wrap'
            }}>
                <LegendItem color="#d1fae5" textColor="#065f46" label="Present (On Time)" />
                <LegendItem color="#fef3c7" textColor="#92400e" label="Present (Late)" />
                <LegendItem color="#fee2e2" textColor="#991b1b" label="Absent" />
                <LegendItem color="#dbeafe" textColor="#1e40af" label="Weekend (Off)" />
                <LegendItem color="#f3f4f6" textColor="#d1d5db" label="Future / N/A" />
            </div>
        </div>
    );
}

function LegendItem({ color, textColor, label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
                width: 16,
                height: 16,
                background: color,
                borderRadius: 4,
                border: '1px solid #e5e7eb'
            }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
        </div>
    );
}
