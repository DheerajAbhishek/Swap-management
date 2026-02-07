/**
 * Supply Audits Lambda - Manage audit reports and auditors
 * Uses AWS SDK v3 for Node.js 18+
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const AUDITS_TABLE = 'supply_audits';
const AUDITORS_TABLE = 'supply_auditors';
const USERS_TABLE = 'supply_users';

// Simple password hashing
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate username from name
function generateUsername(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@auditor.swap';
}

// Generate password from name
function generatePassword(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '') + '123';
}

// CORS headers
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Handle OPTIONS for CORS
    if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const method = event.httpMethod || event.requestContext?.http?.method;
    const path = event.path || event.rawPath || '';
    const pathParts = path.split('/').filter(Boolean);
    const queryParams = event.queryStringParameters || {};

    try {
        // Check authorization
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

        // Determine if this is auditors endpoint or audits endpoint
        const isAuditorsEndpoint = path.includes('/auditors');

        // ========== AUDITORS MANAGEMENT (Admin only) ==========
        if (isAuditorsEndpoint) {
            // Only ADMIN can manage auditors
            if (decoded.role !== 'ADMIN') {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admin can manage auditors' }) };
            }

            if (method === 'GET') {
                const auditorId = pathParts[1];
                if (auditorId && auditorId !== 'auditors') {
                    return await getAuditor(auditorId);
                }
                return await getAllAuditors();
            }

            if (method === 'POST') {
                const body = JSON.parse(event.body || '{}');
                return await createAuditor(body);
            }

            if (method === 'PUT') {
                const auditorId = pathParts[1];
                const body = JSON.parse(event.body || '{}');

                // Check if this is a password reset
                if (path.includes('/reset-password')) {
                    return await resetAuditorPassword(auditorId.replace('/reset-password', ''), body.password);
                }

                return await updateAuditor(auditorId, body);
            }

            if (method === 'DELETE') {
                const auditorId = pathParts[1];
                return await deleteAuditor(auditorId);
            }
        }

        // ========== AUDITS MANAGEMENT ==========
        if (method === 'GET') {
            const auditId = pathParts[1];

            // Auditors can only see their own audits
            if (decoded.role === 'AUDITOR') {
                if (auditId && auditId !== 'audits') {
                    return await getAudit(auditId, decoded.auditor_id);
                }
                return await getAuditsByAuditor(decoded.auditor_id);
            }

            // Admin can see all audits
            if (decoded.role === 'ADMIN') {
                if (auditId && auditId !== 'audits') {
                    return await getAudit(auditId);
                }
                // Filter by franchise if requested
                if (queryParams.franchise_id) {
                    return await getAuditsByFranchise(queryParams.franchise_id);
                }
                // Filter by auditor if requested
                if (queryParams.auditor_id) {
                    return await getAuditsByAuditor(queryParams.auditor_id);
                }
                return await getAllAudits();
            }

            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
        }

        // Only AUDITOR can create audits
        if (method === 'POST') {
            if (decoded.role !== 'AUDITOR') {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only auditors can submit audits' }) };
            }
            const body = JSON.parse(event.body || '{}');
            return await createAudit(body, decoded);
        }

        // ADMIN can update audit status/notes
        if (method === 'PUT') {
            if (decoded.role !== 'ADMIN') {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admin can update audits' }) };
            }
            const auditId = pathParts[1];
            const body = JSON.parse(event.body || '{}');
            return await updateAudit(auditId, body);
        }

        // ADMIN can delete audits
        if (method === 'DELETE') {
            if (decoded.role !== 'ADMIN') {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admin can delete audits' }) };
            }
            const auditId = pathParts[1];
            return await deleteAudit(auditId);
        }

        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};

// ========== AUDITOR FUNCTIONS ==========

async function getAllAuditors() {
    const result = await dynamoDB.send(new ScanCommand({
        TableName: AUDITORS_TABLE
    }));
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Items || [])
    };
}

async function getAuditor(auditorId) {
    const result = await dynamoDB.send(new GetCommand({
        TableName: AUDITORS_TABLE,
        Key: { id: auditorId }
    }));

    if (!result.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Auditor not found' }) };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item)
    };
}

async function createAuditor(data) {
    const id = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const username = generateUsername(data.name);
    const password = generatePassword(data.name);

    // Create auditor record
    const auditor = {
        id,
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        zone: data.zone || '', // Area they cover
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await dynamoDB.send(new PutCommand({
        TableName: AUDITORS_TABLE,
        Item: auditor
    }));

    // Create user record for login
    const userId = `USER-AUD-${Date.now()}`;
    const userRecord = {
        id: userId,
        email: username, // Use generated username as email for login
        name: data.name,
        role: 'AUDITOR',
        auditor_id: id,
        auditor_name: data.name,
        password_hash: hashPassword(password),
        created_at: new Date().toISOString()
    };

    await dynamoDB.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: userRecord
    }));

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            ...auditor,
            credentials: {
                username,
                password
            }
        })
    };
}

async function updateAuditor(auditorId, data) {
    const updateExpressions = [];
    const expressionValues = {};
    const expressionNames = {};

    if (data.name) {
        updateExpressions.push('#name = :name');
        expressionValues[':name'] = data.name;
        expressionNames['#name'] = 'name';
    }
    if (data.email) {
        updateExpressions.push('email = :email');
        expressionValues[':email'] = data.email;
    }
    if (data.phone) {
        updateExpressions.push('phone = :phone');
        expressionValues[':phone'] = data.phone;
    }
    if (data.address) {
        updateExpressions.push('address = :address');
        expressionValues[':address'] = data.address;
    }
    if (data.zone) {
        updateExpressions.push('zone = :zone');
        expressionValues[':zone'] = data.zone;
    }
    if (data.status) {
        updateExpressions.push('#status = :status');
        expressionValues[':status'] = data.status;
        expressionNames['#status'] = 'status';
    }

    updateExpressions.push('updated_at = :updated_at');
    expressionValues[':updated_at'] = new Date().toISOString();

    await dynamoDB.send(new UpdateCommand({
        TableName: AUDITORS_TABLE,
        Key: { id: auditorId },
        UpdateExpression: 'SET ' + updateExpressions.join(', '),
        ExpressionAttributeValues: expressionValues,
        ...(Object.keys(expressionNames).length > 0 && { ExpressionAttributeNames: expressionNames })
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Auditor updated successfully' })
    };
}

async function deleteAuditor(auditorId) {
    // Get auditor to find associated user
    const auditorResult = await dynamoDB.send(new GetCommand({
        TableName: AUDITORS_TABLE,
        Key: { id: auditorId }
    }));

    // Delete auditor
    await dynamoDB.send(new DeleteCommand({
        TableName: AUDITORS_TABLE,
        Key: { id: auditorId }
    }));

    // Find and delete associated user
    const usersResult = await dynamoDB.send(new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'auditor_id = :auditor_id',
        ExpressionAttributeValues: { ':auditor_id': auditorId }
    }));

    for (const user of (usersResult.Items || [])) {
        await dynamoDB.send(new DeleteCommand({
            TableName: USERS_TABLE,
            Key: { id: user.id }
        }));
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Auditor deleted successfully' })
    };
}

async function resetAuditorPassword(auditorId, newPassword) {
    // Find user associated with auditor
    const usersResult = await dynamoDB.send(new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'auditor_id = :auditor_id',
        ExpressionAttributeValues: { ':auditor_id': auditorId }
    }));

    const user = usersResult.Items?.[0];
    if (!user) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
    }

    await dynamoDB.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { id: user.id },
        UpdateExpression: 'SET password_hash = :password_hash',
        ExpressionAttributeValues: {
            ':password_hash': hashPassword(newPassword)
        }
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Password reset successfully' })
    };
}

// ========== AUDIT FUNCTIONS ==========

async function getAllAudits() {
    const result = await dynamoDB.send(new ScanCommand({
        TableName: AUDITS_TABLE
    }));

    // Sort by date descending
    const items = (result.Items || []).sort((a, b) =>
        new Date(b.audit_date) - new Date(a.audit_date)
    );

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(items)
    };
}

async function getAuditsByAuditor(auditorId) {
    const result = await dynamoDB.send(new ScanCommand({
        TableName: AUDITS_TABLE,
        FilterExpression: 'auditor_id = :auditor_id',
        ExpressionAttributeValues: { ':auditor_id': auditorId }
    }));

    // Sort by date descending
    const items = (result.Items || []).sort((a, b) =>
        new Date(b.audit_date) - new Date(a.audit_date)
    );

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(items)
    };
}

async function getAuditsByFranchise(franchiseId) {
    const result = await dynamoDB.send(new ScanCommand({
        TableName: AUDITS_TABLE,
        FilterExpression: 'franchise_id = :franchise_id',
        ExpressionAttributeValues: { ':franchise_id': franchiseId }
    }));

    // Sort by date descending
    const items = (result.Items || []).sort((a, b) =>
        new Date(b.audit_date) - new Date(a.audit_date)
    );

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(items)
    };
}

async function getAudit(auditId, auditorId = null) {
    const result = await dynamoDB.send(new GetCommand({
        TableName: AUDITS_TABLE,
        Key: { id: auditId }
    }));

    if (!result.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Audit not found' }) };
    }

    // If auditor, verify they own this audit
    if (auditorId && result.Item.auditor_id !== auditorId) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item)
    };
}

async function createAudit(data, decoded) {
    const id = `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Calculate overall score
    const scores = [
        data.temperature_compliance?.score || 0,
        data.cleanliness?.overall_score || 0,
        data.food_storage?.score || 0,
        data.hygiene_practices?.score || 0,
        data.equipment_condition?.score || 0,
        data.staff_compliance?.score || 0,
        data.pest_control?.score || 0,
        data.safety_compliance?.score || 0
    ];

    const validScores = scores.filter(s => s > 0);
    const overallScore = validScores.length > 0
        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        : 0;

    const audit = {
        id,
        auditor_id: decoded.auditor_id,
        auditor_name: decoded.auditor_name || decoded.name || 'Unknown',
        franchise_id: data.franchise_id,
        franchise_name: data.franchise_name || '',
        audit_date: data.audit_date || new Date().toISOString().split('T')[0],
        audit_time: data.audit_time || new Date().toTimeString().split(' ')[0],

        // Temperature Compliance
        temperature_compliance: {
            fridge_temp: data.temperature_compliance?.fridge_temp || '',
            freezer_temp: data.temperature_compliance?.freezer_temp || '',
            hot_holding_temp: data.temperature_compliance?.hot_holding_temp || '',
            cold_display_temp: data.temperature_compliance?.cold_display_temp || '',
            score: data.temperature_compliance?.score || 0,
            notes: data.temperature_compliance?.notes || ''
        },

        // Cleanliness
        cleanliness: {
            kitchen_area: data.cleanliness?.kitchen_area || 0,
            dining_area: data.cleanliness?.dining_area || 0,
            restrooms: data.cleanliness?.restrooms || 0,
            storage_area: data.cleanliness?.storage_area || 0,
            exterior: data.cleanliness?.exterior || 0,
            overall_score: data.cleanliness?.overall_score || 0,
            notes: data.cleanliness?.notes || ''
        },

        // Food Storage
        food_storage: {
            proper_labeling: data.food_storage?.proper_labeling || false,
            fifo_followed: data.food_storage?.fifo_followed || false,
            proper_separation: data.food_storage?.proper_separation || false,
            no_expired_items: data.food_storage?.no_expired_items || false,
            score: data.food_storage?.score || 0,
            notes: data.food_storage?.notes || ''
        },

        // Hygiene Practices
        hygiene_practices: {
            handwashing_compliance: data.hygiene_practices?.handwashing_compliance || false,
            gloves_usage: data.hygiene_practices?.gloves_usage || false,
            hairnets_usage: data.hygiene_practices?.hairnets_usage || false,
            no_jewelry: data.hygiene_practices?.no_jewelry || false,
            score: data.hygiene_practices?.score || 0,
            notes: data.hygiene_practices?.notes || ''
        },

        // Equipment Condition
        equipment_condition: {
            cooking_equipment: data.equipment_condition?.cooking_equipment || 0,
            refrigeration: data.equipment_condition?.refrigeration || 0,
            ventilation: data.equipment_condition?.ventilation || 0,
            fire_safety: data.equipment_condition?.fire_safety || 0,
            score: data.equipment_condition?.score || 0,
            notes: data.equipment_condition?.notes || ''
        },

        // Staff Compliance
        staff_compliance: {
            uniforms_clean: data.staff_compliance?.uniforms_clean || false,
            food_handlers_cert: data.staff_compliance?.food_handlers_cert || false,
            training_records: data.staff_compliance?.training_records || false,
            score: data.staff_compliance?.score || 0,
            notes: data.staff_compliance?.notes || ''
        },

        // Pest Control
        pest_control: {
            no_pest_evidence: data.pest_control?.no_pest_evidence || false,
            pest_control_records: data.pest_control?.pest_control_records || false,
            proper_waste_disposal: data.pest_control?.proper_waste_disposal || false,
            score: data.pest_control?.score || 0,
            notes: data.pest_control?.notes || ''
        },

        // Safety Compliance
        safety_compliance: {
            fire_extinguisher: data.safety_compliance?.fire_extinguisher || false,
            first_aid_kit: data.safety_compliance?.first_aid_kit || false,
            emergency_exits: data.safety_compliance?.emergency_exits || false,
            safety_signage: data.safety_compliance?.safety_signage || false,
            score: data.safety_compliance?.score || 0,
            notes: data.safety_compliance?.notes || ''
        },

        // Images (base64 or S3 URLs)
        images: data.images || [],

        // Overall
        overall_score: overallScore,
        overall_notes: data.overall_notes || '',
        recommendations: data.recommendations || '',
        critical_issues: data.critical_issues || [],

        status: 'SUBMITTED',
        admin_notes: '',
        reviewed_by: '',
        reviewed_at: '',

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await dynamoDB.send(new PutCommand({
        TableName: AUDITS_TABLE,
        Item: audit
    }));

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify(audit)
    };
}

async function updateAudit(auditId, data) {
    const updateExpressions = [];
    const expressionValues = {};
    const expressionNames = {};

    if (data.status) {
        updateExpressions.push('#status = :status');
        expressionValues[':status'] = data.status;
        expressionNames['#status'] = 'status';
    }
    if (data.admin_notes !== undefined) {
        updateExpressions.push('admin_notes = :admin_notes');
        expressionValues[':admin_notes'] = data.admin_notes;
    }
    if (data.reviewed_by) {
        updateExpressions.push('reviewed_by = :reviewed_by');
        expressionValues[':reviewed_by'] = data.reviewed_by;
        updateExpressions.push('reviewed_at = :reviewed_at');
        expressionValues[':reviewed_at'] = new Date().toISOString();
    }

    updateExpressions.push('updated_at = :updated_at');
    expressionValues[':updated_at'] = new Date().toISOString();

    await dynamoDB.send(new UpdateCommand({
        TableName: AUDITS_TABLE,
        Key: { id: auditId },
        UpdateExpression: 'SET ' + updateExpressions.join(', '),
        ExpressionAttributeValues: expressionValues,
        ...(Object.keys(expressionNames).length > 0 && { ExpressionAttributeNames: expressionNames })
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Audit updated successfully' })
    };
}

async function deleteAudit(auditId) {
    await dynamoDB.send(new DeleteCommand({
        TableName: AUDITS_TABLE,
        Key: { id: auditId }
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Audit deleted successfully' })
    };
}
