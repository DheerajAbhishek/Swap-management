/**
 * Photo Upload Lambda - Handle photo uploads to S3
 * Supports: complaints, discrepancies, order dispatch/receive photos
 */
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: 'ap-south-1' });
const BUCKET_NAME = 'swap-management-photos';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function getUserFromToken(event) {
    try {
        const authHeader = event.headers?.authorization || event.headers?.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

        const token = authHeader.replace('Bearer ', '');
        // Our token is a simple base64 encoded JSON, not a real JWT
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));

        // Check token expiration
        if (payload.exp && payload.exp < Date.now()) {
            return null;
        }
        return payload;
    } catch (err) {
        console.error('Token parse error:', err);
        return null;
    }
}

exports.handler = async (event) => {
    console.log('Photo Lambda Event:', JSON.stringify(event));

    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path;

    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const user = getUserFromToken(event);
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        // POST /photos/upload - Upload a photo
        if (httpMethod === 'POST' && path.includes('/upload')) {
            const body = JSON.parse(event.body || '{}');
            const { image, filename, contentType, folder } = body;

            if (!image) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Image data is required' })
                };
            }

            // Extract base64 data (remove data URL prefix if present)
            let imageData = image;
            if (image.startsWith('data:')) {
                imageData = image.split(',')[1];
            }

            // Generate unique filename
            const timestamp = Date.now();
            const random = Math.random().toString(36).substr(2, 8);
            const extension = (contentType || 'image/jpeg').split('/')[1] || 'jpg';
            const key = `${folder || 'general'}/${timestamp}-${random}.${extension}`;

            // Convert base64 to buffer
            const buffer = Buffer.from(imageData, 'base64');

            // Upload to S3
            await s3.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: contentType || 'image/jpeg',
                Metadata: {
                    'uploaded-by': user.userId || 'unknown',
                    'original-name': filename || 'photo.jpg'
                }
            }));

            // Generate URL (public URL if bucket is configured for public access)
            const url = `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${key}`;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    url,
                    key,
                    filename: `${timestamp}-${random}.${extension}`
                })
            };
        }

        // DELETE /photos - Delete a photo
        if (httpMethod === 'DELETE') {
            const body = JSON.parse(event.body || '{}');
            const { url, key } = body;

            let objectKey = key;
            if (!objectKey && url) {
                // Extract key from URL
                const urlParts = url.split('.amazonaws.com/');
                if (urlParts.length > 1) {
                    objectKey = urlParts[1];
                }
            }

            if (!objectKey) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Photo key or URL is required' })
                };
            }

            await s3.send(new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: objectKey
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Photo deleted' })
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
