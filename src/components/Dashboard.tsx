import React, { useEffect, useState } from 'react';
import '../styles/Dashboard.css';
import { useAttendance } from '../store/AttendanceStore';
import { loadDemoData } from '../services/firebaseService';

interface DashboardProps {
  onViewTT: () => void;
  onAttendanceRecord: () => void;
  onSubjectWise: () => void;
  onInsertTimetable: () => void;
  onBackToHome: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  onViewTT, 
  onAttendanceRecord, 
  onSubjectWise, 
  onInsertTimetable,
  onBackToHome
}) => {
  const { subjects, calculateAttendanceGoal, isSubjectCritical, isLoading } = useAttendance();
  const [averageAttendance, setAverageAttendance] = useState(0);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // Calculate average attendance whenever subjects change
  useEffect(() => {
    if (subjects.length === 0) return;
    
    const total = subjects.reduce((acc, subject) => acc + subject.percentage, 0);
    const average = Math.round(total / subjects.length);
    setAverageAttendance(average);
  }, [subjects]);

  const toggleExpandSubject = (subjectId: string) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subjectId);
    }
  };

  const handleLoadDemoData = async () => {
    setIsLoadingDemo(true);
    try {
      await loadDemoData();
      // Reload the page to refresh state with demo data
      window.location.reload();
    } catch (error) {
      console.error('Error loading demo data:', error);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="sidebar">
          <button className="sidebar-button" onClick={onBackToHome}>
            home
          </button>
          <button className="sidebar-button" onClick={onViewTT}>
            view TT
          </button>
        </div>
        
        <div className="main-content">
          <div className="attendance-display">
            <h2 className="display-title">ATTENDANCE</h2>
            <div className="attendance-box">
              {isLoading ? (
                <div className="loading-indicator">Loading attendance data...</div>
              ) : subjects.length > 0 ? (
                <div className="subjects-list">
                  {subjects.map((subject) => {
                    const attendanceGoal = calculateAttendanceGoal(subject?.id || '');
                    const isCritical = isSubjectCritical(subject);
                    
                    return (
                      <div key={subject?.id || ''}>
                        <div 
                          className={`subject-item ${isCritical ? 'critical' : ''}`}
                          onClick={() => toggleExpandSubject(subject?.id || '')}
                        >
                          <span className="subject-name">{subject?.name || 'Unknown'}</span>
                          <div className="subject-details">
                            <span className={`subject-percentage ${isCritical ? 'critical-text' : ''}`}>
                              {subject?.percentage || 0}%
                            </span>
                            <button className="expand-button">
                              {expandedSubject === subject?.id ? '−' : '+'}
                            </button>
                          </div>
                        </div>
                        
                        {expandedSubject === subject?.id && (
                          <div className="subject-goal-details">
                            <div className="goal-stat">
                              <span className="goal-label">Classes Attended:</span>
                              <span className="goal-value">{attendanceGoal?.classesAttended || 0} / {attendanceGoal?.totalClasses || 0}</span>
                            </div>
                            
                            <div className="goal-stat">
                              <span className="goal-label">Classes Remaining:</span>
                              <span className="goal-value">{attendanceGoal?.remainingClasses || 0}</span>
                            </div>
                            
                            <div className="goal-stat">
                              <span className="goal-label">To reach 75%:</span>
                              <span className="goal-value">
                                {(attendanceGoal?.classesNeeded || 0) > 0 
                                  ? `Need ${attendanceGoal?.classesNeeded} more class${(attendanceGoal?.classesNeeded || 0) > 1 ? 'es' : ''}`
                                  : 'Target achieved!'}
                              </span>
                            </div>
                            
                            {(attendanceGoal?.classesNeeded || 0) > 0 && (
                              <div className="goal-stat">
                                <span className="goal-label">If you attend all remaining:</span>
                                <span className={`goal-value ${(attendanceGoal?.futureProjection || 0) < 75 ? 'critical-text' : ''}`}>
                                  {attendanceGoal?.futureProjection || 0}%
                                </span>
                              </div>
                            )}
                            
                            {!attendanceGoal?.isPossible && (attendanceGoal?.classesNeeded || 0) > 0 && (
                              <div className="goal-warning">
                                It's not possible to reach 75% with the {attendanceGoal?.remainingClasses || 0} remaining classes.
                              </div>
                            )}
                            
                            {attendanceGoal?.isPossible && (attendanceGoal?.classesNeeded || 0) > 0 && (
                              <div className="goal-achievement">
                                <div className="achievement-label">
                                  You can reach 75% by attending {attendanceGoal?.classesNeeded || 0} of the {attendanceGoal?.remainingClasses || 0} remaining classes.
                                </div>
                                <div className="achievement-progress">
                                  <div 
                                    className="achievement-bar" 
                                    style={{
                                      width: `${Math.min(100, ((attendanceGoal?.classesNeeded || 0) / (attendanceGoal?.remainingClasses || 1)) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-subjects">
                  No subjects added yet. Click "insert Time Table" to add subjects or "Load Demo Data" for sample data.
                </div>
              )}
            </div>
          </div>
          
          <div className="stats-container">
            <div className="current-stats">
              <h3 className="stats-title">CURRENT</h3>
              <div className={`percentage-box ${averageAttendance < 75 ? 'critical-box' : ''}`}>
                <span className="percentage-value">{isLoading ? '...' : `${averageAttendance}%`}</span>
              </div>
            </div>
            
            <div className="action-buttons">
              <button 
                className="timetable-button" 
                onClick={onInsertTimetable}
                disabled={isLoading}
              >
                insert Time Table
              </button>
              
              <button 
                className="demo-button" 
                onClick={handleLoadDemoData}
                disabled={isLoadingDemo}
              >
                {isLoadingDemo ? 'Loading...' : 'Load Demo Data'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="firebase-indicator">
        {isLoading ? 'Connecting to Firebase...' : 'Connected to Firebase'}
        <span className={`firebase-dot ${isLoading ? 'connecting' : 'connected'}`}></span>
      </div>
    </div>
  );
};

export default Dashboard; 