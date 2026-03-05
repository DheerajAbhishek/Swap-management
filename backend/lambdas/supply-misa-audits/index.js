/**
 * Misa Audit Lambda - Daily morning audit for items with photo verification
 * Uses presigned S3 URLs for direct photo upload from frontend
 * AWS SDK v3 for Node.js 18+
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({ region: 'ap-south-1' });

const MISA_AUDITS_TABLE = 'supply_misa_audits';
const S3_BUCKET = 'swap-management-photos';

// CORS headers
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Generate unique ID
function generateId() {
    return `MISA-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
}

// Parse time string (HH:MM) to minutes since midnight
function parseTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Get current time in IST as minutes since midnight
function getCurrentISTMinutes(timestamp) {
    const date = new Date(timestamp);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(date.getTime() + istOffset);
    return istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
}

// Determine submission status based on time
function getSubmissionStatus(submissionTime) {
    const minutes = getCurrentISTMinutes(submissionTime);
    const startWindow = parseTimeToMinutes('08:30');
    const endWindow = parseTimeToMinutes('09:00');

    if (minutes < startWindow) return 'EARLY';
    if (minutes <= endWindow) return 'ON_TIME';
    return 'LATE';
}

// Check if auditor has marked attendance via S3 photos
async function checkAttendance(auditorId, date) {
    try {
        const result = await s3Client.send(new ListObjectsV2Command({
            Bucket: S3_BUCKET,
            Prefix: `attendance/${auditorId}/`,
            MaxKeys: 50
        }));

        if (!result.Contents || result.Contents.length === 0) return null;

        const todayPhoto = result.Contents.find(obj => {
            const lastMod = obj.LastModified ? new Date(obj.LastModified) : null;
            if (!lastMod) return false;
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(lastMod.getTime() + istOffset);
            return istDate.toISOString().split('T')[0] === date;
        });

        return todayPhoto ? { id: todayPhoto.Key, date } : null;
    } catch (error) {
        console.error('Error checking attendance via S3:', error);
        // Don't block on attendance check failure
        return { id: 's3-fallback', date };
    }
}

// Check if Misa audit already submitted for today
async function checkExistingAudit(auditorId, date) {
    try {
        const result = await dynamoDB.send(new QueryCommand({
            TableName: MISA_AUDITS_TABLE,
            IndexName: 'auditor_id-audit_date-index',
            KeyConditionExpression: 'auditor_id = :auditor_id AND audit_date = :date',
            ExpressionAttributeValues: {
                ':auditor_id': auditorId,
                ':date': date
            }
        }));
        return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    } catch (error) {
        console.error('Error checking existing audit:', error);
        const result = await dynamoDB.send(new ScanCommand({
            TableName: MISA_AUDITS_TABLE,
            FilterExpression: 'auditor_id = :auditor_id AND audit_date = :date',
            ExpressionAttributeValues: {
                ':auditor_id': auditorId,
                ':date': date
            }
        }));
        return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    }
}

// Generate presigned upload URLs for items
async function generateUploadUrls(items, auditorId) {
    const timestamp = Date.now();
    const urls = [];

    for (const item of items) {
        const random = Math.random().toString(36).substr(2, 8);
        const key = `misa-audit/${auditorId}/${timestamp}/${item.item_id}-${random}.jpg`;

        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            ContentType: 'image/jpeg'
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min expiry
        const publicUrl = `https://${S3_BUCKET}.s3.ap-south-1.amazonaws.com/${key}`;

        urls.push({
            item_id: item.item_id,
            upload_url: uploadUrl,
            photo_url: publicUrl,
            key
        });
    }

    return urls;
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const method = event.httpMethod || event.requestContext?.http?.method;
    const path = event.path || event.rawPath || '';
    const pathParts = path.split('/').filter(Boolean);

    try {
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

        const isAdmin = decoded.role === 'ADMIN';
        const isAuditor = decoded.role === 'AUDITOR';
        const isKitchen = decoded.role === 'KITCHEN' || decoded.role === 'KITCHEN_STAFF';

        if (!isAdmin && !isAuditor && !isKitchen) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admins, auditors and kitchen staff can access Misa Audits' }) };
        }

        // GET /misa-audits - list audits (admin sees all, auditor sees own, kitchen sees own vendor)
        if (method === 'GET' && !pathParts[1]) {
            if (isAdmin) return await getAllMisaAudits();
            if (isKitchen) {
                const date = event.queryStringParameters?.date || null;
                // vendor_id may be stored as vendor_id OR userId depending on how kitchen user was set up
                const kitchenVendorId = decoded.vendor_id || decoded.userId;
                console.log('Kitchen auth debug:', { role: decoded.role, vendor_id: decoded.vendor_id, userId: decoded.userId, resolvedVendorId: kitchenVendorId, date });
                return await getVendorMisaAudits(kitchenVendorId, date);
            }
            return await getAuditorMisaAudits(decoded.auditor_id);
        }

        // GET /misa-audits/check?date=
        if (method === 'GET' && path.includes('/check')) {
            const date = event.queryStringParameters?.date || new Date().toISOString().split('T')[0];
            const existingAudit = await checkExistingAudit(decoded.auditor_id, date);
            return {
                statusCode: 200, headers,
                body: JSON.stringify({ exists: !!existingAudit, audit: existingAudit })
            };
        }

        // POST /misa-audits/upload-urls - generate presigned S3 upload URLs
        if (method === 'POST' && path.includes('/upload-urls')) {
            const body = JSON.parse(event.body || '{}');
            if (!body.items || body.items.length === 0) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'No items provided' }) };
            }
            const urls = await generateUploadUrls(body.items, decoded.auditor_id);
            return { statusCode: 200, headers, body: JSON.stringify({ urls }) };
        }

        // GET /misa-audits/{id}
        if (method === 'GET' && pathParts[1]) {
            return await getMisaAudit(pathParts[1], isAdmin ? null : decoded.auditor_id);
        }

        // POST /misa-audits - submit audit (with S3 URLs, not base64)
        if (method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            return await createMisaAudit(body, decoded);
        }

        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500, headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};

// Get ALL audits (admin view)
async function getAllMisaAudits() {
    const result = await dynamoDB.send(new ScanCommand({
        TableName: MISA_AUDITS_TABLE
    }));
    const items = (result.Items || []).sort((a, b) => new Date(b.audit_date) - new Date(a.audit_date));
    return { statusCode: 200, headers, body: JSON.stringify(items) };
}

// Get audits for a vendor/kitchen (optionally filtered by date)
async function getVendorMisaAudits(vendorId, date) {
    try {
        console.log('getVendorMisaAudits called with vendorId:', vendorId, 'date:', date);
        if (!vendorId) {
            console.log('WARNING: vendorId is empty – returning empty list');
            return { statusCode: 200, headers, body: JSON.stringify([]) };
        }

        const filterExpr = date
            ? 'vendor_id = :vendor_id AND audit_date = :date'
            : 'vendor_id = :vendor_id';
        const exprValues = date
            ? { ':vendor_id': vendorId, ':date': date }
            : { ':vendor_id': vendorId };

        const result = await dynamoDB.send(new ScanCommand({
            TableName: MISA_AUDITS_TABLE,
            FilterExpression: filterExpr,
            ExpressionAttributeValues: exprValues
        }));
        const items = (result.Items || []).sort((a, b) => new Date(b.audit_date) - new Date(a.audit_date));
        console.log(`getVendorMisaAudits: found ${items.length} items for vendorId=${vendorId}`);
        if (items.length === 0) {
            // Debug: show what vendor_ids actually exist in the table so mismatch is visible in logs
            const allResult = await dynamoDB.send(new ScanCommand({ TableName: MISA_AUDITS_TABLE, ProjectionExpression: 'vendor_id, audit_date' }));
            const uniqueVendors = [...new Set((allResult.Items || []).map(i => i.vendor_id))];
            console.log('DEBUG: existing vendor_ids in table:', uniqueVendors);
        }
        return { statusCode: 200, headers, body: JSON.stringify(items) };
    } catch (error) {
        console.error('Error getting vendor audits:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch audits' }) };
    }
}

// Get all audits for an auditor
async function getAuditorMisaAudits(auditorId) {
    try {
        const result = await dynamoDB.send(new QueryCommand({
            TableName: MISA_AUDITS_TABLE,
            IndexName: 'auditor_id-audit_date-index',
            KeyConditionExpression: 'auditor_id = :auditor_id',
            ExpressionAttributeValues: { ':auditor_id': auditorId },
            ScanIndexForward: false
        }));
        return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
    } catch (error) {
        console.error('Error getting audits:', error);
        const result = await dynamoDB.send(new ScanCommand({
            TableName: MISA_AUDITS_TABLE,
            FilterExpression: 'auditor_id = :auditor_id',
            ExpressionAttributeValues: { ':auditor_id': auditorId }
        }));
        const items = (result.Items || []).sort((a, b) => new Date(b.audit_date) - new Date(a.audit_date));
        return { statusCode: 200, headers, body: JSON.stringify(items) };
    }
}

// Get single audit
async function getMisaAudit(auditId, auditorId) {
    const result = await dynamoDB.send(new GetCommand({
        TableName: MISA_AUDITS_TABLE,
        Key: { id: auditId }
    }));

    if (!result.Item) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Audit not found' }) };
    if (auditorId && result.Item.auditor_id !== auditorId) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };

    return { statusCode: 200, headers, body: JSON.stringify(result.Item) };
}

// Create new Misa audit - accepts photo_url (S3 URLs) instead of base64
async function createMisaAudit(data, decoded) {
    const auditDate = data.audit_date || new Date().toISOString().split('T')[0];
    const submissionTime = new Date().toISOString();

    // 1. Validate vendor
    if (!data.vendor_id || !data.vendor_name) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Vendor required', message: 'Please select a vendor to audit' }) };
    }

    // 2. Check duplicate
    const existingAudit = await checkExistingAudit(decoded.auditor_id, auditDate);
    if (existingAudit) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Audit already submitted', message: 'You have already submitted Misa Audit for today', audit: existingAudit }) };
    }

    // 3. Validate items
    if (!data.items || data.items.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No items provided' }) };
    }

    // Build items - accept photo_url (already uploaded to S3) directly
    const itemsWithPhotos = [];
    for (const item of data.items) {
        if (!item.photo_url) {
            return {
                statusCode: 400, headers,
                body: JSON.stringify({ error: 'Missing photo', message: `Photo is required for item: ${item.item_name}` })
            };
        }
        itemsWithPhotos.push({
            item_id: item.item_id,
            item_name: item.item_name,
            category: item.category || '',
            photo_url: item.photo_url,
            notes: item.notes || '',
            has_complaint: item.has_complaint || false,
            complaint_note: item.complaint_note || ''
        });
    }

    // 5. Validate food_as_per_menu
    const foodAsPerMenu = data.food_as_per_menu || null; // 'yes' | 'no'
    const foodMenuNote = data.food_menu_note || '';
    if (!foodAsPerMenu || !['yes', 'no'].includes(foodAsPerMenu)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Food menu answer required', message: 'Please answer whether the food is as per daily menu' }) };
    }
    if (foodAsPerMenu === 'no' && !foodMenuNote.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Note required', message: 'A note is required when food is not as per daily menu' }) };
    }

    // 6. Validate dispatch time
    const misaDispatchTime = data.misa_dispatch_time || '';
    if (!misaDispatchTime.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dispatch time required', message: 'Please enter the MISA dispatch time' }) };
    }

    // 7. Status based on time
    const status = getSubmissionStatus(submissionTime);

    // 8. Save audit record
    const auditId = generateId();
    const audit = {
        id: auditId,
        auditor_id: decoded.auditor_id,
        auditor_name: decoded.auditor_name || decoded.name || 'Unknown',
        vendor_id: data.vendor_id,
        vendor_name: data.vendor_name,
        audit_date: auditDate,
        submission_time: submissionTime,
        status,
        items: itemsWithPhotos,
        total_items: itemsWithPhotos.length,
        notes: data.notes || '',
        food_as_per_menu: foodAsPerMenu,
        food_menu_note: foodMenuNote,
        misa_dispatch_time: misaDispatchTime,
        created_at: submissionTime,
        updated_at: submissionTime
    };

    await dynamoDB.send(new PutCommand({
        TableName: MISA_AUDITS_TABLE,
        Item: audit
    }));

    return { statusCode: 201, headers, body: JSON.stringify(audit) };
}
