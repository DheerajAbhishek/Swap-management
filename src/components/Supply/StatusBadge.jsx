import { STATUS_COLORS } from '../../utils/constants';

/**
 * StatusBadge - Display order status with appropriate styling
 */
export default function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || { bg: '#e5e7eb', color: '#374151' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: colors.bg,
        color: colors.color,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}
    >
      {status}
    </span>
  );
}
