import jwt from 'jsonwebtoken';
import axios from 'axios';

// --- Helper Functions ---

/**
 * Generates a list of date strings between two dates
 */
function getDatesInRange(startDateStr, endDateStr) {
    const dates = [];
    try {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        const delta = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

        for (let i = 0; i <= delta; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            dates.push(day.toISOString().split('T')[0]);
        }
    } catch (error) {
        return [];
    }
    return dates;
}

/**
 * Fetches a single page of sales data for a given day
 */
async function fetchSalesPage(day, branchId, apiKey, secretKey, lastKey = null) {
    const payload = {
        iss: apiKey,
        iat: Math.floor(Date.now() / 1000),
        jti: `req_${Date.now()}_${day}_${lastKey || 'initial'}`
    };

    const token = jwt.sign(payload, secretKey, { algorithm: 'HS256' });

    let url = `https://api.ristaapps.com/v1/sales/page?branch=${branchId}&day=${day}`;
    if (lastKey) {
        url += `&lastKey=${lastKey}`;
    }

    const headers = {
        'x-api-token': token,
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
    };

    const response = await axios.get(url, { headers, timeout: 20000 });
    return response.data;
}

/**
 * Fetches all pages of sales data for a given day
 */
async function fetchSalesForDay(day, branchId, apiKey, secretKey) {
    let allOrders = [];
    let lastKey = null;
    let hasMore = true;

    while (hasMore) {
        try {
            const responseData = await fetchSalesPage(day, branchId, apiKey, secretKey, lastKey);

            if (responseData && Array.isArray(responseData.data)) {
                allOrders = allOrders.concat(responseData.data);
            }

            if (responseData && responseData.lastKey) {
                lastKey = responseData.lastKey;
                hasMore = true;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error(`Error fetching page for day ${day} with lastKey ${lastKey}:`, error.message);
            hasMore = false;
        }
    }

    return allOrders;
}

// --- Main Lambda Handler ---

export const handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event));

    // CORS headers
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };

    // Handle OPTIONS preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'OK' })
        };
    }

    try {
        // Parse request - support both GET query params and POST body
        const queryParams = event.queryStringParameters || {};
        let body = event.body || {};

        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                body = {};
            }
        }

        // Get API credentials from environment variables (set in Lambda config)
        const apiKey = process.env.VITE_RISTA_API_KEY;
        const secretKey = process.env.VITE_RISTA_SECRET_KEY;

        // Get other params from query string or body
        const branchId = queryParams.branchId || body.branchId;
        const startDate = queryParams.startDate || body.startDate;
        const endDate = queryParams.endDate || body.endDate;
        const channelParam = queryParams.channel || body.channelName || 'takeaway';
        const groupBy = queryParams.groupBy || body.groupBy || 'total';

        // Map channel name to actual Rista API channel names
        const channelMapping = {
            'takeaway': 'Takeaway - Swap',
            'swiggy': 'Swiggy',
            'zomato': 'Zomato',
            'corporate': 'Corporate Orders'
        };
        const channelName = channelMapping[channelParam.toLowerCase()] || channelParam;

        if (!apiKey || !secretKey || !branchId || !startDate || !endDate) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Missing required parameters',
                    required: ['branchId', 'startDate', 'endDate'],
                    note: 'API credentials should be in Lambda environment variables'
                })
            };
        }

        // Get dates in range
        const dates = getDatesInRange(startDate, endDate);
        if (dates.length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid date range or format. Use YYYY-MM-DD.' })
            };
        }

        // Fetch sales data for all dates
        const dailyResults = await Promise.all(
            dates.map(day => fetchSalesForDay(day, branchId, apiKey, secretKey))
        );

        // Track which dates have data
        const datesWithData = new Set();

        // Consolidate results with daily breakdown
        const consolidated = {
            noOfOrders: 0,
            grossSale: 0,
            gstOnOrder: 0,
            discounts: 0,
            packings: 0,
            netSale: 0,
            ads: 0,
            commissionAndTaxes: 0,
            payout: 0
        };

        let restaurantName = '';
        const dailyInsights = {};

        // Debug: track what channels we see
        const channelsSeen = new Set();
        const statusesSeen = new Set();
        let totalOrdersFetched = 0;
        let closedOrdersCount = 0;
        let excludedOrdersCount = 0;
        let sampleOrder = null;

        for (const ordersForOneDay of dailyResults) {
            if (ordersForOneDay && Array.isArray(ordersForOneDay)) {
                totalOrdersFetched += ordersForOneDay.length;

                for (const order of ordersForOneDay) {
                    // Track channels for debugging
                    const orderChannel = order.channel || 'unknown';
                    const orderStatus = order.status || 'unknown';
                    channelsSeen.add(orderChannel);
                    statusesSeen.add(orderStatus);

                    // Filter by channel name and only include closed orders
                    // If channelParam is 'all', include all channels
                    const shouldInclude = channelParam.toLowerCase() === 'all' ||
                        orderChannel.toLowerCase() === channelName.toLowerCase();

                    if (!shouldInclude || orderStatus !== 'Closed') {
                        excludedOrdersCount++;
                        continue;
                    }

                    closedOrdersCount++;

                    // Capture first order as sample
                    if (!sampleOrder) {
                        sampleOrder = {
                            channel: orderChannel,
                            status: orderStatus,
                            grossAmount: order.grossAmount,
                            chargeAmount: order.chargeAmount,
                            taxAmount: order.taxAmount,
                            totalDiscountAmount: order.totalDiscountAmount,
                            invoiceDay: order.invoiceDay
                        };
                    }

                    if (!restaurantName && order.branchName) {
                        restaurantName = order.branchName;
                    }

                    const taxAmount = order.taxAmount || 0;
                    const chargeAmount = order.chargeAmount || 0;
                    const grossAmount = order.grossAmount || 0;
                    const totalDiscountAmount = order.totalDiscountAmount || 0;
                    const orderDay = order.invoiceDay || '';

                    // Initialize daily data if needed
                    if (orderDay && !dailyInsights[orderDay]) {
                        dailyInsights[orderDay] = {
                            noOfOrders: 0,
                            grossSale: 0,
                            grossSaleAfterGST: 0,
                            gstOnOrder: 0,
                            discounts: 0,
                            packings: 0,
                            netSale: 0,
                            ads: 0,
                            commissionAndTaxes: 0,
                            payout: 0,
                            netOrder: 0,
                            totalDeductions: 0,
                            netAdditions: 0,
                            netPay: 0
                        };
                    }

                    // Calculate values for this order
                    const grossForOrder = grossAmount + chargeAmount;
                    const netSaleForOrder = grossForOrder - taxAmount - Math.abs(totalDiscountAmount);

                    // Net Order = Subtotal + Packaging - Discounts + GST
                    const netOrderForOrder = grossAmount + chargeAmount - Math.abs(totalDiscountAmount) + taxAmount;

                    // Update consolidated totals
                    consolidated.noOfOrders += 1;
                    consolidated.grossSale += grossForOrder;
                    consolidated.gstOnOrder += taxAmount;
                    consolidated.discounts += Math.abs(totalDiscountAmount);
                    consolidated.packings += chargeAmount;
                    consolidated.netSale += netSaleForOrder;
                    consolidated.payout += netSaleForOrder; // For takeaway, payout = netSale (no commissions)

                    // Update daily totals
                    if (orderDay) {
                        datesWithData.add(orderDay); // Track that this date has data
                        dailyInsights[orderDay].noOfOrders += 1;
                        dailyInsights[orderDay].grossSale += grossForOrder;
                        dailyInsights[orderDay].grossSaleAfterGST += grossForOrder; // No separate GST for takeaway
                        dailyInsights[orderDay].gstOnOrder += taxAmount;
                        dailyInsights[orderDay].discounts += Math.abs(totalDiscountAmount);
                        dailyInsights[orderDay].packings += chargeAmount;
                        dailyInsights[orderDay].netSale += netSaleForOrder;
                        dailyInsights[orderDay].payout += netSaleForOrder;
                        dailyInsights[orderDay].netOrder += netOrderForOrder;
                    }
                }
            }
        }

        // Round daily insights
        for (const day in dailyInsights) {
            const metrics = ['grossSale', 'gstOnOrder', 'discounts', 'packings', 'netSale', 'ads', 'commissionAndTaxes', 'payout'];
            for (const key of metrics) {
                dailyInsights[day][key] = parseFloat(dailyInsights[day][key].toFixed(2));
            }

            // Add NBV and percentages to daily
            const dailyNbv = dailyInsights[day].grossSale - dailyInsights[day].discounts;
            dailyInsights[day].nbv = parseFloat(dailyNbv.toFixed(2));
            dailyInsights[day].commissionPercent = 0;
            dailyInsights[day].discountPercent = parseFloat(
                (dailyInsights[day].grossSale > 0
                    ? (dailyInsights[day].discounts / dailyInsights[day].grossSale * 100)
                    : 0
                ).toFixed(2)
            );
            dailyInsights[day].adsPercent = 0;
        }

        // Calculate missing dates
        const allDatesSet = new Set(dates);
        const missingDates = [...allDatesSet].filter(d => !datesWithData.has(d)).sort();
        const dataCoverage = `${datesWithData.size}/${dates.length}`;

        // Calculate percentages and additional metrics
        const grossSaleTotal = consolidated.grossSale;
        const discountPercent = grossSaleTotal > 0 ? (consolidated.discounts / grossSaleTotal * 100) : 0;
        const nbv = grossSaleTotal - consolidated.discounts;

        // Calculate Net Order for consolidated (Gross - Discounts + GST)
        const netOrderTotal = grossSaleTotal - consolidated.discounts + consolidated.gstOnOrder;

        // For takeaway: no commissions/deductions, so totalDeductions = 0
        const totalDeductions = 0;
        const netAdditions = 0;

        // Net Pay = Net Order - Deductions + Net Additions - Ads
        const netPayTotal = netOrderTotal - totalDeductions + netAdditions - consolidated.ads;

        const commissionPercent = grossSaleTotal > 0 ? (consolidated.commissionAndTaxes / grossSaleTotal * 100) : 0;
        const adsPercent = grossSaleTotal > 0 ? (consolidated.ads / grossSaleTotal * 100) : 0;

        // Round daily insights and add calculated fields
        for (const day in dailyInsights) {
            const allMetrics = ['grossSale', 'grossSaleAfterGST', 'gstOnOrder', 'discounts', 'packings', 'netSale', 'ads', 'commissionAndTaxes', 'payout', 'netOrder', 'totalDeductions', 'netAdditions', 'netPay'];
            for (const key of allMetrics) {
                dailyInsights[day][key] = parseFloat((dailyInsights[day][key] || 0).toFixed(2));
            }

            // Calculate Net Pay for daily
            dailyInsights[day].netPay = dailyInsights[day].netOrder - dailyInsights[day].totalDeductions + dailyInsights[day].netAdditions;

            // Add NBV and percentages to daily
            const dailyNbv = dailyInsights[day].grossSale - dailyInsights[day].discounts;
            dailyInsights[day].nbv = parseFloat(dailyNbv.toFixed(2));
            dailyInsights[day].commissionPercent = 0;
            dailyInsights[day].discountPercent = parseFloat(
                (dailyInsights[day].grossSale > 0
                    ? (dailyInsights[day].discounts / dailyInsights[day].grossSale * 100)
                    : 0
                ).toFixed(2)
            );
            dailyInsights[day].adsPercent = 0;
        }

        // --- NEW GROUPING LOGIC for week/month ---
        if (groupBy === 'month' || groupBy === 'week') {
            const groupedData = {};

            for (const [dayStr, dayData] of Object.entries(dailyInsights)) {
                try {
                    const dayDate = new Date(dayStr);
                    let periodKey;

                    if (groupBy === 'month') {
                        periodKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}`;
                    } else { // week
                        const weekStart = new Date(dayDate);
                        weekStart.setDate(dayDate.getDate() - dayDate.getDay());
                        periodKey = weekStart.toISOString().split('T')[0];
                    }

                    if (!groupedData[periodKey]) {
                        groupedData[periodKey] = {
                            noOfOrders: 0, grossSale: 0, grossSaleAfterGST: 0, gstOnOrder: 0,
                            discounts: 0, packings: 0, netSale: 0, ads: 0,
                            commissionAndTaxes: 0, payout: 0, netOrder: 0,
                            totalDeductions: 0, netAdditions: 0, netPay: 0
                        };
                    }

                    // Sum up metrics for this period
                    for (const key in groupedData[periodKey]) {
                        groupedData[periodKey][key] += dayData[key] || 0;
                    }
                } catch (error) {
                    continue; // Skip invalid dates
                }
            }

            // Build timeSeriesData array
            const timeSeriesData = [];
            const sortedPeriods = Object.keys(groupedData).sort();

            for (const periodKey of sortedPeriods) {
                const periodMetrics = groupedData[periodKey];

                // Calculate breakdowns for this period
                const periodNetOrder = periodMetrics.grossSale - periodMetrics.discounts + periodMetrics.gstOnOrder;
                const periodTotalDeductions = 0; // Takeaway has no deductions
                const periodNetAdditions = 0;
                const periodNetPay = periodNetOrder - periodTotalDeductions + periodNetAdditions;

                const channelData = {
                    noOfOrders: parseFloat(periodMetrics.noOfOrders.toFixed(2)),
                    grossSale: parseFloat(periodMetrics.grossSale.toFixed(2)),
                    grossSaleWithGST: parseFloat((periodMetrics.grossSale + periodMetrics.gstOnOrder).toFixed(2)),
                    grossSaleAfterGST: parseFloat(periodMetrics.grossSaleAfterGST.toFixed(2)),
                    gstOnOrder: parseFloat(periodMetrics.gstOnOrder.toFixed(2)),
                    discounts: parseFloat(periodMetrics.discounts.toFixed(2)),
                    packings: parseFloat(periodMetrics.packings.toFixed(2)),
                    ads: parseFloat(periodMetrics.ads.toFixed(2)),
                    commissionAndTaxes: parseFloat(periodMetrics.commissionAndTaxes.toFixed(2)),
                    payout: parseFloat(periodMetrics.payout.toFixed(2)),
                    netSale: parseFloat(periodMetrics.netSale.toFixed(2)),
                    netOrder: parseFloat(periodNetOrder.toFixed(2)),
                    totalDeductions: parseFloat(periodTotalDeductions.toFixed(2)),
                    netAdditions: parseFloat(periodNetAdditions.toFixed(2)),
                    netPay: parseFloat(periodNetPay.toFixed(2)),
                    netOrderBreakdown: {
                        subtotal: parseFloat((periodMetrics.grossSale - periodMetrics.packings).toFixed(2)),
                        packaging: parseFloat(periodMetrics.packings.toFixed(2)),
                        discountsPromo: parseFloat(periodMetrics.discounts.toFixed(2)),
                        discountsBogo: 0,
                        gst: parseFloat(periodMetrics.gstOnOrder.toFixed(2)),
                        total: parseFloat(periodNetOrder.toFixed(2))
                    },
                    deductionsBreakdown: {
                        commission: {
                            baseServiceFee: 0, paymentMechanismFee: 0,
                            longDistanceFee: 0, serviceFeeDiscount: 0, total: 0
                        },
                        taxes: { taxOnService: 0, tds: 0, gst: 0, total: 0 },
                        otherDeductions: 0, totalDeductions: 0
                    }
                };

                timeSeriesData.push({
                    period: periodKey,
                    [channelParam]: channelData
                });
            }

            // Return timeSeriesData format
            const responseBody = {
                restaurantId: restaurantName,
                startDate: startDate,
                endDate: endDate,
                body: {
                    timeSeriesData: timeSeriesData,
                    discountBreakdown: {},
                    _debug: {
                        totalOrdersFetched: totalOrdersFetched,
                        closedOrders: closedOrdersCount,
                        excludedOrders: excludedOrdersCount,
                        channelsSeen: Array.from(channelsSeen),
                        statusesSeen: Array.from(statusesSeen),
                        filteringFor: channelName,
                        datesQueried: dates,
                        sampleOrder: sampleOrder,
                        calculation: sampleOrder ? {
                            grossForOrder: (sampleOrder.grossAmount || 0) + (sampleOrder.chargeAmount || 0),
                            formula: 'grossAmount + chargeAmount (packaging)'
                        } : null
                    }
                },
                missingDates: missingDates,
                dataCoverage: dataCoverage
            };

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(responseBody)
            };
        } else {
            // Original total summary format
            const responseBody = {
                restaurantId: restaurantName,
                startDate: startDate,
                endDate: endDate,
                body: {
                    consolidatedInsights: {
                        noOfOrders: consolidated.noOfOrders,
                        grossSale: parseFloat(consolidated.grossSale.toFixed(2)),
                        grossSaleWithGST: parseFloat((consolidated.grossSale + consolidated.gstOnOrder).toFixed(2)),
                        grossSaleAfterGST: parseFloat(consolidated.grossSale.toFixed(2)),
                        gstOnOrder: parseFloat(consolidated.gstOnOrder.toFixed(2)),
                        discounts: parseFloat(consolidated.discounts.toFixed(2)),
                        packings: parseFloat(consolidated.packings.toFixed(2)),
                        ads: parseFloat(consolidated.ads.toFixed(2)),
                        commissionAndTaxes: parseFloat(consolidated.commissionAndTaxes.toFixed(2)),
                        payout: parseFloat(consolidated.payout.toFixed(2)),
                        netSale: parseFloat(consolidated.netSale.toFixed(2)),
                        nbv: parseFloat(nbv.toFixed(2)),
                        netOrder: parseFloat(netOrderTotal.toFixed(2)),
                        totalDeductions: parseFloat(totalDeductions.toFixed(2)),
                        netAdditions: parseFloat(netAdditions.toFixed(2)),
                        netPay: parseFloat(netPayTotal.toFixed(2)),
                        commissionPercent: parseFloat(commissionPercent.toFixed(2)),
                        discountPercent: parseFloat(discountPercent.toFixed(2)),
                        adsPercent: parseFloat(adsPercent.toFixed(2)),
                        netOrderBreakdown: {
                            subtotal: parseFloat((consolidated.grossSale - consolidated.packings).toFixed(2)),
                            packaging: parseFloat(consolidated.packings.toFixed(2)),
                            discountsPromo: parseFloat(consolidated.discounts.toFixed(2)),
                            discountsBogo: 0,
                            gst: parseFloat(consolidated.gstOnOrder.toFixed(2)),
                            total: parseFloat(netOrderTotal.toFixed(2))
                        },
                        deductionsBreakdown: {
                            commission: {
                                baseServiceFee: 0,
                                paymentMechanismFee: 0,
                                longDistanceFee: 0,
                                serviceFeeDiscount: 0,
                                total: 0
                            },
                            taxes: {
                                taxOnService: 0,
                                tds: 0,
                                gst: 0,
                                total: 0
                            },
                            otherDeductions: 0,
                            totalDeductions: 0
                        }
                    },
                    dailyInsights: dailyInsights,
                    discountBreakdown: {},
                    _debug: {
                        totalOrdersFetched: totalOrdersFetched,
                        closedOrders: closedOrdersCount,
                        excludedOrders: excludedOrdersCount,
                        channelsSeen: Array.from(channelsSeen),
                        statusesSeen: Array.from(statusesSeen),
                        filteringFor: channelName,
                        datesQueried: dates,
                        sampleOrder: sampleOrder,
                        calculation: sampleOrder ? {
                            grossForOrder: (sampleOrder.grossAmount || 0) + (sampleOrder.chargeAmount || 0),
                            formula: 'grossAmount + chargeAmount (packaging)'
                        } : null
                    }
                },
                missingDates: missingDates,
                dataCoverage: dataCoverage
            };

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(responseBody)
            };
        }

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: `Internal server error: ${error.message}` })
        };
    }
};
