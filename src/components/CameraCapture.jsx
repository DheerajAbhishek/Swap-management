import { useState, useRef, useEffect } from 'react';

/**
 * CameraCapture - Camera-only photo capture component for on-spot verification
 * Mobile-first design with fallback for desktop
 */
export default function CameraCapture({
    photo = null,
    onChange,
    label = 'Capture Photo',
    required = false,
    disabled = false
}) {
    const [capturing, setCapturing] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        return () => {
            // Cleanup camera stream on unmount
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    const startCamera = async () => {
        try {
            setCameraError(null);
            // Request camera with preference for back camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
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
            console.error('Camera access error:', err);
            setCameraError('Camera access denied. Please allow camera access to capture photos.');
            alert('Please enable camera access in your browser settings to capture photos.');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Convert to JPEG with 80% quality
        const photoData = canvas.toDataURL('image/jpeg', 0.8);

        onChange(photoData);

        // Stop camera
        stopCamera();
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setCapturing(false);
    };

    const retakePhoto = () => {
        onChange(null);
        startCamera();
    };

    const removePhoto = () => {
        onChange(null);
    };

    return (
        <div className="camera-capture" style={{ width: '100%' }}>
            {!photo && !capturing && (
                <button
                    type="button"
                    onClick={startCamera}
                    disabled={disabled}
                    className="btn btn-primary w-100"
                    style={{
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    {label} {required && <span className="text-danger">*</span>}
                </button>
            )}

            {cameraError && (
                <div className="alert alert-warning mt-2">
                    {cameraError}
                </div>
            )}

            {capturing && (
                <div className="camera-preview" style={{
                    position: 'relative',
                    width: '100%',
                    background: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <video
                        ref={videoRef}
                        style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '400px',
                            display: 'block'
                        }}
                        autoPlay
                        playsInline
                        muted
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    <div
                        className="camera-controls"
                        style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: 0,
                            right: 0,
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '12px',
                            padding: '0 20px'
                        }}
                    >
                        <button
                            type="button"
                            onClick={capturePhoto}
                            className="btn btn-light"
                            style={{
                                borderRadius: '50%',
                                width: '64px',
                                height: '64px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="10" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={stopCamera}
                            className="btn btn-secondary"
                            style={{
                                borderRadius: '50%',
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {photo && !capturing && (
                <div className="photo-preview" style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid #dee2e6'
                }}>
                    <img
                        src={photo}
                        alt="Captured"
                        style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '300px',
                            objectFit: 'cover',
                            display: 'block'
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            display: 'flex',
                            gap: '8px'
                        }}
                    >
                        <button
                            type="button"
                            onClick={retakePhoto}
                            className="btn btn-sm btn-warning"
                            disabled={disabled}
                            title="Retake photo"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={removePhoto}
                            className="btn btn-sm btn-danger"
                            disabled={disabled}
                            title="Remove photo"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
