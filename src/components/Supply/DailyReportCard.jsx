import { formatCurrency } from '../../utils/constants';

/**
 * DailyReportCard - Shows daily financial summary with COGS calculation
 * 
 * Formulas:
 * - COGS% = (B - C - W) / S × 100
 *   where B=Bill, C=Closing, W=Wastage, S=Sales
 * - GST = 5% of Sales
 * - Royalty = 5% of (Sales - GST)
 * - Net Pay = Sales - GST - Royalty - Bill
 */
export default function DailyReportCard({ sales, bill, closing, wastage }) {
  const S = parseFloat(sales) || 0;
  const B = parseFloat(bill) || 0;
  const C = parseFloat(closing) || 0;
  const W = parseFloat(wastage) || 0;

  // COGS% = (B - C - W) / S × 100
  const cogsPercent = S > 0 ? ((B - C - W) / S) * 100 : 0;

  // GST = 5% of Sales
  const gst = S * 0.05;

  // Royalty = 5% of (Sales - GST)
  const royalty = (S - gst) * 0.05;

  // Net Pay = Sales - GST - Royalty - Bill
  const netPay = S - gst - royalty - B;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b, #334155)',
      borderRadius: 16,
      padding: 24,
      color: 'white'
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, margin: 0 }}>
        Daily Financial Summary
      </h3>

      {/* Main Values Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 20
      }}>
        <ValueBox label="Sales (S)" value={S} color="#22c55e" />
        <ValueBox label="Bill (B)" value={B} color="#3b82f6" />
        <ValueBox label="Closing (C)" value={C} color="#a855f7" />
        <ValueBox label="Wastage (W)" value={W} color="#ef4444" />
      </div>

      {/* COGS Calculation */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
              COGS% = (B - C - W) / S × 100
            </div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              ({formatCurrency(B)} - {formatCurrency(C)} - {formatCurrency(W)}) / {formatCurrency(S)} × 100
            </div>
          </div>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: cogsPercent > 40 ? '#ef4444' : cogsPercent > 30 ? '#f59e0b' : '#22c55e'
          }}>
            {cogsPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 16
      }}>
        <BreakdownItem
          label="GST (5% of Sales)"
          value={gst}
          formula={`${formatCurrency(S)} × 5%`}
        />
        <BreakdownItem
          label="Royalty (5% of S-GST)"
          value={royalty}
          formula={`(${formatCurrency(S)} - ${formatCurrency(gst)}) × 5%`}
        />
        <BreakdownItem
          label="Bill Amount"
          value={B}
          formula="Purchase orders total"
        />
      </div>

      {/* Net Pay */}
      <div style={{
        background: netPay >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        border: `2px solid ${netPay >= 0 ? '#22c55e' : '#ef4444'}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Net Pay = Sales - GST - Royalty - Bill
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {formatCurrency(S)} - {formatCurrency(gst)} - {formatCurrency(royalty)} - {formatCurrency(B)}
          </div>
        </div>
        <div style={{
          fontSize: 32,
          fontWeight: 800,
          color: netPay >= 0 ? '#22c55e' : '#ef4444'
        }}>
          {formatCurrency(netPay)}
        </div>
      </div>
    </div>
  );
}

function ValueBox({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: 12,
      textAlign: 'center',
      borderLeft: `3px solid ${color}`
    }}>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{formatCurrency(value)}</div>
    </div>
  );
}

function BreakdownItem({ label, value, formula }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 8,
      padding: 12
    }}>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(value)}</div>
      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>{formula}</div>
    </div>
  );
}
