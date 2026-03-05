/**
 * Example Integration: How to add Rista Sales Sync to DailyEntry.jsx
 * 
 * This file shows the changes needed to add the sync button to your DailyEntry page.
 */

// 1. ADD IMPORT at the top of DailyEntry.jsx
import SyncSalesButton from '../../components/SyncSalesButton';
import '../../styles/syncSales.css';

// 2. ADD handleSalesSync function (add this before handleClosingSubmit)
const handleSalesSync = (syncedData) => {
    if (!syncedData) return;

    // Auto-populate sales field with Rista data
    setSales(syncedData.grossSale.toString());

    // Show success message with details
    setMessage({
        type: 'success',
        text: `Sales synced! Orders: ${syncedData.totalOrders}, Gross: ${syncedData.formatted.grossSale}, Net: ${syncedData.formatted.netSale}`
    });

    // Optional: Show detailed breakdown
    console.log('Synced Sales Data:', {
        totalOrders: syncedData.totalOrders,
        grossSale: syncedData.grossSale,
        packings: syncedData.packings,
        discounts: syncedData.discounts,
        netSale: syncedData.netSale
    });

    setTimeout(() => setMessage(null), 5000);
};

// 3. MODIFY the Sales Input section (replace the existing sales input div)
// Find the section around line 202-235 in your DailyEntry.jsx and replace with:

<div>
    <label style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#374151',
        marginBottom: 8
    }}>
        Today's Sales (₹)
        <span style={{
            fontSize: 11,
            fontWeight: 400,
            color: '#6b7280',
            marginLeft: 8
        }}>
            (Auto-sync from Rista or enter manually)
        </span>
    </label>

    {/* ADD SYNC BUTTON HERE */}
    <SyncSalesButton
        branchId={user?.branch_id || 'MK'}
        onDataSynced={handleSalesSync}
    />

    <input
        type="number"
        value={sales}
        onChange={(e) => {
            const value = e.target.value;
            if (value.includes('e') || value.includes('E')) return;
            setSales(value);
        }}
        onKeyDown={(e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) {
                e.preventDefault();
            }
        }}
        placeholder="Enter sales amount or click Sync"
        min="0"
        step="0.01"
        style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: '2px solid #22c55e',
            fontSize: 16,
            fontWeight: 600,
            boxSizing: 'border-box',
            background: '#f0fdf4',
            marginTop: 8
        }}
    />
</div>

// 4. OPTIONAL: Add a Sales Breakdown Display (add after sales input)
{
    sales && parseFloat(sales) > 0 && (
        <div style={{
            marginTop: 12,
            padding: 12,
            background: '#f0fdf4',
            borderRadius: 8,
            fontSize: 13,
            color: '#065f46'
        }}>
            <strong>Sales: {formatCurrency(parseFloat(sales))}</strong>
        </div>
    )
}

// 5. CONFIGURATION: Make sure your .env file has the API endpoint
// Add this to your .env file:
// VITE_RISTA_SALES_API_URL=https://YOUR_API_GATEWAY_ID.execute-api.ap-south-1.amazonaws.com/prod/rista-sales

/**
 * COMPLETE INTEGRATION STEPS:
 * 
 * 1. Deploy the Lambda function:
 *    .\backend\deploy-rista-lambda.ps1
 * 
 * 2. Set up API Gateway (see RISTA_INTEGRATION.md)
 * 
 * 3. Update .env with your API Gateway URL
 * 
 * 4. Add the import and function above to DailyEntry.jsx
 * 
 * 5. Replace the sales input section with the code above
 * 
 * 6. Test the sync button!
 */

/**
 * BENEFITS:
 * ✅ Eliminates manual data entry
 * ✅ Reduces human error
 * ✅ Real-time data from Rista API
 * ✅ Shows breakdown (orders, discounts, packaging)
 * ✅ Can still manually override if needed
 */

/**
 * USER WORKFLOW:
 * 1. Staff opens Daily Entry page
 * 2. Clicks "🔄 Sync from Rista" button
 * 3. Sales data auto-populates from Rista API
 * 4. Reviews closing inventory and wastage
 * 5. Clicks "Save Daily Report"
 * 6. Done! No manual sales entry needed
 */
