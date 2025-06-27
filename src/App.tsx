import React, { useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Timetable from './components/Timetable';
import Calendar from './components/Calendar';
import HomePage from './components/HomePage';
import AttendanceProvider from './store/AttendanceStore';

function App() {
  const [activeView, setActiveView] = useState('home'); // 'home', 'dashboard', 'timetable', 'calendar'
  const [currentSubject, setCurrentSubject] = useState('');

  const handleViewChange = (view: string) => {
    setActiveView(view);
  };

  const handleInsertTimetable = () => {
    setActiveView('timetable');
  };

  const handleViewTT = () => {
    setActiveView('timetable');
  };

  const handleAttendanceRecord = () => {
    // Logic for attendance record view
    setActiveView('dashboard');
  };

  const handleSubjectWise = () => {
    // Logic for subject wise view
    setActiveView('dashboard');
  };

  const handleBackToHome = () => {
    setActiveView('home');
  };

  return (
    <div className="App">
      <AttendanceProvider>
        <div className="attendance-manager">
          {activeView !== 'home' && (
            <h1 className="app-title">Attendance Manager</h1>
          )}
          
          <div className="app-container">
            {activeView === 'home' && (
              <HomePage onEnter={() => setActiveView('dashboard')} />
            )}
            
            {activeView === 'dashboard' && (
              <Dashboard 
                onViewTT={handleViewTT}
                onAttendanceRecord={handleAttendanceRecord}
                onSubjectWise={handleSubjectWise}
                onInsertTimetable={handleInsertTimetable}
                onBackToHome={handleBackToHome}
              />
            )}
            
            {activeView === 'timetable' && (
              <Timetable 
                onBack={() => setActiveView('dashboard')}
                setCurrentSubject={setCurrentSubject}
              />
            )}
            
            {activeView === 'calendar' && (
              <Calendar 
                onBack={() => setActiveView('dashboard')}
              />
            )}
          </div>
        </div>
      </AttendanceProvider>
    </div>
  );
}

export default App;
