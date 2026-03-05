import { useState, useEffect } from 'react';
import { staffService } from '../services/staffService';

/**
 * Staff Score Form Component
 * Form to create or update staff performance scores
 */
export default function StaffScoreForm({ staffId, staffName, onSuccess, onCancel }) {
    const [formData, setFormData] = useState({
        attendance_score: 0,
        hygiene_score: 0,
        discipline_score: 0,
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingCurrent, setLoadingCurrent] = useState(true);

    useEffect(() => {
        if (staffId) {
            loadCurrentScore();
        }
    }, [staffId]);

    const loadCurrentScore = async () => {
        try {
            setLoadingCurrent(true);
            const response = await staffService.getCurrentMonthScore(staffId);
            if (response.data) {
                setFormData({
                    attendance_score: response.data.attendance_score || 0,
                    hygiene_score: response.data.hygiene_score || 0,
                    discipline_score: response.data.discipline_score || 0,
                    notes: response.data.notes || ''
                });
            }
        } catch (err) {
            // No existing score, that's fine
            console.log('No existing score found');
        } finally {
            setLoadingCurrent(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate scores
        if (formData.attendance_score < 0 || formData.attendance_score > 10) {
            setError('Attendance score must be between 0 and 10');
            return;
        }
        if (formData.hygiene_score < 0 || formData.hygiene_score > 10) {
            setError('Hygiene score must be between 0 and 10');
            return;
        }
        if (formData.discipline_score < 0 || formData.discipline_score > 10) {
            setError('Discipline score must be between 0 and 10');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const scoreData = {
                staff_id: staffId,
                staff_name: staffName,
                attendance_score: parseFloat(formData.attendance_score),
                hygiene_score: parseFloat(formData.hygiene_score),
                discipline_score: parseFloat(formData.discipline_score),
                notes: formData.notes
            };

            const response = await staffService.updateStaffScore(scoreData);

            if (response.success) {
                onSuccess && onSuccess(response.data);
            } else {
                setError(response.error || 'Failed to update score');
            }
        } catch (err) {
            console.error('Failed to update score:', err);
            setError(err.response?.data?.error || 'Failed to update score');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError(null);
    };

    const totalScore = parseFloat(formData.attendance_score) +
        parseFloat(formData.hygiene_score) +
        parseFloat(formData.discipline_score);
    const normalizedScore = (totalScore / 3).toFixed(2);

    if (loadingCurrent) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.form}>
                {/* Header */}
                <div style={styles.header}>
                    <h3 style={styles.title}>Update Performance Score</h3>
                    <p style={styles.subtitle}>{staffName}</p>
                </div>

                {error && (
                    <div style={styles.error}>
                        {error}
                    </div>
                )}

                {/* Score Inputs */}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>
                        <span style={styles.labelIcon}>📅</span>
                        Attendance Score (0-10)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.attendance_score}
                        onChange={(e) => handleInputChange('attendance_score', e.target.value)}
                        style={styles.input}
                        required
                    />
                    <small style={styles.hint}>
                        Based on punctuality, regularity, and presence
                    </small>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>
                        <span style={styles.labelIcon}>🧼</span>
                        Hygiene Score (0-10)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.hygiene_score}
                        onChange={(e) => handleInputChange('hygiene_score', e.target.value)}
                        style={styles.input}
                        required
                    />
                    <small style={styles.hint}>
                        Based on cleanliness standards and hygiene practices
                    </small>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>
                        <span style={styles.labelIcon}>⚖️</span>
                        Discipline Score (0-10)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.discipline_score}
                        onChange={(e) => handleInputChange('discipline_score', e.target.value)}
                        style={styles.input}
                        required
                    />
                    <small style={styles.hint}>
                        Based on behavior, compliance, and professionalism
                    </small>
                </div>

                {/* Total Score Display */}
                <div style={styles.scorePreview}>
                    <div style={styles.scorePreviewLabel}>Overall Score</div>
                    <div style={styles.scorePreviewValue}>
                        {normalizedScore}/10
                    </div>
                    <small style={styles.scorePreviewHint}>
                        Total: {totalScore.toFixed(1)}/30
                    </small>
                </div>

                {/* Notes */}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>
                        Notes (Optional)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        style={styles.textarea}
                        rows={3}
                        placeholder="Add any additional comments or observations..."
                    />
                </div>

                {/* Actions */}
                <div style={styles.actions}>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            style={styles.cancelButton}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        style={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save Score'}
                    </button>
                </div>
            </form>
        </div>
    );
}

const styles = {
    container: {
        background: 'white',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    loading: {
        textAlign: 'center',
        padding: 20,
        color: '#6b7280'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20
    },
    header: {
        marginBottom: 8
    },
    title: {
        margin: 0,
        fontSize: 20,
        fontWeight: 600,
        color: '#1f2937'
    },
    subtitle: {
        margin: '4px 0 0 0',
        fontSize: 14,
        color: '#6b7280'
    },
    error: {
        padding: 12,
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        color: '#dc2626',
        fontSize: 14
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
    },
    label: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 14,
        fontWeight: 500,
        color: '#374151'
    },
    labelIcon: {
        fontSize: 18
    },
    input: {
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: 14,
        outline: 'none',
        transition: 'border-color 0.2s',
        ':focus': {
            borderColor: '#3b82f6'
        }
    },
    textarea: {
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: 14,
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit'
    },
    hint: {
        fontSize: 12,
        color: '#9ca3af'
    },
    scorePreview: {
        padding: 16,
        background: '#f0f9ff',
        border: '2px solid #3b82f6',
        borderRadius: 12,
        textAlign: 'center'
    },
    scorePreviewLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4
    },
    scorePreviewValue: {
        fontSize: 32,
        fontWeight: 700,
        color: '#3b82f6'
    },
    scorePreviewHint: {
        display: 'block',
        marginTop: 4,
        fontSize: 12,
        color: '#6b7280'
    },
    actions: {
        display: 'flex',
        gap: 12,
        justifyContent: 'flex-end',
        marginTop: 8
    },
    cancelButton: {
        padding: '10px 20px',
        background: 'white',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        color: '#6b7280',
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
            background: '#f9fafb'
        },
        ':disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    },
    submitButton: {
        padding: '10px 24px',
        background: '#3b82f6',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        color: 'white',
        cursor: 'pointer',
        transition: 'background 0.2s',
        ':hover': {
            background: '#2563eb'
        },
        ':disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    }
};
