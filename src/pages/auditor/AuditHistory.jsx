import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auditService } from '../../services/auditService';
import { formatDate, formatDateTime } from '../../utils/constants';

/**
 * AuditHistory - View all past audits for the auditor
 */
export default function AuditHistory() {
    const { user } = useAuth();
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadAudits();
    }, []);

    const loadAudits = async () => {
        try {
            setLoading(true);
            const data = await auditService.getAudits();
            setAudits(data);
        } catch (err) {
            console.error('Failed to load audits:', err);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const getStatusBadge = (status) => {
        const styles = {
            SUBMITTED: { bg: '#fef3c7', color: '#92400e' },
            REVIEWED: { bg: '#d1fae5', color: '#065f46' },
            FLAGGED: { bg: '#fee2e2', color: '#991b1b' }
        };
        const style = styles[status] || styles.SUBMITTED;
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: style.bg,
                color: style.color
            }}>
                {status}
            </span>
        );
    };

    const filteredAudits = audits.filter(audit => {
        if (filter === 'all') return true;
        return audit.status === filter;
    });

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 18, color: '#6b7280' }}>Loading audits...</div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Audit History
                </h1>
                <p style={{ color: '#6b7280', marginTop: 8 }}>
                    View all your completed audit reports
                </p>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: 8,
                marginBottom: 20
            }}>
                {['all', 'SUBMITTED', 'REVIEWED', 'FLAGGED'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 20,
                            border: 'none',
                            background: filter === f ? '#3b82f6' : '#f3f4f6',
                            color: filter === f ? 'white' : '#6b7280',
                            cursor: 'pointer',
                            fontWeight: filter === f ? 600 : 400,
                            fontSize: 13
                        }}
                    >
                        {f === 'all' ? 'All' : f}
                    </button>
                ))}
            </div>

            {/* Audits Table */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                {filteredAudits.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                        <p style={{ fontSize: 16 }}>No audits found</p>
                        <a href="/auditor/conduct-audit" style={{
                            display: 'inline-block',
                            marginTop: 16,
                            padding: '12px 24px',
                            background: '#3b82f6',
                            color: 'white',
                            borderRadius: 8,
                            textDecoration: 'none',
                            fontWeight: 500
                        }}>
                            Conduct New Audit
                        </a>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                <th style={thStyle}>Franchise</th>
                                <th style={thStyle}>Date</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Score</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAudits.map(audit => (
                                <tr key={audit.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={tdStyle}>
                                        <div style={{ fontWeight: 500 }}>{audit.franchise_name}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>{audit.id}</div>
                                    </td>
                                    <td style={tdStyle}>
                                        <div>{formatDate(audit.audit_date)}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>{audit.audit_time}</div>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            width: 52,
                                            padding: '6px 0',
                                            borderRadius: 8,
                                            fontWeight: 700,
                                            fontSize: 14,
                                            color: 'white',
                                            background: getScoreColor(audit.overall_score)
                                        }}>
                                            {audit.overall_score}%
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        {getStatusBadge(audit.status)}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSelectedAudit(audit)}
                                            style={{
                                                padding: '6px 16px',
                                                background: '#eff6ff',
                                                color: '#3b82f6',
                                                border: 'none',
                                                borderRadius: 6,
                                                fontSize: 13,
                                                fontWeight: 500,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detail Modal */}
            {selectedAudit && (
                <AuditDetailModal
                    audit={selectedAudit}
                    onClose={() => setSelectedAudit(null)}
                />
            )}
        </div>
    );
}

const thStyle = {
    padding: '14px 16px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const tdStyle = {
    padding: '14px 16px'
};

function AuditDetailModal({ audit, onClose }) {
    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const CheckItem = ({ checked, label }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
            <span style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: checked ? '#10b981' : '#ef4444',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600
            }}>
                {checked ? '✓' : '✗'}
            </span>
            <span style={{ color: checked ? '#374151' : '#991b1b' }}>{label}</span>
        </div>
    );

    const SliderItem = ({ value, label, max = 10 }) => (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
                <span style={{ fontWeight: 600, color: getScoreColor(value * 10) }}>{value}/{max}</span>
            </div>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${(value / max) * 100}%`,
                    background: getScoreColor(value * 10),
                    borderRadius: 4
                }} />
            </div>
        </div>
    );

    const SectionCard = ({ title, children, score }) => (
        <div style={{
            background: '#f9fafb',
            borderRadius: 12,
            padding: 20,
            marginBottom: 16
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h4>
                {score !== undefined && (
                    <span style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontWeight: 600,
                        fontSize: 14,
                        background: `${getScoreColor(score)}20`,
                        color: getScoreColor(score)
                    }}>
                        {score}%
                    </span>
                )}
            </div>
            {children}
        </div>
    );

    const temp = audit.temperature_compliance || {};
    const clean = audit.cleanliness || {};
    const storage = audit.food_storage || {};
    const hygiene = audit.hygiene_practices || {};
    const equipment = audit.equipment_condition || {};
    const staff = audit.staff_compliance || {};
    const pest = audit.pest_control || {};
    const safety = audit.safety_compliance || {};

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
            padding: 20
        }}>
            <div style={{
                background: 'white',
                borderRadius: 16,
                maxWidth: 900,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    background: 'white',
                    zIndex: 1
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                            Audit Report
                        </h2>
                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
                            {audit.franchise_name} - {formatDate(audit.audit_date)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: 'none',
                            background: '#f3f4f6',
                            cursor: 'pointer',
                            fontSize: 18
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ padding: 24 }}>
                    {/* Overall Score */}
                    <div style={{
                        padding: 24,
                        background: `${getScoreColor(audit.overall_score)}15`,
                        borderRadius: 12,
                        textAlign: 'center',
                        marginBottom: 24,
                        border: `2px solid ${getScoreColor(audit.overall_score)}`
                    }}>
                        <div style={{
                            fontSize: 56,
                            fontWeight: 700,
                            color: getScoreColor(audit.overall_score)
                        }}>
                            {audit.overall_score}%
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 16 }}>Overall Compliance Score</div>
                    </div>

                    {/* Temperature Compliance */}
                    <SectionCard title="Temperature Compliance" score={temp.score}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                            <div style={{ padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Refrigerator</div>
                                <div style={{ fontSize: 24, fontWeight: 600, color: temp.fridge_temp <= 5 ? '#10b981' : '#ef4444' }}>
                                    {temp.fridge_temp || '-'}°C
                                </div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>Target: 0-5°C</div>
                            </div>
                            <div style={{ padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Freezer</div>
                                <div style={{ fontSize: 24, fontWeight: 600, color: temp.freezer_temp <= -18 ? '#10b981' : '#ef4444' }}>
                                    {temp.freezer_temp || '-'}°C
                                </div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>Target: -18°C or below</div>
                            </div>
                            <div style={{ padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Hot Holding</div>
                                <div style={{ fontSize: 24, fontWeight: 600, color: temp.hot_holding_temp >= 63 ? '#10b981' : '#ef4444' }}>
                                    {temp.hot_holding_temp || '-'}°C
                                </div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>Target: 63°C or above</div>
                            </div>
                            <div style={{ padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Cold Display</div>
                                <div style={{ fontSize: 24, fontWeight: 600, color: temp.cold_display_temp < 8 ? '#10b981' : '#ef4444' }}>
                                    {temp.cold_display_temp || '-'}°C
                                </div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>Target: Below 8°C</div>
                            </div>
                        </div>
                        {temp.notes && (
                            <div style={{ marginTop: 12, padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notes:</div>
                                <div style={{ fontSize: 14 }}>{temp.notes}</div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Cleanliness */}
                    <SectionCard title="Cleanliness Assessment" score={clean.overall_score}>
                        <SliderItem value={clean.kitchen_area || 0} label="Kitchen Area" />
                        <SliderItem value={clean.dining_area || 0} label="Dining Area" />
                        <SliderItem value={clean.restrooms || 0} label="Restrooms" />
                        <SliderItem value={clean.storage_area || 0} label="Storage Area" />
                        <SliderItem value={clean.exterior || 0} label="Exterior/Entrance" />
                        {clean.notes && (
                            <div style={{ marginTop: 12, padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notes:</div>
                                <div style={{ fontSize: 14 }}>{clean.notes}</div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Food Storage */}
                    <SectionCard title="Food Storage Compliance" score={storage.score}>
                        <CheckItem checked={storage.proper_labeling} label="All food items properly labeled with dates" />
                        <CheckItem checked={storage.fifo_followed} label="FIFO (First In First Out) system followed" />
                        <CheckItem checked={storage.proper_separation} label="Raw and cooked foods properly separated" />
                        <CheckItem checked={storage.no_expired_items} label="No expired items found" />
                        {storage.notes && (
                            <div style={{ marginTop: 12, padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notes:</div>
                                <div style={{ fontSize: 14 }}>{storage.notes}</div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Hygiene Practices */}
                    <SectionCard title="Hygiene Practices" score={hygiene.score}>
                        <CheckItem checked={hygiene.handwashing_compliance} label="Staff following proper handwashing procedures" />
                        <CheckItem checked={hygiene.gloves_usage} label="Proper use of food handling gloves" />
                        <CheckItem checked={hygiene.hairnets_usage} label="Hair restraints/hairnets worn by kitchen staff" />
                        <CheckItem checked={hygiene.no_jewelry} label="No jewelry or accessories in food prep areas" />
                        {hygiene.notes && (
                            <div style={{ marginTop: 12, padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notes:</div>
                                <div style={{ fontSize: 14 }}>{hygiene.notes}</div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Equipment Condition */}
                    <SectionCard title="Equipment Condition" score={equipment.score}>
                        <SliderItem value={equipment.cooking_equipment || 0} label="Cooking Equipment (stoves, ovens, grills)" />
                        <SliderItem value={equipment.refrigeration || 0} label="Refrigeration Units" />
                        <SliderItem value={equipment.ventilation || 0} label="Ventilation/Exhaust Systems" />
                        <SliderItem value={equipment.fire_safety || 0} label="Fire Safety Equipment" />
                        {equipment.notes && (
                            <div style={{ marginTop: 12, padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notes:</div>
                                <div style={{ fontSize: 14 }}>{equipment.notes}</div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Staff Compliance */}
                    <SectionCard title="Staff Compliance" score={staff.score}>
                        <CheckItem checked={staff.uniforms_clean} label="Staff wearing clean uniforms/aprons" />
                        <CheckItem checked={staff.food_handlers_cert} label="Valid food handlers certificates available" />
                        <CheckItem checked={staff.training_records} label="Training records maintained and up to date" />
                        {staff.notes && (
                            <div style={{ marginTop: 12, padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notes:</div>
                                <div style={{ fontSize: 14 }}>{staff.notes}</div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Pest Control */}
                    <SectionCard title="Pest Control" score={pest.score}>
                        <CheckItem checked={pest.no_pest_evidence} label="No evidence of pests (droppings, damage, live pests)" />
                        <CheckItem checked={pest.pest_control_records} label="Pest control service records available" />
                        <CheckItem checked={pest.proper_waste_disposal} label="Proper waste disposal and bin management" />
                        {pest.notes && (
                            <div style={{ marginTop: 12, padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notes:</div>
                                <div style={{ fontSize: 14 }}>{pest.notes}</div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Safety Compliance */}
                    <SectionCard title="Safety Compliance" score={safety.score}>
                        <CheckItem checked={safety.fire_extinguisher} label="Fire extinguisher present and serviced" />
                        <CheckItem checked={safety.first_aid_kit} label="First aid kit available and stocked" />
                        <CheckItem checked={safety.emergency_exits} label="Emergency exits clear and accessible" />
                        <CheckItem checked={safety.safety_signage} label="Safety signage visible (wet floor, exit signs, etc.)" />
                        {safety.notes && (
                            <div style={{ marginTop: 12, padding: 12, background: 'white', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notes:</div>
                                <div style={{ fontSize: 14 }}>{safety.notes}</div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Overall Notes & Recommendations */}
                    {audit.overall_notes && (
                        <div style={{ marginBottom: 16, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
                            <h4 style={{ fontWeight: 600, marginBottom: 8 }}>Overall Notes</h4>
                            <p style={{ color: '#374151', lineHeight: 1.6, margin: 0 }}>{audit.overall_notes}</p>
                        </div>
                    )}

                    {audit.recommendations && (
                        <div style={{ marginBottom: 16, padding: 16, background: '#fffbeb', borderRadius: 12 }}>
                            <h4 style={{ fontWeight: 600, marginBottom: 8, color: '#92400e' }}>Recommendations</h4>
                            <p style={{ color: '#374151', lineHeight: 1.6, margin: 0 }}>{audit.recommendations}</p>
                        </div>
                    )}

                    {/* Critical Issues */}
                    {audit.critical_issues?.length > 0 && (
                        <div style={{ marginBottom: 16, padding: 16, background: '#fef2f2', borderRadius: 12 }}>
                            <h4 style={{ fontWeight: 600, marginBottom: 12, color: '#991b1b' }}>Critical Issues</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {audit.critical_issues.map((issue, i) => (
                                    <span key={i} style={{
                                        padding: '6px 12px',
                                        background: '#fee2e2',
                                        color: '#991b1b',
                                        borderRadius: 20,
                                        fontSize: 13
                                    }}>
                                        {issue}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Images */}
                    {audit.images?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <h4 style={{ fontWeight: 600, marginBottom: 12 }}>Photos ({audit.images.length})</h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: 10
                            }}>
                                {audit.images.map((img, i) => (
                                    <img
                                        key={i}
                                        src={img.data}
                                        alt={`Audit photo ${i + 1}`}
                                        style={{
                                            width: '100%',
                                            height: 120,
                                            objectFit: 'cover',
                                            borderRadius: 8,
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => window.open(img.data, '_blank')}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admin Notes */}
                    {audit.admin_notes && (
                        <div style={{
                            padding: 16,
                            background: '#eff6ff',
                            borderRadius: 12,
                            marginTop: 16
                        }}>
                            <h4 style={{ fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>
                                Admin Review Notes
                            </h4>
                            <p style={{ color: '#374151', margin: 0 }}>{audit.admin_notes}</p>
                            {audit.reviewed_by && (
                                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                                    Reviewed by {audit.reviewed_by} on {formatDateTime(audit.reviewed_at)}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
