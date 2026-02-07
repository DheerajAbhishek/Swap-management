import { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/constants';

/**
 * OrderTable - Display orders in a table format (responsive)
 */
export default function OrderTable({ 
  orders, 
  onViewOrder, 
  onAccept, 
  onDispatch,
  showActions = true,
  userRole = 'FRANCHISE'
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!orders || orders.length === 0) {
    return (
      <div style={{
        padding: isMobile ? 24 : 40,
        textAlign: 'center',
        color: '#6b7280',
        background: '#f9fafb',
        borderRadius: 12
      }}>
        No orders found
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {orders.map((order) => (
          <div
            key={order.id}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontWeight: 600, color: '#3b82f6', fontSize: 14 }}>
                  {order.order_number}
                </span>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  {formatDateTime(order.created_at)}
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>
            
            {userRole === 'ADMIN' && (
              <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>
                <strong>Franchise:</strong> {order.franchise_name || order.franchise_id}
              </div>
            )}

            {/* Show kitchen name for franchise users */}
            {(userRole === 'FRANCHISE' || userRole === 'FRANCHISE_STAFF') && order.vendor_name && (
              <div style={{ fontSize: 13, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span><strong>Kitchen:</strong> {order.vendor_name}</span>
              </div>
            )}

            {/* Show franchise name for kitchen users */}
            {(userRole === 'KITCHEN' || userRole === 'KITCHEN_STAFF') && (
              <div style={{ fontSize: 13, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span><strong>Franchise:</strong> {order.franchise_name}</span>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {order.items?.length || 0} items
              </span>
              <span style={{ fontWeight: 600, fontSize: 16, color: '#1f2937' }}>
                {formatCurrency(order.total_amount || 0)}
              </span>
            </div>
            
            {showActions && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => onViewOrder(order)}
                  style={{ ...viewBtnStyle, flex: 1, minWidth: 60 }}
                >
                  View
                </button>
                
                {userRole === 'KITCHEN' && order.status === 'PLACED' && onAccept && (
                  <button
                    onClick={() => onAccept(order.id)}
                    style={{ ...acceptBtnStyle, flex: 1, minWidth: 60 }}
                  >
                    Accept
                  </button>
                )}
                
                {userRole === 'KITCHEN' && order.status === 'ACCEPTED' && onDispatch && (
                  <button
                    onClick={() => onDispatch(order.id)}
                    style={{ ...dispatchBtnStyle, flex: 1, minWidth: 60 }}
                  >
                    Dispatch
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <th style={thStyle}>Order #</th>
            <th style={thStyle}>Date</th>
            {userRole === 'ADMIN' && <th style={thStyle}>Franchise</th>}
            {(userRole === 'FRANCHISE' || userRole === 'FRANCHISE_STAFF') && <th style={thStyle}>Kitchen</th>}
            {(userRole === 'KITCHEN' || userRole === 'KITCHEN_STAFF') && <th style={thStyle}>Franchise</th>}
            <th style={thStyle}>Items</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}>Status</th>
            {showActions && <th style={thStyle}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={tdStyle}>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                  {order.order_number}
                </span>
              </td>
              <td style={tdStyle}>
                {formatDateTime(order.created_at)}
              </td>
              {userRole === 'ADMIN' && (
                <td style={tdStyle}>{order.franchise_name || order.franchise_id}</td>
              )}
              {(userRole === 'FRANCHISE' || userRole === 'FRANCHISE_STAFF') && (
                <td style={tdStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f97316' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" rx="2" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    {order.vendor_name || '-'}
                  </span>
                </td>
              )}
              {(userRole === 'KITCHEN' || userRole === 'KITCHEN_STAFF') && (
                <td style={tdStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    {order.franchise_name}
                  </span>
                </td>
              )}
              <td style={tdStyle}>
                {order.items?.length || 0} items
              </td>
              <td style={tdStyle}>
                <span style={{ fontWeight: 600 }}>
                  {formatCurrency(order.total_amount || 0)}
                </span>
              </td>
              <td style={tdStyle}>
                <StatusBadge status={order.status} />
              </td>
              {showActions && (
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => onViewOrder(order)}
                      style={viewBtnStyle}
                    >
                      View
                    </button>
                    
                    {/* Kitchen actions */}
                    {userRole === 'KITCHEN' && order.status === 'PLACED' && onAccept && (
                      <button
                        onClick={() => onAccept(order.id)}
                        style={acceptBtnStyle}
                      >
                        Accept
                      </button>
                    )}
                    
                    {userRole === 'KITCHEN' && order.status === 'ACCEPTED' && onDispatch && (
                      <button
                        onClick={() => onDispatch(order.id)}
                        style={dispatchBtnStyle}
                      >
                        Dispatch
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: 14,
  color: '#1f2937'
};

const viewBtnStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  border: 'none',
  background: '#e5e7eb',
  color: '#374151',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer'
};

const acceptBtnStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  border: 'none',
  background: '#10b981',
  color: 'white',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer'
};

const dispatchBtnStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  border: 'none',
  background: '#3b82f6',
  color: 'white',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer'
};
