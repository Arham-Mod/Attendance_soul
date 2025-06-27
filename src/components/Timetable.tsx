import React, { useState, useEffect } from 'react';
import '../styles/Timetable.css';
import { useAttendance } from '../store/AttendanceStore';
import { v4 as uuidv4 } from 'uuid';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  format, 
  getDay, 
  addDays, 
  subDays,
  addWeeks, 
  subWeeks,
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameWeek,
  parseISO,
  isWeekend,
  getWeek
} from 'date-fns';

interface TimetableProps {
  onBack: () => void;
  setCurrentSubject: (subject: string) => void;
}

interface AttendanceRecord {
  present: boolean;
  date: number;
  timeSlot: string;
  dayOfWeek?: number; // 0-6 where 0 is Sunday
}

interface CellData {
  subjectName: string;
  isPresent: boolean | null; // null = not marked, true = present, false = absent
  attendees?: string; // Optional field for attendees (performers, etc.)
  isHoliday?: boolean; // New field to mark holidays or cancelled classes
  dayOfWeek?: number; // 0-6 where 0 is Sunday
}

// Predefined color palette for subjects
const subjectColors = [
  { bg: 'rgba(0, 204, 153, 0.2)', text: '#00cc99', border: 'rgba(0, 204, 153, 0.5)' },
  { bg: 'rgba(75, 120, 240, 0.2)', text: '#4b78f0', border: 'rgba(75, 120, 240, 0.5)' },
  { bg: 'rgba(255, 152, 0, 0.2)', text: '#ff9800', border: 'rgba(255, 152, 0, 0.5)' },
  { bg: 'rgba(244, 67, 54, 0.2)', text: '#f44336', border: 'rgba(244, 67, 54, 0.5)' },
  { bg: 'rgba(156, 39, 176, 0.2)', text: '#9c27b0', border: 'rgba(156, 39, 176, 0.5)' },
  { bg: 'rgba(233, 30, 99, 0.2)', text: '#e91e63', border: 'rgba(233, 30, 99, 0.5)' },
  { bg: 'rgba(33, 150, 243, 0.2)', text: '#2196f3', border: 'rgba(33, 150, 243, 0.5)' },
  { bg: 'rgba(255, 193, 7, 0.2)', text: '#ffc107', border: 'rgba(255, 193, 7, 0.5)' }
];

// Modified time slots (typical college schedule)
const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const weekdayNumbers = [1, 2, 3, 4, 5]; // Monday to Friday (excludes weekends)

const Timetable: React.FC<TimetableProps> = ({ onBack, setCurrentSubject }) => {
  const { 
    addSubject, 
    subjects, 
    getSubjectByName, 
    timetableData, 
    updateTimetableData,
    isLoading
  } = useAttendance();
  
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [cellData, setCellData] = useState<Record<string, Record<string, CellData>>>(
    timetableData && Object.keys(timetableData).length > 0 
      ? timetableData 
      : {}
  );
  
  const [selectedCell, setSelectedCell] = useState<{weekday: number, timeSlot: string} | null>(null);
  const [subjectInputValue, setSubjectInputValue] = useState('');
  const [attendeesValue, setAttendeesValue] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);
  const [subjectColorMap, setSubjectColorMap] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Get the current week key (used for storage)
  const getCurrentWeekKey = (): string => {
    return `week-${getWeek(currentWeek)}-${format(currentWeek, 'yyyy')}`;
  };

  // Get weekday dates for the current week (Monday-Friday)
  const getWeekdayDates = (): Date[] => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Week starts on Monday (1)
    return weekdayNumbers.map(dayNum => addDays(weekStart, dayNum - 1));
  };

  // Format display date range for the week
  const formatWeekRange = (): string => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  };

  // Initialize cell data for a new week
  const initializeWeekData = (week: Date): Record<string, Record<string, CellData>> => {
    const weekKey = `week-${getWeek(week)}-${format(week, 'yyyy')}`;
    const weekData: Record<string, Record<string, CellData>> = {};
    
    if (!cellData[weekKey]) {
      weekData[weekKey] = {};
      
      // Initialize each time slot for each weekday
      weekdayNumbers.forEach(dayNum => {
        timeSlots.forEach(timeSlot => {
          const cellId = `day-${dayNum}-${timeSlot}`;
          weekData[weekKey][cellId] = {
            subjectName: '',
            isPresent: null,
            attendees: '',
            isHoliday: false,
            dayOfWeek: dayNum
          };
        });
      });
    }
    
    return weekData;
  };

  // Initialize cell data if empty or when week changes
  useEffect(() => {
    const weekKey = getCurrentWeekKey();
    
    if (!cellData[weekKey]) {
      const newWeekData = initializeWeekData(currentWeek);
      setCellData(prev => ({
        ...prev,
        ...newWeekData
      }));
    }
  }, [currentWeek, cellData]);

  // Update the global state whenever cellData changes
  useEffect(() => {
    // Skip initial render or when loading
    if (isLoading || Object.keys(cellData).length === 0) return;
    
    const timer = setTimeout(() => {
      updateTimetableData(cellData);
    }, 500); // Debounce updates to prevent excessive Firebase operations
    
    return () => clearTimeout(timer);
  }, [cellData, updateTimetableData, isLoading]);

  // Update subject color map whenever cell data changes
  useEffect(() => {
    const uniqueSubjects = new Set<string>();
    
    // Collect all unique subject names
    Object.values(cellData).forEach(weekData => {
      if (!weekData) return;
      
      Object.values(weekData).forEach(data => {
        if (data && data.subjectName && data.subjectName.trim() !== '') {
          uniqueSubjects.add(data.subjectName);
        }
      });
    });
    
    // Assign colors to subjects
    const colorMap: Record<string, number> = {};
    Array.from(uniqueSubjects).forEach((subject, index) => {
      colorMap[subject] = index % subjectColors.length;
    });
    
    setSubjectColorMap(colorMap);
  }, [cellData]);

  const getSubjectColor = (subjectName: string) => {
    if (!subjectName || subjectName.trim() === '') return null;
    return subjectColors[subjectColorMap[subjectName] || 0];
  };

  const handleCellClick = (weekday: number, timeSlot: string) => {
    const weekKey = getCurrentWeekKey();
    const cellId = `day-${weekday}-${timeSlot}`;
    
    setSelectedCell({ weekday, timeSlot });
    
    if (cellData[weekKey] && cellData[weekKey][cellId]) {
      const currentData = cellData[weekKey][cellId];
      setSubjectInputValue(currentData.subjectName || '');
      setAttendeesValue(currentData.attendees || '');
      setIsHoliday(currentData.isHoliday || false);
    } else {
      setSubjectInputValue('');
      setAttendeesValue('');
      setIsHoliday(false);
    }
  };

  const handleSubjectSave = () => {
    if (!selectedCell) return;
    
    const { weekday, timeSlot } = selectedCell;
    const weekKey = getCurrentWeekKey();
    const cellId = `day-${weekday}-${timeSlot}`;
    
    setCellData(prev => {
      const newData = { ...prev };
      
      if (!newData[weekKey]) {
        newData[weekKey] = {};
      }
      
      newData[weekKey][cellId] = {
        ...((newData[weekKey][cellId]) || { isPresent: null }),
        subjectName: subjectInputValue,
        attendees: attendeesValue,
        isHoliday: isHoliday,
        dayOfWeek: weekday
      };
      
      return newData;
    });
    
    setSelectedCell(null);
    setSubjectInputValue('');
    setAttendeesValue('');
    setIsHoliday(false);
  };

  const markAttendance = (weekday: number, timeSlot: string, isPresent: boolean, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const weekKey = getCurrentWeekKey();
    const cellId = `day-${weekday}-${timeSlot}`;
    
    setCellData(prev => {
      const newData = { ...prev };
      
      if (!newData[weekKey]) {
        newData[weekKey] = {};
      }
      
      if (!newData[weekKey][cellId]) {
        newData[weekKey][cellId] = {
          subjectName: '',
          isPresent: null,
          isHoliday: false,
          dayOfWeek: weekday
        };
      }
      
      newData[weekKey][cellId] = {
        ...newData[weekKey][cellId],
        isPresent
      };
      
      return newData;
    });
  };

  const markHoliday = (weekday: number, timeSlot: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const weekKey = getCurrentWeekKey();
    const cellId = `day-${weekday}-${timeSlot}`;
    
    setCellData(prev => {
      const newData = { ...prev };
      
      if (!newData[weekKey]) {
        newData[weekKey] = {};
      }
      
      if (!newData[weekKey][cellId]) {
        newData[weekKey][cellId] = {
          subjectName: '',
          isPresent: null,
          isHoliday: false,
          dayOfWeek: weekday
        };
      }
      
      const currentIsHoliday = newData[weekKey][cellId].isHoliday || false;
      
      newData[weekKey][cellId] = {
        ...newData[weekKey][cellId],
        isHoliday: !currentIsHoliday
      };
      
      return newData;
    });
  };

  const handleSaveTimeTable = async () => {
    setIsSaving(true);
    try {
      // Process all subject data from timetable
      const subjectMap: Record<string, {
        classes: number;
        attended: number;
        attendance: AttendanceRecord[];
      }> = {};
      
      // Collect attendance data from all weeks
      Object.entries(cellData).forEach(([weekKey, weekData]) => {
        if (!weekData) return;
        
        Object.entries(weekData).forEach(([cellId, data]) => {
          // Add explicit null check before accessing data properties
          if (!data || !data.subjectName || data.isHoliday) return;
          
          const subjectName = data.subjectName;
          if (!subjectMap[subjectName]) {
            subjectMap[subjectName] = {
              classes: 0,
              attended: 0,
              attendance: []
            };
          }
          
          subjectMap[subjectName].classes++;
          
          // Extract day and time info from cellId
          const [, dayNumStr, timeSlot] = cellId.split('-');
          const dayNum = parseInt(dayNumStr);
          
          // Calculate the specific date for this class based on the week and day
          const weekParts = weekKey.split('-');
          const weekNum = parseInt(weekParts[1]);
          const year = parseInt(weekParts[2]);
          
          // Get the date for this specific day in the week
          const firstDayOfYear = new Date(year, 0, 1);
          const dayOfYear = (weekNum - 1) * 7 + dayNum;
          const date = new Date(year, 0, dayOfYear);
          
          if (data.isPresent === true) {
            subjectMap[subjectName].attended++;
            subjectMap[subjectName].attendance.push({
              present: true,
              date: date.getTime(),
              timeSlot,
              dayOfWeek: dayNum
            });
          } else if (data.isPresent === false) {
            subjectMap[subjectName].attendance.push({
              present: false,
              date: date.getTime(),
              timeSlot,
              dayOfWeek: dayNum
            });
          }
        });
      });
      
      // Create/update subjects with attendance data
      for (const [subjectName, data] of Object.entries(subjectMap)) {
        const existingSubject = getSubjectByName(subjectName);
        const percentage = data.classes > 0 
          ? Math.round((data.attended / data.classes) * 100) 
          : 0;
        
        if (existingSubject) {
          // Update existing subject
          await addSubject({
            ...existingSubject,
            percentage,
            attendance: data.attendance
          });
        } else {
          // Create new subject
          await addSubject({
            id: uuidv4(),
            name: subjectName,
            percentage,
            attendance: data.attendance
          });
        }
      }
      
      // Also save timetable to Firebase
      await updateTimetableData(cellData);
      
      // Go back to dashboard
      onBack();
    } catch (error) {
      console.error('Error saving timetable:', error);
      alert('Error saving timetable. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const handleWeekChange = (date: Date) => {
    setCurrentWeek(date);
  };

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <button className="back-button" onClick={onBack}>
          ← BACK
        </button>
        <h2>Weekly Time Table</h2>
        <button 
          className="save-button" 
          onClick={handleSaveTimeTable}
          disabled={isSaving || isLoading}
        >
          {isSaving ? 'SAVING...' : 'SAVE'}
        </button>
      </div>
      
      <div className="week-navigation">
        <button className="nav-button" onClick={handlePrevWeek}>
          &lt; Previous Week
        </button>
        
        <div className="week-selector">
          <DatePicker
            selected={currentWeek}
            onChange={handleWeekChange}
            dateFormat="MMMM d, yyyy"
            className="date-picker"
            wrapperClassName="date-picker-wrapper"
          />
          <div className="week-range">{formatWeekRange()}</div>
        </div>
        
        <button className="nav-button" onClick={handleNextWeek}>
          Next Week &gt;
        </button>
      </div>
      
      {isLoading ? (
        <div className="timetable-loading">
          <p>Loading timetable data...</p>
        </div>
      ) : (
        <div className="timetable">
          <div className="timetable-header-row">
            <div className="day-cell">
              <span className="day-name">Day</span>
            </div>
            {timeSlots.map((timeSlot, timeIndex) => (
              <div key={timeIndex} className="time-slot-header">
                {timeSlot}
              </div>
            ))}
          </div>
          
          {weekdayNumbers.map((dayNum, dayIndex) => {
            const weekdayDate = getWeekdayDates()[dayIndex];
            return (
              <div key={dayIndex} className="timetable-row">
                <div className="day-cell">
                  <div className="day-name">{weekdays[dayIndex]}</div>
                  <div className="day-number">{format(weekdayDate, 'MMM d')}</div>
                </div>
                
                {timeSlots.map((timeSlot, timeIndex) => {
                  const weekKey = getCurrentWeekKey();
                  const cellId = `day-${dayNum}-${timeSlot}`;
                  
                  // Ensure we have valid data with defaults
                  const data = (cellData[weekKey] && cellData[weekKey][cellId]) || { 
                    subjectName: '', 
                    isPresent: null, 
                    attendees: '',
                    isHoliday: false,
                    dayOfWeek: dayNum
                  };
                  
                  const subjectColor = getSubjectColor(data.subjectName);
                  const cellStyle = data.subjectName && !data.isHoliday && subjectColor ? {
                    backgroundColor: data.isPresent === true ? subjectColor.bg : data.isPresent === false ? 'rgba(255, 102, 102, 0.15)' : subjectColor.bg,
                    borderLeft: `2px solid ${data.isPresent === true ? 'rgba(0, 204, 153, 0.5)' : data.isPresent === false ? 'rgba(255, 102, 102, 0.5)' : subjectColor.border}`
                  } : {};
                  
                  return (
                    <div 
                      key={cellId} 
                      className={`time-slot-cell 
                        ${data.isPresent === true ? 'present' : ''} 
                        ${data.isPresent === false ? 'absent' : ''} 
                        ${data.subjectName ? 'has-subject' : ''}
                        ${data.isHoliday ? 'holiday' : ''}
                      `}
                      onClick={() => handleCellClick(dayNum, timeSlot)}
                      style={cellStyle}
                    >
                      {data.subjectName && (
                        <div 
                          className="cell-subject-name"
                          style={!data.isHoliday && subjectColor ? { color: subjectColor.text, backgroundColor: `${subjectColor.bg}` } : {}}
                        >
                          {data.subjectName}
                        </div>
                      )}
                      
                      {data.isHoliday && (
                        <div className="holiday-marker">CANCELLED</div>
                      )}
                      
                      {data.attendees && !data.isHoliday && (
                        <div className="cell-attendees">{data.attendees}</div>
                      )}
                      
                      <div className="attendance-buttons">
                        <button 
                          className={`attendance-icon present-icon ${data.isPresent === true ? 'active' : ''}`}
                          onClick={(e) => markAttendance(dayNum, timeSlot, true, e)}
                          title="Mark as present"
                          disabled={data.isHoliday}
                        >
                          ✓
                        </button>
                        <button 
                          className={`attendance-icon absent-icon ${data.isPresent === false ? 'active' : ''}`}
                          onClick={(e) => markAttendance(dayNum, timeSlot, false, e)}
                          title="Mark as absent"
                          disabled={data.isHoliday}
                        >
                          ✗
                        </button>
                        <button 
                          className={`attendance-icon holiday-icon ${data.isHoliday ? 'active' : ''}`}
                          onClick={(e) => markHoliday(dayNum, timeSlot, e)}
                          title={data.isHoliday ? "Unmark as holiday/cancelled" : "Mark as holiday/cancelled"}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          
          {/* Weekend Notice */}
          <div className="weekend-notice">
            <p>Note: Saturday and Sunday are considered holidays and are not displayed in the timetable.</p>
          </div>
        </div>
      )}
      
      {selectedCell && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <h3>Edit Cell</h3>
            <div className="form-group">
              <label>Subject Name:</label>
              <input 
                type="text" 
                value={subjectInputValue} 
                onChange={(e) => setSubjectInputValue(e.target.value)}
                placeholder="Enter subject name"
              />
            </div>
            <div className="form-group">
              <label>Attendees/Notes:</label>
              <input 
                type="text" 
                value={attendeesValue} 
                onChange={(e) => setAttendeesValue(e.target.value)}
                placeholder="Optional: attendees or notes"
              />
            </div>
            <div className="form-group checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={isHoliday} 
                  onChange={(e) => setIsHoliday(e.target.checked)}
                />
                Mark as Holiday/No Class
              </label>
            </div>
            <div className="edit-actions">
              <button onClick={() => setSelectedCell(null)}>Cancel</button>
              <button onClick={handleSubjectSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;