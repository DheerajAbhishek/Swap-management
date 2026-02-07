import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';

/**
 * Franchise Staff Attendance Page
 * Allows marking check-in with photos (selfie + shoes) and check-out
 * Photos must be captured via camera, no file upload
 */
export default function StaffAttendance() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Camera state
  const [cameraMode, setCameraMode] = useState(null); // 'selfie' or 'shoes'
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [shoesPhoto, setShoesPhoto] = useState(null);
  const [stream, setStream] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const currentTime = new Date();
  const isBeforeCutoff = currentTime.getHours() < 10 || (currentTime.getHours() === 10 && currentTime.getMinutes() === 0);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const attendance = await attendanceService.getTodayAttendance();
        setTodayAttendance(attendance);
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = useCallback(async (mode) => {
    try {
      setError(null);
      setCameraMode(mode);
      
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode === 'selfie' ? 'user' : 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please grant camera permissions.');
      setCameraMode(null);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const photoData = canvas.toDataURL('image/jpeg', 0.8);

    if (cameraMode === 'selfie') {
      setSelfiePhoto(photoData);
    } else {
      setShoesPhoto(photoData);
    }

    // Stop camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraMode(null);
  }, [cameraMode, stream]);

  const cancelCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraMode(null);
  }, [stream]);

  const handleCheckIn = async () => {
    if (!selfiePhoto || !shoesPhoto) {
      setError('Please capture both photos before checking in');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const result = await attendanceService.checkIn({
        selfie_photo: selfiePhoto,
        shoes_photo: shoesPhoto
      });

      setSuccess(result.message);
      setTodayAttendance(result.attendance);
      setSelfiePhoto(null);
      setShoesPhoto(null);
    } catch (err) {
      console.error('Check-in failed:', err);
      setError(err.response?.data?.error || 'Failed to check in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      const result = await attendanceService.checkOut();
      setSuccess(result.message);
      
      // Update attendance state
      setTodayAttendance(prev => ({
        ...prev,
        checkout_time: new Date().toISOString(),
        shift_duration: result.shiftDuration,
        is_early_checkout: result.isEarlyCheckout
      }));
    } catch (err) {
      console.error('Check-out failed:', err);
      setError(err.response?.data?.error || 'Failed to check out');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading...</div>;
  }

  // Already checked out
  if (todayAttendance?.checkout_time) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
            Shift Complete
          </h1>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            You have completed your shift for today.
          </p>
          
          <div style={{ background: '#f3f4f6', borderRadius: 12, padding: 16, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#6b7280' }}>Check-in:</span>
              <span style={{ fontWeight: 600 }}>
                {new Date(todayAttendance.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                {todayAttendance.is_late && <span style={{ color: '#f59e0b', marginLeft: 8 }}>⚠️ Late</span>}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#6b7280' }}>Check-out:</span>
              <span style={{ fontWeight: 600 }}>
                {new Date(todayAttendance.checkout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Duration:</span>
              <span style={{ fontWeight: 600, color: todayAttendance.is_early_checkout ? '#f59e0b' : '#10b981' }}>
                {Math.floor(todayAttendance.shift_duration / 60)}h {todayAttendance.shift_duration % 60}m
                {todayAttendance.is_early_checkout && <span style={{ marginLeft: 8 }}>⚠️ Early</span>}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Already checked in, show checkout option
  if (todayAttendance?.checkin_time) {
    const checkInTime = new Date(todayAttendance.checkin_time);
    const hoursWorked = (new Date() - checkInTime) / (1000 * 60 * 60);
    const minShiftHours = 9;
    const canCheckoutOnTime = hoursWorked >= minShiftHours;

    return (
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🕐</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
              Currently Working
            </h1>
            <p style={{ color: '#6b7280' }}>
              Checked in at {checkInTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {todayAttendance.is_late && <span style={{ color: '#f59e0b', marginLeft: 8 }}>⚠️ Late</span>}
            </p>
          </div>

          {success && (
            <div style={{
              background: '#d1fae5',
              color: '#065f46',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              textAlign: 'center'
            }}>
              {success}
            </div>
          )}

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <div style={{ background: '#f3f4f6', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280' }}>Hours worked:</span>
              <span style={{ 
                fontSize: 24, 
                fontWeight: 700, 
                color: canCheckoutOnTime ? '#10b981' : '#f59e0b' 
              }}>
                {hoursWorked.toFixed(1)}h
              </span>
            </div>
            <div style={{ 
              height: 8, 
              background: '#e5e7eb', 
              borderRadius: 4, 
              marginTop: 12,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min((hoursWorked / minShiftHours) * 100, 100)}%`,
                background: canCheckoutOnTime ? '#10b981' : '#f59e0b',
                borderRadius: 4,
                transition: 'width 0.3s'
              }} />
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
              Minimum shift: {minShiftHours} hours
              {!canCheckoutOnTime && ` (${(minShiftHours - hoursWorked).toFixed(1)}h remaining)`}
            </div>
          </div>

          {!canCheckoutOnTime && (
            <div style={{
              background: '#fef3c7',
              color: '#92400e',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
              textAlign: 'center'
            }}>
              ⚠️ Early checkout will deduct 5 points from your score
            </div>
          )}

          <button
            onClick={handleCheckOut}
            disabled={submitting}
            style={{
              width: '100%',
              padding: 16,
              background: canCheckoutOnTime ? '#10b981' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Processing...' : canCheckoutOnTime ? '👋 Check Out' : '⚠️ Check Out Early'}
          </button>
        </div>
      </div>
    );
  }

  // Show check-in form with camera
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
          Mark Attendance
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Take photos to check in for today
        </p>

        {!isBeforeCutoff && (
          <div style={{
            background: '#fef3c7',
            color: '#92400e',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            textAlign: 'center'
          }}>
            ⚠️ It's past 10:00 AM. Check-in will be marked as late (-5 points)
          </div>
        )}

        {success && (
          <div style={{
            background: '#d1fae5',
            color: '#065f46',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            textAlign: 'center'
          }}>
            {success}
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Camera View */}
        {cameraMode && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              background: '#000',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 12,
              position: 'relative'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', display: 'block' }}
              />
              <div style={{
                position: 'absolute',
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14
              }}>
                {cameraMode === 'selfie' 
                  ? '📸 Take selfie showing grooming & hair cap' 
                  : '👟 Take photo of your shoes/boots'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={capturePhoto}
                style={{
                  flex: 1,
                  padding: 14,
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📷 Capture
              </button>
              <button
                onClick={cancelCamera}
                style={{
                  padding: 14,
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Photo capture buttons */}
        {!cameraMode && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Selfie Photo */}
            <div style={{
              border: `2px dashed ${selfiePhoto ? '#10b981' : '#d1d5db'}`,
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
              background: selfiePhoto ? '#f0fdf4' : '#f9fafb'
            }}>
              {selfiePhoto ? (
                <>
                  <img 
                    src={selfiePhoto} 
                    alt="Selfie" 
                    style={{ 
                      width: '100%', 
                      borderRadius: 8, 
                      marginBottom: 12 
                    }} 
                  />
                  <button
                    onClick={() => startCamera('selfie')}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: '#10b981',
                      border: '1px solid #10b981',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Retake
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🤳</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Selfie Photo</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                    Show grooming & hair cap
                  </div>
                  <button
                    onClick={() => startCamera('selfie')}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Take Photo
                  </button>
                </>
              )}
            </div>

            {/* Shoes Photo */}
            <div style={{
              border: `2px dashed ${shoesPhoto ? '#10b981' : '#d1d5db'}`,
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
              background: shoesPhoto ? '#f0fdf4' : '#f9fafb'
            }}>
              {shoesPhoto ? (
                <>
                  <img 
                    src={shoesPhoto} 
                    alt="Shoes" 
                    style={{ 
                      width: '100%', 
                      borderRadius: 8, 
                      marginBottom: 12 
                    }} 
                  />
                  <button
                    onClick={() => startCamera('shoes')}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: '#10b981',
                      border: '1px solid #10b981',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Retake
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👟</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Shoes Photo</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                    Show your boots/shoes
                  </div>
                  <button
                    onClick={() => startCamera('shoes')}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Take Photo
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Check-in Button */}
        {!cameraMode && (
          <button
            onClick={handleCheckIn}
            disabled={submitting || !selfiePhoto || !shoesPhoto}
            style={{
              width: '100%',
              padding: 16,
              background: selfiePhoto && shoesPhoto ? '#10b981' : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: selfiePhoto && shoesPhoto && !submitting ? 'pointer' : 'not-allowed',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Checking in...' : '✓ Check In'}
          </button>
        )}

        {/* Instructions */}
        <div style={{ marginTop: 24, padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📋 Requirements</h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#6b7280' }}>
            <li>Selfie must show proper grooming and hair cap</li>
            <li>Shoes photo must clearly show your work boots/shoes</li>
            <li>Check in before 10:00 AM to avoid late penalty</li>
            <li>Minimum shift duration is 9 hours</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
