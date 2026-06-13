import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GrievanceForm from '../components/complaints/GrievanceForm';
import RecentGrievancesSidebar from '../components/complaints/RecentGrievancesSidebar';

export default function GrievancePortalPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWZhNWI3NTAtNzZjZS00OWI0LTkxNTItMjY4MjA2ZTgwZjBjIiwicGhvbmUiOiI5OTk5OTk5OTk5IiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.JRm7oCU_rnG7qcvqYL7NdlwizhpRFZ41nPgWQdju4XQ';
    const currentToken = localStorage.getItem('tracely_token') || localStorage.getItem('token');
    
    if (currentToken !== devToken) {
      localStorage.setItem('tracely_token', devToken);
      localStorage.setItem('token', devToken);
      window.location.reload();
    }
  }, []);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isMobile = windowWidth < 768;

  const steps = [
    { num: 1, label: 'Journey Details' },
    { num: 2, label: 'Grievance Category' },
    { num: 3, label: 'Evidence Upload' },
    { num: 4, label: 'Submit' },
  ];

  return (
    <div style={styles.container}>
      {/* Breadcrumbs */}
      <nav style={styles.breadcrumb}>
        <Link to="/" style={styles.breadcrumbLink}>Home</Link>
        <span style={styles.breadcrumbSeparator}>&gt;</span>
        <span style={styles.breadcrumbActive}>File Grievance Portal</span>
      </nav>

      {/* Page Heading */}
      <h1 style={styles.heading}>File Grievance Portal</h1>

      {/* Horizontal Stepper Progress Bar */}
      <div style={styles.stepperContainer}>
        {/* Background Line */}
        <div style={styles.stepperLineBg} />
        {/* Progress Line */}
        <div 
          style={{ 
            ...styles.stepperLineProgress, 
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
          }} 
        />
        
        {/* Step Circles & Labels */}
        {steps.map((step) => {
          const isCompleted = step.num < currentStep;
          const isActive = step.num === currentStep;

          let circleStyle = styles.stepCirclePending;
          let labelStyle = styles.stepLabelPending;

          if (isCompleted) {
            circleStyle = styles.stepCircleCompleted;
            labelStyle = styles.stepLabelActive;
          } else if (isActive) {
            circleStyle = styles.stepCircleActive;
            labelStyle = styles.stepLabelActive;
          }

          return (
            <div key={step.num} style={styles.stepItem}>
              <div style={circleStyle}>
                {isCompleted ? '✓' : step.num}
              </div>
              <span style={labelStyle}>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Main Two-Column Layout */}
      <div style={{
        ...styles.mainGrid,
        gridTemplateColumns: isMobile ? '1fr' : '7fr 3fr',
        gap: isMobile ? '24px' : '32px'
      }}>
        {/* Left Column: Form */}
        <div>
          <GrievanceForm 
            currentStep={currentStep} 
            setCurrentStep={setCurrentStep} 
            onSubmitSuccess={() => setRefreshTrigger(prev => prev + 1)}
          />
        </div>

        {/* Right Column: Recent Grievances Sidebar */}
        <div>
          <RecentGrievancesSidebar refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#888888',
  },
  breadcrumbLink: {
    color: '#E8621A',
    fontWeight: '500',
    textDecoration: 'none',
  },
  breadcrumbSeparator: {
    color: '#CCCCCC',
  },
  breadcrumbActive: {
    color: '#555555',
    fontWeight: '500',
  },
  heading: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111111',
    margin: 0,
  },
  stepperContainer: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    margin: '20px 0 40px 0',
    padding: '0 20px',
    width: '100%',
  },
  stepperLineBg: {
    position: 'absolute',
    top: '18px',
    left: '40px',
    right: '40px',
    height: '4px',
    backgroundColor: '#E0E0E0',
    zIndex: 0,
  },
  stepperLineProgress: {
    position: 'absolute',
    top: '18px',
    left: '40px',
    height: '4px',
    backgroundColor: '#1A3557', // Navy progress line
    zIndex: 0,
    transition: 'width 0.3s ease-in-out',
  },
  stepItem: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 1,
    width: '120px',
  },
  stepCirclePending: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    border: '2px solid #E0E0E0',
    color: '#888888',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    transition: 'all 0.2s ease',
  },
  stepCircleActive: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#1A3557', // navy circle
    border: '2.5px solid #E8621A', // orange highlight border
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    boxShadow: '0 0 10px rgba(232, 98, 26, 0.4)',
    transition: 'all 0.2s ease',
  },
  stepCircleCompleted: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#1A3557', // navy circle
    border: '2px solid #1A3557',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    transition: 'all 0.2s ease',
  },
  stepLabelPending: {
    marginTop: '10px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#888888',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  stepLabelActive: {
    marginTop: '10px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#1A3557',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  mainGrid: {
    display: 'grid',
    alignItems: 'start',
  },
};
