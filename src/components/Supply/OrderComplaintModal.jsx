import { useState, useRef, useEffect } from 'react';
import { complaintService } from '../../services/complaintService';

/**
 * OrderComplaintModal - Modal to raise a complaint for a specific order
 * Includes camera/image upload functionality
 */
export default function OrderComplaintModal({ 
  isOpen, 
  onClose, 
  order, 
  user,
  onSuccess 
}) {
  const [complaint, setComplaint] = useState({
    category: 'QUALITY',
    subject: '',
    description: '',
    priority: 'MEDIUM'
  });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setComplaint({
        category: 'QUALITY',
        subject: '',
        description: '',
        priority: 'MEDIUM'
      });
      setImages([]);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert('Each image must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, {
          name: file.name,
          data: reader.result,
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!complaint.subject.trim()) {
      alert('Please enter a subject');
      return;
    }
    if (!complaint.description.trim()) {
      alert('Please describe the issue');
      return;
    }

    setSubmitting(true);
    try {
      const complaintData = {
        category: complaint.category,
        subject: complaint.subject,
        description: complaint.description,
        priority: complaint.priority,
        order_id: order.id,
        order_number: order.order_number,
        vendor_id: order.vendor_id || '',
        vendor_name: order.vendor_name || 'Kitchen',
        attachments: images.map(img => ({
          name: img.name,
          data: img.data,
          type: img.type
        }))
      };

      await complaintService.createComplaint(complaintData);
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
      alert('Complaint submitted successfully!');
    } catch (err) {
      console.error('Failed to submit complaint:', err);
      alert('Failed to submit complaint: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { value: 'QUALITY', label: 'Quality Issue', icon: '⚠️' },
    { value: 'QUANTITY', label: 'Quantity Mismatch', icon: '📦' },
    { value: 'DELIVERY', label: 'Delivery Issue', icon: '🚚' },
    { value: 'PACKAGING', label: 'Packaging Issue', icon: '📋' },
    { value: 'GENERAL', label: 'General Issue', icon: '💬' }
  ];

  const priorities = [
    { value: 'LOW', label: 'Low', color: '#6b7280' },
    { value: 'MEDIUM', label: 'Medium', color: '#f59e0b' },
    { value: 'HIGH', label: 'High', color: '#ef4444' },
    { value: 'URGENT', label: 'Urgent', color: '#dc2626' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? 0 : 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: isMobile ? 0 : 16,
        width: isMobile ? '100%' : '90%',
        maxWidth: 600,
        height: isMobile ? '100%' : 'auto',
        maxHeight: isMobile ? '100%' : '90vh',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '16px 20px' : '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fef2f2',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20, color: '#991b1b' }}>
              Raise Complaint
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Order: {order.order_number}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#6b7280',
              padding: 4
            }}
          >
            ×
          </button>
        </div>

        {/* Form Content */}
        <div style={{ padding: isMobile ? 16 : 24, flex: 1 }}>
          {/* Order Info */}
          <div style={{
            background: '#f9fafb',
            borderRadius: 10,
            padding: 14,
            marginBottom: 20,
            fontSize: 13
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#6b7280' }}>Franchise:</span>
              <span style={{ fontWeight: 500 }}>{order.franchise_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#6b7280' }}>Order Date:</span>
              <span style={{ fontWeight: 500 }}>{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Items:</span>
              <span style={{ fontWeight: 500 }}>{order.items?.length || 0} items</span>
            </div>
          </div>

          {/* Category Selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#374151' }}>
              Issue Category *
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
              gap: 8 
            }}>
              {categories.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setComplaint({ ...complaint, category: cat.value })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: complaint.category === cat.value ? '2px solid #ef4444' : '1px solid #e5e7eb',
                    background: complaint.category === cat.value ? '#fef2f2' : 'white',
                    cursor: 'pointer',
                    fontSize: 13,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{cat.icon}</span>
                  <span style={{ color: complaint.category === cat.value ? '#991b1b' : '#374151' }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority Selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#374151' }}>
              Priority *
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {priorities.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setComplaint({ ...complaint, priority: p.value })}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: complaint.priority === p.value ? `2px solid ${p.color}` : '1px solid #e5e7eb',
                    background: complaint.priority === p.value ? `${p.color}15` : 'white',
                    color: complaint.priority === p.value ? p.color : '#6b7280',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14, color: '#374151' }}>
              Subject *
            </label>
            <input
              type="text"
              value={complaint.subject}
              onChange={(e) => setComplaint({ ...complaint, subject: e.target.value })}
              placeholder="Brief description of the issue"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '2px solid #e5e7eb',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14, color: '#374151' }}>
              Description *
            </label>
            <textarea
              value={complaint.description}
              onChange={(e) => setComplaint({ ...complaint, description: e.target.value })}
              placeholder="Provide detailed information about your complaint..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '2px solid #e5e7eb',
                fontSize: 14,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Image Upload Section */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#374151' }}>
              Attach Photos (Optional)
            </label>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Add up to 5 photos as evidence. Max 5MB each.
            </p>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {/* Camera Button - Mobile */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '2px dashed #d1d5db',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#6b7280',
                  fontSize: 14
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Take Photo
              </button>
              
              {/* Gallery Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '2px dashed #d1d5db',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#6b7280',
                  fontSize: 14
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Choose File
              </button>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            {/* Image Previews */}
            {images.length > 0 && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                gap: 8 
              }}>
                {images.map((img, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      position: 'relative',
                      paddingTop: '100%',
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <img
                      src={img.data}
                      alt={`Attachment ${index + 1}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: isMobile ? 16 : 24,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 12,
          flexDirection: isMobile ? 'column' : 'row',
          position: 'sticky',
          bottom: 0,
          background: 'white'
        }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: 10,
              border: 'none',
              background: submitting ? '#9ca3af' : '#ef4444',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '14px 24px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: 'white',
              color: '#374151',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
