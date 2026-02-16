import { useState, useRef, useEffect } from 'react';

/**
 * PhotoCapture - Reusable component for capturing/uploading photos
 * Works with mobile camera and file upload
 */
export default function PhotoCapture({
    photos = [],
    onChange,
    maxPhotos = 5,
    maxSizeMB = 5,
    label = 'Add Photos',
    required = false,
    disabled = false
}) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const [capturing, setCapturing] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => {
            handleResize();
            // Cleanup camera stream
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        processFiles(files);
        e.target.value = ''; // Reset input
    };

    const processFiles = async (files) => {
        if (files.length + photos.length > maxPhotos) {
            alert(`Maximum ${maxPhotos} photos allowed`);
            return;
        }

        const newPhotos = [];

        for (const file of files) {
            if (file.size > maxSizeMB * 1024 * 1024) {
                alert(`${file.name} exceeds ${maxSizeMB}MB limit`);
                continue;
            }

            // Compress and convert to base64
            const compressed = await compressImage(file);
            newPhotos.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                name: file.name,
                data: compressed,
                type: file.type,
                timestamp: new Date().toISOString()
            });
        }

        onChange([...photos, ...newPhotos]);
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    // Max dimensions
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;

                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }
                    if (height > MAX_HEIGHT) {
                        width = (width * MAX_HEIGHT) / height;
                        height = MAX_HEIGHT;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG at 80% quality
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            setCameraStream(stream);
            setCapturing(true);

            // Wait for video element to be available
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            }, 100);
        } catch (err) {
            console.error('Camera access denied:', err);
            alert('Could not access camera. Please use file upload instead.');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const photoData = canvas.toDataURL('image/jpeg', 0.8);

        const newPhoto = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name: `photo_${new Date().toISOString()}.jpg`,
            data: photoData,
            type: 'image/jpeg',
            timestamp: new Date().toISOString()
        };

        onChange([...photos, newPhoto]);
        stopCamera();
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setCapturing(false);
    };

    const removePhoto = (photoId) => {
        onChange(photos.filter(p => p.id !== photoId));
    };

    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{
                display: 'block',
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 14,
                color: '#374151'
            }}>
                {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                    ({photos.length}/{maxPhotos})
                </span>
            </label>

            {/* Camera View */}
            {capturing && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'black',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ flex: 1, objectFit: 'cover' }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 20,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 20,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))'
                    }}>
                        <button
                            type="button"
                            onClick={stopCamera}
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: '50%',
                                border: '2px solid white',
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                fontSize: 20,
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                        <button
                            type="button"
                            onClick={capturePhoto}
                            disabled={photos.length >= maxPhotos}
                            style={{
                                width: 70,
                                height: 70,
                                borderRadius: '50%',
                                border: '4px solid white',
                                background: photos.length >= maxPhotos ? '#6b7280' : '#ef4444',
                                cursor: photos.length >= maxPhotos ? 'not-allowed' : 'pointer'
                            }}
                        />
                        <div style={{ width: 50 }} /> {/* Spacer for centering */}
                    </div>
                </div>
            )}

            {/* Photo Preview Modal */}
            {previewPhoto && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.9)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20
                    }}
                    onClick={() => setPreviewPhoto(null)}
                >
                    <img
                        src={previewPhoto}
                        alt="Preview"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            borderRadius: 8
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setPreviewPhoto(null)}
                        style={{
                            position: 'absolute',
                            top: 20,
                            right: 20,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            fontSize: 24,
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Upload Buttons */}
            {photos.length < maxPhotos && !disabled && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    {/* Camera Button - Only show on mobile or devices with camera */}
                    <button
                        type="button"
                        onClick={startCamera}
                        style={{
                            flex: 1,
                            padding: '14px 16px',
                            borderRadius: 10,
                            border: '2px dashed #d1d5db',
                            background: '#f9fafb',
                            color: '#374151',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        Take Photo
                    </button>

                    {/* File Upload Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            flex: 1,
                            padding: '14px 16px',
                            borderRadius: 10,
                            border: '2px dashed #d1d5db',
                            background: '#f9fafb',
                            color: '#374151',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        Upload
                    </button>

                    {/* Hidden file inputs */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                </div>
            )}

            {/* Photo Grid */}
            {photos.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: 10
                }}>
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            style={{
                                position: 'relative',
                                aspectRatio: '1',
                                borderRadius: 8,
                                overflow: 'hidden',
                                border: '1px solid #e5e7eb'
                            }}
                        >
                            <img
                                src={photo.data || photo.url}
                                alt={photo.name}
                                onClick={() => setPreviewPhoto(photo.data || photo.url)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                }}
                            />
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => removePhoto(photo.id)}
                                    style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: 'rgba(239,68,68,0.9)',
                                        color: 'white',
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Helper text */}
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                Supported: JPG, PNG. Max {maxSizeMB}MB per photo.
            </p>
        </div>
    );
}
