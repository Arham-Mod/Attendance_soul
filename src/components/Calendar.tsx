import React from 'react';
import '../styles/Calendar.css';

interface CalendarProps {
  onBack: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ onBack }) => {
  const daysOfWeek = [1, 2, 3, 4, 5, 6, 7];
  
  return (
    <div className="calendar-container">
      <button className="back-button" onClick={onBack}>
        Home
      </button>
      
      <div className="calendar-wrapper">
        <div className="calendar-header">
          <h3>Calendar</h3>
        </div>
        
        <div className="days-grid">
          {daysOfWeek.map(day => (
            <div key={day} className={`day-cell ${day === 2 ? 'active-day' : ''}`}>
              {day}
            </div>
          ))}
        </div>
        
        <div className="timetable-info">
          <p className="timetable-message">
            TT opens with registered attendance
          </p>
        </div>
      </div>
    </div>
  );
};

export default Calendar; 