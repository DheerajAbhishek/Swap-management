import { formatCurrency } from '../../utils/constants';

/**
 * ReceivedItemsReport - Table showing items received by franchise in a period
 */
export default function ReceivedItemsReport({ data, loading, franchiseName }) {
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                Loading received items...
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                <p>No items received in the selected period</p>
            </div>
        );
    }

    // Aggregate items by name and calculate totals
    const aggregated = data.reduce((acc, item) => {
        const key = `${item.item_name}-${item.uom}`;
        if (!acc[key]) {
            acc[key] = {
                item_name: item.item_name,
                uom: item.uom,
                category: item.category || '-',
                total_qty: 0,
                total_value: 0,
                orders_count: 0
            };
        }
        acc[key].total_qty += parseFloat(item.received_qty || item.ordered_qty || 0);
        acc[key].total_value += parseFloat(item.line_total || 0);
        acc[key].orders_count += 1;
        return acc;
    }, {});

    const aggregatedItems = Object.values(aggregated).sort((a, b) => b.total_value - a.total_value);
    const grandTotalValue = aggregatedItems.reduce((sum, item) => sum + item.total_value, 0);
    const totalItemsCount = aggregatedItems.reduce((sum, item) => sum + item.orders_count, 0);

    return (
        <div>
            {franchiseName && (
                <div style={{ marginBottom: 16 }}>
                    <span style={{
                        padding: '4px 12px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 500
                    }}>
                        {franchiseName}
                    </span>
                </div>
            )}

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 16,
                marginBottom: 20
            }}>
                <div style={{
                    background: '#f0fdf4',
                    borderRadius: 10,
                    padding: 16,
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>
                        {aggregatedItems.length}
                    </div>
                    <div style={{ fontSize: 12, color: '#15803d' }}>Unique Items</div>
                </div>
                <div style={{
                    background: '#eff6ff',
                    borderRadius: 10,
                    padding: 16,
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>
                        {totalItemsCount}
                    </div>
                    <div style={{ fontSize: 12, color: '#1d4ed8' }}>Total Line Items</div>
                </div>
                <div style={{
                    background: '#fef3c7',
                    borderRadius: 10,
                    padding: 16,
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#92400e' }}>
                        {formatCurrency(grandTotalValue)}
                    </div>
                    <div style={{ fontSize: 12, color: '#b45309' }}>Total Value</div>
                </div>
            </div>

            {/* Items Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb' }}>
                            <th style={thStyle}>Item</th>
                            <th style={thStyle}>Category</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Quantity</th>
                            <th style={thStyle}>UOM</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Total Value</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Orders</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aggregatedItems.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={tdStyle}>
                                    <span style={{ fontWeight: 600, color: '#1f2937' }}>
                                        {item.item_name}
                                    </span>
                                </td>
                                <td style={tdStyle}>
                                    <span style={{
                                        padding: '2px 8px',
                                        background: '#f3f4f6',
                                        borderRadius: 4,
                                        fontSize: 12,
                                        color: '#6b7280'
                                    }}>
                                        {item.category}
                                    </span>
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                                    {item.total_qty.toFixed(2)}
                                </td>
                                <td style={tdStyle}>{item.uom}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                                    {formatCurrency(item.total_value)}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        background: '#dbeafe',
                                        borderRadius: 10,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: '#1e40af'
                                    }}>
                                        {item.orders_count}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                            <td colSpan="4" style={{ ...tdStyle, textAlign: 'right' }}>
                                Grand Total:
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#059669' }}>
                                {formatCurrency(grandTotalValue)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                {totalItemsCount}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#374151',
    fontSize: 13
};

const tdStyle = {
    padding: '12px 16px',
    fontSize: 14
};
