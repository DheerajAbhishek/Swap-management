import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { staffService } from '../../services/staffService';
import {
  CalendarIcon,
  ChartIcon,
  CameraIcon,
  UserIcon,
  ShoesIcon,
  KitchenIcon,
  CleanIcon,
  CloseIcon,
  ImageIcon
} from '../../components/AttendanceIcons';

/**
 * Franchise Staff Attendance Page
 * Allows marking check-in with photos (selfie + shoes) and check-out
 * Photos must be captured via camera, no file upload
 * Shows attendance history and score
 */
export default function StaffAttendance() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'history'
  const [selectedRecord, setSelectedRecord] = useState(null); // For viewing photos

  // Camera state
  const [cameraMode, setCameraMode] = useState(null); // 'selfie', 'shoes', 'mesa', 'standing'
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [shoesPhoto, setShoesPhoto] = useState(null);
  const [mesaPhoto, setMesaPhoto] = useState(null);
  const [standingPhoto, setStandingPhoto] = useState(null);
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const currentTime = new Date();
  const isBeforeCutoff = currentTime.getHours() < 10 || (currentTime.getHours() === 10 && currentTime.getMinutes() === 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch today's attendance
        const attendance = await attendanceService.getTodayAttendance();
        setTodayAttendance(attendance);

        // Fetch attendance history (last 30 days)
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const history = await attendanceService.getAttendance({
          startDate,
          endDate,
          staffId: user?.staff_id || user?.id
        });
        setAttendanceHistory(Array.isArray(history) ? history : []);

        // Fetch staff info for score
        if (user?.staff_id || user?.id) {
          try {
            const staff = await staffService.getStaffById(user.staff_id || user.id);
            setStaffInfo(staff);
          } catch (e) {
            console.log('Could not fetch staff info:', e);
          }
        }
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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

      // Request camera access - use back camera for mesa, standing, shoes; front for selfie
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode === 'selfie' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
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
    } else if (cameraMode === 'shoes') {
      setShoesPhoto(photoData);
    } else if (cameraMode === 'mesa') {
      setMesaPhoto(photoData);
    } else if (cameraMode === 'standing') {
      setStandingPhoto(photoData);
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
    if (!selfiePhoto || !shoesPhoto || !mesaPhoto || !standingPhoto) {
      setError('Please capture all 4 photos before checking in');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await attendanceService.checkIn({
        selfie_photo: selfiePhoto,
        shoes_photo: shoesPhoto,
        mesa_photo: mesaPhoto,
        standing_area_photo: standingPhoto
      });

      setSuccess(result.message);
      setTodayAttendance(result.attendance);
      setSelfiePhoto(null);
      setShoesPhoto(null);
      setMesaPhoto(null);
      setStandingPhoto(null);
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
        shift_duration: Math.round(result.shiftDuration * 60), // Convert hours to minutes
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

  // Format duration helper
  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  // History Tab Content
  const renderHistoryTab = () => (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Score Card */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        borderRadius: 16,
        padding: 24,
        color: 'white',
        marginBottom: 20,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Your Attendance Score</div>
        <div style={{
          fontSize: 48,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}>
          {staffInfo?.score ?? 100}
          <span style={{ fontSize: 20, fontWeight: 400 }}>/ 100</span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
          {(staffInfo?.score ?? 100) >= 90 ? '🌟 Excellent' :
            (staffInfo?.score ?? 100) >= 70 ? '👍 Good' : '⚠️ Needs Improvement'}
        </div>
      </div>

      {/* History List */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Attendance History</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Last 30 days</p>
        </div>

        {attendanceHistory.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            No attendance records found
          </div>
        ) : (
          <div>
            {attendanceHistory.map((record, index) => (
              <div
                key={record.id || index}
                onClick={() => setSelectedRecord(record)}
                style={{
                  padding: 16,
                  borderBottom: index < attendanceHistory.length - 1 ? '1px solid #f3f4f6' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>
                    {new Date(record.date || record.checkin_time).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {record.checkin_time
                      ? new Date(record.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '-'
                    }
                    {record.checkout_time && (
                      <> → {new Date(record.checkout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>
                    )}
                  </div>
                  {(record.selfie_photo || record.shoes_photo || record.mesa_photo || record.standing_area_photo) && (
                    <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CameraIcon size={14} color="#3b82f6" /> Click to view photos
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: (record.status === 'PRESENT' || record.status === 'ON_TIME') ? '#d1fae5' :
                      record.status === 'LATE' ? '#fef3c7' :
                        record.status === 'ABSENT' ? '#fee2e2' : '#f3f4f6',
                    color: (record.status === 'PRESENT' || record.status === 'ON_TIME') ? '#065f46' :
                      record.status === 'LATE' ? '#92400e' :
                        record.status === 'ABSENT' ? '#991b1b' : '#6b7280'
                  }}>
                    {record.status === 'ON_TIME' ? 'ON TIME' : (record.status || (record.checkin_time ? (record.is_late ? 'LATE' : 'PRESENT') : 'ABSENT'))}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                    {formatDuration(record.shift_duration)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Already checked out
  if (todayAttendance?.checkout_time) {
    return (
      <div>
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          maxWidth: 600,
          margin: '0 auto 24px'
        }}>
          <button
            onClick={() => setActiveTab('today')}
            style={{
              flex: 1,
              padding: '12px 20px',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'today' ? '#3b82f6' : '#f3f4f6',
              color: activeTab === 'today' ? 'white' : '#6b7280'
            }}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '12px 20px',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'history' ? '#3b82f6' : '#f3f4f6',
              color: activeTab === 'history' ? 'white' : '#6b7280'
            }}
          >
            History & Score
          </button>
        </div>

        {activeTab === 'history' ? renderHistoryTab() : (
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
        )}
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
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setActiveTab('today')}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'today' ? '#3b82f6' : '#f3f4f6',
              color: activeTab === 'today' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <CalendarIcon size={16} color={activeTab === 'today' ? 'white' : '#6b7280'} /> Today
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'history' ? '#3b82f6' : '#f3f4f6',
              color: activeTab === 'history' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <ChartIcon size={16} color={activeTab === 'history' ? 'white' : '#6b7280'} /> History & Score
          </button>
        </div>

      {activeTab === 'history' ? (
        renderHistoryTab()
      ) : (
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
        )}
      </div>
    );
  }

  // Show check-in form with camera
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('today')}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: activeTab === 'today' ? '#3b82f6' : '#f3f4f6',
            color: activeTab === 'today' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <CalendarIcon size={16} color={activeTab === 'today' ? 'white' : '#6b7280'} /> Today
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: activeTab === 'history' ? '#3b82f6' : '#f3f4f6',
            color: activeTab === 'history' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <ChartIcon size={16} color={activeTab === 'history' ? 'white' : '#6b7280'} /> History & Score
        </button>
      </div>

      {activeTab === 'history' ? (
        renderHistoryTab()
      ) : (
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
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  {cameraMode === 'selfie' && <><CameraIcon size={16} color="white" /> Take selfie showing grooming & hair cap</>}
                  {cameraMode === 'shoes' && <><CameraIcon size={16} color="white" /> Take photo of your shoes/boots</>}
                  {cameraMode === 'mesa' && <><CameraIcon size={16} color="white" /> Take photo of kitchen/pit with food items visible</>}
                  {cameraMode === 'standing' && <><CameraIcon size={16} color="white" /> Take photo of standing/work area for cleanliness</>}
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
                    <div style={{ marginBottom: 8 }}><UserIcon size={40} color="#d1d5db" /></div>
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
                    <div style={{ marginBottom: 8 }}><ShoesIcon size={40} color="#d1d5db" /></div>
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

              {/* Mesa Photo */}
              <div style={{
                border: `2px dashed ${mesaPhoto ? '#10b981' : '#d1d5db'}`,
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
                background: mesaPhoto ? '#f0fdf4' : '#f9fafb'
              }}>
                {mesaPhoto ? (
                  <>
                    <img
                      src={mesaPhoto}
                      alt="Mesa"
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        marginBottom: 12
                      }}
                    />
                    <button
                      onClick={() => startCamera('mesa')}
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
                    <div style={{ marginBottom: 8 }}><KitchenIcon size={40} color="#d1d5db" /></div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Kitchen/Mesa Photo</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                      Show overall pit with food items
                    </div>
                    <button
                      onClick={() => startCamera('mesa')}
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

              {/* Standing Area Photo */}
              <div style={{
                border: `2px dashed ${standingPhoto ? '#10b981' : '#d1d5db'}`,
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
                background: standingPhoto ? '#f0fdf4' : '#f9fafb'
              }}>
                {standingPhoto ? (
                  <>
                    <img
                      src={standingPhoto}
                      alt="Standing Area"
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        marginBottom: 12
                      }}
                    />
                    <button
                      onClick={() => startCamera('standing')}
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
                    <div style={{ marginBottom: 8 }}><CleanIcon size={40} color="#d1d5db" /></div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Standing Area Photo</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                      Show work area cleanliness
                    </div>
                    <button
                      onClick={() => startCamera('standing')}
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
              disabled={submitting || !selfiePhoto || !shoesPhoto || !mesaPhoto || !standingPhoto}
              style={{
                width: '100%',
                padding: 16,
                background: selfiePhoto && shoesPhoto && mesaPhoto && standingPhoto ? '#10b981' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: selfiePhoto && shoesPhoto && mesaPhoto && standingPhoto && !submitting ? 'pointer' : 'not-allowed',
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
      )}

      {/* Photo Viewer Modal */}
      {selectedRecord && (
        <div
          onClick={() => setSelectedRecord(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 16,
              maxWidth: 900,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 24
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
                  Attendance Photos
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
                  {new Date(selectedRecord.date || selectedRecord.checkin_time).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                  {' · '}
                  {selectedRecord.checkin_time && new Date(selectedRecord.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CloseIcon size={18} color="#6b7280" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {selectedRecord.selfie_photo && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserIcon size={16} color="#6b7280" /> Selfie
                  </div>
                  <img
                    src={selectedRecord.selfie_photo}
                    alt="Selfie"
                    style={{ width: '100%', borderRadius: 12, border: '2px solid #e5e7eb' }}
                  />
                </div>
              )}
              {selectedRecord.shoes_photo && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShoesIcon size={16} color="#6b7280" /> Shoes
                  </div>
                  <img
                    src={selectedRecord.shoes_photo}
                    alt="Shoes"
                    style={{ width: '100%', borderRadius: 12, border: '2px solid #e5e7eb' }}
                  />
                </div>
              )}
              {selectedRecord.mesa_photo && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <KitchenIcon size={16} color="#6b7280" /> Kitchen Overview (Mesa)
                  </div>
                  <img
                    src={selectedRecord.mesa_photo}
                    alt="Kitchen Overview"
                    style={{ width: '100%', borderRadius: 12, border: '2px solid #e5e7eb' }}
                  />
                </div>
              )}
              {selectedRecord.standing_area_photo && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CleanIcon size={16} color="#6b7280" /> Standing Area
                  </div>
                  <img
                    src={selectedRecord.standing_area_photo}
                    alt="Standing Area"
                    style={{ width: '100%', borderRadius: 12, border: '2px solid #e5e7eb' }}
                  />
                </div>
              )}
            </div>

            {(!selectedRecord.selfie_photo && !selectedRecord.shoes_photo && !selectedRecord.mesa_photo && !selectedRecord.standing_area_photo) && (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                No photos available for this attendance record
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
