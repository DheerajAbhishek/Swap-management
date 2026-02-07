import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auditService } from '../../services/auditService';
import { franchiseService } from '../../services/franchiseService';

/**
 * ConductAudit - Comprehensive audit form for restaurant inspection
 */
export default function ConductAudit() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [franchises, setFranchises] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [currentSection, setCurrentSection] = useState(0);
    const imageInputRef = useRef(null);

    const [formData, setFormData] = useState({
        franchise_id: '',
        franchise_name: '',
        audit_date: new Date().toISOString().split('T')[0],
        audit_time: new Date().toTimeString().slice(0, 5),

        // Temperature Compliance
        temperature_compliance: {
            fridge_temp: '',
            freezer_temp: '',
            hot_holding_temp: '',
            cold_display_temp: '',
            score: 0,
            notes: ''
        },

        // Cleanliness (1-10 scale)
        cleanliness: {
            kitchen_area: 0,
            dining_area: 0,
            restrooms: 0,
            storage_area: 0,
            exterior: 0,
            overall_score: 0,
            notes: ''
        },

        // Food Storage
        food_storage: {
            proper_labeling: false,
            fifo_followed: false,
            proper_separation: false,
            no_expired_items: false,
            score: 0,
            notes: ''
        },

        // Hygiene Practices
        hygiene_practices: {
            handwashing_compliance: false,
            gloves_usage: false,
            hairnets_usage: false,
            no_jewelry: false,
            score: 0,
            notes: ''
        },

        // Equipment Condition (1-10 scale)
        equipment_condition: {
            cooking_equipment: 0,
            refrigeration: 0,
            ventilation: 0,
            fire_safety: 0,
            score: 0,
            notes: ''
        },

        // Staff Compliance
        staff_compliance: {
            uniforms_clean: false,
            food_handlers_cert: false,
            training_records: false,
            score: 0,
            notes: ''
        },

        // Pest Control
        pest_control: {
            no_pest_evidence: false,
            pest_control_records: false,
            proper_waste_disposal: false,
            score: 0,
            notes: ''
        },

        // Safety Compliance
        safety_compliance: {
            fire_extinguisher: false,
            first_aid_kit: false,
            emergency_exits: false,
            safety_signage: false,
            score: 0,
            notes: ''
        },

        // Images
        images: [],

        // Overall
        overall_notes: '',
        recommendations: '',
        critical_issues: []
    });

    const sections = [
        { id: 'basic', title: 'Basic Info' },
        { id: 'temperature', title: 'Temperature' },
        { id: 'cleanliness', title: 'Cleanliness' },
        { id: 'food_storage', title: 'Food Storage' },
        { id: 'hygiene', title: 'Hygiene' },
        { id: 'equipment', title: 'Equipment' },
        { id: 'staff', title: 'Staff' },
        { id: 'pest_control', title: 'Pest Control' },
        { id: 'safety', title: 'Safety' },
        { id: 'images', title: 'Images' },
        { id: 'summary', title: 'Summary' }
    ];

    useEffect(() => {
        loadFranchises();
    }, []);

    const loadFranchises = async () => {
        try {
            setLoading(true);
            const data = await franchiseService.getFranchises();
            setFranchises(data);
        } catch (err) {
            console.error('Failed to load franchises:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFranchiseChange = (e) => {
        const franchiseId = e.target.value;
        const franchise = franchises.find(f => f.id === franchiseId);
        setFormData(prev => ({
            ...prev,
            franchise_id: franchiseId,
            franchise_name: franchise?.name || ''
        }));
    };

    const updateSection = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const calculateSectionScore = (section, checkboxFields) => {
        const checked = checkboxFields.filter(f => formData[section][f]).length;
        return Math.round((checked / checkboxFields.length) * 100);
    };

    const calculateCleanlinessScore = () => {
        const scores = [
            formData.cleanliness.kitchen_area,
            formData.cleanliness.dining_area,
            formData.cleanliness.restrooms,
            formData.cleanliness.storage_area,
            formData.cleanliness.exterior
        ];
        const validScores = scores.filter(s => s > 0);
        return validScores.length > 0
            ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10)
            : 0;
    };

    const calculateEquipmentScore = () => {
        const scores = [
            formData.equipment_condition.cooking_equipment,
            formData.equipment_condition.refrigeration,
            formData.equipment_condition.ventilation,
            formData.equipment_condition.fire_safety
        ];
        const validScores = scores.filter(s => s > 0);
        return validScores.length > 0
            ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10)
            : 0;
    };

    const handleImageCapture = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, {
                        id: Date.now() + Math.random(),
                        data: reader.result,
                        name: file.name,
                        timestamp: new Date().toISOString()
                    }]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (imageId) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter(img => img.id !== imageId)
        }));
    };

    const addCriticalIssue = () => {
        const issue = prompt('Enter critical issue:');
        if (issue) {
            setFormData(prev => ({
                ...prev,
                critical_issues: [...prev.critical_issues, issue]
            }));
        }
    };

    const removeCriticalIssue = (index) => {
        setFormData(prev => ({
            ...prev,
            critical_issues: prev.critical_issues.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        if (!formData.franchise_id) {
            alert('Please select a franchise');
            return;
        }

        setSubmitting(true);
        try {
            // Calculate all scores before submission
            const finalData = {
                ...formData,
                temperature_compliance: {
                    ...formData.temperature_compliance,
                    score: formData.temperature_compliance.fridge_temp && formData.temperature_compliance.freezer_temp ? 80 : 50
                },
                cleanliness: {
                    ...formData.cleanliness,
                    overall_score: calculateCleanlinessScore()
                },
                food_storage: {
                    ...formData.food_storage,
                    score: calculateSectionScore('food_storage', ['proper_labeling', 'fifo_followed', 'proper_separation', 'no_expired_items'])
                },
                hygiene_practices: {
                    ...formData.hygiene_practices,
                    score: calculateSectionScore('hygiene_practices', ['handwashing_compliance', 'gloves_usage', 'hairnets_usage', 'no_jewelry'])
                },
                equipment_condition: {
                    ...formData.equipment_condition,
                    score: calculateEquipmentScore()
                },
                staff_compliance: {
                    ...formData.staff_compliance,
                    score: calculateSectionScore('staff_compliance', ['uniforms_clean', 'food_handlers_cert', 'training_records'])
                },
                pest_control: {
                    ...formData.pest_control,
                    score: calculateSectionScore('pest_control', ['no_pest_evidence', 'pest_control_records', 'proper_waste_disposal'])
                },
                safety_compliance: {
                    ...formData.safety_compliance,
                    score: calculateSectionScore('safety_compliance', ['fire_extinguisher', 'first_aid_kit', 'emergency_exits', 'safety_signage'])
                }
            };

            await auditService.submitAudit(finalData);
            alert('Audit submitted successfully!');
            navigate('/auditor/history');
        } catch (err) {
            alert('Failed to submit audit: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const renderBasicInfo = () => (
        <div>
            <h3 style={styles.sectionTitle}>Basic Information</h3>
            <div style={styles.formGrid}>
                <div style={styles.field}>
                    <label style={styles.label}>Franchise *</label>
                    <select
                        value={formData.franchise_id}
                        onChange={handleFranchiseChange}
                        style={styles.select}
                    >
                        <option value="">Select Franchise</option>
                        {franchises.map(f => (
                            <option key={f.id} value={f.id}>{f.name} - {f.location}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.field}>
                    <label style={styles.label}>Audit Date *</label>
                    <input
                        type="date"
                        value={formData.audit_date}
                        onChange={e => setFormData(prev => ({ ...prev, audit_date: e.target.value }))}
                        style={styles.input}
                    />
                </div>
                <div style={styles.field}>
                    <label style={styles.label}>Audit Time</label>
                    <input
                        type="time"
                        value={formData.audit_time}
                        onChange={e => setFormData(prev => ({ ...prev, audit_time: e.target.value }))}
                        style={styles.input}
                    />
                </div>
            </div>
        </div>
    );

    const renderTemperature = () => (
        <div>
            <h3 style={styles.sectionTitle}>Temperature Compliance</h3>
            <p style={styles.description}>Record temperatures of refrigeration and holding units in °C</p>
            <div style={styles.formGrid}>
                <div style={styles.field}>
                    <label style={styles.label}>Refrigerator Temperature (°C)</label>
                    <input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 4.0"
                        value={formData.temperature_compliance.fridge_temp}
                        onChange={e => updateSection('temperature_compliance', 'fridge_temp', e.target.value)}
                        style={styles.input}
                    />
                    <small style={styles.hint}>Should be between 0-5°C</small>
                </div>
                <div style={styles.field}>
                    <label style={styles.label}>Freezer Temperature (°C)</label>
                    <input
                        type="number"
                        step="0.1"
                        placeholder="e.g., -18.0"
                        value={formData.temperature_compliance.freezer_temp}
                        onChange={e => updateSection('temperature_compliance', 'freezer_temp', e.target.value)}
                        style={styles.input}
                    />
                    <small style={styles.hint}>Should be -18°C or below</small>
                </div>
                <div style={styles.field}>
                    <label style={styles.label}>Hot Holding Temperature (°C)</label>
                    <input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 65.0"
                        value={formData.temperature_compliance.hot_holding_temp}
                        onChange={e => updateSection('temperature_compliance', 'hot_holding_temp', e.target.value)}
                        style={styles.input}
                    />
                    <small style={styles.hint}>Should be 63°C or above</small>
                </div>
                <div style={styles.field}>
                    <label style={styles.label}>Cold Display Temperature (°C)</label>
                    <input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 5.0"
                        value={formData.temperature_compliance.cold_display_temp}
                        onChange={e => updateSection('temperature_compliance', 'cold_display_temp', e.target.value)}
                        style={styles.input}
                    />
                    <small style={styles.hint}>Should be below 8°C</small>
                </div>
            </div>
            <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <textarea
                    value={formData.temperature_compliance.notes}
                    onChange={e => updateSection('temperature_compliance', 'notes', e.target.value)}
                    style={styles.textarea}
                    placeholder="Any observations about temperature management..."
                />
            </div>
        </div>
    );

    const renderCleanliness = () => (
        <div>
            <h3 style={styles.sectionTitle}>Cleanliness Assessment</h3>
            <p style={styles.description}>Rate each area on a scale of 1-10 (10 being excellent)</p>
            {[
                { key: 'kitchen_area', label: 'Kitchen Area' },
                { key: 'dining_area', label: 'Dining Area' },
                { key: 'restrooms', label: 'Restrooms' },
                { key: 'storage_area', label: 'Storage Area' },
                { key: 'exterior', label: 'Exterior/Entrance' }
            ].map(item => (
                <div key={item.key} style={styles.sliderField}>
                    <div style={styles.sliderLabel}>
                        <span>{item.label}</span>
                        <span style={styles.sliderValue}>{formData.cleanliness[item.key]}/10</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        value={formData.cleanliness[item.key]}
                        onChange={e => updateSection('cleanliness', item.key, parseInt(e.target.value))}
                        style={styles.slider}
                    />
                </div>
            ))}
            <div style={{ marginTop: 16, padding: 16, background: '#f0fdf4', borderRadius: 8 }}>
                <strong>Cleanliness Score: {calculateCleanlinessScore()}%</strong>
            </div>
            <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <textarea
                    value={formData.cleanliness.notes}
                    onChange={e => updateSection('cleanliness', 'notes', e.target.value)}
                    style={styles.textarea}
                    placeholder="Specific cleanliness issues observed..."
                />
            </div>
        </div>
    );

    const renderFoodStorage = () => (
        <div>
            <h3 style={styles.sectionTitle}>Food Storage Compliance</h3>
            <div style={styles.checkboxGrid}>
                {[
                    { key: 'proper_labeling', label: 'All food items properly labeled with dates' },
                    { key: 'fifo_followed', label: 'FIFO (First In First Out) system followed' },
                    { key: 'proper_separation', label: 'Raw and cooked foods properly separated' },
                    { key: 'no_expired_items', label: 'No expired items found' }
                ].map(item => (
                    <label key={item.key} style={styles.checkbox}>
                        <input
                            type="checkbox"
                            checked={formData.food_storage[item.key]}
                            onChange={e => updateSection('food_storage', item.key, e.target.checked)}
                        />
                        <span style={styles.checkboxLabel}>{item.label}</span>
                    </label>
                ))}
            </div>
            <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <textarea
                    value={formData.food_storage.notes}
                    onChange={e => updateSection('food_storage', 'notes', e.target.value)}
                    style={styles.textarea}
                    placeholder="Food storage issues or observations..."
                />
            </div>
        </div>
    );

    const renderHygiene = () => (
        <div>
            <h3 style={styles.sectionTitle}>Hygiene Practices</h3>
            <div style={styles.checkboxGrid}>
                {[
                    { key: 'handwashing_compliance', label: 'Staff following proper handwashing procedures' },
                    { key: 'gloves_usage', label: 'Proper use of food handling gloves' },
                    { key: 'hairnets_usage', label: 'Hair restraints/hairnets worn by kitchen staff' },
                    { key: 'no_jewelry', label: 'No jewelry or accessories in food prep areas' }
                ].map(item => (
                    <label key={item.key} style={styles.checkbox}>
                        <input
                            type="checkbox"
                            checked={formData.hygiene_practices[item.key]}
                            onChange={e => updateSection('hygiene_practices', item.key, e.target.checked)}
                        />
                        <span style={styles.checkboxLabel}>{item.label}</span>
                    </label>
                ))}
            </div>
            <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <textarea
                    value={formData.hygiene_practices.notes}
                    onChange={e => updateSection('hygiene_practices', 'notes', e.target.value)}
                    style={styles.textarea}
                    placeholder="Hygiene concerns or observations..."
                />
            </div>
        </div>
    );

    const renderEquipment = () => (
        <div>
            <h3 style={styles.sectionTitle}>Equipment Condition</h3>
            <p style={styles.description}>Rate equipment condition on a scale of 1-10</p>
            {[
                { key: 'cooking_equipment', label: 'Cooking Equipment (stoves, ovens, grills)' },
                { key: 'refrigeration', label: 'Refrigeration Units' },
                { key: 'ventilation', label: 'Ventilation/Exhaust Systems' },
                { key: 'fire_safety', label: 'Fire Safety Equipment' }
            ].map(item => (
                <div key={item.key} style={styles.sliderField}>
                    <div style={styles.sliderLabel}>
                        <span>{item.label}</span>
                        <span style={styles.sliderValue}>{formData.equipment_condition[item.key]}/10</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        value={formData.equipment_condition[item.key]}
                        onChange={e => updateSection('equipment_condition', item.key, parseInt(e.target.value))}
                        style={styles.slider}
                    />
                </div>
            ))}
            <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <textarea
                    value={formData.equipment_condition.notes}
                    onChange={e => updateSection('equipment_condition', 'notes', e.target.value)}
                    style={styles.textarea}
                    placeholder="Equipment issues or maintenance needs..."
                />
            </div>
        </div>
    );

    const renderStaff = () => (
        <div>
            <h3 style={styles.sectionTitle}>Staff Compliance</h3>
            <div style={styles.checkboxGrid}>
                {[
                    { key: 'uniforms_clean', label: 'Staff wearing clean uniforms/aprons' },
                    { key: 'food_handlers_cert', label: 'Valid food handlers certificates available' },
                    { key: 'training_records', label: 'Training records maintained and up to date' }
                ].map(item => (
                    <label key={item.key} style={styles.checkbox}>
                        <input
                            type="checkbox"
                            checked={formData.staff_compliance[item.key]}
                            onChange={e => updateSection('staff_compliance', item.key, e.target.checked)}
                        />
                        <span style={styles.checkboxLabel}>{item.label}</span>
                    </label>
                ))}
            </div>
            <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <textarea
                    value={formData.staff_compliance.notes}
                    onChange={e => updateSection('staff_compliance', 'notes', e.target.value)}
                    style={styles.textarea}
                    placeholder="Staff compliance observations..."
                />
            </div>
        </div>
    );

    const renderPestControl = () => (
        <div>
            <h3 style={styles.sectionTitle}>Pest Control</h3>
            <div style={styles.checkboxGrid}>
                {[
                    { key: 'no_pest_evidence', label: 'No evidence of pests (droppings, damage, live pests)' },
                    { key: 'pest_control_records', label: 'Pest control service records available' },
                    { key: 'proper_waste_disposal', label: 'Proper waste disposal and bin management' }
                ].map(item => (
                    <label key={item.key} style={styles.checkbox}>
                        <input
                            type="checkbox"
                            checked={formData.pest_control[item.key]}
                            onChange={e => updateSection('pest_control', item.key, e.target.checked)}
                        />
                        <span style={styles.checkboxLabel}>{item.label}</span>
                    </label>
                ))}
            </div>
            <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <textarea
                    value={formData.pest_control.notes}
                    onChange={e => updateSection('pest_control', 'notes', e.target.value)}
                    style={styles.textarea}
                    placeholder="Pest control observations or concerns..."
                />
            </div>
        </div>
    );

    const renderSafety = () => (
        <div>
            <h3 style={styles.sectionTitle}>Safety Compliance</h3>
            <div style={styles.checkboxGrid}>
                {[
                    { key: 'fire_extinguisher', label: 'Fire extinguisher present and serviced' },
                    { key: 'first_aid_kit', label: 'First aid kit available and stocked' },
                    { key: 'emergency_exits', label: 'Emergency exits clear and accessible' },
                    { key: 'safety_signage', label: 'Safety signage visible (wet floor, exit signs, etc.)' }
                ].map(item => (
                    <label key={item.key} style={styles.checkbox}>
                        <input
                            type="checkbox"
                            checked={formData.safety_compliance[item.key]}
                            onChange={e => updateSection('safety_compliance', item.key, e.target.checked)}
                        />
                        <span style={styles.checkboxLabel}>{item.label}</span>
                    </label>
                ))}
            </div>
            <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <textarea
                    value={formData.safety_compliance.notes}
                    onChange={e => updateSection('safety_compliance', 'notes', e.target.value)}
                    style={styles.textarea}
                    placeholder="Safety concerns or observations..."
                />
            </div>
        </div>
    );

    const renderImages = () => (
        <div>
            <h3 style={styles.sectionTitle}>Photo Documentation</h3>
            <p style={styles.description}>Capture photos of any issues or compliance evidence</p>

            <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleImageCapture}
                ref={imageInputRef}
                style={{ display: 'none' }}
            />

            <div style={styles.imageButtons}>
                <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    style={styles.captureBtn}
                >
                    Take Photo / Upload
                </button>
            </div>

            {formData.images.length > 0 && (
                <div style={styles.imageGrid}>
                    {formData.images.map(img => (
                        <div key={img.id} style={styles.imageCard}>
                            <img src={img.data} alt={img.name} style={styles.imagePreview} />
                            <button
                                type="button"
                                onClick={() => removeImage(img.id)}
                                style={styles.removeImageBtn}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {formData.images.length === 0 && (
                <div style={styles.noImages}>
                    <span style={{ fontSize: 48 }}>📷</span>
                    <p>No photos captured yet</p>
                </div>
            )}
        </div>
    );

    const renderSummary = () => {
        const overallScore = Math.round([
            calculateCleanlinessScore(),
            calculateSectionScore('food_storage', ['proper_labeling', 'fifo_followed', 'proper_separation', 'no_expired_items']),
            calculateSectionScore('hygiene_practices', ['handwashing_compliance', 'gloves_usage', 'hairnets_usage', 'no_jewelry']),
            calculateEquipmentScore(),
            calculateSectionScore('staff_compliance', ['uniforms_clean', 'food_handlers_cert', 'training_records']),
            calculateSectionScore('pest_control', ['no_pest_evidence', 'pest_control_records', 'proper_waste_disposal']),
            calculateSectionScore('safety_compliance', ['fire_extinguisher', 'first_aid_kit', 'emergency_exits', 'safety_signage'])
        ].reduce((a, b) => a + b, 0) / 7);

        return (
            <div>
                <h3 style={styles.sectionTitle}>✅ Audit Summary</h3>

                <div style={styles.scoreCard}>
                    <div style={styles.overallScore}>
                        <span style={{
                            fontSize: 48,
                            fontWeight: 700,
                            color: overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444'
                        }}>
                            {overallScore}%
                        </span>
                        <span style={{ color: '#6b7280' }}>Overall Score</span>
                    </div>
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Overall Notes</label>
                    <textarea
                        value={formData.overall_notes}
                        onChange={e => setFormData(prev => ({ ...prev, overall_notes: e.target.value }))}
                        style={styles.textarea}
                        placeholder="General observations and overall assessment..."
                        rows={4}
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Recommendations</label>
                    <textarea
                        value={formData.recommendations}
                        onChange={e => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                        style={styles.textarea}
                        placeholder="Recommendations for improvement..."
                        rows={4}
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Critical Issues</label>
                    <div style={styles.criticalIssues}>
                        {formData.critical_issues.map((issue, index) => (
                            <div key={index} style={styles.issueTag}>
                                <span>🚨 {issue}</span>
                                <button onClick={() => removeCriticalIssue(index)} style={styles.issueRemove}>×</button>
                            </div>
                        ))}
                        <button onClick={addCriticalIssue} style={styles.addIssueBtn}>
                            + Add Critical Issue
                        </button>
                    </div>
                </div>

                <div style={styles.summaryInfo}>
                    <p><strong>Franchise:</strong> {formData.franchise_name || 'Not selected'}</p>
                    <p><strong>Date:</strong> {formData.audit_date}</p>
                    <p><strong>Time:</strong> {formData.audit_time}</p>
                    <p><strong>Photos:</strong> {formData.images.length} captured</p>
                </div>
            </div>
        );
    };

    const renderCurrentSection = () => {
        switch (currentSection) {
            case 0: return renderBasicInfo();
            case 1: return renderTemperature();
            case 2: return renderCleanliness();
            case 3: return renderFoodStorage();
            case 4: return renderHygiene();
            case 5: return renderEquipment();
            case 6: return renderStaff();
            case 7: return renderPestControl();
            case 8: return renderSafety();
            case 9: return renderImages();
            case 10: return renderSummary();
            default: return null;
        }
    };

    const styles = {
        sectionTitle: {
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 16,
            color: '#111827'
        },
        description: {
            color: '#6b7280',
            marginBottom: 20
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
            marginBottom: 20
        },
        field: {
            marginBottom: 20
        },
        label: {
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: '#374151',
            marginBottom: 6
        },
        input: {
            width: '100%',
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box'
        },
        select: {
            width: '100%',
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            background: 'white'
        },
        textarea: {
            width: '100%',
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'vertical',
            minHeight: 80
        },
        hint: {
            display: 'block',
            marginTop: 4,
            fontSize: 12,
            color: '#9ca3af'
        },
        checkboxGrid: {
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: 20
        },
        checkbox: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            padding: '12px 16px',
            background: '#f9fafb',
            borderRadius: 8,
            transition: 'background 0.2s'
        },
        checkboxLabel: {
            fontSize: 14,
            color: '#374151'
        },
        sliderField: {
            marginBottom: 20
        },
        sliderLabel: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 14,
            fontWeight: 500
        },
        sliderValue: {
            color: '#3b82f6',
            fontWeight: 600
        },
        slider: {
            width: '100%',
            height: 8,
            borderRadius: 4,
            cursor: 'pointer'
        },
        imageButtons: {
            display: 'flex',
            gap: 12,
            marginBottom: 20
        },
        captureBtn: {
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer'
        },
        imageGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 12
        },
        imageCard: {
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden'
        },
        imagePreview: {
            width: '100%',
            height: 150,
            objectFit: 'cover'
        },
        removeImageBtn: {
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14
        },
        noImages: {
            padding: 40,
            textAlign: 'center',
            color: '#9ca3af',
            background: '#f9fafb',
            borderRadius: 8
        },
        scoreCard: {
            padding: 24,
            background: '#f0fdf4',
            borderRadius: 12,
            textAlign: 'center',
            marginBottom: 24
        },
        overallScore: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4
        },
        criticalIssues: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8
        },
        issueTag: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 20,
            fontSize: 13
        },
        issueRemove: {
            background: 'none',
            border: 'none',
            color: '#991b1b',
            cursor: 'pointer',
            fontSize: 16
        },
        addIssueBtn: {
            padding: '8px 12px',
            background: '#f3f4f6',
            border: '1px dashed #d1d5db',
            borderRadius: 20,
            fontSize: 13,
            cursor: 'pointer'
        },
        summaryInfo: {
            padding: 20,
            background: '#f9fafb',
            borderRadius: 8,
            marginTop: 20
        }
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Conduct Restaurant Audit
                </h1>
                <p style={{ color: '#6b7280', marginTop: 8 }}>
                    Complete all sections to submit your audit report
                </p>
            </div>

            {/* Progress Tabs */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 24,
                padding: 8,
                background: '#f3f4f6',
                borderRadius: 12
            }}>
                {sections.map((section, index) => (
                    <button
                        key={section.id}
                        onClick={() => setCurrentSection(index)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: 'none',
                            background: currentSection === index ? '#3b82f6' : 'transparent',
                            color: currentSection === index ? 'white' : '#6b7280',
                            fontSize: 13,
                            fontWeight: currentSection === index ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {section.title}
                    </button>
                ))}
            </div>

            {/* Form Content */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 32,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                {renderCurrentSection()}

                {/* Navigation Buttons */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 32,
                    paddingTop: 24,
                    borderTop: '1px solid #e5e7eb'
                }}>
                    <button
                        onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
                        disabled={currentSection === 0}
                        style={{
                            padding: '12px 24px',
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                            background: 'white',
                            color: currentSection === 0 ? '#9ca3af' : '#374151',
                            cursor: currentSection === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: 500
                        }}
                    >
                        ← Previous
                    </button>

                    {currentSection < sections.length - 1 ? (
                        <button
                            onClick={() => setCurrentSection(prev => Math.min(sections.length - 1, prev + 1))}
                            style={{
                                padding: '12px 24px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#3b82f6',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                padding: '12px 32px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#10b981',
                                color: 'white',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: 16
                            }}
                        >
                            {submitting ? 'Submitting...' : '✓ Submit Audit'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
