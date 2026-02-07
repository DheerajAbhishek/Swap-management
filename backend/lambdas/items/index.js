const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const ITEMS_TABLE = 'supply_items';

// CORS headers
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Generate unique ID
function generateId() {
    return 'item-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path;

    // Handle OPTIONS for CORS
    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // GET /items - List all items
        if (httpMethod === 'GET' && !path.includes('/items/')) {
            const result = await dynamodb.send(new ScanCommand({
                TableName: ITEMS_TABLE
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Items || [])
            };
        }

        // GET /items/{id} - Get single item
        if (httpMethod === 'GET' && path.includes('/items/')) {
            const itemId = event.pathParameters?.id;

            const result = await dynamodb.send(new GetCommand({
                TableName: ITEMS_TABLE,
                Key: { id: itemId }
            }));

            if (!result.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Item not found' })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Item)
            };
        }

        // POST /items - Create item
        if (httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');

            const item = {
                id: generateId(),
                name: body.name,
                category: body.category,
                subcategory: body.subcategory || '',
                defaultUom: body.defaultUom || 'kg',
                standard_price: body.standard_price || 0,
                created_at: new Date().toISOString()
            };

            await dynamodb.send(new PutCommand({
                TableName: ITEMS_TABLE,
                Item: item
            }));

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(item)
            };
        }

        // PUT /items/{id} - Update item
        if (httpMethod === 'PUT') {
            const itemId = event.pathParameters?.id;
            const body = JSON.parse(event.body || '{}');

            const result = await dynamodb.send(new UpdateCommand({
                TableName: ITEMS_TABLE,
                Key: { id: itemId },
                UpdateExpression: 'SET #name = :name, category = :category, subcategory = :subcategory, defaultUom = :defaultUom, standard_price = :price, updated_at = :updated',
                ExpressionAttributeNames: { '#name': 'name' },
                ExpressionAttributeValues: {
                    ':name': body.name,
                    ':category': body.category,
                    ':subcategory': body.subcategory || '',
                    ':defaultUom': body.defaultUom || 'kg',
                    ':price': body.standard_price || 0,
                    ':updated': new Date().toISOString()
                },
                ReturnValues: 'ALL_NEW'
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Attributes)
            };
        }

        // DELETE /items/{id} - Delete item
        if (httpMethod === 'DELETE') {
            const itemId = event.pathParameters?.id;

            await dynamodb.send(new DeleteCommand({
                TableName: ITEMS_TABLE,
                Key: { id: itemId }
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Item deleted' })
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};
