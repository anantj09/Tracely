import { useState, useEffect, useRef } from 'react';
import supabase from '../../services/supabase-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const CATEGORIES = [
  { code: 'CLEANLINESS', label: 'Dirty Coach/Station' },
  { code: 'AC_HEATING',  label: 'AC / Heating Issue' },
  { code: 'STAFF',       label: 'Staff Behaviour' },
  { code: 'FOOD',        label: 'Food Quality' },
  { code: 'SAFETY',      label: 'Safety Concern' },
  { code: 'OVERCROWDING',label: 'Overcrowding' },
  { code: 'AMENITY',     label: 'Broken Amenity' },
  { code: 'OTHER',       label: 'Other' },
];

export default function GrievanceForm({ currentStep, setCurrentStep, onSubmitSuccess }) {
  // Step 1: Journey Details
  const [complaintTarget, setComplaintTarget] = useState(''); // '' | STATION | TRAIN
  const [stationCode, setStationCode] = useState('');
  const [platform, setPlatform] = useState('');
  const [pnr, setPnr] = useState('');
  const [trainNumber, setTrainNumber] = useState('');
  const [trainName, setTrainName] = useState('');
  const [coach, setCoach] = useState('');
  const [berth, setBerth] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);

  // PNR Fetching states
  const [pnrLoading, setPnrLoading] = useState(false);
  const [pnrError, setPnrError] = useState('');
  const [pnrSuccess, setPnrSuccess] = useState('');

  // Step 2: Category & Description
  const [complaintType, setComplaintType] = useState('');
  const [description, setDescription] = useState('');

  // Step 3: Evidence Upload
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | uploaded | error
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // General States
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const complaintFiledRef = useRef(false);

  // Clean up orphaned photo upload when form is abandoned
  useEffect(() => {
    return () => {
      if (photoUrl && !complaintFiledRef.current) {
        const parts = photoUrl.split('/complaint-photos/');
        if (parts.length > 1) {
          const filePath = decodeURIComponent(parts[1]);
          supabase.storage
            .from('complaint-photos')
            .remove([filePath])
            .then(({ error }) => {
              if (error) {
                console.warn('[CLEANUP] Failed to delete orphaned photo:', error.message);
              } else {
                console.log('[CLEANUP] Purged orphaned upload:', filePath);
              }
            })
            .catch(() => {});
        }
      }
    };
  }, [photoUrl]);

  const fetchPnrDetails = async (pnrVal) => {
    const cleanPnr = pnrVal.replace(/\D/g, '');
    if (cleanPnr.length !== 10) {
      setPnrError('PNR must be exactly 10 digits');
      return;
    }

    setPnrLoading(true);
    setPnrError('');
    setPnrSuccess('');

    try {
      const token = localStorage.getItem('tracely_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/journeys/pnr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pnr: cleanPnr })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch PNR details');
      }

      const journey = result.data;
      setTrainNumber(journey.train_number || '');
      setTrainName(journey.train_name || '');
      setCoach(journey.coach || '');
      setBerth(journey.berth || '');
      if (journey.travel_date) {
        setTravelDate(journey.travel_date);
      }
      setPnrSuccess(`✓ Verified: ${journey.train_name || 'Train'} (${journey.train_number})`);
      if (errors.pnr) setErrors(prev => ({ ...prev, pnr: null }));
      if (errors.trainNumber) setErrors(prev => ({ ...prev, trainNumber: null }));
    } catch (err) {
      console.error('PNR fetch error:', err);
      setPnrError('Failed to retrieve PNR details. Please check PNR or fill details manually.');
    } finally {
      setPnrLoading(false);
    }
  };

  const isStep1Complete = complaintTarget === 'STATION'
    ? stationCode.trim().length >= 2
    : complaintTarget === 'TRAIN'
      ? pnr.trim().length === 10 && trainNumber.trim().length === 5
      : false;

  const isStep2Complete = complaintType !== '' && description.trim().length >= 10 && description.trim().length <= 500;

  // Auto-progress stepper
  useEffect(() => {
    if (!isStep1Complete) {
      setCurrentStep(1);
    } else if (!isStep2Complete) {
      setCurrentStep(2);
    } else if (successData) {
      setCurrentStep(4);
    } else if (submitting) {
      setCurrentStep(4);
    } else {
      setCurrentStep(3);
    }
  }, [isStep1Complete, isStep2Complete, successData, submitting, setCurrentStep]);

  // Drag & Drop Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const uploadFile = async (file) => {
    setUploadState('uploading');
    setApiError('');
    try {
      // Clean up previous uploaded photo on replace
      if (photoUrl) {
        const parts = photoUrl.split('/complaint-photos/');
        if (parts.length > 1) {
          const filePath = decodeURIComponent(parts[1]);
          supabase.storage.from('complaint-photos').remove([filePath]).catch(() => {});
        }
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `web/${tempId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

      let uploadedUrl = null;
      try {
        const { error: uploadErr } = await supabase.storage
          .from('complaint-photos')
          .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('complaint-photos')
          .getPublicUrl(fileName);
        
        uploadedUrl = urlData.publicUrl;
      } catch (directErr) {
        console.warn('[GrievanceForm] Direct upload failed, trying upload proxy:', directErr.message);
        
        const token = localStorage.getItem('tracely_token') || localStorage.getItem('token');
        const formData = new FormData();
        formData.append('bucket', 'complaint-photos');
        formData.append('filePath', fileName);
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Upload proxy failed');
        }
        uploadedUrl = result.data?.publicUrl;
      }

      if (!uploadedUrl) {
        throw new Error('Upload proxy returned empty URL');
      }

      setPhotoUrl(uploadedUrl);
      setUploadState('uploaded');
    } catch (err) {
      console.error('File upload failed:', err);
      setUploadState('error');
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!complaintTarget) {
      newErrors.complaintTarget = 'Please select Station or Train Journey';
    } else {
      if (complaintTarget === 'STATION' && !stationCode.trim()) {
        newErrors.stationCode = 'Please enter a station code';
      }
      if (complaintTarget === 'TRAIN') {
        if (!pnr.trim()) {
          newErrors.pnr = 'Please enter your PNR number';
        } else if (pnr.trim().length !== 10) {
          newErrors.pnr = 'PNR must be exactly 10 digits';
        }
        if (!trainNumber.trim()) {
          newErrors.trainNumber = 'Please enter or verify the train number';
        } else if (trainNumber.trim().length !== 5) {
          newErrors.trainNumber = 'Train number must be exactly 5 digits';
        }
      }
    }
    if (!travelDate) {
      newErrors.travelDate = 'Please select a travel date';
    }
    if (!complaintType) {
      newErrors.complaintType = 'Please select a complaint category';
    }
    if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    if (description.trim().length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessData(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('tracely_token') || localStorage.getItem('token');

      const finalDescription = (complaintTarget === 'STATION' && platform.trim())
        ? `[Platform ${platform.trim()}] ${description.trim()}`
        : description.trim();

      const payload = {
        complaint_type: complaintType,
        description: finalDescription,
        photo_url: photoUrl || undefined,
        pnr_number: complaintTarget === 'TRAIN' ? (pnr.trim() || undefined) : undefined,
        train_number: complaintTarget === 'TRAIN' ? (trainNumber.trim() || undefined) : undefined,
        train_name: complaintTarget === 'TRAIN' ? (trainName.trim() || undefined) : undefined,
        coach: complaintTarget === 'TRAIN' ? (coach.trim() || undefined) : undefined,
        berth: complaintTarget === 'TRAIN' ? (berth.trim() || undefined) : undefined,
        station_code: complaintTarget === 'STATION' 
          ? stationCode.trim().toUpperCase() 
          : 'UNKNOWN',
        travel_date: travelDate.trim() || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      setSubmitting(false);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit grievance');
      }

      setSuccessData(result.data);
      complaintFiledRef.current = true;
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      // Reset form on success
      setComplaintTarget('');
      setStationCode('');
      setPlatform('');
      setPnr('');
      setTrainNumber('');
      setTrainName('');
      setCoach('');
      setBerth('');
      setTravelDate(new Date().toISOString().split('T')[0]);
      setComplaintType('');
      setDescription('');
      setPhotoUrl(null);
      setUploadState('idle');
      setPnrSuccess('');
      setPnrError('');
    } catch (err) {
      setSubmitting(false);
      setApiError(err.message);
    }
  };

  if (successData) {
    return (
      <div style={styles.successCard}>
        <span style={styles.checkIcon}>✓</span>
        <h2 style={styles.successTitle}>Grievance Filed Successfully!</h2>
        <p style={styles.successText}>
          Your grievance has been received by the authorities and is undergoing processing.
        </p>
        <div style={styles.refBox}>
          <span style={styles.refLabel}>Reference Number:</span>
          <span style={styles.refVal}>{successData.reference_number}</span>
        </div>
        <button 
          style={styles.btnOrange} 
          onClick={() => {
            complaintFiledRef.current = false;
            setSuccessData(null);
          }}
        >
          File Another Grievance
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.formContainer}>
      {apiError && (
        <div style={styles.errorBanner}>
          <span>⚠️ {apiError}</span>
        </div>
      )}

      {/* Step 1: Journey Details */}
      <div style={{ ...styles.card, borderColor: currentStep === 1 ? 'var(--color-navy, #1A3557)' : '#E0E0E0' }}>
        <div style={styles.cardHeader}>
          <div style={styles.stepCircle}>1</div>
          <h3 style={styles.cardTitle}>Journey Details</h3>
        </div>

        {/* Toggle Selector */}
        <div style={styles.toggleContainer}>
          <button
            type="button"
            style={{
              ...styles.toggleBtn,
              ...(complaintTarget === 'STATION' ? styles.toggleBtnActive : styles.toggleBtnInactive)
            }}
            onClick={() => {
              setComplaintTarget('STATION');
              setErrors({});
            }}
          >
            Regarding Station
          </button>
          <button
            type="button"
            style={{
              ...styles.toggleBtn,
              ...(complaintTarget === 'TRAIN' ? styles.toggleBtnActive : styles.toggleBtnInactive)
            }}
            onClick={() => {
              setComplaintTarget('TRAIN');
              setErrors({});
            }}
          >
            Regarding Train Journey
          </button>
        </div>

        {errors.complaintTarget && (
          <div style={{ marginBottom: '16px' }}>
            <span style={styles.errorText}>{errors.complaintTarget}</span>
          </div>
        )}

        {complaintTarget === 'STATION' && (
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Station Code *</label>
              <input
                type="text"
                style={{ ...styles.input, borderColor: errors.stationCode ? '#CC0000' : '#E0E0E0' }}
                placeholder="e.g. NDLS"
                maxLength={7}
                value={stationCode}
                onChange={(e) => {
                  setStationCode(e.target.value.toUpperCase());
                  if (errors.stationCode) setErrors({ ...errors, stationCode: null });
                }}
              />
              {errors.stationCode && <span style={styles.errorText}>{errors.stationCode}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Platform Number (Optional)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g. 3"
                maxLength={3}
                value={platform}
                onChange={(e) => setPlatform(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
        )}

        {complaintTarget === 'TRAIN' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>PNR Number *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    style={{ ...styles.input, flex: 1, borderColor: errors.pnr ? '#CC0000' : '#E0E0E0' }}
                    placeholder="10-digit PNR"
                    maxLength={10}
                    value={pnr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPnr(val);
                      if (errors.pnr) setErrors(prev => ({ ...prev, pnr: null }));
                      setPnrSuccess('');
                      setPnrError('');
                      if (val.length === 10) {
                        fetchPnrDetails(val);
                      }
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      ...styles.verifyBtn,
                      opacity: (pnrLoading || pnr.length !== 10) ? 0.6 : 1,
                      cursor: (pnrLoading || pnr.length !== 10) ? 'not-allowed' : 'pointer'
                    }}
                    disabled={pnrLoading || pnr.length !== 10}
                    onClick={() => fetchPnrDetails(pnr)}
                  >
                    {pnrLoading ? 'Verifying...' : 'Verify PNR'}
                  </button>
                </div>
                {errors.pnr && <span style={styles.errorText}>{errors.pnr}</span>}
                {pnrError && <span style={styles.errorText}>{pnrError}</span>}
                {pnrSuccess && <span style={{ ...styles.successText, color: '#27AE60' }}>{pnrSuccess}</span>}
              </div>
            </div>

            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Train Number *</label>
                <input
                  type="text"
                  style={{ ...styles.input, borderColor: errors.trainNumber ? '#CC0000' : '#E0E0E0' }}
                  placeholder="e.g. 12951 (Auto-filled)"
                  maxLength={5}
                  value={trainNumber}
                  onChange={(e) => {
                    setTrainNumber(e.target.value.replace(/\D/g, ''));
                    if (errors.trainNumber) setErrors(prev => ({ ...prev, trainNumber: null }));
                  }}
                />
                {errors.trainNumber && <span style={styles.errorText}>{errors.trainNumber}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Coach (Optional)</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g. B4 (Auto-filled)"
                  maxLength={5}
                  value={coach}
                  onChange={(e) => setCoach(e.target.value.toUpperCase())}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Seat / Berth Number (Optional)</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g. 21 (Auto-filled)"
                  maxLength={3}
                  value={berth}
                  onChange={(e) => setBerth(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          </div>
        )}

        {complaintTarget === '' && (
          <div style={styles.promptText}>
            Please select whether your complaint is regarding a Station or a Train Journey above to fill journey details.
          </div>
        )}

        {complaintTarget !== '' && (
          <div style={{ ...styles.formGroup, marginTop: '16px' }}>
            <label style={styles.label}>Travel Date *</label>
            <input
              type="date"
              style={{ ...styles.input, borderColor: errors.travelDate ? '#CC0000' : '#E0E0E0' }}
              value={travelDate}
              onChange={(e) => {
                setTravelDate(e.target.value);
                if (errors.travelDate) setErrors({ ...errors, travelDate: null });
              }}
            />
            {errors.travelDate && <span style={styles.errorText}>{errors.travelDate}</span>}
          </div>
        )}
      </div>

      {/* Step 2: Grievance Category & Description */}
      <div style={{ ...styles.card, borderColor: currentStep === 2 ? 'var(--color-navy, #1A3557)' : '#E0E0E0' }}>
        <div style={styles.cardHeader}>
          <div style={styles.stepCircle}>2</div>
          <h3 style={styles.cardTitle}>Grievance Details</h3>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Category *</label>
          <select
            style={{ ...styles.select, borderColor: errors.complaintType ? '#CC0000' : '#E0E0E0' }}
            value={complaintType}
            onChange={(e) => {
              setComplaintType(e.target.value);
              if (errors.complaintType) setErrors({ ...errors, complaintType: null });
            }}
          >
            <option value="">Select Category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.complaintType && <span style={styles.errorText}>{errors.complaintType}</span>}

          {complaintType === 'SAFETY' && (
            <div style={styles.warningBanner}>
              <span>⚠️ Safety concerns are auto-escalated to IN_PROGRESS status for immediate attention.</span>
            </div>
          )}
        </div>

        <div style={{ ...styles.formGroup, marginTop: '16px' }}>
          <label style={styles.label}>Describe the issue *</label>
          <textarea
            style={{ ...styles.textarea, borderColor: errors.description ? '#CC0000' : '#E0E0E0' }}
            placeholder="Describe the issue in detail (minimum 10 characters)..."
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: null });
            }}
          />
          <div style={styles.counterRow}>
            {errors.description ? (
              <span style={styles.errorText}>{errors.description}</span>
            ) : (
              <span />
            )}
            <span style={{ ...styles.counterText, color: description.length > 500 ? '#CC0000' : '#888888' }}>
              {description.length}/500
            </span>
          </div>
        </div>
      </div>

      {/* Step 3: Evidence Upload */}
      <div style={{ ...styles.card, borderColor: currentStep === 3 ? 'var(--color-navy, #1A3557)' : '#E0E0E0' }}>
        <div style={styles.cardHeader}>
          <div style={styles.stepCircle}>3</div>
          <h3 style={styles.cardTitle}>Evidence Upload (Optional)</h3>
        </div>
        <div
          style={{
            ...styles.dropZone,
            borderColor: dragActive ? 'var(--color-orange, #E8621A)' : '#CCCCCC',
            backgroundColor: dragActive ? '#FFF3EC' : '#FAFAFA',
          }}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={styles.fileInput}
            onChange={handleFileChange}
          />
          {uploadState === 'idle' && (
            <div style={styles.dropZoneContent}>
              <span style={styles.uploadIcon}>☁</span>
              <p style={styles.dropZoneText}>Drag-and-drop zone for photo/video upload</p>
              <button type="button" style={styles.btnOutline} onClick={triggerFileSelect}>
                Browse Files
              </button>
            </div>
          )}
          {uploadState === 'uploading' && (
            <div style={styles.dropZoneContent}>
              <div style={styles.spinner}></div>
              <p style={styles.dropZoneText}>Uploading file to Supabase...</p>
            </div>
          )}
          {uploadState === 'uploaded' && (
            <div style={styles.dropZoneContent}>
              <div style={styles.thumbnailWrapper}>
                <img src={photoUrl} alt="Thumbnail" style={styles.thumbnail} />
                <span style={styles.checkIconBadge}>✓</span>
              </div>
              <p style={styles.successUploadText}>Upload successful!</p>
              <button
                type="button"
                style={styles.btnRemove}
                onClick={() => {
                  setPhotoUrl(null);
                  setUploadState('idle');
                }}
              >
                Remove File
              </button>
            </div>
          )}
          {uploadState === 'error' && (
            <div style={styles.dropZoneContent}>
              <span style={styles.errorIconCircle}>✕</span>
              <p style={styles.errorUploadText}>Upload failed. You can still submit without a file.</p>
              <button type="button" style={styles.btnOutline} onClick={triggerFileSelect}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={submitting} style={styles.submitBtn}>
        {submitting ? 'Submitting Grievance...' : 'Submit Grievance'}
      </button>
    </form>
  );
}

const styles = {
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#CC0000',
    fontSize: '14px',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    borderWidth: '2px',
    borderStyle: 'solid',
    transition: 'border-color 150ms ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  stepCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-navy, #1A3557)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111111',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#555555',
  },
  input: {
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#111111',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 150ms ease',
  },
  select: {
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#111111',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    transition: 'border-color 150ms ease',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#111111',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'border-color 150ms ease',
  },
  counterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  counterText: {
    fontSize: '12px',
  },
  errorText: {
    fontSize: '12px',
    color: '#CC0000',
    fontWeight: '500',
  },
  warningBanner: {
    backgroundColor: '#FFF3EC',
    borderColor: '#E8621A',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '12px',
    color: '#E8621A',
    fontWeight: '600',
    marginTop: '8px',
    lineHeight: '16px',
  },
  dropZone: {
    borderWidth: '2px',
    borderStyle: 'dashed',
    borderRadius: '8px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '140px',
    transition: 'all 150ms ease',
  },
  fileInput: {
    display: 'none',
  },
  dropZoneContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  uploadIcon: {
    fontSize: '32px',
    color: '#E8621A',
    marginBottom: '8px',
  },
  dropZoneText: {
    fontSize: '13px',
    color: '#555555',
    margin: '0 0 12px 0',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1.5px solid #E8621A',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#E8621A',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
  },
  btnRemove: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#CC0000',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
    marginTop: '8px',
  },
  thumbnailWrapper: {
    position: 'relative',
    marginBottom: '8px',
  },
  thumbnail: {
    width: '80px',
    height: '80px',
    borderRadius: '6px',
    objectFit: 'cover',
  },
  checkIconBadge: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    backgroundColor: '#27AE60',
    color: '#FFFFFF',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '700',
    border: '1.5px solid #FFFFFF',
  },
  successUploadText: {
    fontSize: '13px',
    color: '#27AE60',
    fontWeight: '600',
    margin: '0 0 4px 0',
  },
  errorIconCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#FFEBEE',
    color: '#CC0000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  errorUploadText: {
    fontSize: '13px',
    color: '#CC0000',
    fontWeight: '600',
    margin: '0 0 12px 0',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #E8621A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '8px',
  },
  submitBtn: {
    backgroundColor: '#E8621A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 2px 8px rgba(232, 98, 26, 0.2)',
    transition: 'background-color 150ms ease',
    outline: 'none',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '36px 24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #E0E0E0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  checkIcon: {
    fontSize: '48px',
    color: '#27AE60',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#27AE60',
    margin: '0 0 8px 0',
  },
  successText: {
    fontSize: '14px',
    color: '#555555',
    margin: '0 0 24px 0',
    lineHeight: '20px',
  },
  refBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: '8px',
    padding: '12px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '24px',
  },
  refLabel: {
    fontSize: '12px',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  refVal: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#E8621A',
  },
  btnOrange: {
    backgroundColor: '#E8621A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
  },
  toggleContainer: {
    display: 'flex',
    backgroundColor: '#F5F5F5',
    borderRadius: '8px',
    padding: '4px',
    marginBottom: '20px',
    gap: '4px',
  },
  toggleBtn: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  toggleBtnActive: {
    backgroundColor: '#1A3557', // Brand Navy
    color: '#FFFFFF',
    boxShadow: '0 2px 6px rgba(26, 53, 87, 0.2)',
  },
  toggleBtnInactive: {
    backgroundColor: 'transparent',
    color: '#555555',
  },
  promptText: {
    fontSize: '14px',
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px 0',
  },
  verifyBtn: {
    backgroundColor: '#1A3557',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
    whiteSpace: 'nowrap',
    transition: 'background-color 150ms ease',
  },
};
